import React from 'react';
import { Search, Filter, X } from 'lucide-react';

interface CompanyFiltersProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    statusFilter: string;
    onStatusFilterChange: (value: string) => void;
    planFilter: string;
    onPlanFilterChange: (value: string) => void;
    regionFilter: string;
    onRegionFilterChange: (value: string) => void;
    onClearFilters: () => void;
}

export default function CompanyFilters({
    searchQuery,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    planFilter,
    onPlanFilterChange,
    regionFilter,
    onRegionFilterChange,
    onClearFilters
}: CompanyFiltersProps) {
    const hasActiveFilters = statusFilter || planFilter || regionFilter || searchQuery;

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-4 flex-wrap">
                {/* Search */}
                <div className="flex-1 min-w-[300px]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Search by name, slug, or owner email..."
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Status Filter */}
                <div className="min-w-[160px]">
                    <select
                        value={statusFilter}
                        onChange={(e) => onStatusFilterChange(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                        <option value="">All Statuses</option>
                        <option value="DRAFT">Draft</option>
                        <option value="ACTIVE">Active</option>
                        <option value="SUSPENDED">Suspended</option>
                        <option value="ARCHIVED">Archived</option>
                    </select>
                </div>

                {/* Plan Filter */}
                <div className="min-w-[160px]">
                    <select
                        value={planFilter}
                        onChange={(e) => onPlanFilterChange(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                        <option value="">All Plans</option>
                        <option value="Free">Free</option>
                        <option value="Starter">Starter</option>
                        <option value="Professional">Professional</option>
                        <option value="Enterprise">Enterprise</option>
                    </select>
                </div>

                {/* Region Filter */}
                <div className="min-w-[160px]">
                    <select
                        value={regionFilter}
                        onChange={(e) => onRegionFilterChange(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                        <option value="">All Regions</option>
                        <option value="US">United States</option>
                        <option value="EU">Europe</option>
                        <option value="APAC">Asia Pacific</option>
                        <option value="LATAM">Latin America</option>
                    </select>
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                    <button
                        onClick={onClearFilters}
                        className="px-4 py-2.5 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <X className="w-4 h-4" />
                        Clear Filters
                    </button>
                )}
            </div>

            {/* Active Filters Summary */}
            {hasActiveFilters && (
                <div className="mt-3 pt-3 border-t flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-600">Active filters:</span>
                    {searchQuery && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            Search: &quot;{searchQuery}&quot;
                        </span>
                    )}
                    {statusFilter && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            Status: {statusFilter}
                        </span>
                    )}
                    {planFilter && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                            Plan: {planFilter}
                        </span>
                    )}
                    {regionFilter && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                            Region: {regionFilter}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
