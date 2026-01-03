import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tenantService } from '../services/tenantService.js';
import { auditService } from '../services/auditService.js';

// Mock the database to prevent actual writes
vi.mock('../database.js', () => ({
    getDb: () => ({
        run: vi.fn().mockResolvedValue({ lastID: 'test-id', changes: 1 }),
        get: vi.fn().mockResolvedValue({ id: 'test-id', name: 'Test Tenant' }),
        all: vi.fn().mockResolvedValue([]),
    })
}));

describe('Audit Trail Verification', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should log audit event when tenant is created', async () => {
        const auditSpy = vi.spyOn(auditService, 'log').mockResolvedValue(undefined);

        const tenantData = {
            name: 'Audit Test Tenant',
            plan: 'Pro'
        };

        await tenantService.createTenant(tenantData);

        expect(auditSpy).toHaveBeenCalledTimes(1);
        expect(auditSpy).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
            action: 'TenantService.createTenant',
            resource: 'companies',
            metadata: expect.objectContaining({ name: 'Audit Test Tenant' })
        }));
    });

    it('should log audit event when tenant is updated', async () => {
        const auditSpy = vi.spyOn(auditService, 'log').mockResolvedValue(undefined);

        await tenantService.updateTenant('test-id', { name: 'Updated Name' });

        expect(auditSpy).toHaveBeenCalledTimes(1);
        expect(auditSpy).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
            action: 'TenantService.updateTenant',
            resource: 'companies',
            resourceId: 'test-id'
        }));
    });
});
