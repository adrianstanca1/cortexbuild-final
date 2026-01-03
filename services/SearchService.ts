
import { runRawPrompt, parseAIJSON } from './geminiService';
import { Project, Task, TeamMember, Defect, SafetyIncident, Page } from '@/types';

export interface SearchResult {
    id: string;
    type: 'Project' | 'Task' | 'Team' | 'Defect' | 'Safety';
    title: string;
    subtitle: string;
    relevance: string;
    page: Page;
}

class SearchService {
    async semanticSearch(
        query: string,
        data: {
            projects: Project[];
            tasks: Task[];
            team: TeamMember[];
            defects: Defect[];
            safety: SafetyIncident[];
        }
    ): Promise<SearchResult[]> {
        if (!query || query.length < 3) return [];

        try {
            const context = {
                projects: data.projects.map(p => ({ id: p.id, name: p.name, desc: p.description, status: p.status })),
                tasks: data.tasks.slice(0, 50).map(t => ({ id: t.id, title: t.title, status: t.status, project: t.projectId })),
                team: data.team.map(m => ({ id: m.id, name: m.name, role: m.role })),
                defects: data.defects.map(d => ({ id: d.id, title: d.title, severity: d.severity })),
                safety: data.safety.map(s => ({ id: s.id, type: s.type, title: s.title }))
            };

            const prompt = `
        Search through the following construction project data for: "${query}"
        Data Context: ${JSON.stringify(context)}

        Identify the most relevant items (max 8). 
        For each item, specify why it's relevant.
        Return as JSON array:
        [{ "id": "string", "type": "Project|Task|Team|Defect|Safety", "title": "string", "subtitle": "string", "relevance": "string" }]
      `;

            const res = await runRawPrompt(prompt, { model: 'gemini-1.5-flash', responseMimeType: 'application/json' });
            const rawResults = parseAIJSON(res);

            if (!Array.isArray(rawResults)) return [];

            return rawResults.map((r: any) => ({
                ...r,
                page: this.mapTypeToPage(r.type)
            }));
        } catch (e) {
            console.error("Search failed:", e);
            return [];
        }
    }

    private mapTypeToPage(type: string): Page {
        switch (type) {
            case 'Project': return Page.PROJECTS;
            case 'Task': return Page.TASKS;
            case 'Team': return Page.TEAM;
            case 'Defect': return Page.SAFETY;
            case 'Safety': return Page.SAFETY;
            default: return Page.DASHBOARD;
        }
    }
}

export const searchService = new SearchService();
