import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';

vi.mock('../middleware/authMiddleware.js', () => ({
    authenticateToken: (req: any, res: any, next: any) => {
        req.user = { id: 'test-user', email: 'test@example.com' };
        next();
    }
}));

vi.mock('web-push', () => ({
    default: {
        setVapidDetails: vi.fn(),
        sendNotification: vi.fn().mockResolvedValue({}),
    }
}));

// Mock Context Middleware to provide Super Admin access
vi.mock('../middleware/contextMiddleware.js', () => ({
    contextMiddleware: (req: any, res: any, next: any) => {
        req.context = {
            userId: 'test-user',
            tenantId: 'c1',
            role: 'SUPERADMIN',
            permissions: ['*'],
            isSuperadmin: true
        };
        req.tenantId = 'c1'; // For legacy compat
        next();
    }
}));

import { getDb } from '../database.js';

vi.mock('../middleware/tenantMiddleware.js', () => ({
    tenantRoutingMiddleware: (req: any, res: any, next: any) => {
        try {
            req.tenantDb = getDb();
            req.tenantId = req.headers['x-tenant-id'] || req.headers['x-company-id'] || 'c1';
            next();
        } catch (e) {
            next();
        }
    },
    requireTenant: (req: any, res: any, next: any) => next()
}));

// Mock Permission Service to allow all actions
vi.mock('../services/permissionService.js', () => ({
    permissionService: {
        hasPermission: vi.fn().mockResolvedValue(true),
        getUserPermissions: vi.fn().mockResolvedValue(['*'])
    }
}));

// Mock Membership Service to allow tenant access
vi.mock('../services/membershipService.js', () => ({
    membershipService: {
        getMembership: vi.fn().mockResolvedValue({ status: 'active', role: 'admin' })
    }
}));

// Mock Email Service to prevent actual sending/failures
vi.mock('../services/emailService.js', () => ({
    emailService: {
        sendInvitation: vi.fn().mockResolvedValue({ success: true }),
        sendPasswordReset: vi.fn().mockResolvedValue({ success: true }),
        sendMessage: vi.fn().mockResolvedValue({ success: true })
    }
}));

// Mock Realtime Service
vi.mock('../services/realtimeService.js', () => ({
    realtimeService: {
        notifySystemAlert: vi.fn(),
        broadcastToUser: vi.fn(),
        broadcastToProject: vi.fn(),
        broadcastToCompany: vi.fn()
    }
}));

import app, { serverPromise } from '../index.js';
import { ensureDbInitialized } from '../database.js';

describe('API Integration Tests', () => {
    beforeAll(async () => {
        // Wait for the server to be fully initialized (DB, seeding, etc.)
        await serverPromise;
        // Also explicitly ensure local DB instance is ready if needed
        await ensureDbInitialized();
    });

    it('should return 404 for unknown routes', async () => {
        const res = await request(app).get('/api/unknown-route');
        expect(res.status).toBe(404);
        expect(res.body.status).toBe('fail');
    });

    it('POST /api/provisioning/companies should return 400 if name is missing', async () => {
        const res = await request(app)
            .post('/api/provisioning/companies')
            .send({
                // missing name
                plan: 'Enterprise'
            });

        expect(res.status).toBe(400);
    });

    it('POST /api/provisioning/companies should create a company with valid data', async () => {
        const res = await request(app)
            .post('/api/provisioning/companies')
            .send({
                company: {
                    name: 'Test Company ' + Date.now(),
                    plan: 'Pro'
                },
                owner: {
                    email: `test-${Date.now()}@example.com`,
                    name: 'Test Owner'
                }
            });

        expect(res.status).toBe(201);
        expect(res.body.data.company.id).toBeDefined();
    });

    it('GET /api/projects should return empty list (or filtered) initially', async () => {
        const res = await request(app).get('/api/projects').set('x-company-id', 'c1');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /api/projects should fail validation if name missing', async () => {
        const res = await request(app)
            .post('/api/projects')
            .set('x-company-id', 'c1')
            .send({
                description: 'Project without name'
            });

        expect(res.status).toBe(400); // Zod validation error
    });

    it('POST /api/projects should create project', async () => {
        const res = await request(app)
            .post('/api/projects')
            .set('x-company-id', 'c1')
            .send({
                name: 'New Skyscraper',
                status: 'Planning'
            });

        expect(res.status).toBe(201);
        expect(res.body.id).toBeDefined();
    });
});
