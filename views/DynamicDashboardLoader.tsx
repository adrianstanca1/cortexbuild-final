import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Plus, X } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import PredictiveInsights from '@/components/PredictiveInsights';
import HighRiskProjectsWidget from '@/components/HighRiskProjectsWidget';
import { TenantUsageWidget } from '@/components/TenantUsageWidget';
import { ActivityFeed } from '@/components/collaboration/ActivityFeed';
import { ActiveTeamWidget } from '@/components/ActiveTeamWidget';
import { db } from '@/services/db';

// Definition of a widget record from DB
interface DashboardWidget {
    id: string;
    dashboardId: string;
    widgetType: string;
    title: string;
    config: any;
    position_x: number;
    position_y: number;
    width: number;
    height: number;
    isVisible: boolean;
}

// Registry map
const WIDGET_REGISTRY: Record<string, React.FC<any>> = {
    'predictive_insights': PredictiveInsights,
    'high_risk_projects': HighRiskProjectsWidget,
    'tenant_usage': TenantUsageWidget,
    'activity_feed': (props) => <ActivityFeed {...props} isDashboard={true} limit={10} />,
    'active_team': ActiveTeamWidget,
    // Add generic placeholders if needed
    'note': ({ config }) => <div className="p-4 bg-white/5 rounded-2xl border border-white/10 h-full"><h3 className="font-bold text-white mb-2">{config.title || 'Note'}</h3><p className="text-zinc-400 text-sm">{config.content || 'No content'}</p></div>
};

export const DynamicDashboardLoader: React.FC = () => {
    const { user, token } = useAuth();
    const { addToast } = useToast();
    const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
    const [loading, setLoading] = useState(true);
    const [dashboardId, setDashboardId] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;

        const loadDashboard = async () => {
            try {
                // 1. Get User Dashboards
                const dashboards = await db.getDashboards();
                let mainDash = dashboards.find((d: any) => d.isDefault) || dashboards[0];

                // 2. If no dashboard, create one (Auto-provisioning logic)
                if (!mainDash) {
                    mainDash = await db.createDashboard({
                        name: 'Main Dashboard',
                        isDefault: true,
                        layout: []
                    });
                }

                if (mainDash) {
                    setDashboardId(mainDash.id);
                    // 3. Get Widgets
                    const widgetsData = await db.getDashboardWidgets(mainDash.id);
                    setWidgets(widgetsData);
                }

            } catch (err) {
                console.error('Error loading dashboard:', err);
            } finally {
                setLoading(false);
            }
        };

        loadDashboard();
    }, [token]);

    const addWidget = async (type: string) => {
        if (!dashboardId || !token) return;
        try {
            const newWidget = await db.addWidget(dashboardId, {
                widgetType: type,
                title: 'New Widget',
                config: {},
                width: 4,
                height: 2
            });
            setWidgets([...widgets, newWidget]);
            addToast('Widget added', 'success');
        } catch (e) {
            addToast('Failed to add widget', 'error');
        }
    };

    const removeWidget = async (id: string) => {
        if (!token) return;
        try {
            await db.deleteWidget(id);
            setWidgets(widgets.filter(w => w.id !== id));
            addToast('Widget removed', 'success');
        } catch (e) {
            addToast('Failed to remove widget', 'error');
        }
    };

    if (loading) return null; // Don't show loading state to avoid layout shift, just pop in

    if (widgets.length === 0) {
        // Optional: Show "Add Widget" placeholder
        return (
            <div className="p-6 border-2 border-dashed border-white/10 rounded-[2rem] text-center my-8">
                <p className="text-zinc-500 mb-4 text-sm font-semibold uppercase tracking-widest">Custom Widgets Area</p>
                <div className="flex gap-4 justify-center">
                    <button onClick={() => addWidget('note')} className="px-4 py-2 bg-white/5 hover:bg-sky-500/20 text-sky-400 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2">
                        <Plus size={14} /> Add Note
                    </button>
                    {/* Demo only */}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 my-8">
            <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em]">Custom Intelligence</h3>
                <div className="flex gap-2">
                    <button onClick={() => addWidget('note')} className="p-2 bg-white/5 hover:bg-sky-500/20 text-sky-400 rounded-lg transition-colors" title="Add Note">
                        <Plus size={14} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {widgets.map(widget => {
                    const Component = WIDGET_REGISTRY[widget.widgetType] || WIDGET_REGISTRY['note'];
                    return (
                        <div key={widget.id} className="relative group">
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-4 shadow-xl h-full min-h-[200px]">
                                <Component config={widget.config} projectId={widget.config?.projectId} />
                            </div>
                            <button
                                onClick={() => removeWidget(widget.id)}
                                className="absolute top-2 right-2 p-1.5 bg-rose-500/20 text-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500 hover:text-white"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
