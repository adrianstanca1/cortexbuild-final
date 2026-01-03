import { v4 as uuidv4 } from 'uuid';
import { BaseTenantService } from './baseTenantService.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

/**
 * TeamService
 * Handles all team member operations with strict tenant isolation
 */
export class TeamService extends BaseTenantService {
    constructor() {
        super('TeamService');
    }

    /**
     * Get all team members for a tenant
     */
    async getTeamMembers(userId: string, tenantId: string) {
        await this.validateTenantAccess(userId, tenantId);

        const db = this.getDb();
        const members = await db.all(
            'SELECT * FROM team WHERE companyId = ? ORDER BY name ASC',
            [tenantId]
        );

        return members.map(m => ({
            ...m,
            skills: m.skills ? JSON.parse(m.skills) : [],
            certifications: m.certifications ? JSON.parse(m.certifications) : [],
        }));
    }

    /**
     * Get a single team member by ID
     */
    async getTeamMember(userId: string, tenantId: string, memberId: string) {
        const db = this.getDb();
        await this.validateTenantAccess(userId, tenantId);
        await this.validateResourceTenant(db, 'team', memberId, tenantId);

        const member = await db.get(
            'SELECT * FROM team WHERE id = ? AND companyId = ?',
            [memberId, tenantId]
        );

        if (!member) {
            throw new AppError('Team member not found', 404);
        }

        return {
            ...member,
            skills: member.skills ? JSON.parse(member.skills) : [],
            certifications: member.certifications ? JSON.parse(member.certifications) : [],
        };
    }

    /**
     * Create a new team member
     */
    async createTeamMember(userId: string, tenantId: string, memberData: any) {
        await this.validateTenantAccess(userId, tenantId);

        const db = this.getDb();
        const id = memberData.id || uuidv4();

        const member = {
            ...memberData,
            id,
            companyId: tenantId, // Force tenant ID
        };

        const skills = member.skills ? JSON.stringify(member.skills) : null;
        const certifications = member.certifications ? JSON.stringify(member.certifications) : null;

        await db.run(
            `INSERT INTO team (
        id, companyId, name, initials, role, status, projectId, projectName,
        phone, color, email, bio, location, skills, certifications,
        performanceRating, completedProjects, joinDate, hourlyRate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, tenantId, member.name, member.initials, member.role, member.status,
                member.projectId, member.projectName, member.phone, member.color,
                member.email, member.bio, member.location, skills, certifications,
                member.performanceRating, member.completedProjects, member.joinDate,
                member.hourlyRate
            ]
        );

        await this.auditAction(db, 'create', userId, tenantId, 'team', id, { name: member.name });

        logger.info(`Team member created: ${id} in tenant ${tenantId}`);
        return this.getTeamMember(userId, tenantId, id);
    }

    /**
     * Update a team member
     */
    async updateTeamMember(userId: string, tenantId: string, memberId: string, updates: any) {
        const db = this.getDb();
        await this.validateTenantAccess(userId, tenantId);
        await this.validateResourceTenant(db, 'team', memberId, tenantId);

        // Serialize JSON fields
        if (updates.skills) updates.skills = JSON.stringify(updates.skills);
        if (updates.certifications) updates.certifications = JSON.stringify(updates.certifications);

        const fields: string[] = [];
        const values: any[] = [];

        for (const [key, value] of Object.entries(updates)) {
            if (key !== 'id' && key !== 'companyId') {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (fields.length === 0) {
            throw new AppError('No fields to update', 400);
        }

        values.push(memberId);
        values.push(tenantId);

        await db.run(
            `UPDATE team SET ${fields.join(', ')} WHERE id = ? AND companyId = ?`,
            values
        );

        await this.auditAction(db, 'update', userId, tenantId, 'team', memberId, updates);

        logger.info(`Team member updated: ${memberId} in tenant ${tenantId}`);
        return this.getTeamMember(userId, tenantId, memberId);
    }

    /**
     * Delete a team member
     */
    async deleteTeamMember(userId: string, tenantId: string, memberId: string) {
        const db = this.getDb();
        await this.validateTenantAccess(userId, tenantId);
        await this.validateResourceTenant(db, 'team', memberId, tenantId);

        const result = await db.run(
            'DELETE FROM team WHERE id = ? AND companyId = ?',
            [memberId, tenantId]
        );

        if (result.changes === 0) {
            throw new AppError('Team member not found', 404);
        }

        await this.auditAction(db, 'delete', userId, tenantId, 'team', memberId);

        logger.info(`Team member deleted: ${memberId} from tenant ${tenantId}`);
        return { success: true, id: memberId };
    }
}

export const teamService = new TeamService();
export default teamService;
