import { getDb } from '../database.js';
import { AppError } from '../utils/AppError.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export class PredictiveService {
    /**
     * Analyze a project for potential delays
     */
    static async analyzeProjectDelays(companyId: string, projectId: string) {
        const db = getDb();

        // 1. Fetch relevant data
        const [project, tasks, safety, weather] = await Promise.all([
            db.get('SELECT * FROM projects WHERE id = ? AND companyId = ?', [projectId, companyId]),
            db.all('SELECT * FROM tasks WHERE projectId = ? AND companyId = ?', [projectId, companyId]),
            db.all('SELECT * FROM safety_incidents WHERE projectId = ? AND companyId = ?', [projectId, companyId]),
            db.all('SELECT * FROM daily_logs WHERE projectId = ? AND companyId = ? ORDER BY date DESC LIMIT 7', [projectId, companyId])
        ]);

        if (!project) throw new AppError('Project not found', 404);
        if (tasks.length === 0) return { delayProbability: 0, reasoning: "No tasks to analyze." };

        // 2. Simple statistical analysis
        const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'Done');
        const overdueTasks = tasks.filter(t => t.status !== 'completed' && new Date(t.dueDate) < new Date());
        const completionRate = completedTasks.length / tasks.length;
        const safetyIncidentCount = safety.length;

        // 3. AI Reasoning (Gemini)
        let aiReasoning = "AI analysis skipped (API key missing).";
        let predictedDelayDays = 0;

        if (process.env.GEMINI_API_KEY) {
            try {
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const prompt = `
                    Act as an expert Construction Risk Analyst. Analyze the following project data to predict delays and identify risks.
                    
                    **Project Data:**
                    - Name: ${project.name} (Status: ${project.status})
                    - Schedule: Start ${project.startDate || 'N/A'}, End ${project.endDate || 'N/A'}
                    - Financials: Budget ${project.budget}, Spent ${project.spent}
                    - Velocity: ${tasks.length} total tasks, ${overdueTasks.length} overdue
                    - Completion Rate: ${(completionRate * 100).toFixed(1)}%
                    - Safety Record: ${safetyIncidentCount} incidents
                    - Recent Weather (last 7 days): ${JSON.stringify(weather.map(w => w.weather || 'Clear'))}

                    **Output Requirement:**
                    Provide valid JSON strictly adhering to this schema (no markdown formatting):
                    {
                        "delayProbability": number (0-100),
                        "predictedDelayDays": number (estimate based on overdue tasks),
                        "reasoning": "string (concise 2-sentence explanation of primary risks)",
                        "riskFactors": ["string", "string", "string"] (top 3 specific risk vectors),
                        "riskScore": number (0-100, >70 is critical),
                        "recommendations": ["string", "string", "string"] (3 actionable mitigation steps),
                        "confidenceLevel": "HIGH" | "MEDIUM" | "LOW"
                    }
                `;

                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();

                // Clean-up potential markdown code blocks if the model ignores checking
                const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

                try {
                    const aiData = JSON.parse(cleanJson);
                    return {
                        ...aiData,
                        analyzedAt: new Date().toISOString()
                    };
                } catch (parseError) {
                    logger.error("[Predictive] Failed to parse AI JSON response:", { cleanJson });
                    aiReasoning = "AI analysis failed (invalid format). Using statistical fallback.";
                }
            } catch (error: any) {
                logger.error("[Predictive] Gemini API Error:", error);

                if (error.message?.includes('SAFETY')) {
                    aiReasoning = "AI analysis blocked by safety filters.";
                } else {
                    aiReasoning = "AI service temporarily unavailable.";
                }
            }
        }

        // Fallback simple logic
        if (!process.env.GEMINI_API_KEY) {
            logger.warn('[PredictiveService] GEMINI_API_KEY missing. Using heuristic fallback.');
        }

        predictedDelayDays = overdueTasks.length * 1.5 + (safetyIncidentCount * 2);
        const delayProbability = Math.min(100, (overdueTasks.length / tasks.length) * 100 + (safetyIncidentCount * 5));

        return {
            delayProbability: Math.round(delayProbability),
            predictedDelayDays: Math.round(predictedDelayDays),
            reasoning: "Statistical analysis based on current overdue tasks and safety record.",
            riskFactors: overdueTasks.length > 0 ? ["Overdue Tasks"] : [],
            riskScore: Math.round(delayProbability),
            recommendations: ["Review overdue tasks", "Monitor safety incidents"],
            confidenceLevel: "MEDIUM",
            analyzedAt: new Date().toISOString()
        };
    }

    /**
     * Analyze all projects for a company
     */
    static async analyzeAllProjects(companyId: string) {
        const db = getDb();
        const projects = await db.all('SELECT id, name FROM projects WHERE companyId = ?', [companyId]);

        // Analyze in parallel but with small limit or just simple map for now
        const results = await Promise.all(projects.map(async (p) => {
            try {
                const analysis = await this.analyzeProjectDelays(companyId, p.id);
                return {
                    projectId: p.id,
                    projectName: p.name,
                    ...analysis
                };
            } catch (e) {
                return { projectId: p.id, projectName: p.name, error: true };
            }
        }));

        return results;
    }
}
