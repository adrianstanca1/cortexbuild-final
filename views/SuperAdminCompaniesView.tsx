import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Grid, List } from 'lucide-react';
import { Page } from '../types';
import CreateCompanyModal from '../components/CreateCompanyModal';
import CompanyCard from '../components/CompanyCard';
import CompanyFilters from '../components/CompanyFilters';
import CompanyDetailPanel from '../components/CompanyDetailPanel';
import { db } from '../services/db';

interface Company {
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
    industry?: string;
    region?: string;
    users: number;
    projects: number;
    mrr: number;
    createdAt: string;
    lastActivityAt?: string;
}

interface CompanyStats {
    totalCompanies: number;
    activeCompanies: number;
    suspendedCompanies: number;
    totalUsers: number;
    totalProjects: number;
    totalMrr: number;
    recentCompanies: number;
}

interface SuperAdminCompaniesViewProps {
    setPage: (page: Page) => void;
}

const SuperAdminCompaniesView: React.FC<SuperAdminCompaniesViewProps> = ({ setPage }) => {
    // State
    const [companies, setCompanies] = useState<Company[]>([]);
    const [stats, setStats] = useState<CompanyStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'grid' | 'list'>('grid');

    // Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

    // Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [planFilter, setPlanFilter] = useState('');
    const [regionFilter, setRegionFilter] = useState('');

    // Debounced search
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch data
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [companiesData, statsData] = await Promise.all([
                db.getAllCompanies(),
                db.getCompanyStats()
            ]);

            setCompanies(Array.isArray(companiesData) ? companiesData : []);
            setStats(statsData);
        } catch (error) {
            console.error('Failed to fetch company data:', error);
            setCompanies([]);
            setStats(null);
        } finally {
            setLoading(false);
        }
    };

    // Filter companies
    const filteredCompanies = Array.isArray(companies) ? companies.filter(company => {
        // Search filter
        const matchesSearch = !debouncedSearch ||
            company.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            company.slug?.toLowerCase().includes(debouncedSearch.toLowerCase());

        // Status filter
        const matchesStatus = !statusFilter || company.status.toLowerCase() === statusFilter.toLowerCase();

        // Plan filter
        const matchesPlan = !planFilter || company.plan === planFilter;

        // Region filter
        const matchesRegion = !regionFilter || company.region === regionFilter;

        return matchesSearch && matchesStatus && matchesPlan && matchesRegion;
    }) : [];

    // Actions
    const handleSuspend = async (id: string) => {
        const reason = prompt('Reason for suspending this company:');
        if (!reason) return;

        try {
            await db.suspendCompany(id, reason);
            fetchData();
        } catch (error) {
            console.error('Failed to suspend company:', error);
            alert('Failed to suspend company. Please try again.');
        }
    };

    const handleActivate = async (id: string) => {
        try {
            await db.activateCompany(id);
            fetchData();
        } catch (error) {
            console.error('Failed to activate company:', error);
            alert('Failed to activate company. Please try again.');
        }
    };

    const handleViewDetails = (id: string) => {
        const company = companies.find(c => c.id === id);
        if (company) {
            setSelectedCompany(company);
        }
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setStatusFilter('');
        setPlanFilter('');
        setRegionFilter('');
    };

    const handleUpdatePlan = async (id: string, currentPlan: string) => {
        const plans = ['Starter', 'Professional', 'Enterprise'];
        const newPlan = prompt(`Enter new plan (${plans.join(', ')}):`, currentPlan);

        if (!newPlan || newPlan === currentPlan) return;

        if (!plans.includes(newPlan)) {
            alert(`Invalid plan. Please choose from: ${plans.join(', ')}`);
            return;
        }

        try {
            await db.updateCompanyLimits(id, { plan: newPlan });
            fetchData();
        } catch (error) {
            console.error('Failed to update plan:', error);
            alert('Failed to update plan. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading company data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gray-50 p-6 overflow-auto">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Platform Companies</h1>
                    <p className="text-gray-600">Manage all companies and tenants across the platform</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-lg"
                >
                    <Plus className="w-5 h-5" />
                    Create Company
                </button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Companies</p>
                                <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalCompanies}</p>
                            </div>
                            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                            {stats.recentCompanies} new this month
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Active Companies</p>
                                <p className="text-2xl font-bold text-green-600 mt-2">{stats.activeCompanies}</p>
                            </div>
                            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                            {stats.suspendedCompanies} suspended
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Users</p>
                                <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalUsers}</p>
                            </div>
                            <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                            Across all companies
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total MRR</p>
                                <p className="text-2xl font-bold text-gray-900 mt-2">${(stats.totalMrr || 0).toLocaleString()}</p>
                            </div>
                            <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                            Monthly recurring revenue
                        </p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <CompanyFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                planFilter={planFilter}
                onPlanFilterChange={setPlanFilter}
                regionFilter={regionFilter}
                onRegionFilterChange={setRegionFilter}
                onClearFilters={handleClearFilters}
            />

            {/* View Toggle */}
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                    Showing <span className="font-medium">{filteredCompanies.length}</span> of <span className="font-medium">{companies.length}</span> companies
                </p>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setView('grid')}
                        className={`p-2 rounded-lg transition-colors ${view === 'grid' ? 'bg-blue-100 text-blue-600' : 'bg-white text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <Grid className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setView('list')}
                        className={`p-2 rounded-lg transition-colors ${view === 'list' ? 'bg-blue-100 text-blue-600' : 'bg-white text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <List className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Companies Grid/List */}
            {filteredCompanies.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No companies found</h3>
                    <p className="mt-2 text-sm text-gray-500">
                        {searchQuery || statusFilter || planFilter || regionFilter
                            ? 'Try adjusting your filters or search term.'
                            : 'Get started by creating your first company.'}
                    </p>
                    {!searchQuery && !statusFilter && !planFilter && !regionFilter && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Create Company
                        </button>
                    )}
                </div>
            ) : (
                <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                    {filteredCompanies.map((company) => (
                        <CompanyCard
                            key={company.id}
                            company={company}
                            onSuspend={handleSuspend}
                            onActivate={handleActivate}
                            onViewDetails={handleViewDetails}
                            onUpdatePlan={handleUpdatePlan}
                        />
                    ))}
                </div>
            )}

            {/* Create Company Modal */}
            <CreateCompanyModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                    fetchData();
                }}
            />

            {/* Company Detail Panel */}
            {selectedCompany && (
                <CompanyDetailPanel
                    company={selectedCompany}
                    isOpen={!!selectedCompany}
                    onClose={() => setSelectedCompany(null)}
                />
            )}
        </div>
    );
};

export default SuperAdminCompaniesView;
