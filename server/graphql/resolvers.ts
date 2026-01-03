import { getDb } from '../database.js';
import { AppError } from '../utils/AppError.js';
import { v4 as uuidv4 } from 'uuid';

export const resolvers = {
    Query: {
        me: (parent: any, args: any, context: any) => {
            if (!context.user) throw new AppError('Not authenticated', 401);
            return context.user;
        },
        projects: async (parent: any, args: any, context: any) => {
            const { tenantId } = context;
            if (!tenantId) throw new AppError('Tenant ID required', 401);

            const db = getDb();
            return await db.all('SELECT * FROM projects WHERE companyId = ?', [tenantId]);
        },
        project: async (parent: any, { id }: any, context: any) => {
            const { tenantId } = context;
            if (!tenantId) throw new AppError('Tenant ID required', 401);

            const db = getDb();
            return await db.get('SELECT * FROM projects WHERE id = ? AND companyId = ?', [id, tenantId]);
        },
        tasks: async (parent: any, { projectId }: any, context: any) => {
            const { tenantId } = context;
            if (!tenantId) throw new AppError('Tenant ID required', 401);

            const db = getDb();
            return await db.all('SELECT * FROM tasks WHERE projectId = ? AND companyId = ?', [projectId, tenantId]);
        },
    },
    Mutation: {
        createProject: async (parent: any, { name, description, budget }: any, context: any) => {
            const { tenantId, userId } = context;
            if (!tenantId) throw new AppError('Tenant ID required', 401);

            const db = getDb();
            const id = uuidv4();
            const status = 'active';
            const progress = 0;
            const spent = 0;
            const createdAt = new Date().toISOString();

            await db.run(
                `INSERT INTO projects (id, name, description, status, progress, budget, spent, companyId, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, name, description, status, progress, budget, spent, tenantId, createdAt]
            );

            return { id, name, description, status, progress, budget, spent, companyId: tenantId };
        },
        updateProjectStatus: async (parent: any, { id, status }: any, context: any) => {
            const { tenantId } = context;
            if (!tenantId) throw new AppError('Tenant ID required', 401);

            const db = getDb();
            const result = await db.run(
                'UPDATE projects SET status = ? WHERE id = ? AND companyId = ?',
                [status, id, tenantId]
            );

            if (result.changes === 0) throw new AppError('Project not found or unauthorized', 404);

            return await db.get('SELECT * FROM projects WHERE id = ?', [id]);
        }
    }
};
