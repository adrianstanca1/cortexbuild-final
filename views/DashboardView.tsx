import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole, Page } from '@/types';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Sub-Dashboards
import { CompanyAdminDashboard } from './dashboard/CompanyAdminDashboard';
import { SupervisorDashboard } from './dashboard/SupervisorDashboard';
import { OperativeDashboard } from './dashboard/OperativeDashboard';

interface DashboardViewProps {
    setPage: (page: Page) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ setPage }) => {
    const { user } = useAuth();

    if (!user) return null;

    switch (user.role) {
        case UserRole.SUPERADMIN:
            // Superadmins are typically routed to PlatformDashboardView by App.tsx.
            // If they land here, we fallback to the Company Admin view for high-level visibility.
            return (
                <ErrorBoundary>
                    <CompanyAdminDashboard setPage={setPage} />
                </ErrorBoundary>
            );
        case UserRole.COMPANY_ADMIN:
            return (
                <ErrorBoundary>
                    <CompanyAdminDashboard setPage={setPage} />
                </ErrorBoundary>
            );
        case UserRole.SUPERVISOR:
            return (
                <ErrorBoundary>
                    <SupervisorDashboard setPage={setPage} />
                </ErrorBoundary>
            );
        case UserRole.OPERATIVE:
            return (
                <ErrorBoundary>
                    <OperativeDashboard setPage={setPage} />
                </ErrorBoundary>
            );
        default:
            return (
                <ErrorBoundary>
                    <OperativeDashboard setPage={setPage} />
                </ErrorBoundary>
            );
    }
};

export default DashboardView;
