/**
 * Third-Party Integration Hooks
 * 
 * Provides integration interfaces for popular construction management platforms.
 * These hooks provide a consistent API for syncing data with external systems.
 */

import { useState, useCallback } from 'react';
import { db } from '@/services/db';

// ============================================================================
// Procore Integration
// ============================================================================

interface ProcoreConfig {
    clientId: string;
    clientSecret: string;
    companyId: string;
    accessToken?: string;
}

interface ProcoreProject {
    id: number;
    name: string;
    project_number: string;
    address: string;
    active: boolean;
}

export const useProcoreIntegration = (config: ProcoreConfig) => {
    const [isConnected, setIsConnected] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    /**
     * Authenticate with Procore API
     */
    const connect = useCallback(async () => {
        try {
            const response = await fetch('https://api.procore.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    grant_type: 'client_credentials',
                    client_id: config.clientId,
                    client_secret: config.clientSecret,
                }),
            });

            const data = await response.json();

            if (data.access_token) {
                setIsConnected(true);
                return { success: true, token: data.access_token };
            }

            return { success: false, error: 'Authentication failed' };
        } catch (error) {
            console.error('Procore connection error:', error);
            return { success: false, error: String(error) };
        }
    }, [config]);

    /**
     * Sync projects from Procore to BuildPro
     */
    const syncProjects = useCallback(async () => {
        if (!isConnected) {
            return { success: false, error: 'Not connected to Procore' };
        }

        setSyncing(true);
        try {
            // Fetch projects from Procore
            const response = await fetch(
                `https://api.procore.com/rest/v1.0/projects?company_id=${config.companyId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${config.accessToken}`,
                        'Procore-Company-Id': config.companyId,
                    },
                }
            );

            const procoreProjects: ProcoreProject[] = await response.json();

            // Sync to BuildPro
            for (const project of procoreProjects) {
                await db.syncProject({
                    name: project.name,
                    externalId: `procore_${project.id}`,
                    client: project.project_number,
                    location: project.address,
                    status: project.active ? 'Active' : 'Completed',
                });
            }

            setLastSync(new Date());
            return { success: true, count: procoreProjects.length };
        } catch (error) {
            console.error('Procore sync error:', error);
            return { success: false, error: String(error) };
        } finally {
            setSyncing(false);
        }
    }, [isConnected, config]);

    /**
     * Push BuildPro task to Procore
     */
    const pushTask = useCallback(async (task: any, procoreProjectId: number) => {
        if (!isConnected) return { success: false, error: 'Not connected' };

        try {
            const response = await fetch(
                `https://api.procore.com/rest/v1.0/projects/${procoreProjectId}/todos`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${config.accessToken}`,
                        'Procore-Company-Id': config.companyId,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        todo: {
                            title: task.title,
                            description: task.description,
                            due_date: task.dueDate,
                            assignee_id: task.procoreAssigneeId,
                        },
                    }),
                }
            );

            const data = await response.json();
            return { success: true, id: data.id };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }, [isConnected, config]);

    return {
        isConnected,
        syncing,
        lastSync,
        connect,
        syncProjects,
        pushTask,
    };
};

// ============================================================================
// PlanGrid Integration
// ============================================================================

interface PlanGridConfig {
    apiKey: string;
    accountId: string;
}

interface PlanGridSheet {
    uid: string;
    name: string;
    number: string;
    version_number: number;
    deleted: boolean;
}

export const usePlanGridIntegration = (config: PlanGridConfig) => {
    const [isConnected, setIsConnected] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    /**
     * Verify PlanGrid API access
     */
    const connect = useCallback(async () => {
        try {
            const response = await fetch('https://io.plangrid.com/api/v1/projects', {
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                },
            });

            if (response.ok) {
                setIsConnected(true);
                return { success: true };
            }

            return { success: false, error: 'Invalid API key' };
        } catch (error) {
            console.error('PlanGrid connection error:', error);
            return { success: false, error: String(error) };
        }
    }, [config.apiKey]);

    /**
     * Sync sheets/drawings from PlanGrid
     */
    const syncSheets = useCallback(async (projectId: string) => {
        if (!isConnected) {
            return { success: false, error: 'Not connected to PlanGrid' };
        }

        setSyncing(true);
        try {
            const response = await fetch(
                `https://io.plangrid.com/api/v1/projects/${projectId}/sheets`,
                {
                    headers: {
                        'Authorization': `Bearer ${config.apiKey}`,
                    },
                }
            );

            const sheets: PlanGridSheet[] = await response.json();

            // Sync to BuildPro as documents
            for (const sheet of sheets.filter(s => !s.deleted)) {
                await db.addDocument({
                    name: sheet.name,
                    type: 'Other',
                    externalId: `plangrid_${sheet.uid}`,
                    version: String(sheet.version_number),
                    number: sheet.number,
                });
            }

            setLastSync(new Date());
            return { success: true, count: sheets.length };
        } catch (error) {
            console.error('PlanGrid sync error:', error);
            return { success: false, error: String(error) };
        } finally {
            setSyncing(false);
        }
    }, [isConnected, config.apiKey]);

    /**
     * Create RFI in PlanGrid
     */
    const createRFI = useCallback(async (projectId: string, rfi: any) => {
        if (!isConnected) return { success: false, error: 'Not connected' };

        try {
            const response = await fetch(
                `https://io.plangrid.com/api/v1/projects/${projectId}/rfis`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${config.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        question: rfi.question,
                        subject: rfi.subject,
                        due_date: rfi.dueDate,
                    }),
                }
            );

            const data = await response.json();
            return { success: true, uid: data.uid };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }, [isConnected, config.apiKey]);

    return {
        isConnected,
        syncing,
        lastSync,
        connect,
        syncSheets,
        createRFI,
    };
};

// ============================================================================
// Generic Webhook Integration
// ============================================================================

export const useWebhookIntegration = () => {
    const [webhooks, setWebhooks] = useState<any[]>([]);

    /**
     * Register a webhook for external system
     */
    const registerWebhook = useCallback(async (config: {
        name: string;
        url: string;
        events: string[];
        secret?: string;
    }) => {
        try {
            const webhook = await db.registerWebhook(config);
            setWebhooks(prev => [...prev, webhook]);
            return { success: true, webhook };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }, []);

    /**
     * Trigger webhook manually
     */
    const triggerWebhook = useCallback(async (webhookId: string, payload: any) => {
        try {
            await db.triggerWebhook(webhookId, payload);
            return { success: true };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }, []);

    return {
        webhooks,
        registerWebhook,
        triggerWebhook,
    };
};
