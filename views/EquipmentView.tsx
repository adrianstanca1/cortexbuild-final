
import React, { useMemo, useState, useRef } from 'react';
import { Plus, Wrench, Filter, Search, Camera, Image as ImageIcon, X, Upload, Calendar, MapPin, Truck, AlertTriangle, Maximize2, Edit2, MoreHorizontal, Trash2, CheckCircle2, Activity, Zap, Info, Gauge, Thermometer, Droplets, Loader2, Brain } from 'lucide-react';
import { useProjects } from '../contexts/ProjectContext';
import { runRawPrompt, parseAIJSON } from '@/services/geminiService';
import { Equipment } from '@/types';
import { useToast } from '@/contexts/ToastContext';

interface EquipmentViewProps {
    projectId?: string;
}

const EquipmentView: React.FC<EquipmentViewProps> = ({ projectId }) => {
    const { addToast } = useToast();
    const { equipment, addEquipment, updateEquipment, addTask, projects } = useProjects();

    // View State
    const [viewMode, setViewMode] = useState<'FLEET' | 'FORECAST'>('FLEET');
    const [filterType, setFilterType] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [showTelemetry, setShowTelemetry] = useState<string | null>(null); // ID of equipment
    const [isPredicting, setIsPredicting] = useState(false);
    const [predictionResult, setPredictionResult] = useState<any>(null);

    // Modal / Form State
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentItem, setCurrentItem] = useState<Partial<Equipment>>({});
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filter Logic
    const filteredEquipment = useMemo(() => {
        let items = equipment;

        if (projectId) {
            items = items.filter(e => e.projectId === projectId);
        }

        if (filterType !== 'All') {
            items = items.filter(e => e.type === filterType);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            items = items.filter(e =>
                e.name.toLowerCase().includes(q) ||
                e.type.toLowerCase().includes(q) ||
                (e.projectName || '').toLowerCase().includes(q)
            );
        }

        return items;
    }, [equipment, projectId, filterType, searchQuery]);

    // Handlers
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const openAddModal = () => {
        setIsEditing(false);
        setCurrentItem({
            status: 'Available',
            type: 'Tools',
            nextService: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
            lastService: new Date().toISOString().split('T')[0]
        });
        setImagePreview(null);
        setShowModal(true);
    };

    const openEditModal = (item: Equipment) => {
        setIsEditing(true);
        setCurrentItem({ ...item });
        setImagePreview(item.image || null);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!currentItem.name || !currentItem.type) return;

        if (isEditing && currentItem.id) {
            // Update Existing
            await updateEquipment(currentItem.id, {
                ...currentItem,
                image: imagePreview || undefined
            });
        } else {
            // Create New
            const eq: Equipment = {
                id: `eq-${Date.now()}`,
                name: currentItem.name,
                type: currentItem.type,
                status: currentItem.status || 'Available',
                projectId: projectId || '',
                projectName: projectId ? 'Current Project' : '-',
                lastService: currentItem.lastService || new Date().toISOString().split('T')[0],
                nextService: currentItem.nextService || '',
                companyId: 'c1',
                image: imagePreview || undefined
            };
            await addEquipment(eq);
        }
        setShowModal(false);
    };

    // Helpers
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'In Use': return 'bg-amber-500 text-white border-amber-600';
            case 'Available': return 'bg-emerald-500 text-white border-emerald-600';
            case 'Maintenance': return 'bg-red-500 text-white border-red-600';
            default: return 'bg-zinc-500 text-white border-zinc-600';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'Heavy Machinery': return <Truck size={48} className="text-zinc-300" />;
            case 'Tools': return <Wrench size={48} className="text-zinc-300" />;
            case 'Access': return <Truck size={48} className="text-zinc-300" />; // Placeholder
            default: return <Wrench size={48} className="text-zinc-300" />;
        }
    };

    const isServiceOverdue = (date: string) => {
        if (!date) return false;
        return new Date(date) < new Date();
    };

    const runPredictiveMaintenance = async (item: Equipment) => {
        setIsPredicting(true);
        setPredictionResult(null);
        try {
            const telemetry = {
                engineHours: 1240 + Math.floor(Math.random() * 50),
                internalTemp: 85 + Math.floor(Math.random() * 15),
                oilPressure: 45 + Math.floor(Math.random() * 5),
                fuelLevel: 65 + Math.floor(Math.random() * 10),
                lastService: item.lastService
            };

            const prompt = `
                Analyze construction equipment data and predict maintenance needs.
                Equipment: ${item.name} (${item.type})
                Telemetry: ${JSON.stringify(telemetry)}
                
                Return JSON:
                {
                    "healthScore": 1-100,
                    "prediction": "Short summary",
                    "estimatedFailureWeeks": number,
                    "recommendedAction": "Action text",
                    "priority": "Critical" | "High" | "Medium" | "Low"
                }
            `;
            const result = await runRawPrompt(prompt, {
                model: 'gemini-3-pro-preview',
                temperature: 0.3,
                thinkingConfig: { thinkingBudget: 1024 }
            });
            setPredictionResult(parseAIJSON(result));
        } catch (e) {
            addToast("Predictive analysis failed.", "error");
        } finally {
            setIsPredicting(false);
        }
    };

    const createMaintenanceTask = async (item: Equipment, prediction: any) => {
        const newTask: any = {
            id: `maint-${Date.now()}`,
            title: `Maint: ${item.name}`,
            projectId: item.projectId || (projects[0]?.id || ''),
            status: 'To Do',
            priority: prediction.priority || 'High',
            description: `AI Predicted Maintenance: ${prediction.prediction}\nRecommended Action: ${prediction.recommendedAction}`,
            dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], // Next week
            assigneeType: 'role',
            type: 'Maintenance'
        };
        await addTask(newTask);
        addToast("Maintenance task created and assigned.", "success");
        setPredictionResult(null);
    };

    return (
        <div className="max-w-7xl mx-auto h-full flex flex-col">
            {/* Header Section */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row justify-between md:items-end mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900 mb-1 flex items-center gap-2">
                            {projectId ? 'Project Equipment' : 'Equipment Fleet'}
                        </h1>
                        <p className="text-zinc-500">Track machinery allocation, maintenance status, and asset conditions.</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="bg-white p-1 rounded-xl border border-zinc-200 shadow-sm flex">
                            <button
                                onClick={() => setViewMode('FLEET')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'FLEET' ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-500 hover:bg-zinc-50'}`}
                            >
                                Fleet List
                            </button>
                            <button
                                onClick={() => setViewMode('FORECAST')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'FORECAST' ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-500 hover:bg-zinc-50'}`}
                            >
                                Service Forecast
                            </button>
                        </div>
                        <button
                            onClick={openAddModal}
                            className="flex items-center gap-2 bg-[#0f5c82] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#0c4a6e] shadow-lg transition-all transform hover:scale-105"
                        >
                            <Plus size={18} /> Add Equipment
                        </button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-2 rounded-2xl border border-zinc-200 shadow-sm">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto hide-scrollbar px-2">
                        {['All', 'Heavy Machinery', 'Utility Equipment', 'Access', 'Tools'].map(type => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${filterType === type
                                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-md'
                                    : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full md:w-64 mr-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search assets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0f5c82] focus:border-transparent outline-none transition-all"
                        />
                    </div>
                </div>
            </div>

            {viewMode === 'FLEET' ? (
                /* Equipment Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                    {filteredEquipment.map((item) => (
                        <div key={item.id} className="group bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:border-blue-200 flex flex-col h-full relative">

                            {/* Image Area */}
                            <div className="aspect-video w-full relative overflow-hidden bg-zinc-100 flex items-center justify-center">
                                {item.image ? (
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center gap-2 opacity-50">
                                        {getTypeIcon(item.type)}
                                        <span className="text-xs text-zinc-400 font-medium">No Image Available</span>
                                    </div>
                                )}

                                {/* Hover Actions Overlay */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px] z-20">
                                    {item.image && (
                                        <button
                                            onClick={() => setViewingImage(item.image || null)}
                                            className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors shadow-lg border border-white/30"
                                            title="View Full Image"
                                        >
                                            <Maximize2 size={20} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => openEditModal(item)}
                                        className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors shadow-lg border border-white/30"
                                        title="Edit Details"
                                    >
                                        <Edit2 size={20} />
                                    </button>
                                </div>

                                {/* Service Alert */}
                                {isServiceOverdue(item.nextService) && (
                                    <div className="absolute top-3 left-3 z-10 bg-red-500 text-white px-2 py-1 rounded-lg shadow-md flex items-center gap-1 text-[10px] font-bold uppercase border border-red-400 animate-pulse">
                                        <AlertTriangle size={12} fill="white" /> Service Due
                                    </div>
                                )}

                                {/* Telemetry HUD Button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowTelemetry(showTelemetry === item.id ? null : item.id); }}
                                    className="absolute bottom-3 right-3 z-30 p-2 bg-white/10 backdrop-blur-md rounded-lg text-white border border-white/20 hover:bg-[#0f5c82] transition-all flex items-center gap-1.5 shadow-lg group/iot"
                                >
                                    <Activity size={14} className={showTelemetry === item.id ? 'text-green-400' : 'text-zinc-300'} />
                                    <span className="text-[10px] font-bold uppercase tracking-tight">IoT Live</span>
                                </button>
                            </div>

                            {/* Card Body */}
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="mb-4">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-zinc-900 text-base mb-1 truncate pr-2">{item.name}</h3>
                                        <button onClick={() => openEditModal(item)} className="text-zinc-300 hover:text-[#0f5c82] transition-colors">
                                            <MoreHorizontal size={16} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-zinc-500 font-medium bg-zinc-100 px-2 py-0.5 rounded w-fit">{item.type}</p>
                                </div>

                                <div className="space-y-3 mb-4 flex-1">
                                    {showTelemetry === item.id ? (
                                        <div className="bg-zinc-900 rounded-xl p-3 space-y-3 animate-in fade-in zoom-in-95 duration-200 border border-zinc-800">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1"><Zap size={10} className="text-yellow-400" /> Live Telemetry</span>
                                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="flex items-center gap-2">
                                                    <Gauge size={12} className="text-[#0f5c82]" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] text-zinc-500 font-bold uppercase">Engine Hours</span>
                                                        <span className="text-xs text-white font-mono">{1240 + (Math.random() * 10).toFixed(1)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Thermometer size={12} className="text-orange-400" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] text-zinc-500 font-bold uppercase">Temp</span>
                                                        <span className="text-xs text-white font-mono">{(85 + Math.random() * 5).toFixed(1)}°C</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Activity size={12} className="text-blue-400" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] text-zinc-500 font-bold uppercase">Oil Pressure</span>
                                                        <span className="text-xs text-white font-mono">{(45 + Math.random() * 2).toFixed(1)} PSI</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Droplets size={12} className="text-purple-400" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] text-zinc-500 font-bold uppercase">Fuel</span>
                                                        <span className="text-xs text-white font-mono">{(65 + Math.random() * 5).toFixed(0)}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => runPredictiveMaintenance(item)}
                                                disabled={isPredicting}
                                                className="w-full py-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-600/30 transition-all flex items-center justify-center gap-2"
                                            >
                                                {isPredicting ? <Loader2 size={12} className="animate-spin" /> : <Activity size={12} />}
                                                AI Predictive Check
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {!projectId && (
                                                <div className="flex items-start gap-2 text-xs text-zinc-600">
                                                    <MapPin size={14} className="text-zinc-400 mt-0.5 shrink-0" />
                                                    <span className="truncate font-medium">{item.projectName || 'Unassigned'}</span>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-2">
                                                    <div className="text-[10px] text-zinc-400 uppercase font-bold mb-0.5">Last Service</div>
                                                    <div className="text-xs font-mono text-zinc-700">{item.lastService || '-'}</div>
                                                </div>
                                                <div className={`border rounded-lg p-2 ${isServiceOverdue(item.nextService) ? 'bg-red-50 border-red-100' : 'bg-zinc-50 border-zinc-100'}`}>
                                                    <div className={`text-[10px] uppercase font-bold mb-0.5 ${isServiceOverdue(item.nextService) ? 'text-red-500' : 'text-zinc-400'}`}>Next Service</div>
                                                    <div className={`text-xs font-mono ${isServiceOverdue(item.nextService) ? 'text-red-700 font-bold' : 'text-zinc-700'}`}>{item.nextService}</div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="pt-4 border-t border-zinc-50 flex gap-2">
                                    <button
                                        onClick={() => updateEquipment(item.id, { status: item.status === 'Available' ? 'In Use' : 'Available' })}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border ${item.status === 'Available'
                                            ? 'bg-[#0f5c82] text-white border-[#0f5c82] hover:bg-[#0c4a6e]'
                                            : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                                            }`}
                                    >
                                        {item.status === 'Available' ? 'Assign to Site' : 'Return to Yard'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredEquipment.length === 0 && (
                        <div className="col-span-full p-16 text-center text-zinc-400 bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-3xl">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                                <Wrench size={32} className="opacity-20" />
                            </div>
                            <h3 className="text-lg font-bold text-zinc-600 mb-2">No Equipment Found</h3>
                            <p className="text-sm text-zinc-400 mb-6">Try adjusting your filters or add new equipment to the fleet.</p>
                            <button onClick={openAddModal} className="text-[#0f5c82] font-bold hover:underline">Add New Equipment</button>
                        </div>
                    )}
                </div>
            ) : (
                /* Forecast View */
                <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-xl font-bold text-zinc-900 mb-1">Maintenance Forecast</h2>
                            <p className="text-sm text-zinc-500">Service schedule for the next 90 days across the fleet.</p>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold">
                            <Calendar size={14} /> Tracking {equipment.length} Assets
                        </div>
                    </div>

                    <div className="space-y-4">
                        {equipment
                            .sort((a, b) => new Date(a.nextService).getTime() - new Date(b.nextService).getTime())
                            .map(item => {
                                const isOverdue = isServiceOverdue(item.nextService);
                                return (
                                    <div key={item.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isOverdue ? 'bg-red-50 border-red-100' : 'bg-zinc-50 border-zinc-100 hover:border-blue-200'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-xl ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                                <Truck size={20} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-zinc-900">{item.name}</div>
                                                <div className="text-xs text-zinc-500 font-medium">{item.type} • {item.projectName || 'Unassigned'}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-8">
                                            <div className="text-right">
                                                <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${isOverdue ? 'text-red-500' : 'text-zinc-400'}`}>Service Date</div>
                                                <div className={`font-mono text-sm ${isOverdue ? 'text-red-700 font-bold' : 'text-zinc-700'}`}>{item.nextService}</div>
                                            </div>
                                            <button
                                                onClick={() => openEditModal(item)}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isOverdue ? 'bg-red-600 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
                                            >
                                                Schedule
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}

            {/* Modals */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                            <div>
                                <h3 className="text-lg font-bold text-zinc-900">{isEditing ? 'Edit Equipment' : 'Register New Asset'}</h3>
                                <p className="text-xs text-zinc-500">{isEditing ? `ID: ${currentItem.id}` : 'Add machinery to the fleet inventory'}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-200 rounded-full text-zinc-500 transition-colors"><X size={20} /></button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                            {/* Image Upload */}
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Asset Photo</label>
                                <div className="flex justify-center">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`relative w-full aspect-video rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group overflow-hidden ${imagePreview ? 'border-0' : 'bg-zinc-50 border-2 border-dashed border-zinc-300 hover:border-blue-400 hover:bg-blue-50'}`}
                                    >
                                        {imagePreview ? (
                                            <>
                                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Camera size={32} className="text-white mb-2" />
                                                    <span className="text-white font-bold text-sm">Change Photo</span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform text-zinc-400">
                                                    <ImageIcon size={24} />
                                                </div>
                                                <p className="text-sm font-bold text-zinc-600">Click to Upload</p>
                                                <p className="text-xs text-zinc-400">JPG, PNG supported</p>
                                            </>
                                        )}
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Equipment Name</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-[#0f5c82] focus:border-transparent outline-none transition-all"
                                        value={currentItem.name || ''}
                                        onChange={e => setCurrentItem({ ...currentItem, name: e.target.value })}
                                        placeholder="e.g. CAT 320 Excavator"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Type</label>
                                        <select
                                            className="w-full p-3 border border-zinc-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#0f5c82]"
                                            value={currentItem.type || ''}
                                            onChange={e => setCurrentItem({ ...currentItem, type: e.target.value })}
                                        >
                                            <option value="Heavy Machinery">Heavy Machinery</option>
                                            <option value="Utility Equipment">Utility Equipment</option>
                                            <option value="Access">Access</option>
                                            <option value="Tools">Tools</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Status</label>
                                        <select
                                            className="w-full p-3 border border-zinc-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#0f5c82]"
                                            value={currentItem.status}
                                            onChange={e => setCurrentItem({ ...currentItem, status: e.target.value as any })}
                                        >
                                            <option value="Available">Available</option>
                                            <option value="In Use">In Use</option>
                                            <option value="Maintenance">Maintenance</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Last Service</label>
                                        <input
                                            type="date"
                                            className="w-full p-3 border border-zinc-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#0f5c82]"
                                            value={currentItem.lastService || ''}
                                            onChange={e => setCurrentItem({ ...currentItem, lastService: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Next Service Due</label>
                                        <input
                                            type="date"
                                            className="w-full p-3 border border-zinc-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#0f5c82]"
                                            value={currentItem.nextService || ''}
                                            onChange={e => setCurrentItem({ ...currentItem, nextService: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-zinc-100 bg-zinc-50 flex justify-end gap-3">
                            <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-zinc-600 font-medium hover:bg-zinc-100 rounded-xl transition-colors">Cancel</button>
                            <button onClick={handleSave} disabled={!currentItem.name || !currentItem.type} className="px-8 py-2.5 bg-[#0f5c82] text-white font-bold rounded-xl hover:bg-[#0c4a6e] disabled:opacity-50 shadow-lg shadow-blue-900/10 transition-all">
                                {isEditing ? 'Save Changes' : 'Register Asset'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {viewingImage && (
                <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <button
                        onClick={() => setViewingImage(null)}
                        className="absolute top-6 right-6 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors z-50"
                    >
                        <X size={24} />
                    </button>
                    <img
                        src={viewingImage}
                        alt="Full Size"
                        className="max-w-full max-h-full object-contain shadow-2xl rounded-lg animate-in zoom-in-95 duration-300"
                    />
                </div>
            )}

            {predictionResult && (
                <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 border border-zinc-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                                <Activity size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-zinc-900">Health Prediction</h2>
                                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">AI Reliability Assessment</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-zinc-600 uppercase">System Health</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-32 h-2 bg-zinc-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${predictionResult.healthScore > 80 ? 'bg-green-500' : predictionResult.healthScore > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${predictionResult.healthScore}%` }}></div>
                                    </div>
                                    <span className="text-lg font-black text-zinc-900">{predictionResult.healthScore}%</span>
                                </div>
                            </div>

                            <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-4">
                                <div className="text-[10px] font-bold text-zinc-400 uppercase mb-2 flex items-center gap-1"><Zap size={10} /> AI Analysis</div>
                                <p className="text-sm text-zinc-700 leading-relaxed font-medium">&quot;{predictionResult.prediction}&quot;</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl">
                                    <div className="text-[10px] font-bold text-orange-800 uppercase mb-1">Risk Logic</div>
                                    <div className="text-sm font-bold text-orange-900">{predictionResult.estimatedFailureWeeks} Weeks <span className="text-[10px] font-normal opacity-70">est. failure</span></div>
                                </div>
                                <div className={`p-3 rounded-xl border ${predictionResult.priority === 'Critical' ? 'bg-red-50 border-red-100 text-red-900' : 'bg-green-50 border-green-100 text-green-900'}`}>
                                    <div className="text-[10px] font-bold uppercase mb-1 opacity-70">Priority</div>
                                    <div className="text-sm font-bold">{predictionResult.priority}</div>
                                </div>
                            </div>

                            <div className="bg-blue-600 text-white p-4 rounded-xl shadow-lg border border-blue-400/30">
                                <div className="text-[10px] font-bold uppercase opacity-80 mb-1 flex items-center gap-1"><CheckCircle2 size={12} /> Maintenance Suggestion</div>
                                <p className="text-sm font-bold">{predictionResult.recommendedAction}</p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setPredictionResult(null)}
                                className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-all"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    const item = equipment.find(e => e.id === showTelemetry);
                                    if (item) createMaintenanceTask(item, predictionResult);
                                }}
                                className="flex-1 py-3 bg-[#0f5c82] text-white rounded-xl font-bold hover:bg-[#0c4a6e] transition-all shadow-xl"
                            >
                                Create Task
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EquipmentView;
