
import React, { useState, useEffect } from 'react';
import { ShoppingCart, Package, Truck, BarChart3, Plus, Search, Filter, Check, AlertCircle, Sparkles, CheckCircle2, Clock, MapPin, TrendingUp, X } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { useProjects } from '@/contexts/ProjectContext';
import { PurchaseOrder, Vendor, Transaction } from '@/types';
import { useTenant } from '@/contexts/TenantContext';
import SupplyChainIntelligence from '@/components/SupplyChainIntelligence';
import { runRawPrompt, parseAIJSON } from '@/services/geminiService';

const ProcurementView: React.FC = () => {
  const { addToast } = useToast();
  const { inventory, updateInventoryItem, transactions, addTransaction, purchaseOrders, addPurchaseOrder, updatePurchaseOrder, projects } = useProjects();
  const { vendors } = useTenant();
  const [activeTab, setActiveTab] = useState<'VENDORS' | 'ORDERS' | 'APPROVALS' | 'LOGISTICS'>('VENDORS');
  const [showSmartPO, setShowSmartPO] = useState(false);
  const [poGenerating, setPoGenerating] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  const [isAnalyzingLogistics, setIsAnalyzingLogistics] = useState(false);
  const [logisticsRisks, setLogisticsRisks] = useState<Record<string, any>>({});
  const [approverComment, setApproverComment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [recommendedVendors, setRecommendedVendors] = useState<any[]>([]);
  const [isFindingVendors, setIsFindingVendors] = useState(false);

  const lowStockItems = inventory.filter(item => item.stock <= item.threshold);

  const analyzeLogisticsRisks = async () => {
    const activeOrders = purchaseOrders.filter(po => po.status === 'approved' || po.status === 'completed');
    if (activeOrders.length === 0) return;
    setIsAnalyzingLogistics(true);
    try {
      const data = activeOrders.map(po => ({ number: po.number, vendor: po.vendor, date: po.date }));
      const prompt = `Analyze these construction material shipments: ${JSON.stringify(data)}. Return JSON: { risks: { [poNumber]: { probability: number, reason: string } } }`;
      const res = await runRawPrompt(prompt, { model: 'gemini-1.5-flash', responseMimeType: 'application/json' });
      const result = parseAIJSON(res);
      setLogisticsRisks(result.risks || {});
    } catch (e) {
      console.error("Logistics analysis failed", e);
    } finally {
      setIsAnalyzingLogistics(false);
    }
  };

  const findRecommendedVendors = async (item: string) => {
    setIsFindingVendors(true);
    try {
      const prompt = `Recommend top 2 vendors for "${item}" from: ${JSON.stringify(vendors)}. Return JSON: { recommendations: [{name, reason, score}] }`;
      const res = await runRawPrompt(prompt, { model: 'gemini-1.5-flash', responseMimeType: 'application/json' });
      const data = parseAIJSON(res);
      setRecommendedVendors(data.recommendations || []);
    } catch (e) {
      setRecommendedVendors(vendors.slice(0, 2).map(v => ({ name: v.name, reason: "Historical preferred vendor", score: v.rating * 10 })));
    } finally {
      setIsFindingVendors(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'LOGISTICS') analyzeLogisticsRisks();
  }, [activeTab]);

  useEffect(() => {
    if (showSmartPO && lowStockItems.length > 0) findRecommendedVendors(lowStockItems[0].name);
  }, [showSmartPO]);

  const filteredOrders = purchaseOrders.filter(po =>
    po.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.vendor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleApprove = async (po: PurchaseOrder, approverId: string) => {
    const updatedApprovers = po.approvers.map(a =>
      a.id === approverId ? { ...a, status: 'approved' as const, timestamp: new Date().toLocaleString(), comment: approverComment } : a
    );
    const allApproved = updatedApprovers.every(a => a.status !== 'pending' && a.status !== 'rejected');
    const newStatus = allApproved ? 'approved' : 'pending_approval';

    try {
      await updatePurchaseOrder(po.id, { approvers: updatedApprovers, status: newStatus as any });

      if (allApproved) {
        await addTransaction({
          id: `txn-${Date.now()}`,
          companyId: 'c1',
          projectId: po.projectId || 'p1',
          date: new Date().toISOString().split('T')[0],
          description: `PO ${po.number} Approval: ${po.vendor}`,
          amount: po.amount,
          type: 'expense',
          category: 'Procurement',
          status: 'pending',
          linkedPurchaseOrderId: po.id
        });
        addToast(`PO ${po.number} approved and transaction recorded.`, "success");
        setApproverComment('');
      } else {
        addToast(`Approval recorded for ${po.number}`, "success");
      }
    } catch (e) {
      addToast("Failed to update approval", "error");
    }
  };

  const handleMarkReceived = async (po: PurchaseOrder) => {
    try {
      // 1. Update PO status
      await updatePurchaseOrder(po.id, { status: 'received' });

      // 2. Update Inventory Stock
      const matchingItem = inventory.find(i =>
        po.items.some(poItem => poItem.description.toLowerCase().includes(i.name.toLowerCase()) || i.name.toLowerCase().includes(poItem.description.toLowerCase()))
      );

      if (matchingItem) {
        const receivedQty = po.items.reduce((acc, item) => acc + item.quantity, 0);
        const newStock = matchingItem.stock + receivedQty;

        await updateInventoryItem(matchingItem.id, {
          stock: newStock,
          status: newStock > matchingItem.threshold ? 'In Stock' : 'Low Stock',
          lastOrderDate: new Date().toISOString().split('T')[0]
        });
        addToast(`Goods received. Updated stock for ${matchingItem.name}.`, "success");
      } else {
        addToast(`Goods received. (No matching inventory item found to update automatically)`, "warning");
      }

    } catch (e) {
      addToast("Failed to process receipt", "error");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto relative animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <SupplyChainIntelligence />
      </div>

      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-3 tracking-tight">
            <ShoppingCart className="text-sky-500" /> Intelligent Procurement
          </h1>
          <p className="text-slate-400">Vendor management, smart reordering, and supply chain tracking.</p>
        </div>
        <button
          onClick={() => setShowSmartPO(true)}
          className="bg-sky-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-sky-500 shadow-lg shadow-sky-500/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 border border-sky-400/20"
        >
          <Sparkles size={18} className="text-amber-300" /> Smart Reorder
        </button>
      </div>

      <div className="flex gap-1 border-b border-slate-800 mb-6 overflow-x-auto">
        {['VENDORS', 'ORDERS', 'APPROVALS', 'LOGISTICS'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === tab
              ? 'border-sky-500 text-sky-400 bg-sky-500/5'
              : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
          >
            {tab === 'VENDORS' && <Truck size={16} />}
            {tab === 'ORDERS' && <Package size={16} />}
            {tab === 'APPROVALS' && <CheckCircle2 size={16} />}
            {tab === 'LOGISTICS' && <MapPin size={16} />}
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl shadow-xl overflow-hidden min-h-[400px] backdrop-blur-sm">
        {activeTab === 'VENDORS' && (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-xs backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 font-bold tracking-wider">Vendor Name</th>
                <th className="px-6 py-4 font-bold tracking-wider">Performance</th>
                <th className="px-6 py-4 font-bold tracking-wider">Active Orders</th>
                <th className="px-6 py-4 font-bold tracking-wider">Total Spend</th>
                <th className="px-6 py-4 font-bold tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {vendors.map((v, i) => (
                <tr key={i} className="hover:bg-slate-800/50 transition-colors group">
                  <td className="px-6 py-4 font-bold text-white group-hover:text-sky-400 transition-colors">{v.name}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]`} style={{ width: `${v.rating}%` }}></div>
                      </div>
                      <span className="text-xs font-bold text-emerald-400">{v.rating}/100</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-400">{v.activeOrders}</td>
                  <td className="px-6 py-4 font-mono text-slate-300">{v.spend}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold uppercase px-2 py-1 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">{v.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'ORDERS' && (
          <div className="p-6 space-y-4">
            {filteredOrders.map(po => (
              <div key={po.id} className="border border-slate-700 bg-slate-800/30 rounded-lg p-4 hover:shadow-lg hover:bg-slate-800/50 transition-all cursor-pointer group">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-white group-hover:text-sky-400 transition-colors">{po.number} - {po.vendor}</h4>
                  <div className="flex gap-2">
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase">{po.status}</span>
                    {po.status === 'approved' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkReceived(po); }}
                        className="bg-sky-600 text-white px-3 py-1 rounded text-[10px] font-bold hover:bg-sky-500 shadow-lg shadow-sky-500/20"
                      >
                        Receive
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm font-mono mt-2 text-slate-300">£{po.amount.toLocaleString()}</p>
              </div>
            ))}
            {filteredOrders.length === 0 && (
              <div className="text-center text-slate-500 py-10 italic">No orders found.</div>
            )}
          </div>
        )}

        {activeTab === 'APPROVALS' && (
          <div className="p-6">
            {purchaseOrders.filter(p => p.status === 'pending_approval').map(po => (
              <div key={po.id} className="border border-amber-500/30 bg-amber-500/5 p-4 rounded-xl mb-4 shadow-[0_0_15px_rgba(245,158,11,0.05)]">
                <div className="flex justify-between mb-4">
                  <h4 className="font-bold text-amber-200">{po.number} - {po.vendor}</h4>
                  <span className="font-black text-white">£{po.amount.toLocaleString()}</span>
                </div>
                <div className="space-y-2">
                  {po.approvers.map(a => (
                    <div key={a.id} className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                      <div><p className="font-bold text-white">{a.name}</p><p className="text-xs text-slate-500">{a.role}</p></div>
                      {a.status === 'pending' && <button onClick={() => handleApprove(po, a.id)} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all">Approve</button>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {purchaseOrders.filter(p => p.status === 'pending_approval').length === 0 && (
              <div className="text-center text-slate-500 py-10 italic flex flex-col items-center">
                <CheckCircle2 size={48} className="text-slate-700 mb-2" />
                No pending approvals.
              </div>
            )}
          </div>
        )}

        {activeTab === 'LOGISTICS' && (
          <div className="p-6 space-y-8 animate-in fade-in transition-all">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-slate-950 rounded-2xl p-6 relative overflow-hidden min-h-[400px] border border-slate-800">
                <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1200&q=80')] bg-cover mix-blend-overlay"></div>
                <div className="relative z-10 flex flex-col h-full">
                  <h3 className="text-white font-bold flex items-center gap-2 mb-1"><MapPin className="text-sky-400" /> Supply Chain Map</h3>
                  <p className="text-slate-500 text-xs mb-6">AI processing geo-transit and regional weather volatility.</p>
                  <div className="flex-1 bg-sky-900/10 rounded-xl border border-sky-500/10 flex flex-col items-center justify-center mb-6 relative">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-sky-500/10 via-transparent to-transparent"></div>
                    <Truck className="text-sky-400 animate-pulse mb-2 relative z-10" size={40} />
                    <span className="text-sky-200 font-mono text-xs relative z-10">EN ROUTE: PO-2025-894</span>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {vendors.slice(0, 3).map((v, i) => (
                      <div key={i} className="min-w-[150px] bg-slate-900/80 border border-slate-700 p-2 rounded-lg backdrop-blur-md">
                        <p className="text-[10px] text-white font-bold truncate">{v.name}</p>
                        <p className="text-[9px] text-slate-400">ETA: {i + 3} Days</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl">
                  <h4 className="text-xs font-bold text-amber-400 uppercase flex items-center gap-2 mb-4"><AlertCircle size={16} /> AI Transit Risk</h4>
                  <div className="space-y-4">
                    {purchaseOrders.filter(p => p.status === 'approved' || p.status === 'completed').map(po => (
                      <div key={po.id} className="border-l-2 border-amber-500/50 pl-3">
                        <div className="flex justify-between text-[10px] font-bold mb-1">
                          <span className="text-slate-400">{po.number}</span>
                          <span className="text-amber-500">{logisticsRisks[po.number]?.probability || 'Low'}% RISK</span>
                        </div>
                        <p className="text-sm font-bold text-white">{po.vendor}</p>
                        <p className="text-[10px] text-slate-500 mt-1 italic">{logisticsRisks[po.number]?.reason || 'Standard transit detected.'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showSmartPO && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-slate-800">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-white"><Sparkles className="text-sky-500" /> AI Smart Reorder</h3>
            {isFindingVendors ? <p className="animate-pulse text-sky-400">Finding best local matches...</p> : (
              <div className="space-y-4">
                {recommendedVendors.map((v, i) => (
                  <div key={i} className="p-3 border border-slate-800 rounded-xl bg-slate-950/50 hover:border-sky-500/30 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold text-white">{v.name}</p>
                      <span className="text-sky-400 font-bold text-xs">{v.score}% match</span>
                    </div>
                    <p className="text-xs text-slate-500 italic">{v.reason}</p>
                  </div>
                ))}
                <button onClick={async () => {
                  const vendor = recommendedVendors[0];
                  if (!vendor) return;
                  const item = lowStockItems[0];
                  if (!item) {
                    addToast("No items below threshold to reorder.", "warning");
                    return;
                  }

                  const newPO: PurchaseOrder = {
                    id: crypto.randomUUID(),
                    number: `PO-2025-${Math.floor(Math.random() * 1000)}`,
                    vendor: vendor.name,
                    date: new Date().toISOString().split('T')[0],
                    amount: (item.costPerUnit || 100) * 100, // Assuming reorder of 100 units
                    status: 'pending_approval',
                    createdBy: 'Smart Reorder AI',
                    items: [
                      { description: item.name, quantity: 100, unitPrice: item.costPerUnit || 100, total: (item.costPerUnit || 100) * 100 }
                    ],
                    notes: 'Auto-generated by Smart Reorder',
                    approvers: [
                      { id: 'a1', name: 'Finance Mgr', role: 'Finance', status: 'pending' }
                    ],
                    projectId: projects[0]?.id || 'p1',
                    createdAt: new Date().toISOString()
                  };
                  await addPurchaseOrder(newPO);
                  addToast(`Smart PO created for ${vendor.name}`, "success");
                  setShowSmartPO(false);
                }} className="w-full py-3 bg-sky-600 text-white rounded-xl font-bold mt-4 hover:bg-sky-500 shadow-lg shadow-sky-600/20 transition-all">Generate Suggested PO</button>
              </div>
            )}
            <button onClick={() => setShowSmartPO(false)} className="w-full py-2 text-slate-500 text-sm mt-2 hover:text-white transition-colors">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcurementView;
