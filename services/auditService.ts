import { supabase } from '@/services/supabaseClient';

const VITE_API_URL = import.meta.env.VITE_API_URL || '';
const API_URL = (VITE_API_URL.endsWith('/api') ? VITE_API_URL : `${VITE_API_URL}/api`).replace(/\/$/, '') + '/v1';

export interface AuditLog {
    id: string;
    timestamp: string;
    action: string;
    actor: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
    resource: {
        type: string;
        id: string;
        name?: string;
    };
    details: any;
    metadata: any;
    ip_address?: string;
    status: 'success' | 'failure' | 'warning';
}

export interface AuditStats {
    totalEvents: number;
    uniqueActors: number;
    topActions: { action: string; count: number }[];
    activityByDay: { date: string; count: number }[];
}

const getAuthHeaders = async (): Promise<HeadersInit> => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
};

export const auditService = {
    /**
     * Get company audit timeline
     */
    getCompanyTimeline: async (companyId: string, params: {
        limit?: number;
        offset?: number;
        action?: string;
        actor?: string;
        since?: string;
    } = {}) => {
        const queryParams = new URLSearchParams();
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.offset) queryParams.append('offset', params.offset.toString());
        if (params.action) queryParams.append('action', params.action);
        if (params.actor) queryParams.append('actor', params.actor);
        if (params.since) queryParams.append('since', params.since);

        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/audit/companies/${companyId}/timeline?${queryParams.toString()}`, {
            headers
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch audit timeline: ${response.statusText}`);
        }
        return await response.json();
    },

    /**
     * Get audit statistics
     */
    getAuditStats: async (companyId: string, period: '24h' | '7d' | '30d' = '7d') => {
        const queryParams = new URLSearchParams({ period });
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/audit/companies/${companyId}/stats?${queryParams.toString()}`, {
            headers
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch audit stats: ${response.statusText}`);
        }
        return await response.json();
    },

    /**
     * Export audit logs
     */
    exportAuditLogs: async (companyId: string, format: 'json' | 'csv' = 'csv') => {
        const queryParams = new URLSearchParams({ format });
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/audit/companies/${companyId}/export?${queryParams.toString()}`, {
            headers
        });

        if (!response.ok) {
            throw new Error(`Failed to export audit logs: ${response.statusText}`);
        }
        return await response.blob();
    }
};
