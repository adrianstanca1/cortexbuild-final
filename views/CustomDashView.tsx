import React, { useState, useEffect } from 'react';
import { Layout, Save, Download, Share2, X, Plus, Grid3x3, RotateCw, Copy, Eye, EyeOff, Trash2, Settings } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

interface Widget {
  id: string;
  type: 'kpi' | 'chart' | 'table' | 'forecast' | 'timeline' | 'matrix' | 'heatmap' | 'metric';
  title: string;
  size: 'small' | 'medium' | 'large';
  position: number;
  visible: boolean;
}

interface DashboardLayout {
  id: string;
  name: string;
  widgets: Widget[];
  createdAt: string;
  lastModified: string;
}

const CustomDashView: React.FC = () => {
  const { addToast } = useToast();
  const STORAGE_KEY = 'dashboard_layouts';
  const CURRENT_LAYOUT_KEY = 'current_dashboard_layout';

  // State Management
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [savedLayouts, setSavedLayouts] = useState<DashboardLayout[]>([]);
  const [currentLayoutId, setCurrentLayoutId] = useState<string | null>(null);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [showLayoutManager, setShowLayoutManager] = useState(false);
  const [editingLayoutName, setEditingLayoutName] = useState('');
  const [editingLayoutId, setEditingLayoutId] = useState<string | null>(null);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Available Widgets
  const availableWidgets: Omit<Widget, 'id' | 'position' | 'visible'>[] = [
    { type: 'kpi', title: 'Portfolio Health', size: 'small' },
    { type: 'kpi', title: 'Profit YTD', size: 'small' },
    { type: 'kpi', title: 'Avg Margin', size: 'small' },
    { type: 'kpi', title: 'Projects at Risk', size: 'small' },
    { type: 'chart', title: 'Project Pipeline', size: 'medium' },
    { type: 'chart', title: 'Budget Utilization', size: 'medium' },
    { type: 'chart', title: 'Team Capacity', size: 'medium' },
    { type: 'forecast', title: 'Cash Flow Forecast', size: 'large' },
    { type: 'matrix', title: 'Risk vs Margin Matrix', size: 'large' },
    { type: 'timeline', title: 'Project Timeline', size: 'large' },
    { type: 'table', title: 'Active Projects', size: 'large' },
    { type: 'heatmap', title: 'Resource Utilization Heatmap', size: 'large' },
  ];

  // Initialize Dashboard on Mount

  // Load all saved layouts from localStorage
  const loadSavedLayouts = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const currentId = localStorage.getItem(CURRENT_LAYOUT_KEY);

    if (saved) {
      const layouts = JSON.parse(saved) as DashboardLayout[];
      setSavedLayouts(layouts);

      if (currentId) {
        const layout = layouts.find(l => l.id === currentId);
        if (layout) {
          setCurrentLayoutId(currentId);
          setWidgets(layout.widgets);
          return;
        }
      }

      // Load first layout if no current layout
      if (layouts.length > 0) {
        setCurrentLayoutId(layouts[0].id);
        setWidgets(layouts[0].widgets);
      }
    }

    // Create default layout if none exists
    if (!saved) {
      createDefaultLayout();
    }
  };

  // Create Default Layout
  const createDefaultLayout = () => {
    const defaultWidgets: Widget[] = [
      { id: '1', type: 'kpi', title: 'Portfolio Health', size: 'small', position: 0, visible: true },
      { id: '2', type: 'kpi', title: 'Profit YTD', size: 'small', position: 1, visible: true },
      { id: '3', type: 'kpi', title: 'Avg Margin', size: 'small', position: 2, visible: true },
      { id: '4', type: 'kpi', title: 'Projects at Risk', size: 'small', position: 3, visible: true },
      { id: '5', type: 'matrix', title: 'Risk vs Margin Matrix', size: 'large', position: 4, visible: true },
      { id: '6', type: 'forecast', title: 'Cash Flow Forecast', size: 'large', position: 5, visible: true },
    ];

    const defaultLayout: DashboardLayout = {
      id: `layout-${Date.now()}`,
      name: 'Default Dashboard',
      widgets: defaultWidgets,
      createdAt: new Date().toLocaleString(),
      lastModified: new Date().toLocaleString(),
    };

    setSavedLayouts([defaultLayout]);
    setCurrentLayoutId(defaultLayout.id);
    setWidgets(defaultWidgets);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([defaultLayout]));
    localStorage.setItem(CURRENT_LAYOUT_KEY, defaultLayout.id);
  };

  // Add Widget to Dashboard
  const addWidget = (widgetType: Omit<Widget, 'id' | 'position' | 'visible'>) => {
    const newWidget: Widget = {
      ...widgetType,
      id: `widget-${Date.now()}`,
      position: widgets.length,
      visible: true,
    };

    const updatedWidgets = [...widgets, newWidget];
    setWidgets(updatedWidgets);
    setShowWidgetPicker(false);
    saveCurrentLayout(updatedWidgets);
  };

  // Remove Widget
  const removeWidget = (id: string) => {
    const updatedWidgets = widgets.filter(w => w.id !== id);
    setWidgets(updatedWidgets);
    saveCurrentLayout(updatedWidgets);
  };

  // Toggle Widget Visibility
  const toggleWidgetVisibility = (id: string) => {
    const updatedWidgets = widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w);
    setWidgets(updatedWidgets);
    saveCurrentLayout(updatedWidgets);
  };

  // Drag and Drop Handler
  const handleDragStart = (id: string) => {
    setDraggedWidget(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetId: string) => {
    if (!draggedWidget || draggedWidget === targetId) return;

    const draggedIndex = widgets.findIndex(w => w.id === draggedWidget);
    const targetIndex = widgets.findIndex(w => w.id === targetId);

    const newWidgets = [...widgets];
    [newWidgets[draggedIndex], newWidgets[targetIndex]] = [newWidgets[targetIndex], newWidgets[draggedIndex]];

    setWidgets(newWidgets.map((w, i) => ({ ...w, position: i })));
    saveCurrentLayout(newWidgets);
    setDraggedWidget(null);
  };

  // Save Current Layout
  const saveCurrentLayout = (updatedWidgets?: Widget[]) => {
    const widgetsToSave = updatedWidgets || widgets;

    const updated = savedLayouts.map(l =>
      l.id === currentLayoutId
        ? { ...l, widgets: widgetsToSave, lastModified: new Date().toLocaleString() }
        : l
    );

    setSavedLayouts(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  // Create New Layout
  const createNewLayout = () => {
    const newLayout: DashboardLayout = {
      id: `layout-${Date.now()}`,
      name: `Dashboard ${savedLayouts.length + 1}`,
      widgets: [],
      createdAt: new Date().toLocaleString(),
      lastModified: new Date().toLocaleString(),
    };

    const updated = [...savedLayouts, newLayout];
    setSavedLayouts(updated);
    setCurrentLayoutId(newLayout.id);
    setWidgets([]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem(CURRENT_LAYOUT_KEY, newLayout.id);
  };

  // Load Layout
  const loadLayout = (layoutId: string) => {
    const layout = savedLayouts.find(l => l.id === layoutId);
    if (layout) {
      setCurrentLayoutId(layoutId);
      setWidgets(layout.widgets);
      localStorage.setItem(CURRENT_LAYOUT_KEY, layoutId);
    }
  };

  // Delete Layout
  const deleteLayout = (layoutId: string) => {
    if (savedLayouts.length <= 1) {
      addToast('Cannot delete the last layout', 'warning');
      return;
    }

    const updated = savedLayouts.filter(l => l.id !== layoutId);
    setSavedLayouts(updated);

    if (currentLayoutId === layoutId) {
      const nextLayout = updated[0];
      setCurrentLayoutId(nextLayout.id);
      setWidgets(nextLayout.widgets);
      localStorage.setItem(CURRENT_LAYOUT_KEY, nextLayout.id);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  // Rename Layout
  const renameLayout = (layoutId: string, newName: string) => {
    const updated = savedLayouts.map(l =>
      l.id === layoutId ? { ...l, name: newName } : l
    );

    setSavedLayouts(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setEditingLayoutId(null);
    setEditingLayoutName('');
  };

  // Render Widget Component
  const renderWidget = (widget: Widget) => {
    const sizeClasses = {
      small: 'col-span-1 row-span-1',
      medium: 'col-span-2 row-span-2',
      large: 'col-span-2 row-span-3',
    };

    return (
      <div
        key={widget.id}
        draggable
        onDragStart={() => handleDragStart(widget.id)}
        onDragOver={handleDragOver}
        onDrop={() => handleDrop(widget.id)}
        className={`${sizeClasses[widget.size]} bg-white border-2 border-dashed border-zinc-200 rounded-xl p-6 cursor-move hover:border-blue-400 hover:shadow-md transition-all group ${!widget.visible ? 'opacity-40' : ''}`}
      >
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-bold text-zinc-900 text-sm">{widget.title}</h3>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <button
              onClick={() => toggleWidgetVisibility(widget.id)}
              className="p-1 hover:bg-zinc-100 rounded"
              title={widget.visible ? 'Hide' : 'Show'}
            >
              {widget.visible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <button
              onClick={() => removeWidget(widget.id)}
              className="p-1 hover:bg-red-100 text-red-600 rounded"
              title="Remove"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Widget Content Based on Type */}
        {widget.type === 'kpi' && (
          <div className="h-full flex flex-col justify-center">
            <div className="text-3xl font-bold text-[#0f5c82] mb-2">87</div>
            <div className="text-xs text-zinc-500">Key Metric</div>
            <div className="text-green-600 text-xs font-medium mt-2">↑ +2 pts</div>
          </div>
        )}

        {widget.type === 'forecast' && (
          <svg viewBox="0 0 500 150" className="w-full h-full">
            <polyline points="0,100 100,80 200,70 300,75 400,50 500,30" fill="none" stroke="#22d3ee" strokeWidth="2" />
            <path d="M0,100 L100,80 L200,70 L300,75 L400,50 L500,30 L500,150 L0,150 Z" fill="#22d3ee" fillOpacity="0.1" />
          </svg>
        )}

        {widget.type === 'matrix' && (
          <div className="w-full h-full border-l border-b border-zinc-200 grid grid-cols-5 grid-rows-4 gap-1">
            {[...Array(20)].map((_, i) => <div key={i} className="bg-blue-100 rounded opacity-60" />)}
          </div>
        )}

        {widget.type === 'chart' && (
          <div className="h-full flex items-center justify-center text-zinc-400">
            <Grid3x3 size={32} />
          </div>
        )}

        {widget.type === 'table' && (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between text-xs text-zinc-600 py-1 border-b border-zinc-100">
                <span>Project {i + 1}</span>
                <span className="font-bold">In Progress</span>
              </div>
            ))}
          </div>
        )}

        {widget.type === 'timeline' && (
          <div className="space-y-3">
            {['Phase 1', 'Phase 2', 'Phase 3'].map((phase, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <div className="flex-1 h-1 bg-zinc-200 rounded" />
                <span className="text-xs text-zinc-500">{phase}</span>
              </div>
            ))}
          </div>
        )}

        {widget.type === 'heatmap' && (
          <div className="grid grid-cols-4 gap-1 h-full">
            {[...Array(12)].map((_, i) => <div key={i} className={`rounded ${i % 3 === 0 ? 'bg-green-200' : i % 3 === 1 ? 'bg-yellow-200' : 'bg-red-200'}`} />)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 mb-1">Custom Dashboard</h1>
        <p className="text-zinc-500">Drag-and-drop widgets, role-specific views, 50+ widget library</p>
      </div>

      {/* Layout Manager Modal */}
      {showLayoutManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-zinc-900">Dashboard Layouts</h2>
              <button onClick={() => setShowLayoutManager(false)} className="text-zinc-400 hover:text-zinc-600 text-2xl">×</button>
            </div>

            {/* Create New Layout */}
            <button
              onClick={createNewLayout}
              className="w-full mb-6 px-4 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Create New Layout
            </button>

            {/* Layout List */}
            <div className="space-y-3">
              {savedLayouts.map(layout => (
                <div
                  key={layout.id}
                  className={`p-4 border-2 rounded-lg transition-all ${currentLayoutId === layout.id ? 'border-blue-500 bg-blue-50' : 'border-zinc-200 hover:border-zinc-300'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      {editingLayoutId === layout.id ? (
                        <input
                          type="text"
                          value={editingLayoutName}
                          onChange={(e) => setEditingLayoutName(e.target.value)}
                          onBlur={() => renameLayout(layout.id, editingLayoutName)}
                          autoFocus
                          className="w-full px-3 py-1 border border-zinc-300 rounded font-bold text-zinc-900"
                        />
                      ) : (
                        <h3 className="font-bold text-zinc-900">{layout.name}</h3>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {currentLayoutId !== layout.id && (
                        <button
                          onClick={() => loadLayout(layout.id)}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded font-bold hover:bg-blue-200"
                        >
                          Load
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingLayoutId(layout.id);
                          setEditingLayoutName(layout.name);
                        }}
                        className="px-2 py-1 text-zinc-600 hover:bg-zinc-100 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteLayout(layout.id)}
                        className="px-2 py-1 text-red-600 hover:bg-red-100 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs text-zinc-500">
                    <span>{layout.widgets.length} widgets</span>
                    <span>Modified: {layout.lastModified}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Widget Picker Modal */}
      {showWidgetPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-zinc-900">Add Widget</h2>
              <button onClick={() => setShowWidgetPicker(false)} className="text-zinc-400 hover:text-zinc-600 text-2xl">×</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availableWidgets.map((widget, i) => (
                <button
                  key={i}
                  onClick={() => addWidget(widget)}
                  className="p-4 border border-zinc-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
                >
                  <h4 className="font-bold text-sm text-zinc-900 group-hover:text-blue-600">{widget.title}</h4>
                  <p className="text-xs text-zinc-500 mt-1">{widget.type} • {widget.size}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Controls */}
      <div className="flex gap-2 mb-8 flex-wrap">
        <button
          onClick={() => setShowWidgetPicker(!showWidgetPicker)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Add Widget
        </button>
        <button
          onClick={() => setShowLayoutManager(!showLayoutManager)}
          className="bg-zinc-100 text-zinc-700 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-zinc-200 transition-colors"
        >
          <Download size={16} /> {savedLayouts.length} Layouts
        </button>
        <button
          onClick={createNewLayout}
          className="bg-zinc-100 text-zinc-700 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-zinc-200 transition-colors"
        >
          <Plus size={16} /> New Layout
        </button>
        <button className="bg-zinc-100 text-zinc-700 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-zinc-200 transition-colors ml-auto">
          <Share2 size={16} /> Share
        </button>
      </div>

      {/* Widget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 auto-rows-max gap-6 flex-1">
        {widgets.length > 0 ? (
          widgets.map(widget => renderWidget(widget))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center text-zinc-400">
            <Layout size={48} className="mb-4 opacity-50" />
            <p className="font-bold text-zinc-600 mb-2">No widgets yet</p>
            <p className="text-sm text-zinc-500 mb-4">Start building your dashboard by adding widgets</p>
            <button
              onClick={() => setShowWidgetPicker(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={16} /> Add Your First Widget
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomDashView;