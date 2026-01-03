import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
    userId?: string;
    userName?: string;
    tenantId?: string;
    user?: any;
    tenantDb?: any; // Avoiding IDatabase import loop, type as any or import interface
    context?: {
        userId: string;
        userName?: string;
        tenantId: string;
        role: string;
        permissions?: string[];
        isSuperadmin?: boolean;
    };
}
