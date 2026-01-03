import { getDb } from '../database.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

export interface IntegrationConfig {
    id: string;
    companyId: string;
    type: 'procore' | 'plangrid' | 'autodesk';
    status: 'connected' | 'disconnected' | 'error';
    accessToken?: string;
    refreshToken?: string;
    lastSyncedAt?: string;
    settings?: string; // JSON
}

export class IntegrationService {
    /**
     * Get integration for a tenant
     */
    static async getIntegration(companyId: string, type: string) {
        const db = getDb();
        return await db.get('SELECT * FROM integrations WHERE companyId = ? AND type = ?', [companyId, type]);
    }

    /**
     * Connect or update integration
     */
    static async connectIntegration(companyId: string, type: string, tokens: { access: string, refresh?: string }) {
        const db = getDb();
        const existing = await this.getIntegration(companyId, type);
        const id = existing?.id || uuidv4();
        const now = new Date().toISOString();

        if (existing) {
            await db.run(
                'UPDATE integrations SET accessToken = ?, refreshToken = ?, status = ?, lastSyncedAt = ? WHERE id = ?',
                [tokens.access, tokens.refresh, 'connected', now, id]
            );
        } else {
            await db.run(
                'INSERT INTO integrations (id, companyId, type, status, accessToken, refreshToken, lastSyncedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [id, companyId, type, 'connected', tokens.access, tokens.refresh, now]
            );
        }

        return { id, type, status: 'connected' };
    }

    /**
     * Mock sync Project data from external tool
     */
    static async syncProjectData(companyId: string, type: string, externalProjectId: string) {
        // In a real app, this would call the external API (e.g. Procore Projects API)
        // For this hardening phase, we provide the architectural plumbing
        const integration = await this.getIntegration(companyId, type);
        if (!integration || integration.status !== 'connected') {
            throw new Error(`Integration ${type} not connected for company ${companyId}`);
        }

        logger.info(`[Integration] Syncing project ${externalProjectId} from ${type}...`);

        // Mock success response
        return {
            success: true,
            syncedItems: 12,
            type: 'projects',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Map external data to BuildPro schema
     */
    static mapExternalTask(externalTask: any, provider: string) {
        if (provider === 'procore') {
            return {
                title: externalTask.name,
                description: externalTask.description,
                status: externalTask.status === 'open' ? 'in_progress' : 'completed',
                externalId: externalTask.id
            };
        }
        return externalTask;
    }
}
