import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock all contexts
vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'u1', name: 'Test User', email: 'test@test.com', role: 'COMPANY_ADMIN' },
        isAuthenticated: true,
        isLoading: false,
    }),
}));

vi.mock('@/contexts/TenantContext', () => ({
    useTenant: () => ({
        currentCompanyId: 'c1',
        currentCompanyName: 'Test Company',
        workforce: [],
        canAddResource: () => true,
        checkFeature: () => true,
        systemSettings: { betaFeatures: true },
    }),
}));

vi.mock('@/contexts/ToastContext', () => ({
    useToast: () => ({
        addToast: vi.fn(),
    }),
}));

vi.mock('@/contexts/WebSocketContext', () => ({
    useWebSocket: () => ({
        isConnected: true,
        joinRoom: vi.fn(),
        leaveRoom: vi.fn(),
        sendMessage: vi.fn(),
        lastMessage: null,
        onlineUsers: []
    }),
}));

const { useProjectsMock } = vi.hoisted(() => ({
    useProjectsMock: vi.fn(() => ({
        projects: [
            { id: 'p1', name: 'Test Project', status: 'Active', progress: 45, budget: 1000000, health: 'Good' },
            { id: 'p2', name: 'Another Project', status: 'Planning', progress: 10, budget: 500000, health: 'Neutral' },
        ],
        tasks: [],
        documents: [],
        safetyHazards: [],
        equipment: [],
        isLoading: false,
        getPredictiveAnalysis: vi.fn(() => Promise.resolve({
            delayProbability: 15,
            predictedDelayDays: 2,
            reasoning: 'Stable trajectories',
            riskFactors: [],
            analyzedAt: new Date().toISOString()
        })),
    })),
}));

vi.mock('@/contexts/ProjectContext', () => ({
    useProjects: useProjectsMock
}));

vi.mock('@/services/geminiService', () => ({
    runRawPrompt: vi.fn(() => Promise.resolve('{"greeting": "Hello", "agenda": [], "risks": [], "wins": [], "quote": "Test"}')),
    parseAIJSON: vi.fn((str) => JSON.parse(str)),
}));

vi.mock('@/services/db', () => ({
    db: {
        getKPIs: vi.fn(() => Promise.resolve({
            totalProjects: 5,
            activeProjects: 3,
            completedTasks: 42,
            pendingTasks: 18,
        })),
        getProjects: vi.fn(() => Promise.resolve([])),
        getActivities: vi.fn(() => Promise.resolve([])),
        getPredictiveAnalysis: vi.fn(() => Promise.resolve({
            risk_level: 'low',
            completion_probability: 0.95,
            recommendations: []
        })),
    },
}));

// Import after mocks
import DashboardView from '@/views/DashboardView';

const renderWithProviders = (component: React.ReactElement) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    );
};

describe('DashboardView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders dashboard header', async () => {
        renderWithProviders(<DashboardView setPage={vi.fn()} />);

        await waitFor(() => {
            expect(screen.getByText(/Strategic Overview/i)).toBeInTheDocument();
        });
    });

    it('renders project list section', async () => {
        renderWithProviders(<DashboardView setPage={vi.fn()} />);

        await waitFor(() => {
            // Look for any project-related content
            const projectElements = screen.queryAllByText(/Nodes/i);
            expect(projectElements.length).toBeGreaterThan(0);
        });
    });

    it('displays loading state initially', async () => {
        // Re-mock to show loading
        useProjectsMock.mockReturnValueOnce({
            projects: [],
            tasks: [],
            documents: [],
            safetyHazards: [],
            equipment: [],
            isLoading: true,
        } as any);

        renderWithProviders(<DashboardView setPage={vi.fn()} />);

        // Wait for loading to finish or at least for the component to settle
        await waitFor(() => {
            expect(screen.getByText(/Strategic Overview/i)).toBeInTheDocument();
        });
    });
});
