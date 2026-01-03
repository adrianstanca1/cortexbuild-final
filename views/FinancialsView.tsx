
import React, { useState, useMemo } from 'react';
import { PoundSterling, TrendingUp, PieChart, ArrowUpRight, ArrowDownRight, Download, Filter, Calendar, FileText, DollarSign, AlertCircle, CheckCircle2, Eye, Plus, Zap, Loader2, ShieldAlert, Sparkles, Info, X, Brain } from 'lucide-react';
import { useProjects } from '../contexts/ProjectContext';
import { runRawPrompt, parseAIJSON } from '@/services/geminiService';
import { Transaction, UserRole } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import BudgetForecasting from '@/components/BudgetForecasting';
import FileUploadZone from '@/components/FileUploadZone';
import InvoicingView from './InvoicingView';
import ExpensesView from './ExpensesView';
import DayworksView from './DayworksView';

const FinancialsView: React.FC = () => {
  const { addToast } = useToast();
  const { transactions, projects, addTransaction, costCodes, activeProject: contextActiveProject } = useProjects();
  const { requireRole, currentTenant } = useTenant();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'CASHFLOW' | 'BUDGET' | 'TRANSACTIONS' | 'INVOICING' | 'EXPENSES' | 'DAYWORKS'>('CASHFLOW');
  const [filterMonth, setFilterMonth] = useState('2025-12');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCostCodeModal, setShowCostCodeModal] = useState(false);

  // AI State
  const [isForecasting, setIsForecasting] = useState(false);
  const [forecastData, setForecastData] = useState<any>(null);
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [isAnalyzingInsights, setIsAnalyzingInsights] = useState(false);
  const [showInvoiceScan, setShowInvoiceScan] = useState(false);
  const [invoiceAnalysis, setInvoiceAnalysis] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzingVariance, setIsAnalyzingVariance] = useState(false);
  const [varianceExplanation, setVarianceExplanation] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const stats = useMemo(() => {
    const totalRev = transactions.reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum, 0);
    const totalCost = transactions.reduce((sum, t) => t.type === 'expense' ? sum + Math.abs(t.amount) : sum, 0);
    const netProfit = totalRev - totalCost;
    const margin = totalRev > 0 ? Math.round((netProfit / totalRev) * 100) : 0;
    return { totalRev, totalCost, netProfit, margin };
  }, [transactions]);

  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();

    return months.map((m, i) => {
      const monthPrefix = `${currentYear}-${(i + 1).toString().padStart(2, '0')}`;
      const monthTxns = transactions.filter(t => t.date.startsWith(monthPrefix));
      const revenue = monthTxns.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = monthTxns.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);

      // Calculate a "height" percentage for the chart (relative to a max, e.g. 100k)
      const maxVal = 100000;
      const revHeight = Math.min(95, Math.max(5, (revenue / maxVal) * 100)) || 5;
      const expHeight = Math.min(100, (expense / maxVal) * 100) || 5;

      return { month: m, revenue, expense, revHeight, expHeight };
    });
  }, [transactions]);



  const filteredTransactions = transactions.filter(t => t.date.startsWith(filterMonth));

  const handleAddTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newTxn: Transaction = {
      id: crypto.randomUUID(),
      companyId: '', // Added by context
      date: formData.get('date') as string,
      description: formData.get('description') as string,
      amount: parseFloat(formData.get('amount') as string) * (formData.get('type') === 'expense' ? -1 : 1),
      type: formData.get('type') as ('income' | 'expense'),
      category: formData.get('category') as string,
      status: 'completed',
      projectId: formData.get('projectId') as string,
      costCodeId: formData.get('costCodeId') as string,
    };
    await addTransaction(newTxn);
    setShowAddModal(false);
  };

  const { updateTransaction, addCostCode, updateCostCode } = useProjects();

  const handleAddCostCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newCode: any = {
      id: crypto.randomUUID(),
      projectId: projects[0]?.id || 'p1',
      companyId: user?.companyId || 'c1',
      code: formData.get('code') as string,
      description: formData.get('description') as string,
      budget: parseFloat(formData.get('budget') as string),
      spent: 0
    };
    await addCostCode(newCode);
    setShowCostCodeModal(false);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Simulate sync with accounting (e.g. Xero/Quickbooks)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const unexported = filteredTransactions.filter(t => !t.isExported);
      for (const t of unexported) {
        await updateTransaction(t.id, { isExported: true, exportDate: new Date().toISOString() });
      }

      // Generate CSV simulation
      const csvContent = "Date,Description,Amount,Category,CostCode\n" +
        unexported.map(t => `${t.date},${t.description},${t.amount},${t.category},${t.costCodeId || ''}`).join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accounting-export-${filterMonth}.csv`;
      a.click();

      addToast(`Sync complete. ${unexported.length} items exported to CSV.`, "success");
    } catch (e) {
      addToast("Accounting sync failed.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const runAIForecast = async () => {
    setIsForecasting(true);
    try {
      const history = monthlyData.map(m => ({ month: m.month, rev: m.revenue, exp: m.expense }));
      const prompt = `
            Analyze this construction financial history: ${JSON.stringify(history)}.
            Also consider the REAL-TIME TRANSACTIONS and PURCHASE ORDERS provided in your system context.
            Predict the next 3 months of Cash Flow. 
            Return JSON:
            {
                "forecast": [
                    { "month": "Jan", "rev": number, "exp": number },
                    { "month": "Feb", "rev": number, "exp": number },
                    { "month": "Mar", "rev": number, "exp": number }
                ],
                "confidenceScore": number,
                "reasoning": "Brief explanation citing specific recent transactions or POs if relevant."
            }
        `;
      const result = await runRawPrompt(prompt, {
        model: 'gemini-3-pro-preview',
        temperature: 0.2,
        thinkingConfig: { thinkingBudget: 1024 },
        projectId: projects[0]?.id || 'p1'
      });
      setForecastData(parseAIJSON(result));
    } catch (e) {
      addToast("Financial forecasting failed.", "error");
    } finally {
      setIsForecasting(false);
    }
  };

  const generateRiskInsights = async () => {
    setIsAnalyzingInsights(true);
    try {
      const codes = JSON.stringify(costCodes);
      const prompt = `
            Analyze these construction cost codes: ${codes}.
            Identify 3 high-priority financial risks (e.g. materials price hikes, labor overruns).
            Return JSON array:
            [
                { "title": "Risk Name", "severity": "High"|"Medium", "code": "03-3000", "mitigation": "Action plan", "impact": "£X amount" }
            ]
        `;
      const result = await runRawPrompt(prompt, {
        model: 'gemini-3-pro-preview',
        temperature: 0.4
      });
      setAiInsights(parseAIJSON(result));
    } catch (e) {
      console.error("AI Insight failure", e);
    } finally {
      setIsAnalyzingInsights(false);
    }
  };

  const handleInvoiceScan = async (url: string, file: File) => {
    setIsScanning(true);
    setInvoiceAnalysis(null);
    try {
      const base64 = url.startsWith('data:') ? url.split(',')[1] : null;
      if (!base64) throw new Error("Could not get image data");

      const prompt = `Extract construction invoice details. Total Amount, Vendor Name, Date, and suggest a Cost Code from: ${JSON.stringify(costCodes.map(c => c.description))}. Return JSON: { amount: number, vendor: string, date: string, suggestedCode: string, confidence: number }`;
      const res = await runRawPrompt(prompt, { model: 'gemini-1.5-flash', responseMimeType: 'application/json' }, base64);
      setInvoiceAnalysis(parseAIJSON(res));
    } catch (e) {
      addToast("Invoice scanning failed.", "error");
    } finally {
      setIsScanning(false);
    }
  };

  const runVarianceAnalysis = async () => {
    setIsAnalyzingVariance(true);
    try {
      const data = JSON.stringify(costCodes);
      const prompt = `
        Analyze the following construction budget variance data:
        ${data}
        
        Provide a deep-dive explanation for WHY these variances might be occurring (e.g., market price hikes for specific materials, labor inefficiencies, or scope expansion). 
        Suggest 3 high-impact corrective actions.
        Return your response in a clear, professional style suitable for a project manager.
      `;
      const result = await runRawPrompt(prompt, { model: 'gemini-3-pro-preview', thinkingConfig: { thinkingBudget: 1024 } });
      setVarianceExplanation(result);
    } catch (e) {
      addToast("Variance analysis failed", "error");
    } finally {
      setIsAnalyzingVariance(false);
    }
  };

  if (!requireRole(['company_admin', 'super_admin'])) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] p-8 text-center">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert size={40} />
        </div>
        <h2 className="text-2xl font-black text-zinc-900 mb-2">Access Restricted</h2>
        <p className="text-zinc-500 max-w-md mb-8">
          Financial Command is only available to Company Administrators.
          Please contact your system administrator if you believe this is an error.
        </p>
        <button
          onClick={() => window.history.back()}
          className="px-6 py-2 bg-zinc-900 text-white rounded-lg font-bold hover:bg-zinc-800 transition-all"
        >
          Return to Safety
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-[#020617] text-slate-100">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <PoundSterling className="text-sky-400" /> Financial Command
          </h1>
          <p className="text-slate-400">Real-time budget tracking and cost control.</p>
        </div>
        <div className="flex gap-2 bg-slate-900/50 p-1 rounded-xl backdrop-blur-md border border-slate-800">
          {['CASHFLOW', 'BUDGET', 'TRANSACTIONS', 'INVOICING', 'EXPENSES', 'DAYWORKS'].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode as any)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${viewMode === mode
                ? 'bg-sky-500 text-white shadow-[0_0_20px_rgba(14,165,233,0.3)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
            >
              {mode.charAt(0) + mode.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 relative group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-2 relative">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Revenue</div>
            <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">+{(stats.totalRev / 10000).toFixed(0)}%</span>
          </div>
          <div className="text-3xl font-black text-white relative">£{(stats.totalRev / 1000000).toFixed(1)}M</div>
        </div>
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 relative group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-2 relative">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Costs</div>
            <span className="bg-rose-500/20 text-rose-400 text-xs px-2 py-0.5 rounded-full font-bold border border-rose-500/30">+{(stats.totalCost / 10000).toFixed(0)}%</span>
          </div>
          <div className="text-3xl font-black text-white relative">£{(stats.totalCost / 1000000).toFixed(1)}M</div>
        </div>
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 relative group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-2 relative">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Net Profit</div>
            <span className="bg-sky-500/20 text-sky-400 text-xs px-2 py-0.5 rounded-full font-bold border border-sky-500/30">+{(stats.netProfit / 10000).toFixed(0)}%</span>
          </div>
          <div className="text-3xl font-black text-sky-400 relative drop-shadow-[0_0_15px_rgba(56,189,248,0.3)]">£{(stats.netProfit / 1000000).toFixed(1)}M</div>
        </div>
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 relative group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-2 relative">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Margin</div>
          </div>
          <div className="text-3xl font-black text-white relative">{stats.margin}%</div>
        </div>
      </div>

      {viewMode === 'CASHFLOW' && (
        <div className="mb-8">
          <BudgetForecasting projectId={projects[0]?.id || 'p1'} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-lg min-h-[350px] flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-center mb-6 relative z-10">
            <h3 className="font-bold text-white flex items-center gap-2">
              {viewMode === 'CASHFLOW' ? 'Cash Flow Analysis (YTD)' : 'Budget vs Actual by Phase'}
              {forecastData && <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase animate-pulse">AI Forecast Active</span>}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={runAIForecast}
                disabled={isForecasting}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-500 transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)] disabled:opacity-50"
              >
                {isForecasting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                AI Forecast
              </button>
              <button className="text-slate-400 hover:text-sky-400 p-1.5 hover:bg-slate-800 rounded-lg transition-colors"><Download size={18} /></button>
            </div>
          </div>

          <div className="flex-1 relative w-full flex items-end gap-3 px-4 border-b border-l border-slate-700/50 mb-2 mt-8">
            {monthlyData.map((data, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end h-full gap-1 group cursor-pointer relative">
                <div
                  className="w-full bg-sky-500 rounded-t-sm opacity-90 group-hover:opacity-100 transition-all relative shadow-[0_0_10px_rgba(14,165,233,0.2)]"
                  style={{ height: `${data.revHeight}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 border border-slate-600">
                    Rev: £{(data.revenue / 1000).toFixed(0)}k
                  </div>
                </div>
                {viewMode === 'CASHFLOW' && (
                  <div
                    className="w-full bg-zinc-200 rounded-b-sm border-t border-white/20"
                    style={{ height: `${data.expHeight * 0.6}%` }}
                  ></div>
                )}
              </div>
            ))}

            {/* Forecast Overlay */}
            {forecastData && forecastData.forecast.map((f: any, i: number) => (
              <div key={`forecast-${i}`} className="flex-1 flex flex-col justify-end h-full gap-1 group cursor-pointer opacity-50 relative">
                <div className="absolute inset-0 bg-purple-500/5 -z-10 rounded-lg"></div>
                <div
                  className="w-full bg-purple-500 rounded-t-sm border-2 border-dashed border-purple-300 relative"
                  style={{ height: `${(f.rev / 100000) * 100 || 10}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-purple-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                    Forecast Rev: £{(f.rev / 1000).toFixed(0)}k
                  </div>
                </div>
                <div
                  className="w-full bg-zinc-400 rounded-b-sm border-2 border-dashed border-zinc-300"
                  style={{ height: `${(f.exp / 100000) * 60 || 10}%` }}
                ></div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-purple-600 uppercase italic">Forecast</div>
              </div>
            ))}
          </div>

          <div className="flex justify-between mt-6 text-[10px] font-bold text-zinc-400 px-4 uppercase tracking-wider">
            {monthlyData.map(d => <span key={d.month}>{d.month}</span>)}
            {forecastData && forecastData.forecast.map((f: any) => <span key={f.month} className="text-purple-400">{f.month}*</span>)}
          </div>

          {forecastData && (
            <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-100 flex items-center gap-3">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Info size={16} /></div>
              <div className="text-xs text-purple-800 leading-tight">
                <span className="font-bold">AI Insight:</span> {forecastData.reasoning}
                <span className="ml-2 font-black text-purple-900">(Confidence: {forecastData.confidenceScore}%)</span>
              </div>
            </div>
          )}
        </div>

        {/* Cost Code Breakdown & AI Risks */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-white">Budget Breakdown</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCostCodeModal(true)}
                className="text-slate-400 hover:text-sky-400 hover:bg-slate-800 p-1.5 rounded-lg transition-all"
                title="Manage Cost Codes"
              >
                <Filter size={18} />
              </button>
              <button
                onClick={generateRiskInsights}
                disabled={isAnalyzingInsights}
                className="text-sky-400 hover:bg-sky-500/10 p-1.5 rounded-lg transition-all"
                title="AI Risk Analysis"
              >
                {isAnalyzingInsights ? <Loader2 size={18} className="animate-spin" /> : <ShieldAlert size={18} />}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-2">
            {aiInsights.length > 0 && (
              <div className="space-y-3 mb-6 bg-rose-500/5 p-4 rounded-xl border border-rose-500/20 animate-in slide-in-from-top-4">
                <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle size={12} /> Priority Financial Risks
                </h4>
                {aiInsights.map((risk, i) => (
                  <div key={i} className="bg-slate-800/50 p-3 rounded-lg border border-rose-500/20 shadow-sm flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-slate-200 pr-2 leading-tight">{risk.title}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${risk.severity === 'High' ? 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.4)]' : 'bg-orange-500 text-white'}`}>{risk.severity}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 italic">&quot;Impact: {risk.impact}&quot;</div>
                    <div className="mt-1 p-2 bg-slate-900 rounded text-[9px] text-sky-400 font-medium leading-snug border border-slate-700">
                      <span className="font-bold mr-1 uppercase text-[8px] text-slate-500">Mitigation:</span> {risk.mitigation}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {costCodes.map((item, i) => (
              <div key={i} className="group cursor-pointer">
                <div className="flex justify-between text-sm font-bold text-slate-200 mb-1 leading-none">
                  <span>{item.description}</span>
                  <span className="font-mono text-[10px] text-slate-500 pr-4">£{(item.spent / 1000).toFixed(0)}k</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-1 relative border border-slate-700">
                  <div
                    className={`h-full rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(0,0,0,0.3)] ${item.var > 10 ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : item.var > 0 ? 'bg-amber-500' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`}
                    style={{ width: `${Math.min(100, (item.spent / item.budget) * 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[9px] font-bold uppercase tracking-tight">
                  <span className="text-slate-600 font-mono">{item.code}</span>
                  <span className={item.var > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                    {item.var > 0 ? `+${item.var}% OVER` : `${Math.abs(item.var)}% UNDER`}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {varianceExplanation && (
            <div className="mt-4 p-4 bg-sky-900/20 border border-sky-500/30 rounded-xl relative animate-in fade-in slide-in-from-top-2 backdrop-blur-md">
              <button
                onClick={() => setVarianceExplanation(null)}
                className="absolute top-2 right-2 text-sky-400 hover:text-sky-300 transition-colors"
              >
                <X size={14} />
              </button>
              <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Brain size={12} /> AI Variance Deep-Dive
              </h4>
              <p className="text-[11px] text-sky-100 leading-relaxed whitespace-pre-wrap">{varianceExplanation}</p>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={runVarianceAnalysis}
              disabled={isAnalyzingVariance}
              className="w-full py-2.5 bg-sky-500 text-white rounded-xl text-xs font-bold hover:bg-sky-400 transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isAnalyzingVariance ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              {isAnalyzingVariance ? 'Analyzing Variances...' : 'AI Deep-Dive Variance'}
            </button>
            <button className="w-full py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition-all border border-slate-700">
              Generate Comprehensive Audit
            </button>
          </div>
        </div>
      </div>

      {/* Transactions View */}
      {viewMode === 'TRANSACTIONS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h3 className="text-lg font-bold text-white">Transaction History</h3>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowInvoiceScan(true)}
                className="flex items-center gap-2 px-3 py-2 border border-sky-500/50 text-sky-400 rounded-lg text-sm font-medium hover:bg-sky-500/10 transition-colors flex-1 sm:flex-initial justify-center sm:justify-start"
              >
                <Zap size={16} /> <span className="hidden sm:inline">AI Invoice Scan</span><span className="sm:hidden">Scan</span>
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-2 px-3 py-2 border border-emerald-500/50 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-500/10 transition-colors disabled:opacity-50 flex-1 sm:flex-initial justify-center sm:justify-start"
              >
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                <span className="hidden sm:inline">Sync</span><span className="sm:hidden">Export</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-400 transition-colors flex-1 sm:flex-initial justify-center sm:justify-start shadow-[0_0_15px_rgba(14,165,233,0.3)]"
              >
                <Plus size={16} /> <span className="hidden sm:inline">Add Transaction</span><span className="sm:hidden">Add</span>
              </button>
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none w-full sm:w-auto"
              />
              <button className="text-slate-500 hover:text-sky-400 hidden sm:block"><Download size={18} /></button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((txn) => (
                <div
                  key={txn.id}
                  onClick={() => setSelectedTransaction(txn)}
                  className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-2 rounded-lg ${txn.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {txn.type === 'income' ? (
                        <ArrowDownRight size={20} />
                      ) : (
                        <ArrowUpRight size={20} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-100 group-hover:text-white transition-colors">{txn.description}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs bg-sky-500/10 text-sky-400 px-2 py-1 rounded border border-sky-500/20">{txn.category}</span>
                        {txn.status === 'pending' ? (
                          <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-1 rounded flex items-center gap-1 border border-amber-500/20">
                            <AlertCircle size={12} /> Pending
                          </span>
                        ) : (
                          <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded flex items-center gap-1 border border-emerald-500/20">
                            <CheckCircle2 size={12} /> Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${txn.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {txn.type === 'income' ? '+' : '-'}£{Math.abs(txn.amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">{txn.date}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-8 text-center text-slate-500">
                No transactions for {filterMonth}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-3 rounded-lg ${selectedTransaction.type === 'income' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                <DollarSign className={`${selectedTransaction.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`} size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">{selectedTransaction.description}</h2>
            </div>
            {/* ... Modal Details ... */}
            <div className="space-y-4 mb-8 text-slate-300">
              {/* Simplified for brevity in replace, keeping logic same */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase mb-1">Amount</div>
                  <div className={`text-xl font-bold ${selectedTransaction.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {selectedTransaction.type === 'income' ? '+' : '-'}£{Math.abs(selectedTransaction.amount).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase mb-1">Date</div>
                  <div className="font-bold text-slate-200">{selectedTransaction.date}</div>
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Category</div>
                <div className="font-bold text-slate-200">{selectedTransaction.category}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Status</div>
                <div className="font-bold text-slate-200">{selectedTransaction.status}</div>
              </div>
            </div>

            <button
              onClick={() => setSelectedTransaction(null)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition-colors border border-slate-700"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <h2 className="text-xl font-bold text-white mb-6">Record Transaction</h2>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                <input name="description" required className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50" placeholder="e.g. Steel Beam Delivery" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount (£)</label>
                  <input name="amount" type="number" step="0.01" required className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                  <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                <select name="type" className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50">
                  <option value="expense">Expense</option>
                  <option value="income">Income / Progress Claim</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project</label>
                <select name="projectId" defaultValue={projects[0]?.id} className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50">
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {/* Cost Code Select - Simplified styling */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cost Code (Optional)</label>
                <select name="costCodeId" className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50">
                  <option value="">No Cost Code</option>
                  {costCodes.map(cc => <option key={cc.id} value={cc.id}>{cc.code} - {cc.description}</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 text-slate-400 font-medium hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-sky-500 text-white font-bold rounded-lg hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20">Save Transaction</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Budget Management Tab */}
      {viewMode === 'BUDGET' && (
        <div className="space-y-6">
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="bg-slate-950/50 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-white">Budget Allocation & Tracking</h3>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setShowCostCodeModal(true)}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
                >
                  Manage Budget
                </button>
                <div className="flex gap-2 text-[10px] font-bold uppercase ml-4">
                  <span className="flex items-center gap-1.5 text-emerald-400"><CheckCircle2 size={12} /> Under Budget</span>
                  <span className="flex items-center gap-1.5 text-amber-400"><AlertCircle size={12} /> Near Limit</span>
                  <span className="flex items-center gap-1.5 text-rose-400"><ShieldAlert size={12} /> Over Budget</span>
                </div>
              </div>
            </div>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-950/30">
                  <tr>
                    <th className="px-6 py-4">Cost Code</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Total Budget</th>
                    <th className="px-6 py-4">Actual Spent</th>
                    <th className="px-6 py-4">Variance</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 italic">
                  {costCodes.map((cc) => (
                    <tr key={cc.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4 font-mono text-xs text-slate-400 font-bold">{cc.code}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-200">{cc.description}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-200">£{cc.budget.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-200">£{cc.spent.toLocaleString()}</td>
                      <td className={`px-6 py-4 text-sm font-bold ${(cc.var || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {(cc.var || 0) > 0 ? `+${cc.var}%` : `${cc.var}%`}
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-32 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full shadow-[0_0_10px_rgba(0,0,0,0.3)] ${(cc.var || 0) > 10 ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : (cc.var || 0) > 0 ? 'bg-amber-500' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`}
                            style={{ width: `${Math.min(100, (cc.spent / cc.budget) * 100)}%` }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden p-4 space-y-3">
              {costCodes.map((cc) => (
                <div key={cc.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-white mb-1">{cc.description}</h4>
                      <p className="text-xs text-slate-500 font-mono">{cc.code}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${(cc.var || 0) > 10 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : (cc.var || 0) > 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                      {(cc.var || 0) > 0 ? `+${cc.var}%` : `${cc.var}%`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Budget</p>
                      <p className="text-sm font-bold text-slate-200">£{cc.budget.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Spent</p>
                      <p className="text-sm font-bold text-slate-200">£{cc.spent.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${(cc.var || 0) > 10 ? 'bg-rose-500' : (cc.var || 0) > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, (cc.spent / cc.budget) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-sky-900/10 border border-sky-500/20 rounded-xl p-6 backdrop-blur-sm">
              <h4 className="font-black text-[10px] text-sky-400 uppercase mb-4 flex items-center gap-2">
                <Brain size={12} /> Strategic Recommendation
              </h4>
              <p className="text-sm text-sky-100 leading-relaxed italic">
                Based on current progress and historical material trends, we recommend adjusting the &quot;Plaster &amp; Gypsum&quot; contingency by 12% to account for upcoming seasonal logistics delays. Overall project health remains stable.
              </p>
            </div>
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-6 text-white shadow-xl flex items-center justify-between relative overflow-hidden">
              <div className="absolute inset-0 bg-sky-500/5"></div>
              <div className="relative z-10">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Available Funds</p>
                <h4 className="text-2xl font-black italic">£{(stats.netProfit / 1000).toFixed(0)}k</h4>
              </div>
              <button className="relative z-10 px-4 py-2 bg-white text-slate-950 rounded-lg text-xs font-black uppercase hover:bg-sky-50 transition-all shadow-lg">
                Request Reallocation
              </button>
            </div>
          </div>
        </div>
      )}
      {/* New Modules */}
      {viewMode === 'INVOICING' && <InvoicingView />}
      {viewMode === 'EXPENSES' && <ExpensesView />}
      {viewMode === 'DAYWORKS' && <DayworksView />}

      {/* AI Invoice Scan Modal */}
      {showInvoiceScan && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-sky-600 p-6 text-white flex justify-between items-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-sky-600 to-blue-600"></div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold flex items-center gap-2"><Zap size={20} className="text-yellow-300 drop-shadow-md" /> AI Invoice Intelligence</h3>
                <p className="text-sky-100 text-xs mt-1">Upload an invoice to automatically extract and verify details.</p>
              </div>
              <button onClick={() => { setShowInvoiceScan(false); setInvoiceAnalysis(null); }} className="relative z-10 p-2 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"><X size={20} /></button>
            </div>

            <div className="p-6">
              {!invoiceAnalysis && !isScanning ? (
                <FileUploadZone
                  onUploadComplete={handleInvoiceScan}
                  label="Drop invoice here for AI Scan"
                  description="Upload image or PDF"
                  allowedTypes={['image/*', 'application/pdf']}
                />
              ) : isScanning ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                  <div className="w-12 h-12 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin"></div>
                  <div className="text-center">
                    <p className="font-bold text-white">Reading Invoice Content...</p>
                    <p className="text-xs text-slate-400">Gemini is extracting line items and verifying budget codes.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Vendor</p>
                      <p className="font-bold text-white border-b border-slate-800 pb-1">{invoiceAnalysis.vendor}</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Total Amount</p>
                      <p className="text-lg font-black text-sky-400">£{invoiceAnalysis.amount?.toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Invoice Date</p>
                      <p className="text-sm font-medium text-slate-300">{invoiceAnalysis.date}</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">AI Confidence</p>
                      <p className="text-sm font-black text-emerald-400">{invoiceAnalysis.confidence}% Match</p>
                    </div>
                  </div>

                  <div className="bg-sky-500/10 p-4 rounded-xl border border-sky-500/20">
                    <p className="text-[10px] font-bold text-sky-400 uppercase mb-2">Suggested Cost Code</p>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-sky-500" />
                      <span className="font-bold text-sky-100">{invoiceAnalysis.suggestedCode}</span>
                    </div>
                    <p className="text-[10px] text-sky-400/80 mt-1 italic">Suggested based on vendor category and item description.</p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setInvoiceAnalysis(null)}
                      className="flex-1 py-3 border border-slate-700 rounded-xl text-slate-400 font-medium hover:bg-slate-800 transition-colors"
                    >
                      Rescan
                    </button>
                    <button
                      onClick={async () => {
                        const newTxn: Transaction = {
                          id: `txn-${Date.now()}`,
                          companyId: 'c1',
                          date: invoiceAnalysis.date || new Date().toISOString().split('T')[0],
                          description: `Invoiced: ${invoiceAnalysis.vendor}`,
                          amount: -invoiceAnalysis.amount,
                          type: 'expense',
                          category: 'Materials',
                          status: 'completed',
                          projectId: projects[0]?.id || 'p1'
                        };
                        await addTransaction(newTxn);
                        setShowInvoiceScan(false);
                        setInvoiceAnalysis(null);
                        addToast("Invoice recorded as transaction.", "success");
                      }}
                      className="flex-1 py-3 bg-sky-500 text-white rounded-xl font-bold hover:bg-sky-600 shadow-lg shadow-sky-500/20 transition-all"
                    >
                      Approve & Record
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-500 text-center">
              AI verification should be reviewed. Accuracy depends on document clarity.
            </div>
          </div>
        </div>
      )}
      {/* Manage Cost Codes Modal */}
      {showCostCodeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Manage Cost Codes</h2>
              <button onClick={() => setShowCostCodeModal(false)} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>

            <div className="flex gap-6 h-full overflow-hidden">
              {/* Add New Form */}
              <div className="w-1/3 border-r border-slate-800 pr-6">
                <h3 className="text-xs font-black text-slate-500 uppercase mb-4">Add New Code</h3>
                <form onSubmit={handleAddCostCode} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Code</label>
                    <input name="code" required className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50" placeholder="e.g. 03-3000" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                    <input name="description" required className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50" placeholder="e.g. Concrete" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Budget (£)</label>
                    <input name="budget" type="number" required className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50" placeholder="0.00" />
                  </div>
                  <button type="submit" className="w-full py-2 bg-sky-500 text-white font-bold rounded-lg hover:bg-sky-600 transition-all shadow-lg text-sm mt-4 shadow-sky-500/20">Add Cost Code</button>
                </form>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <h3 className="text-xs font-black text-slate-500 uppercase mb-4">Active Cost Codes</h3>
                <div className="space-y-2">
                  {costCodes.map(cc => (
                    <div key={cc.id} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 flex justify-between items-center group hover:bg-slate-800 transition-colors">
                      <div>
                        <div className="font-mono text-xs text-sky-400 font-bold">{cc.code}</div>
                        <div className="font-bold text-slate-200 text-sm">{cc.description}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-white">£{cc.budget.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-500">Budget</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialsView;
