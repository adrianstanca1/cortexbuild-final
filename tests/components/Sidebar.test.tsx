import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';

// Mock contexts
vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'u1', name: 'Test User', email: 'test@test.com', role: 'COMPANY_ADMIN', avatarInitials: 'TU' },
        isAuthenticated: true,
        logout: vi.fn(),
        stopImpersonating: vi.fn(),
        isImpersonating: false
    }),
}));

vi.mock('@/contexts/TenantContext', () => ({
    useTenant: () => ({
        systemSettings: { betaFeatures: true },
        currentCompanyId: 'c1',
        currentCompanyName: 'Test Company',
    }),
}));

vi.mock('@/contexts/WebSocketContext', () => ({
    useWebSocket: () => ({
        isConnected: true,
        lastMessage: null,
        sendMessage: vi.fn(),
        onlineUsers: [],
    }),
}));

vi.mock('@/hooks/usePermissions', () => ({
    usePermissions: () => ({
        can: () => true,
        isAdmin: true,
    }),
}));

// Import after mocks
import Sidebar from '@/components/Sidebar';
import { Page } from '@/types';

const renderSidebar = (isOpen = true) => {
    return render(
        <MemoryRouter initialEntries={['/dashboard']}>
            <Sidebar currentPage={Page.DASHBOARD} setPage={vi.fn()} isOpen={isOpen} onClose={vi.fn()} />
        </MemoryRouter>
    );
};

describe('Sidebar Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders when open', () => {
        renderSidebar(true);

        // Sidebar should be visible when open
        const sidebar = document.querySelector('nav');
        expect(sidebar).toBeInTheDocument();
    });

    it('contains navigation links', () => {
        renderSidebar(true);

        // Should have navigation elements
        const links = document.querySelectorAll('button');
        expect(links.length).toBeGreaterThan(0);
    });

    it('shows Dashboard link', () => {
        renderSidebar(true);

        // Dashboard should always be visible
        expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    });

    it('shows Projects link for authorized users', () => {
        renderSidebar(true);

        expect(screen.getByText(/Portfolio/i)).toBeInTheDocument();
    });

    it('shows Tasks link', () => {
        renderSidebar(true);

        expect(screen.getByText(/Vector Ledger/i)).toBeInTheDocument();
    });
});
