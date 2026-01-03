import React, { useState, useEffect } from 'react';
import { Activity, Clock, User, AlertCircle, CheckCircle, XCircle, Info, Download, Filter } from 'lucide-react';

interface TimelineEvent {
    id: string;
    timestamp: string;
    action: string;
    actor: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
    resource: {
        type: string;
        id: string;
        name?: string;
    };
    details: any;
    metadata: any;
    ip_address?: string;
}

interface CompanyTimelineProps {
    companyId: string;
}

const CompanyTimeline: React.FC<CompanyTimelineProps> = ({ companyId }) => {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [actorFilter, setActorFilter] = useState('');

    useEffect(() => {
        fetchTimeline();
    }, [companyId, filter, actorFilter]);

    const fetchTimeline = async () => {
        try {
            setLoading(true);
            let url = `/api/audit/companies/${companyId}/timeline?limit=100`;
            if (filter) url += `&action=${filter}`;
            if (actorFilter) url += `&actor=${actorFilter}`;

            const res = await fetch(url, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch timeline');

            const data = await res.json();
            setEvents(data.events || []);
        } catch (error) {
            console.error('Failed to fetch timeline:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const res = await fetch(`/api/audit/companies/${companyId}/export?format=json`, {
                credentials: 'include',
            });

            if (!res.ok) throw new Error('Failed to export audit logs');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit_logs_${companyId}_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export audit logs:', error);
            alert('Failed to export audit logs. Please try again.');
        }
    };

    const getActionIcon = (action: string) => {
        const lowerAction = action.toLowerCase();
        if (lowerAction.includes('create')) return <CheckCircle className="w-4 h-4 text-green-600" />;
        if (lowerAction.includes('update')) return <Info className="w-4 h-4 text-blue-600" />;
        if (lowerAction.includes('delete')) return <XCircle className="w-4 h-4 text-red-600" />;
        if (lowerAction.includes('error') || lowerAction.includes('fail')) return <AlertCircle className="w-4 h-4 text-orange-600" />;
        return <Activity className="w-4 h-4 text-gray-600" />;
    };

    const getActionColor = (action: string) => {
        const lowerAction = action.toLowerCase();
        if (lowerAction.includes('create')) return 'text-green-700 bg-green-50 border-green-200';
        if (lowerAction.includes('update')) return 'text-blue-700 bg-blue-50 border-blue-200';
        if (lowerAction.includes('delete')) return 'text-red-700 bg-red-50 border-red-200';
        if (lowerAction.includes('error') || lowerAction.includes('fail')) return 'text-orange-700 bg-orange-50 border-orange-200';
        return 'text-gray-700 bg-gray-50 border-gray-200';
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    <p className="text-sm text-gray-600">Loading timeline...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200 flex-1 max-w-xs">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Filter by action..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="flex-1 bg-transparent outline-none text-sm"
                        />
                    </div>
                    {filter && (
                        <button
                            onClick={() => setFilter('')}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Clear
                        </button>
                    )}
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                    <Download className="w-4 h-4" />
                    Export
                </button>
            </div>

            {/* Timeline */}
            <div className="space-y-3">
                {events.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg p-8 text-center border border-gray-200">
                        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-600 font-medium">No events found</p>
                        <p className="text-sm text-gray-500 mt-1">
                            {filter ? 'Try adjusting your filter' : 'Timeline events will appear here'}
                        </p>
                    </div>
                ) : (
                    events.map((event, index) => (
                        <div
                            key={event.id}
                            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start gap-4">
                                {/* Timeline Dot */}
                                <div className="flex-shrink-0 mt-1">
                                    {getActionIcon(event.action)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getActionColor(event.action)}`}>
                                                    {event.action}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {event.resource.type}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-900 font-medium">
                                                {event.resource.name || `Resource ${event.resource.id.substring(0, 8)}...`}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                            <Clock className="w-3 h-3" />
                                            {formatTimestamp(event.timestamp)}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm">
                                        <User className="w-3 h-3 text-gray-400" />
                                        <span className="text-gray-700">{event.actor.name}</span>
                                        <span className="text-gray-500">•</span>
                                        <span className="text-gray-500">{event.actor.email}</span>
                                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                                            {event.actor.role}
                                        </span>
                                    </div>

                                    {/* Details (collapsible) */}
                                    {Object.keys(event.details || {}).length > 0 && (
                                        <details className="mt-3">
                                            <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-700 font-medium">
                                                View details
                                            </summary>
                                            <div className="mt-2 bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-700 overflow-x-auto">
                                                <pre>{JSON.stringify(event.details, null, 2)}</pre>
                                            </div>
                                        </details>
                                    )}

                                    {event.ip_address && (
                                        <p className="text-xs text-gray-400 mt-2">
                                            IP: {event.ip_address}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {events.length > 0 && (
                <div className="text-center py-4">
                    <p className="text-sm text-gray-500">Showing {events.length} events</p>
                </div>
            )}
        </div>
    );
};

export default CompanyTimeline;
