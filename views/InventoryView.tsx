
import React, { useState, useRef } from 'react';
import { Package, Search, Filter, AlertTriangle, ArrowDown, Plus, History, X, ScanBarcode, Camera, Loader2, QrCode, MapPin, Image as ImageIcon, Sparkles, TrendingDown, Target, ShieldCheck } from 'lucide-react';
import { InventoryItem, PurchaseOrder } from '@/types';
import { useProjects } from '@/contexts/ProjectContext';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/contexts/ToastContext';
import FileUploadZone from '@/components/FileUploadZone';
import { runRawPrompt, parseAIJSON } from '@/services/geminiService';

const InventoryView: React.FC = () => {
    const { addToast } = useToast();
    const { inventory, addInventoryItem, updateInventoryItem, addPurchaseOrder, projects } = useProjects();
    const { vendors } = useTenant();
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

    // Form State
    const [newItem, setNewItem] = useState<Partial<InventoryItem>>({ status: 'In Stock', threshold: 10, stock: 0 });
    const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [predictions, setPredictions] = useState<Record<string, any>>({});

    const analyzeStockoutRisks = async () => {
        if (inventory.length === 0) return;
        setIsAnalyzing(true);
        try {
            const data = inventory.map(i => ({ name: i.name, stock: i.stock, threshold: i.threshold, unit: i.unit }));
            const prompt = `Analyze this construction inventory: ${JSON.stringify(data)}. For each item, predict days until stockout based on typical project velocity. Return JSON: { predictions: { [itemName]: { daysLeft: number, risk: "High"|"Medium"|"Low", recommendation: string } } }`;
            const res = await runRawPrompt(prompt, { model: 'gemini-1.5-flash', responseMimeType: 'application/json' });
            const result = parseAIJSON(res);
            setPredictions(result.predictions || {});
        } catch (e) {
            console.error("AI Analysis failed", e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    React.useEffect(() => {
        analyzeStockoutRisks();
    }, [inventory.length]);

    const filteredInventory = inventory.filter(i =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedItem = inventory.find(i => i.id === selectedItemId);

    const lowStockCount = inventory.filter(i => i.stock <= i.threshold).length;
    const totalValue = inventory.reduce((acc, item) => acc + (item.stock * (item.costPerUnit || 0)), 0);

    const handleCreate = () => {
        if (newItem.name && newItem.category) {
            const item: InventoryItem = {
                id: `INV-${Date.now()}`,
                companyId: 'c1',
                name: newItem.name!,
                category: newItem.category!,
                stock: newItem.stock || 0,
                unit: newItem.unit || 'Units',
                threshold: newItem.threshold || 10,
                location: newItem.location || 'Unassigned',
                status: (newItem.stock || 0) === 0 ? 'Out of Stock' : (newItem.stock || 0) <= (newItem.threshold || 10) ? 'Low Stock' : 'In Stock',
                lastOrderDate: new Date().toISOString().split('T')[0],
                costPerUnit: newItem.costPerUnit || 0,
                image: tempImageUrl || undefined
            };
            addInventoryItem(item);
            setShowModal(false);
            setNewItem({ status: 'In Stock', threshold: 10, stock: 0 });
            setTempImageUrl(null);
        }
    };

    const handleReorder = async (id: string) => {
        // Find the item
        const item = inventory.find(i => i.id === id);
        if (item) {
            // Smart Vendor Selection (Mock logic: pick preferred or first)
            const preferredVendor = vendors.find(v => v.category === item.category && v.status === 'Preferred') || vendors[0];
            const reorderQty = item.threshold * 5; // Simple reorder logic
            const cost = item.costPerUnit || 10;

            const newPO: PurchaseOrder = {
                id: crypto.randomUUID(),
                number: `PO-2025-${Math.floor(Math.random() * 9000 + 1000)}`,
                vendor: preferredVendor?.name || 'Generic Supplier',
                date: new Date().toISOString().split('T')[0],
                amount: reorderQty * cost,
                status: 'pending_approval',
                createdBy: 'Inventory System',
                items: [
                    { description: item.name, quantity: reorderQty, unitPrice: cost, total: reorderQty * cost }
                ],
                approvers: [
                    { id: 'a1', name: 'Finance Mgr', role: 'Finance', status: 'pending' }
                ],
                notes: 'Auto-generated by Smart Reorder',
                projectId: projects[0]?.id || 'p1', // Default to first project
                createdAt: new Date().toISOString()
            };

            await addPurchaseOrder(newPO);
            addToast(`Reorder PO generated for ${item.name}`, 'success');
        }
    };

    const simulateScan = () => {
        setScanning(true);
        // Simulate processing time
        setTimeout(() => {
            setScanning(false);
            setShowScanner(false);
            // Pick a random item to "find" or mock a specific SKU
            if (inventory.length > 0) {
                const randomItem = inventory[Math.floor(Math.random() * inventory.length)];
                setSearchQuery(randomItem.id); // Filter to this item
                setSelectedItemId(randomItem.id);
                addToast(`SKU Identified: ${randomItem.name}`, 'success');
            } else {
                addToast("No matching item found in database.", 'error');
            }
        }, 2000);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto h-full flex flex-col relative animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Material Inventory</h1>
                <p className="text-slate-400">Track stock levels, logistics, and automated reordering</p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center gap-4 shadow-lg backdrop-blur-sm">
                    <div className="p-3 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20"><Package size={24} /></div>
                    <div>
                        <div className="text-2xl font-black text-white">{inventory.length}</div>
                        <div className="text-xs text-slate-400 font-bold uppercase">Total SKUs</div>
                    </div>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center gap-4 shadow-lg backdrop-blur-sm">
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20"><ArrowDown size={24} /></div>
                    <div>
                        <div className="text-2xl font-black text-white">£{totalValue.toLocaleString()}</div>
                        <div className="text-xs text-slate-400 font-bold uppercase">Value In Stock</div>
                    </div>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center gap-4 shadow-lg backdrop-blur-sm">
                    <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20"><AlertTriangle size={24} /></div>
                    <div>
                        <div className="text-2xl font-black text-white">{lowStockCount}</div>
                        <div className="text-xs text-slate-400 font-bold uppercase">Low Stock Alerts</div>
                    </div>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center gap-4 shadow-lg backdrop-blur-sm">
                    <div className="p-3 bg-violet-500/10 text-violet-400 rounded-lg border border-violet-500/20"><History size={24} /></div>
                    <div>
                        <div className="text-2xl font-black text-white">12</div>
                        <div className="text-xs text-slate-400 font-bold uppercase">Pending Orders</div>
                    </div>
                </div>
            </div>

            {/* AI Logistics Alert */}
            {isAnalyzing ? (
                <div className="mb-8 p-6 bg-sky-900/20 border border-sky-500/30 rounded-2xl flex items-center justify-between animate-pulse shadow-[0_0_20px_rgba(14,165,233,0.1)]">
                    <div className="flex items-center gap-3">
                        <Sparkles className="text-sky-400" />
                        <div className="text-sm font-bold text-sky-300">AI Logistics Engine is analyzing consumption velocity...</div>
                    </div>
                </div>
            ) : Object.keys(predictions).length > 0 && (
                <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 bg-gradient-to-r from-sky-900/90 to-indigo-900/90 border border-sky-500/30 p-6 rounded-2xl text-white shadow-xl flex items-center justify-between relative overflow-hidden backdrop-blur-md">
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
                                <ShieldCheck size={20} className="text-emerald-400" /> Supply Chain Resilience Active
                            </h3>
                            <p className="text-sky-100/80 text-xs max-w-md leading-relaxed">
                                AI has identified {Object.values(predictions).filter((p: any) => p.risk === 'High').length} critical stockout risks.
                                Recommended proactive reordering for materials with less than 7 days velocity.
                            </p>
                        </div>
                        <button
                            onClick={analyzeStockoutRisks}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold backdrop-blur-md transition-all border border-white/10 relative z-10"
                        >
                            Refresh Analysis
                        </button>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl shadow-lg flex flex-col justify-center backdrop-blur-sm">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-3">
                            <TrendingDown size={14} className="text-rose-500" /> Highest Velocity Item
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-lg font-black text-white leading-none truncate max-w-[150px]">{inventory.sort((a, b) => b.stock - a.stock)[0]?.name || 'N/A'}</p>
                                <p className="text-[10px] text-slate-500 mt-1">Depletion in ~3 days</p>
                            </div>
                            <div className="text-right">
                                <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] px-2 py-1 rounded-full font-bold shadow-[0_0_10px_rgba(244,63,94,0.2)]">CRITICAL</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3 flex-1">
                    <div className="relative w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search materials..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-transparent placeholder-slate-600 shadow-inner"
                        />
                    </div>
                    <button
                        onClick={() => setShowScanner(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-all shadow-lg hover:shadow-sky-500/10 group"
                    >
                        <ScanBarcode size={16} className="text-sky-500 group-hover:scale-110 transition-transform" /> Scan QR
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-all shadow-lg">
                        <Filter size={16} className="text-slate-400" /> Category
                    </button>
                </div>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 text-white rounded-xl text-sm font-bold hover:bg-sky-500 shadow-lg shadow-sky-500/20 transition-all hover:scale-105 active:scale-95">
                    <Plus size={16} /> Add Item
                </button>
            </div>

            {/* Inventory Table */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl shadow-xl overflow-hidden flex-1 overflow-y-auto backdrop-blur-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950/80 text-slate-400 text-xs uppercase border-b border-slate-800 sticky top-0 z-10 backdrop-blur-md">
                        <tr>
                            <th className="px-6 py-4 font-bold tracking-wider">Item Name</th>
                            <th className="px-6 py-4 font-bold tracking-wider">Category</th>
                            <th className="px-6 py-4 font-bold tracking-wider">Stock Level</th>
                            <th className="px-6 py-4 font-bold tracking-wider">Location</th>
                            <th className="px-6 py-4 font-bold tracking-wider">Replenishment Risk</th>
                            <th className="px-6 py-4 font-bold tracking-wider text-center">Status</th>
                            <th className="px-6 py-4 font-bold tracking-wider text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {filteredInventory.map((item) => (
                            <tr
                                key={item.id}
                                onClick={() => setSelectedItemId(item.id)}
                                className="hover:bg-slate-800/50 transition-colors group cursor-pointer"
                            >
                                <td className="px-6 py-4">
                                    <div className="font-bold text-white group-hover:text-sky-400 transition-colors">{item.name}</div>
                                    <div className="text-xs text-slate-500 font-mono">{item.id}</div>
                                </td>
                                <td className="px-6 py-4 text-slate-400">{item.category}</td>
                                <td className="px-6 py-4">
                                    <div className="font-medium text-white">{item.stock} <span className="text-slate-500 font-normal text-xs">{item.unit}</span></div>
                                    {item.stock <= item.threshold && (
                                        <div className="text-[10px] text-amber-500 font-bold mt-1">Below Threshold: {item.threshold}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-slate-400">{item.location}</td>
                                <td className="px-6 py-4 min-w-[200px]">
                                    {predictions[item.name] ? (
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`w-1.5 h-1.5 rounded-full ${predictions[item.name].risk === 'High' ? 'bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]' :
                                                    predictions[item.name].risk === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                                                    }`}></span>
                                                <span className="text-xs font-bold text-slate-300">{predictions[item.name].daysLeft} Days Left</span>
                                            </div>
                                            <p className="text-[9px] text-slate-500 leading-tight italic truncate max-w-[180px]" title={predictions[item.name].recommendation}>
                                                &quot;{predictions[item.name].recommendation}&quot;
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-[10px] text-slate-600 italic">
                                            <div className="w-8 h-1 bg-slate-800 rounded-full animate-pulse"></div> Analyzing...
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border ${item.status === 'In Stock' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                        item.status === 'Low Stock' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                            'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                        }`}>
                                        {item.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleReorder(item.id); }}
                                        className="text-sky-400 hover:text-sky-300 hover:underline text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        Quick Reorder
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredInventory.length === 0 && (
                    <div className="p-20 text-center text-slate-500 italic">
                        <Package className="mx-auto mb-4 opacity-20" size={48} />
                        No items found in inventory.
                    </div>
                )}
            </div>

            {/* Scanner Modal */}
            {showScanner && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-black w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative border border-slate-800">
                        <div className="aspect-[3/4] relative bg-slate-900">
                            {/* Simulated Camera View */}
                            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=800&q=80')] bg-cover opacity-40 mix-blend-overlay"></div>

                            {/* Scanning UI */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <div className="w-64 h-64 border-2 border-white/30 rounded-3xl relative overflow-hidden backdrop-blur-sm shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 -mt-1 -ml-1"></div>
                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 -mt-1 -mr-1"></div>
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 -mb-1 -ml-1"></div>
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 -mb-1 -mr-1"></div>

                                    {scanning ? (
                                        <>
                                            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.8)] animate-[scan_1.5s_ease-in-out_infinite]"></div>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <QrCode size={120} className="text-emerald-500/20 animate-pulse" />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <ScanBarcode size={48} className="text-white/50" />
                                        </div>
                                    )}
                                </div>
                                <p className="text-white/90 mt-8 font-bold animate-pulse bg-slate-900/80 px-6 py-2 rounded-full text-sm backdrop-blur-md border border-slate-700">
                                    {scanning ? 'Identifying SKU...' : 'Align Barcode / QR Code'}
                                </p>
                            </div>

                            <button
                                onClick={() => setShowScanner(false)}
                                className="absolute top-4 right-4 p-3 bg-black/40 text-white rounded-full hover:bg-black/60 backdrop-blur-md transition-colors"
                            >
                                <X size={24} />
                            </button>

                            <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                                <button
                                    onClick={simulateScan}
                                    disabled={scanning}
                                    className="w-20 h-20 bg-white rounded-full border-4 border-slate-800 flex items-center justify-center hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-white/20"
                                >
                                    {scanning ? <Loader2 size={40} className="animate-spin text-slate-800" /> : <Camera size={32} className="text-slate-800" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Item Modal */}
            {showModal && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-800">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                            <h3 className="text-lg font-bold text-white">Add Inventory Item</h3>
                            <button onClick={() => setShowModal(false)}><X size={20} className="text-slate-500 hover:text-white transition-colors" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Item Name</label>
                                <input type="text" className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none" value={newItem.name || ''} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Category</label>
                                    <select className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white outline-none" value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}>
                                        <option value="">Select...</option>
                                        <option value="Raw Materials">Raw Materials</option>
                                        <option value="Safety Gear">Safety Gear</option>
                                        <option value="Consumables">Consumables</option>
                                        <option value="Tools">Tools</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Location</label>
                                    <input type="text" className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none" value={newItem.location || ''} onChange={e => setNewItem({ ...newItem, location: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Initial Stock</label>
                                    <input type="number" className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none" value={newItem.stock} onChange={e => setNewItem({ ...newItem, stock: parseInt(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Unit</label>
                                    <input type="text" className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none" placeholder="e.g. Bags" value={newItem.unit || ''} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Threshold</label>
                                    <input type="number" className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none" value={newItem.threshold} onChange={e => setNewItem({ ...newItem, threshold: parseInt(e.target.value) })} />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Cost Per Unit (£)</label>
                                <input type="number" className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none" value={newItem.costPerUnit} onChange={e => setNewItem({ ...newItem, costPerUnit: parseFloat(e.target.value) })} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-3">Item Photo</label>
                                {tempImageUrl ? (
                                    <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-800">
                                        <img src={tempImageUrl} className="w-full h-full object-cover" alt="Item Preview" />
                                        <button
                                            onClick={() => setTempImageUrl(null)}
                                            className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <FileUploadZone
                                        onUploadComplete={(url) => setTempImageUrl(url)}
                                        allowedTypes={['image/*']}
                                        label="Upload product photo"
                                        description="JPG or PNG"
                                    />
                                )}
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-3">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-400 font-bold hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
                            <button onClick={handleCreate} disabled={!newItem.name || !newItem.category} className="px-6 py-2 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-500 shadow-lg shadow-sky-500/20 disabled:opacity-50 disabled:shadow-none">Add Item</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Item Details Side Panel */}
            {selectedItem && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex justify-end transition-opacity" onClick={() => setSelectedItemId(null)}>
                    <div
                        className="w-full max-w-md bg-slate-900 h-full shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto border-l border-slate-800"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="relative">
                            <button
                                onClick={() => setSelectedItemId(null)}
                                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors z-10"
                            >
                                <X size={20} />
                            </button>

                            {/* Header Banner */}
                            <div className="h-40 bg-gradient-to-br from-slate-800 to-slate-900 p-8 flex flex-col justify-end relative overflow-hidden">
                                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1504917538177-323f9d3e5873?auto=format&fit=crop&w=800&q=80')] bg-cover opacity-10 mix-blend-overlay"></div>
                                <h2 className="text-3xl font-black text-white mb-1 relative z-10">{selectedItem.name}</h2>
                                <p className="text-slate-400 text-xs font-mono relative z-10">{selectedItem.id}</p>
                            </div>

                            <div className="p-8 space-y-6">
                                {/* Status Section */}
                                <div className="flex justify-between items-center p-4 bg-slate-950/50 rounded-xl border border-slate-800">
                                    <div>
                                        <div className="text-xs font-bold text-slate-500 uppercase mb-1">Current Status</div>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${selectedItem.status === 'In Stock' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                            selectedItem.status === 'Low Stock' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                            }`}>
                                            {selectedItem.status}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-slate-500 uppercase mb-1">Stock Level</div>
                                        <div className="text-xl font-bold text-white">{selectedItem.stock} <span className="text-sm font-medium text-slate-500">{selectedItem.unit}</span></div>
                                    </div>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Category</label>
                                        <div className="font-medium text-slate-200">{selectedItem.category}</div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Location</label>
                                        <div className="font-medium text-slate-200 flex items-center gap-2">
                                            <MapPin size={14} className="text-slate-500" />
                                            {selectedItem.location}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Cost Per Unit</label>
                                        <div className="font-medium text-slate-200">£{selectedItem.costPerUnit?.toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Total Value</label>
                                        <div className="font-medium text-slate-200">£{((selectedItem.costPerUnit || 0) * selectedItem.stock).toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Reorder Threshold</label>
                                        <div className="font-medium text-slate-200">{selectedItem.threshold} {selectedItem.unit}</div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Last Order</label>
                                        <div className="font-medium text-slate-200">{selectedItem.lastOrderDate || 'N/A'}</div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="pt-6 border-t border-slate-800">
                                    <button
                                        onClick={() => handleReorder(selectedItem.id)}
                                        className="w-full py-4 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-500 transition-all shadow-lg shadow-sky-600/20 active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <Package size={18} /> Place Reorder
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryView;
