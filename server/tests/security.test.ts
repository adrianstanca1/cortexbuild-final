import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import app, { serverPromise } from '../index.js';
import { ensureDbInitialized, getDb } from '../database.js';

// --- Dynamic Mocks for Security Testing ---

// 1. Mock Auth Middleware to parse "fake" tokens
vi.mock('../middleware/authMiddleware.js', () => ({
    authenticateToken: (req: any, res: any, next: any) => {
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                // We use JSON tokens for testing convenience: Bearer {"id":"u1","companyId":"c1"}
                const tokenStr = authHeader.split(' ')[1];
                const cleanToken = tokenStr.includes('%7B') ? decodeURIComponent(tokenStr) : tokenStr;

                if (cleanToken.startsWith('{')) {
                    req.user = JSON.parse(cleanToken);
                } else {
                    req.user = { id: 'test-user', companyId: 'c1' }; // Fallback
                }
            } catch (e) {
                return res.status(403).json({ error: 'Invalid test token' });
            }
        }
        next();
    }
}));

// 2. Mock Context Middleware to build context from req.user
vi.mock('../middleware/contextMiddleware.js', () => ({
    contextMiddleware: (req: any, res: any, next: any) => {
        if (req.user) {
            req.context = {
                userId: req.user.id,
                tenantId: req.user.companyId,
                role: req.user.role || 'USER',
                permissions: ['*'], // Simplified permissions
                isSuperadmin: req.user.role === 'SUPERADMIN'
            };
            req.tenantId = req.user.companyId;
        }
        next();
    }
}));

// 3. Mock Permission Service (Allow all for now, we focus on Tenant Isolation)
vi.mock('../services/permissionService.js', () => ({
    permissionService: {
        hasPermission: vi.fn().mockResolvedValue(true),
        getUserPermissions: vi.fn().mockResolvedValue(['*']),
        checkPermission: vi.fn().mockResolvedValue(true)
    }
}));

// 4. Mock Membership Service
vi.mock('../services/membershipService.js', () => ({
    membershipService: {
        getMembership: vi.fn().mockImplementation(async (userId, companyId) => {
            // Mock strict membership check: only allow if matches token
            if (userId.includes('user-a') && companyId === 'company-a') return { status: 'active', role: 'admin' };
            if (userId.includes('user-b') && companyId === 'company-b') return { status: 'active', role: 'admin' };
            if (userId.includes('super')) return { status: 'active', role: 'superadmin' };
            return null;
        })
    }
}));

// 5. Mock Tenant Service (For Quota Testing)
vi.mock('../services/tenantService.js', () => ({
    checkTenantLimits: vi.fn().mockImplementation(async (tenantId, resourceType) => {
        if (tenantId === 'company-quota-exceeded' && resourceType === 'projects') {
            return { allowed: false, current: 10, limit: 10 };
        }
        return { allowed: true, current: 5, limit: 100 };
    }),
    tenantService: {
        checkTenantLimits: vi.fn()
    }
}));


// Test Data IDs (Global Scope)
const COMPANY_A_ID = 'company-a';
const COMPANY_B_ID = 'company-b';
const PROJECT_A_ID = 'proj-a-1';
const PROJECT_B_ID = 'proj-b-1';
const API_URL = process.env.API_URL || 'http://localhost:5000';

// Global Tokens
let companyAToken: string;
let companyBToken: string;
let superadminToken: string;

describe('Security & Compliance Tests', () => {

    beforeAll(async () => {
        await serverPromise; // Wait for server setup
        await ensureDbInitialized();
        const db = getDb();

        // Seed Test Data
        // Users (Required for foreign key constraints in memberships)
        try { await db.run('INSERT INTO users (id, email, name, password, role, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['user-a', 'user-a@example.com', 'User A', 'hashed_pw', 'ADMIN', 'active', new Date().toISOString(), new Date().toISOString()]); } catch (e) { /* Ignore duplicate key errors */ }
        try { await db.run('INSERT INTO users (id, email, name, password, role, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['user-b', 'user-b@example.com', 'User B', 'hashed_pw', 'ADMIN', 'active', new Date().toISOString(), new Date().toISOString()]); } catch (e) { /* Ignore duplicate key errors */ }
        try { await db.run('INSERT INTO users (id, email, name, password, role, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['super-admin', 'admin@cortex.com', 'Super Admin', 'hashed_pw', 'SUPERADMIN', 'active', new Date().toISOString(), new Date().toISOString()]); } catch (e) { /* Ignore duplicate key errors */ }

        // Companies
        try { await db.run('INSERT INTO companies (id, name, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [COMPANY_A_ID, 'Company A', 'active', new Date().toISOString(), new Date().toISOString()]); } catch (e) { /* Ignore duplicate key errors */ }
        try { await db.run('INSERT INTO companies (id, name, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [COMPANY_B_ID, 'Company B', 'active', new Date().toISOString(), new Date().toISOString()]); } catch (e) { /* Ignore duplicate key errors */ }

        // Projects
        try { await db.run('INSERT INTO projects (id, companyId, name, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)', [PROJECT_A_ID, COMPANY_A_ID, 'Project A', 'Active', new Date().toISOString(), new Date().toISOString()]); } catch (e) { /* Ignore duplicate key errors */ }
        try { await db.run('INSERT INTO projects (id, companyId, name, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)', [PROJECT_B_ID, COMPANY_B_ID, 'Project B', 'Active', new Date().toISOString(), new Date().toISOString()]); } catch (e) { /* Ignore duplicate key errors */ }

        // Memberships (Required because validateActiveMembership middleware queries DB directly, bypassing service mock)
        try { await db.run('INSERT INTO memberships (id, userId, companyId, role, status, joinedAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['mem-a', 'user-a', COMPANY_A_ID, 'ADMIN', 'active', new Date().toISOString(), new Date().toISOString(), new Date().toISOString()]); } catch (e) { /* Ignore duplicate key errors */ }
        try { await db.run('INSERT INTO memberships (id, userId, companyId, role, status, joinedAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['mem-b', 'user-b', COMPANY_B_ID, 'ADMIN', 'active', new Date().toISOString(), new Date().toISOString(), new Date().toISOString()]); } catch (e) { /* Ignore duplicate key errors */ }

        // Generate "Mock Tokens" (JSON strings)
        companyAToken = JSON.stringify({ id: 'user-a', companyId: COMPANY_A_ID, role: 'ADMIN' });
        companyBToken = JSON.stringify({ id: 'user-b', companyId: COMPANY_B_ID, role: 'ADMIN' });
        superadminToken = JSON.stringify({ id: 'super-admin', companyId: 'system', role: 'SUPERADMIN' });
    });

    describe('Cross-Tenant Access Prevention', () => {
        it('should block access to other tenant\'s project', async () => {
            const response = await request(app)
                .get(`/api/projects/${PROJECT_B_ID}`)
                .set('Authorization', `Bearer ${companyAToken}`);

            // Expect 403 or 404 depending on how isolation is implemented (filtering vs blocking)
            expect([403, 404]).toContain(response.status);
        });

        it('should allow access to own tenant\'s project', async () => {
            const response = await request(app)
                .get(`/api/projects/${PROJECT_A_ID}`)
                .set('Authorization', `Bearer ${companyAToken}`);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(PROJECT_A_ID);
        });
    });

    describe('Request Body Validation', () => {
        it('should auto-correct companyId in request body', async () => {
            const res = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${companyAToken}`)
                .send({
                    name: 'Injection Attempt',
                    companyId: COMPANY_B_ID, // Malicious attempt
                    status: 'Active'
                });

            // If successful, it should have been created under Company A
            if (res.status === 201) {
                expect(res.body.companyId).toBe(COMPANY_A_ID);
            } else {
                // Or blocked entirely
                expect(res.status).toBeGreaterThanOrEqual(400);
            }
        });
    });

    describe('ID Enumeration Prevention', () => {
        it('should handle rapid requests gracefully', async () => {
            // Vitest might timeout if we do too many, let's do 3 to avoid hitting DB max_connections_per_hour
            const requests = Array(3).fill(0).map((_, i) =>
                request(app)
                    .get(`/api/projects/fake-id-${i}`)
                    .set('Authorization', `Bearer ${companyAToken}`)
            );

            const responses = await Promise.all(requests);
            // We just expect them to process without crashing/hanging
            responses.forEach(r => {
                expect([200, 404, 403, 429]).toContain(r.status);
            });
        });
    });
});

describe('Inactive Membership Validation', () => {
    it('should block access if membership is suspended', async () => {
        const db = getDb();
        // Update user-a membership to suspended
        await db.run("UPDATE memberships SET status = 'suspended' WHERE userId = 'user-a' AND companyId = ?", [COMPANY_A_ID]);

        const response = await request(app)
            .get(`/api/projects/${PROJECT_A_ID}`)
            .set('Authorization', `Bearer ${companyAToken}`);

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('No active membership in this tenant');

        // Reset for other tests
        await db.run("UPDATE memberships SET status = 'active' WHERE userId = 'user-a' AND companyId = ?", [COMPANY_A_ID]);
    });
});

describe('Tenant Resource Quota Enforcement', () => {
    it('should block project creation if quota exceeded', async () => {
        // We need a specific token for the quota exceeded tenant
        const quotaToken = JSON.stringify({ id: 'user-q', companyId: 'company-quota-exceeded', role: 'ADMIN' });

        const db = getDb();
        // Seed user-q (User Q) - Remove try/catch to ensure it works
        await db.run('INSERT INTO users (id, email, name, password, role, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['user-q', 'user-q@example.com', 'User Q', 'hashed_pw', 'ADMIN', 'active', new Date().toISOString(), new Date().toISOString()]);
        // Seed company-quota-exceeded
        await db.run('INSERT INTO companies (id, name, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', ['company-quota-exceeded', 'Company Q', 'active', new Date().toISOString(), new Date().toISOString()]);
        // Seed membership
        await db.run('INSERT INTO memberships (id, userId, companyId, role, status, joinedAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['mem-q', 'user-q', 'company-quota-exceeded', 'ADMIN', 'active', new Date().toISOString(), new Date().toISOString(), new Date().toISOString()]);

        // Attempt to create a project when limit is reached (mocked)
        const response = await request(app)
            .post('/api/projects')
            .set('Authorization', `Bearer ${quotaToken}`)
            .send({ name: 'Project Over Quota', status: 'Active' });

        expect(response.status).toBe(403);
        expect(response.body.error).toMatch(/limit exceeded/i);
    });
});

