import React, { useState } from 'react';
import { useProjects } from '@/contexts/ProjectContext';
import { Daywork } from '@/types';
import { Plus, Clock, Hammer, Truck, FileText, ChevronRight, Calculator, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

const DayworksView: React.FC = () => {
    const { dayworks, addDaywork } = useProjects();
    const { addToast } = useToast();

    // Calculate total pending costs
    const pendingTotal = dayworks
        .filter(d => d.status === 'Pending')
        .reduce((sum, d) => sum + (d.grandTotal || 0), 0);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Context Header */}
            <div className="bg-gradient-to-br from-orange-600 to-amber-700 rounded-2xl p-6 text-white shadow-xl shadow-orange-500/10 flex justify-between items-center relative overflow-hidden border border-orange-500/30">
                <div className="relative z-10">
                    <h2 className="text-2xl font-black mb-1 flex items-center gap-2">
                        <Hammer className="text-orange-200" /> Daywork Control
                    </h2>
                    <p className="text-orange-100 text-sm max-w-lg">
                        Track Time & Materials (T&M) for out-of-scope work. Ensure all sheets are signed off by the client before billing.
                    </p>
                </div>
                <div className="text-right relative z-10">
                    <div className="text-xs font-bold text-orange-200 uppercase tracking-wider">Unbilled Pending</div>
                    <div className="text-4xl font-black">£{pendingTotal.toLocaleString()}</div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            </div>

            {/* List & Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Main List */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-white">Recent Sheets</h3>
                        <button className="text-amber-500 hover:text-amber-400 hover:underline text-sm font-bold transition-colors">View All Archive</button>
                    </div>

                    {dayworks.length > 0 ? (
                        dayworks.map(sheet => (
                            <div key={sheet.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-amber-500/30 hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:bg-slate-800/80 transition-all cursor-pointer group backdrop-blur-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg flex items-center justify-center font-bold">
                                            DW
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-200 group-hover:text-amber-400 transition-colors">
                                                {sheet.description}
                                            </h4>
                                            <div className="text-xs text-slate-500 flex items-center gap-2">
                                                <Clock size={12} /> {sheet.date}
                                                <span className="text-slate-700">|</span>
                                                <span className="font-mono text-slate-400">ID: {sheet.id.slice(0, 8)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${sheet.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                            sheet.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                        }`}>
                                        {sheet.status}
                                    </div>
                                </div>

                                {/* Resource Breakdown Mini-table */}
                                <div className="bg-slate-950/50 rounded-lg p-3 grid grid-cols-3 gap-4 mb-3 border border-slate-800">
                                    <div className="text-center">
                                        <div className="text-[10px] text-slate-500 font-bold uppercase">Labor Hrs</div>
                                        <div className="font-bold text-slate-300">{sheet.totalLaborCost ? `${(sheet.totalLaborCost / 50).toFixed(1)}h` : '-'}</div>
                                    </div>
                                    <div className="text-center border-l border-slate-800">
                                        <div className="text-[10px] text-slate-500 font-bold uppercase">Material</div>
                                        <div className="font-bold text-slate-300">£{sheet.totalMaterialCost?.toFixed(0) || 0}</div>
                                    </div>
                                    <div className="text-center border-l border-slate-800">
                                        <div className="text-[10px] text-slate-500 font-bold uppercase">Total</div>
                                        <div className="font-black text-amber-400">£{sheet.grandTotal?.toFixed(2) || 0}</div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center">
                                    <div className="flex -space-x-2">
                                        {/* Avatar Placeholders for assigned crew */}
                                        <div className="w-6 h-6 rounded-full bg-slate-700 border-2 border-slate-900"></div>
                                        <div className="w-6 h-6 rounded-full bg-slate-600 border-2 border-slate-900"></div>
                                    </div>
                                    <div className="text-xs text-amber-500 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform group-hover:text-amber-400">
                                        Review Sheet <ChevronRight size={14} />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-slate-900/30 border md:border-dashed border-slate-800 rounded-xl p-10 text-center">
                            <Truck className="mx-auto text-slate-600 mb-4" size={48} />
                            <h3 className="font-bold text-slate-200">No Daywork Sheets</h3>
                            <p className="text-slate-500 text-sm">Create a new sheet to record extra works.</p>
                        </div>
                    )}
                </div>

                {/* Sidebar / Tools */}
                <div className="space-y-4">
                    <button className="w-full py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-500 transition-all shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2">
                        <Plus size={18} /> New Daywork Sheet
                    </button>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 shadow-sm backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-3 text-white font-bold">
                            <Calculator size={18} className="text-amber-500" /> Quick Estimator
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Labor Hours</label>
                                <input type="number" className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" placeholder="e.g. 8" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Crew Size</label>
                                <input type="number" className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" placeholder="e.g. 3" />
                            </div>
                            <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400">Est. Cost:</span>
                                <span className="font-black text-emerald-400">£0.00</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                        <h4 className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2">
                            <AlertTriangle size={14} /> Approval Policy
                        </h4>
                        <p className="text-xs text-amber-200/70 leading-relaxed">
                            Daywork sheets exceeding £1,000 require Client Representative signature before billing.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DayworksView;
