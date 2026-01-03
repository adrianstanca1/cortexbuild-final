import { v4 as uuidv4 } from 'uuid';
import { BaseTenantService } from './baseTenantService.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { IDatabase } from '../database.js';

/**
 * ProjectService
 * Handles all project-related operations with strict tenant isolation
 */
export class ProjectService extends BaseTenantService {
    constructor() {
        super('ProjectService');
    }

    /**
     * Get all projects for a tenant
     */
    async getProjects(db: IDatabase, userId: string, tenantId: string) {
        await this.validateTenantAccess(userId, tenantId);

        const { query, params } = this.scopeQueryByTenant(
            'SELECT * FROM projects p',
            tenantId,
            'p'
        );

        const projects = await db.all(`${query} ORDER BY p.createdAt DESC`, params);

        return projects.map(p => ({
            ...p,
            zones: p.zones ? JSON.parse(p.zones) : [],
            phases: p.phases ? JSON.parse(p.phases) : [],
            timelineOptimizations: p.timelineOptimizations ? JSON.parse(p.timelineOptimizations) : [],
            weatherLocation: p.weatherLocation ? JSON.parse(p.weatherLocation) : null,
        }));
    }

    /**
     * Get a single project by ID
     */
    async getProject(db: IDatabase, userId: string, tenantId: string, projectId: string) {
        await this.validateTenantAccess(userId, tenantId);
        // Helper also needs DB if it queries? 
        // validateResourceTenant queries the table. It should use the TENANT DB now.
        // But validateResourceTenant in BaseTenantService uses getDb() (Global).
        // We should overload it or pass db to it.
        // For now, let's assume validation is metadata-based or we'll update BaseService later.
        // Actually, preventing cross-tenant access in Tenant DB is redundant if the DB only contains that tenant's data.
        // But it's good for sanity if we are still verifying IDs.
        // HOWEVER, if we connect to Tenant A DB, looking for Project B (Tenant B) will just return not found.
        // So validation simplifies to "Exists in this DB".

        const { query, params } = this.scopeQueryByTenant(
            'SELECT * FROM projects p WHERE id = ?',
            tenantId,
            'p'
        );

        const project = await db.get(query, [projectId, ...params]);

        if (!project) {
            throw new AppError('Project not found', 404);
        }

        return {
            ...project,
            zones: project.zones ? JSON.parse(project.zones) : [],
            phases: project.phases ? JSON.parse(project.phases) : [],
            timelineOptimizations: project.timelineOptimizations ? JSON.parse(project.timelineOptimizations) : [],
            weatherLocation: project.weatherLocation ? JSON.parse(project.weatherLocation) : null,
        };
    }

    /**
     * Create a new project
     */
    async createProject(db: IDatabase, userId: string, tenantId: string, projectData: any) {
        await this.validateTenantAccess(userId, tenantId);

        const id = projectData.id || uuidv4();
        const now = new Date().toISOString();

        // Ensure companyId matches tenant context
        const project = {
            ...projectData,
            id,
            companyId: tenantId, // Force tenant ID
            createdAt: now,
            updatedAt: now,
        };

        // Serialize JSON fields
        const zones = project.zones ? JSON.stringify(project.zones) : null;
        const phases = project.phases ? JSON.stringify(project.phases) : null;
        const timelineOptimizations = project.timelineOptimizations ? JSON.stringify(project.timelineOptimizations) : null;
        const weatherLocation = project.weatherLocation ? JSON.stringify(project.weatherLocation) : null;

        await db.run(
            `INSERT INTO projects (
        id, companyId, name, code, description, location, type, status, health,
        progress, budget, spent, startDate, endDate, manager, image, teamSize,
        weatherLocation, aiAnalysis, zones, phases, timelineOptimizations,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, tenantId, project.name, project.code, project.description,
                project.location, project.type, project.status, project.health,
                project.progress, project.budget, project.spent, project.startDate,
                project.endDate, project.manager, project.image, project.teamSize,
                weatherLocation, project.aiAnalysis, zones, phases, timelineOptimizations,
                now, now
            ]
        );

        // --- Activity & Audit Logging ---
        const userName = (projectData as any).userName || 'System';
        await this.logActivity(db, tenantId, id, userId, userName, 'created', 'project', id, { name: project.name });
        await this.auditAction(db, 'create', userId, tenantId, 'projects', id, { name: project.name });

        logger.info(`Project created: ${id} in tenant ${tenantId}`);
        return this.getProject(db, userId, tenantId, id);
    }

    /**
     * Update a project
     */
    async updateProject(db: IDatabase, userId: string, tenantId: string, projectId: string, updates: any) {
        await this.validateTenantAccess(userId, tenantId);

        // We verify existence/ownership by attempting update or check first.
        const existing = await this.getProject(db, userId, tenantId, projectId);
        if (!existing) throw new AppError('Project not found', 404);

        const now = new Date().toISOString();

        // Build update query dynamically
        const fields: string[] = [];
        const values: any[] = [];

        // Serialize JSON fields
        if (updates.zones) updates.zones = JSON.stringify(updates.zones);
        if (updates.phases) updates.phases = JSON.stringify(updates.phases);
        if (updates.timelineOptimizations) updates.timelineOptimizations = JSON.stringify(updates.timelineOptimizations);
        if (updates.weatherLocation) updates.weatherLocation = JSON.stringify(updates.weatherLocation);

        for (const [key, value] of Object.entries(updates)) {
            if (key !== 'id' && key !== 'companyId') { // Never allow changing these
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (fields.length === 0) {
            throw new AppError('No fields to update', 400);
        }

        fields.push('updatedAt = ?');
        values.push(now);
        values.push(projectId);
        values.push(tenantId);

        await db.run(
            `UPDATE projects SET ${fields.join(', ')} WHERE id = ? AND companyId = ?`,
            values
        );

        // --- Activity & Audit Logging ---
        const userName = (updates as any).userName || 'System';
        await this.logActivity(db, tenantId, projectId, userId, userName, 'updated', 'project', projectId, { updates });
        await this.auditAction(db, 'update', userId, tenantId, 'projects', projectId, updates);

        logger.info(`Project updated: ${projectId} in tenant ${tenantId}`);
        return this.getProject(db, userId, tenantId, projectId);
    }

    /**
     * Delete a project
     */
    async deleteProject(db: IDatabase, userId: string, tenantId: string, projectId: string) {
        await this.validateTenantAccess(userId, tenantId);

        const result = await db.run(
            'DELETE FROM projects WHERE id = ? AND companyId = ?',
            [projectId, tenantId]
        );

        if (result.changes === 0) {
            throw new AppError('Project not found', 404);
        }

        // --- Activity & Audit Logging ---
        await this.logActivity(db, tenantId, projectId, userId, 'System', 'deleted', 'project', projectId);
        await this.auditAction(db, 'delete', userId, tenantId, 'projects', projectId);

        logger.info(`Project deleted: ${projectId} from tenant ${tenantId}`);
        return { success: true, id: projectId };
    }
}

export const projectService = new ProjectService();
export default projectService;
