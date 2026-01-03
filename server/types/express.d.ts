import { Request } from 'express';

declare global {
    namespace Express {
        interface Request {
            userId?: string;
            tenantId?: string;
            userName?: string;
            user?: any;
            context?: {
                userId: string;
                tenantId: string;
                role: string;
            };
        }
    }
}
