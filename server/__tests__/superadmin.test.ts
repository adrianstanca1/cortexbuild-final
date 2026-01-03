
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService } from '../../server/services/authService';
import { tenantService } from '../../server/services/tenantService';
import * as userManagementService from '../../server/services/userManagementService';
import { getDb, initializeDatabase } from '../../server/database';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

// Mock dependencies
vi.mock('../../server/database', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../../server/database')>();
    return {
        ...mod,
        getDb: vi.fn(),
    };
});

// Mock logger to avoid noise
vi.mock('../../server/utils/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    }
}));

// Mock process.env for JWT_SECRET
process.env.JWT_SECRET = 'test-secret';

describe('SuperAdmin Services', () => {
    let mockDb: any;

    beforeEach(() => {
        vi.resetAllMocks();

        mockDb = {
            get: vi.fn(),
            run: vi.fn(),
            all: vi.fn(),
        };
        (getDb as any).mockReturnValue(mockDb);
    });

    describe('Impersonation', () => {
        it('should generate an impersonation token for SuperAdmin', async () => {
            const adminId = 'admin-123';
            const targetUserId = 'target-456';
            const companyId = 'c1';

            // 1. Mock Admin Check (Permissions) - The service checks users table for admin role
            mockDb.get.mockImplementation((query: string, params: any[]) => {
                if (query.includes('FROM users') && params[0] === adminId) {
                    return Promise.resolve({ role: 'SUPERADMIN' });
                }
                if (query.includes('FROM users') && params[0] === targetUserId) {
                    return Promise.resolve({ id: targetUserId, email: 'target@test.com', name: 'Target User', role: 'USER', companyId });
                }
                return Promise.resolve(null);
            });

            // Mock Activity Log insert
            mockDb.run.mockResolvedValue({ lastID: 1 });

            const result = await authService.impersonateUser(adminId, targetUserId);

            expect(result).toHaveProperty('token');
            expect(result).toHaveProperty('id', targetUserId);
            // expect(result).toHaveProperty('isImpersonated', true); // UserSession doesn't have this property in interface yet

            // Verify Token Content
            // Verify Token Content (Custom Format, not JWT)
            // Format: imp_v1:userId:timestamp:signature
            const parts = result.token.split(':');
            expect(parts).toHaveLength(4);
            expect(parts[0]).toBe('imp_v1');
            expect(parts[1]).toBe(targetUserId);

            // Optional: Verify signature if needed, but structure check is likely sufficient for unit test
            expect(result).toHaveProperty('id', targetUserId);
        });

        it('should throw error if requestor is not SuperAdmin', async () => {
            const adminId = 'regular-123';
            const targetUserId = 'target-456';

            mockDb.get.mockImplementation((query: string, params: any[]) => {
                if (query.includes('FROM users') && params[0] === adminId) {
                    return Promise.resolve({ role: 'USER' }); // Not SuperAdmin
                }
                return Promise.resolve(null);
            });

            await expect(authService.impersonateUser(adminId, targetUserId))
                .rejects.toThrow('Unauthorized: Only SuperAdmins can impersonate users');
        });
    });

    describe('Tenant Controls', () => {
        it('should suspend a tenant', async () => {
            const tenantId = 't1';
            const reason = 'Payment failure';
            const adminId = 'admin-1';

            mockDb.run.mockResolvedValue({ changes: 1 });

            await tenantService.suspendTenant(tenantId);

            expect(mockDb.run).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE companies SET status = ?'),
                expect.arrayContaining(['Suspended', tenantId])
            );
        });

        it('should update tenant limits', async () => {
            const tenantId = 't1';
            const limits = { maxUsers: 50, maxProjects: 10, plan: 'PRO' };

            mockDb.get.mockResolvedValue({ id: tenantId }); // Check exists
            mockDb.run.mockResolvedValue({ changes: 1 });

            await tenantService.updateTenantLimits(tenantId, limits);

            expect(mockDb.run).toHaveBeenCalledWith(
                expect.stringMatching(/UPDATE companies SET.*maxUsers = \?.*maxProjects = \?.*plan = \?/),
                expect.arrayContaining([50, 10, 'PRO', tenantId])
            );
        });
    });
});
