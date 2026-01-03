import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Comments } from '@/components/Comments';
import { ProjectProvider } from '@/contexts/ProjectContext';
import { TenantProvider } from '@/contexts/TenantContext';

// Mock DB service
vi.mock('@/services/db', () => ({
    db: {
        getComments: vi.fn(() => Promise.resolve([])),
        addComment: vi.fn(() => Promise.resolve({ id: '123' })),
        updateComment: vi.fn(() => Promise.resolve()),
        deleteComment: vi.fn(() => Promise.resolve()),
        getProjects: vi.fn(() => Promise.resolve([])),
        getTeamMembers: vi.fn(() => Promise.resolve([])),
    },
}));

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { id: '1', name: 'Test User', email: 'test@test.com' },
    }),
}));

// Mock tenant context
vi.mock('@/contexts/TenantContext', () => ({
    TenantProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useTenant: () => ({
        currentTenant: { id: 'c1', name: 'Test Company' },
        tenants: [{ id: 'c1', name: 'Test Company' }],
    }),
}));

// Mock project context
vi.mock('@/contexts/ProjectContext', () => ({
    ProjectProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useProjects: () => ({
        projects: [],
        loading: false,
    }),
}));

const renderWithProviders = (component: React.ReactElement) => {
    return render(
        <TenantProvider>
            <ProjectProvider>
                {component}
            </ProjectProvider>
        </TenantProvider>
    );
};

describe('Comments Component', () => {
    it('renders comments header', async () => {
        renderWithProviders(<Comments entityType="task" entityId="123" />);
        await waitFor(() => expect(screen.getByText(/Discussion/i)).toBeInTheDocument());
    });

    it('shows empty state when no comments', async () => {
        renderWithProviders(<Comments entityType="task" entityId="123" />);

        await waitFor(() => {
            expect(screen.getByText(/0 Comments/i)).toBeInTheDocument();
        });
    });

    it('allows user to type a comment', async () => {
        renderWithProviders(<Comments entityType="task" entityId="123" />);
        await waitFor(() => expect(screen.getByText(/0 Comments/i)).toBeInTheDocument());

        const textarea = screen.getByPlaceholderText(/Write a comment/i);
        fireEvent.change(textarea, { target: { value: 'Test comment' } });

        expect(textarea).toHaveValue('Test comment');
    });

    it('disables send button when comment is empty', async () => {
        renderWithProviders(<Comments entityType="task" entityId="123" />);
        await waitFor(() => expect(screen.getByText(/0 Comments/i)).toBeInTheDocument());

        const sendButton = screen.getByRole('button');
        expect(sendButton).toBeDisabled();
    });
});
