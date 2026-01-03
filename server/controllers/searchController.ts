import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.js';
import { AppError } from '../utils/AppError.js';
import { BucketRegistry } from '../buckets/DataBucket.js';
import { getDb } from '../database.js';

/**
 * Search Controller
 * Handles global search across all entities (Projects, Tasks, Documents)
 */

interface SearchResult {
    type: 'project' | 'task' | 'document';
    id: string;
    title: string;
    description?: string;
    url?: string; // For documents or frontend routing
    metadata?: any;
    relevance: number;
}

export const searchAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        const { q } = req.query;

        if (!tenantId) {
            throw new AppError('Tenant ID required', 401);
        }

        if (!q || typeof q !== 'string' || q.length < 2) {
            return res.json({ success: true, data: [] });
        }

        const isSuperAdmin = req.user?.role === 'SUPERADMIN';
        const isGlobal = isSuperAdmin && req.query.global === 'true';

        // Use main DB for global search, otherwise use tenant-specific DB
        const db = isGlobal ? getDb() : req.tenantDb;
        if (!db) throw new AppError('Database connection failed', 500);

        const query = `%${q}%`;
        const results: SearchResult[] = [];

        // 1. Search Projects
        const projectSql = isGlobal
            ? `SELECT id, name, description, status, companyId FROM projects WHERE name LIKE ? OR description LIKE ? LIMIT 10`
            : `SELECT id, name, description, status FROM projects WHERE name LIKE ? OR description LIKE ? LIMIT 5`;

        const projects = await db.all(projectSql, [query, query]);

        projects.forEach(p => {
            results.push({
                type: 'project',
                id: p.id,
                title: p.name,
                description: p.description,
                metadata: { status: p.status, companyId: p.companyId },
                relevance: p.name.toLowerCase().includes(q.toLowerCase()) ? 10 : 5
            });
        });

        // 2. Search Tasks
        const taskSql = isGlobal
            ? `SELECT id, title, description, status, projectId, companyId FROM tasks WHERE title LIKE ? OR description LIKE ? LIMIT 10`
            : `SELECT id, title, description, status, projectId FROM tasks WHERE title LIKE ? OR description LIKE ? LIMIT 5`;

        const tasks = await db.all(taskSql, [query, query]);

        tasks.forEach(t => {
            results.push({
                type: 'task',
                id: t.id,
                title: t.title,
                description: t.description,
                metadata: { status: t.status, projectId: t.projectId, companyId: t.companyId },
                relevance: t.title.toLowerCase().includes(q.toLowerCase()) ? 9 : 4
            });
        });

        // 3. Search Documents
        const docSql = isGlobal
            ? `SELECT id, name, category, url, companyId FROM documents WHERE name LIKE ? LIMIT 10`
            : `SELECT id, name, category, url FROM documents WHERE name LIKE ? LIMIT 5`;

        const documents = await db.all(docSql, [query]);

        documents.forEach(d => {
            results.push({
                type: 'document',
                id: d.id,
                title: d.name,
                description: d.category,
                url: d.url,
                metadata: { companyId: d.companyId },
                relevance: d.name.toLowerCase().includes(q.toLowerCase()) ? 8 : 4
            });
        });

        // Sort by relevance
        results.sort((a, b) => b.relevance - a.relevance);

        res.json({ success: true, query: q, count: results.length, data: results });
    } catch (error) {
        next(error);
    }
};
