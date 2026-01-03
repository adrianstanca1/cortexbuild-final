import { GoogleGenAI } from '@google/genai';
import { logger } from '../utils/logger.js';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    logger.error('GEMINI_API_KEY is not configured!');
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

// Schema for phase extraction
const phaseHandlerSchema = {
    type: "OBJECT",
    properties: {
        phases: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    name: { type: "STRING" },
                    startDate: { type: "STRING", description: "YYYY-MM-DD" },
                    endDate: { type: "STRING", description: "YYYY-MM-DD" },
                    status: { type: "STRING", enum: ["Pending", "In Progress", "Completed", "Delayed", "On Hold"] },
                    riskLevel: { type: "STRING", enum: ["Low", "Medium", "High"] },
                    description: { type: "STRING" },
                    keyDependencies: { type: "ARRAY", items: { type: "STRING" } }
                },
                required: ["name", "startDate", "endDate", "status", "riskLevel"]
            }
        },
        summary: { type: "STRING" },
        confidenceScore: { type: "NUMBER" }
    },
    required: ["phases", "summary"]
};

export const analyzeProjectDocument = async (fileBuffer: Buffer, mimeType: string, projectContext: any = {}) => {
    try {
        if (!apiKey) throw new Error("Gemini API Key missing");

        const model = "gemini-2.0-flash-exp";

        const prompt = `
        Analyze this project document (schedule, gantt chart, or plan).
        Context: Project "${projectContext.name || 'Unknown'}" (${projectContext.type || 'General'}).
        
        Extract the distinct project phases, their dates, and status.
        If specific dates aren't visible, estimate reasonable logical dates based on standard construction timelines relative to the start date.
        Assess risk level based on the complexity or tight deadlines visible.
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: fileBuffer.toString('base64')
                            }
                        }
                    ]
                }
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: phaseHandlerSchema,
                temperature: 0.1,
            }
        });

        // The SDK might return parsed object directly if responseMimeType is json? 
        // Or we access part.text and JSON.parse.
        // Let's check the response structure safely.
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) throw new Error("No response from AI");

        return JSON.parse(text);

    } catch (error: any) {
        logger.error("AI Analysis Failed:", error);
        throw error;
    }
};
