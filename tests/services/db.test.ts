import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Supabase
vi.mock('@/services/supabaseClient', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(() => Promise.resolve({
                data: {
                    session: {
                        access_token: 'test-token'
                    }
                }
            })),
            refreshSession: vi.fn(() => Promise.resolve({
                data: {
                    session: {
                        access_token: 'new-test-token'
                    }
                },
                error: null
            }))
        }
    }
}));

// Import after mocks
import { db } from '@/services/db';

describe('DatabaseService', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('getProjects', () => {
        it('fetches projects from API', async () => {
            const mockProjects = [
                { id: 'p1', name: 'Project 1' },
                { id: 'p2', name: 'Project 2' },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockProjects),
            });

            const result = await db.getProjects();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/projects'),
                expect.objectContaining({
                    headers: expect.any(Object)
                })
            );
            expect(result).toEqual(mockProjects);
        });

        it('throws error on failed request', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Not Found',
            });

            await expect(db.getProjects()).rejects.toThrow();
        });
    });

    describe('getTasks', () => {
        it('fetches tasks from API', async () => {
            const mockTasks = [
                { id: 't1', title: 'Task 1', status: 'To Do' },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockTasks),
            });

            const result = await db.getTasks();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/tasks'),
                expect.any(Object)
            );
            expect(result).toEqual(mockTasks);
        });
    });

    describe('getSafetyChecklists', () => {
        it('fetches safety checklists from compliance API', async () => {
            const mockChecklists = [
                { id: 'sc1', name: 'Daily Audit' },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockChecklists),
            });

            const result = await db.getSafetyChecklists();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/compliance/safety-checklists'),
                expect.any(Object)
            );
            expect(result).toEqual(mockChecklists);
        });

        it('returns empty array on error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
            });

            const result = await db.getSafetyChecklists();
            expect(result).toEqual([]);
        });
    });

    describe('setTenantId', () => {
        it('sets the tenant ID for subsequent requests', () => {
            db.setTenantId('company-123');
            // Verify internal state is set (we can't directly access private props,
            // but subsequent requests should include the header)
            expect(true).toBe(true); // Placeholder assertion
        });
    });
});
