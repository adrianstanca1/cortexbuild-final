import React, { useState } from 'react';
import { Briefcase, Shield, List, DollarSign, Users, Wrench, Filter, Calculator, FileDown, Eye, X, Loader2, Download, Mail, Clock, Plus, GripVertical, Settings, Trash2, Layout, BarChart, Table as TableIcon, Type, PlusCircle, CheckCircle2, AlertTriangle, TrendingUp, Calendar, Zap, Info, ChevronRight, Share2, Brain } from 'lucide-react';
import { db } from '@/services/db';
import { useToast } from '@/contexts/ToastContext';
import { useProjects } from '@/contexts/ProjectContext';
import { runRawPrompt, parseAIJSON } from '@/services/geminiService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReportElement {
  id: string;
  title: string;
  desc: string;
  metrics: string[];
  type: 'chart' | 'table' | 'kpi' | 'text';
  icon: React.ComponentType<any>;
}

interface Report {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  lastModified: string;
  recipients: string[];
  format: 'pdf' | 'excel' | 'csv' | 'powerpoint';
  schedule?: string;
  lastRun?: string;
  nextRun?: string;
  elements?: ReportElement[];
}

interface ReportTemplate {
  icon: React.ComponentType<any>;
  title: string;
  desc: string;
  id: string;
  metrics: string[];
  defaultElements?: ReportElement[];
}

const ReportsView = () => {
  const { addToast } = useToast();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [reportName, setReportName] = useState('');
  const [reportFormat, setReportFormat] = useState<'pdf' | 'excel' | 'csv' | 'powerpoint'>('pdf');
  const [recipients, setRecipients] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [scheduleFrequency, setScheduleFrequency] = useState<string>('');
  const [generatedReport, setGeneratedReport] = useState<Report | null>(null);
  const { projects, tasks, financials, inventory, safetyIncidents } = useProjects();
  const [isAiSummarizing, setIsAiSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  // Designer State
  const [isDesigning, setIsDesigning] = useState(false);
  const [activeElements, setActiveElements] = useState<ReportElement[]>([]);

  const availableElements: ReportElement[] = [
    { id: 'kpi-1', title: 'Revenue Total', desc: 'Real-time revenue summation', metrics: ['$2.4M'], type: 'kpi', icon: DollarSign },
    { id: 'chart-1', title: 'Budget vs Actual', desc: 'Variance analytics over time', metrics: ['+12% Trend'], type: 'chart', icon: BarChart },
    { id: 'table-1', title: 'Transaction Log', desc: 'Detailed line-item audit', metrics: ['500 Rows'], type: 'table', icon: TableIcon },
    { id: 'txt-1', title: 'Executive Summary', desc: 'Editable AI-generated summary', metrics: ['Text block'], type: 'text', icon: Type },
    { id: 'safety-1', title: 'TRIFR Metric', desc: 'Total Recordable Injury Frequency Rate', metrics: ['4.2 Rate'], type: 'kpi', icon: Shield },
    { id: 'equ-1', title: 'Asset Utilization', desc: 'Fleet uptime and ROI', metrics: ['87% Active'], type: 'chart', icon: Wrench },
  ];

  const templates: ReportTemplate[] = [
    {
      icon: Briefcase,
      title: 'Executive Summary',
      desc: 'Portfolio overview, KPIs, forecast',
      id: 'executive',
      metrics: ['Revenue', 'Profit Margin', 'Projects Active'],
    },
    {
      icon: Shield,
      title: 'Safety Report',
      desc: 'Incidents, TRIFR, compliance status',
      id: 'safety',
      metrics: ['Total Incidents', 'TRIFR Rate', 'Compliance Score'],
    },
    {
      icon: List,
      title: 'Project Progress',
      desc: 'Timeline, budget, milestones',
      id: 'progress',
      metrics: ['On-Time Rate', 'Budget Variance', 'Milestones'],
    },
    {
      icon: DollarSign,
      title: 'Financial Closeout',
      desc: 'Cost breakdown, profit, variance',
      id: 'financial',
      metrics: ['Total Cost', 'Gross Profit', 'Cost Variance'],
    },
    {
      icon: Users,
      title: 'Team Performance',
      desc: 'KPIs, utilization, productivity',
      id: 'team',
      metrics: ['Utilization Rate', 'Productivity Score', 'Churn'],
    },
    {
      icon: Wrench,
      title: 'Equipment Utilization',
      desc: 'ROI, maintenance, availability',
      id: 'equipment',
      metrics: ['Availability', 'Maintenance Cost', 'ROI'],
    },
  ];

  const [savedReports, setSavedReports] = useState<Report[]>([
    {
      id: 'r1',
      name: 'Weekly Safety Summary',
      type: 'Safety Report',
      createdAt: '2025-11-01',
      lastModified: '2025-12-01',
      recipients: ['safety@buildpro.com'],
      format: 'pdf',
      schedule: 'Every Monday 8AM',
      lastRun: '2025-12-01',
      nextRun: '2025-12-08'
    },
    {
      id: 'r2',
      name: 'Monthly Financial',
      type: 'Financial Closeout',
      createdAt: '2025-10-01',
      lastModified: '2025-12-01',
      recipients: ['finance@buildpro.com'],
      format: 'excel',
      schedule: '1st of month at 9AM',
      lastRun: '2025-12-01',
      nextRun: '2026-01-01'
    }
  ]);

  const filters = ['Date Range', 'Project Type', 'Location', 'Team Member', 'Budget Range', 'Status'];

  const handleGenerateReport = async () => {
    if (!reportName || !selectedTemplate) {
      addToast('Please enter a report name and select a template', 'warning');
      return;
    }

    setGenerating(true);

    try {
      // 1. Fetch real analytics data for the selected template/elements
      const metrics = activeElements.length > 0
        ? activeElements.map(el => el.title)
        : templates.find(t => t.id === selectedTemplate)?.metrics || [];

      const realData = await db.getCustomReport({
        metrics: JSON.stringify(metrics),
        templateId: selectedTemplate,
        // Default to last 30 days for now
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      });

      // 2. Gather context for AI using real data
      const context = {
        reportName,
        template: selectedTemplate,
        metrics: realData.metrics || {},
        trends: realData.trends || {},
        projects: projects.map(p => ({ name: p.name, status: p.status, progress: p.progress })),
        recentTasks: tasks.filter(t => t.status !== 'Done').slice(0, 5).map(t => ({ title: t.title, due: t.dueDate })),
        safetyStats: realData.safety || { TRIFR: '4.2', incidents: 0 }
      };

      const prompt = `
        Generate a professional construction executive summary for a report named "${reportName}" based on this template: ${selectedTemplate}.
        Real Data Context: ${JSON.stringify(context)}
        
        The summary should highlight:
        1. Current project health across the portfolio based on actual metrics.
        2. Top 3 critical risks or blockers identified in the data.
        3. Strategic recommendations for the next 7 days.
        
        Keep it professional, concise, and impact-oriented. Use real numbers from the context.
      `;

      setIsAiSummarizing(true);
      const result = await runRawPrompt(prompt, {
        model: 'gemini-1.5-pro', // Using stable model
        thinkingConfig: { thinkingBudget: 1024 }
      });
      setAiSummary(result);

      const newReport: Report = {
        id: `r${Date.now()}`,
        name: reportName,
        type: templates.find(t => t.id === selectedTemplate)?.title || 'Custom Report',
        createdAt: new Date().toLocaleDateString(),
        lastModified: new Date().toLocaleDateString(),
        recipients: recipients.split(',').map(r => r.trim()).filter(r => r),
        format: reportFormat,
        schedule: scheduleFrequency || undefined,
        lastRun: scheduleFrequency ? new Date().toLocaleDateString() : undefined,
        nextRun: scheduleFrequency ? 'Future' : undefined,
        elements: [...activeElements]
      };

      setGeneratedReport(newReport);
      setSavedReports([newReport, ...savedReports]);
      setActiveModal('preview');
      setIsDesigning(false);
    } catch (e) {
      console.error("Report generation failed:", e);
      addToast("Failed to generate report data", "error");
    } finally {
      setGenerating(false);
      setIsAiSummarizing(false);
    }
  };

  const startNewCustomReport = () => {
    setReportName('New Custom Report');
    setSelectedTemplate('custom');
    setActiveElements([]);
    setIsDesigning(true);
  };

  const addElementToReport = (element: ReportElement) => {
    const newElement = { ...element, id: `${element.id}-${Date.now()}` };
    setActiveElements([...activeElements, newElement]);
    addToast(`${element.title} added to report`, 'success');
  };

  const removeElementFromReport = (id: string) => {
    setActiveElements(activeElements.filter(el => el.id !== id));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-zinc-50/30">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 mb-2 tracking-tight">Report Intelligence</h1>
          <p className="text-zinc-500 font-medium">Design, automate, and deliver professional construction insights.</p>
        </div>
        <div className="flex gap-3">
          {!isDesigning && (
            <button
              onClick={startNewCustomReport}
              className="px-5 py-3 bg-[#0f5c82] text-white rounded-2xl text-sm font-bold flex items-center gap-2 hover:bg-[#0c4a6e] transition-all shadow-xl shadow-[#0f5c82]/20 group"
            >
              <PlusCircle size={18} className="group-hover:rotate-90 transition-transform duration-300" />
              Custom Builder
            </button>
          )}
        </div>
      </div>

      {isDesigning ? (
        <div className="flex gap-8 h-[calc(100vh-280px)] animate-in fade-in slide-in-from-bottom-6 duration-500">
          {/* Designer Sidebar */}
          <div className="w-80 bg-white border border-zinc-200 rounded-[2rem] p-8 shadow-2xl shadow-zinc-200/50 flex flex-col gap-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#0f5c82] to-blue-400"></div>
            <div>
              <h3 className="font-black text-zinc-900 flex items-center gap-2 mb-6 uppercase text-xs tracking-widest">
                <Layout size={16} className="text-[#0f5c82]" /> Dashboard Tools
              </h3>
              <div className="space-y-3">
                {availableElements.map(el => (
                  <div
                    key={el.id}
                    onClick={() => addElementToReport(el)}
                    className="bg-zinc-50 border border-zinc-100 p-4 rounded-2xl hover:border-[#0f5c82] hover:bg-blue-50/30 cursor-pointer transition-all group flex items-center gap-4"
                  >
                    <div className="p-2.5 bg-white rounded-xl text-zinc-600 group-hover:bg-[#0f5c82] group-hover:text-white transition-all shadow-sm">
                      <el.icon size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-zinc-800">{el.title}</p>
                      <p className="text-[9px] text-zinc-400 font-black uppercase tracking-tighter">{el.type}</p>
                    </div>
                    <Plus size={14} className="text-zinc-300 group-hover:text-[#0f5c82] transition-colors" />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto space-y-4">
              <div className="p-5 bg-zinc-900 rounded-[1.5rem] border border-zinc-800 shadow-xl">
                <h4 className="text-[10px] font-black text-zinc-500 uppercase mb-3 flex items-center gap-2">
                  <Calculator size={12} className="text-blue-400" /> Calculations
                </h4>
                <button className="w-full py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-[10px] font-bold text-zinc-400 hover:text-white transition-all flex items-center justify-center gap-2">
                  <Plus size={10} /> Add Calculated Field
                </button>
              </div>
              <button
                onClick={() => {
                  if (activeElements.length === 0) return addToast('Design your report first!', 'warning');
                  setActiveModal('create');
                }}
                className="w-full py-4 bg-[#0f5c82] text-white rounded-2xl font-black text-sm shadow-2xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                Assemble & Schedule <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setIsDesigning(false)}
                className="w-full py-2 text-zinc-400 font-bold text-xs hover:text-red-500 transition-colors"
              >
                Discard Draft
              </button>
            </div>
          </div>

          {/* Designer Workspace */}
          <div className="flex-1 bg-white border border-zinc-200 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
              <div className="flex items-center gap-4">
                <Settings size={18} className="text-[#0f5c82] animate-spin-slow" />
                <div>
                  <h2 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Report Canvas</h2>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase">{reportName}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-white border border-zinc-200 rounded-full text-[10px] font-black text-zinc-500 uppercase">Interactive Preview</span>
              </div>
            </div>

            <div className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px]">
              {activeElements.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-300 gap-6">
                  <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center border-2 border-dashed border-zinc-100">
                    <Layout size={40} className="opacity-20" />
                  </div>
                  <div className="text-center max-w-xs">
                    <p className="font-black text-zinc-500 text-lg uppercase tracking-tight">Canvas Empty</p>
                    <p className="text-sm text-zinc-400 font-medium leading-relaxed">Select widgets from the toolbox to build your custom data narrative.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-8 pb-32">
                  {activeElements.map((el) => (
                    <div
                      key={el.id}
                      className={`relative bg-white rounded-3xl border border-zinc-100 p-8 shadow-sm hover:shadow-xl transition-all group animate-in zoom-in-95 duration-300 ${el.type === 'table' || el.type === 'chart' ? 'col-span-2' : 'col-span-1'}`}
                    >
                      <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                        <button className="p-2 bg-zinc-50 text-zinc-400 hover:text-[#0f5c82] rounded-xl border border-zinc-100 flex items-center justify-center"><GripVertical size={16} /></button>
                        <button
                          onClick={() => removeElementFromReport(el.id)}
                          className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl border border-red-100 flex items-center justify-center"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-blue-50 text-[#0f5c82] rounded-2xl">
                          <el.icon size={22} />
                        </div>
                        <div>
                          <h3 className="font-black text-zinc-900 text-lg tracking-tight">{el.title}</h3>
                          <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">{el.type}</p>
                        </div>
                      </div>

                      {el.type === 'kpi' && (
                        <div className="flex items-end gap-3">
                          <div className="text-5xl font-black text-zinc-900">{el.metrics[0]}</div>
                          <div className="mb-2 text-xs font-bold text-green-500 flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-full">
                            <TrendingUp size={12} /> +12%
                          </div>
                        </div>
                      )}

                      {el.type === 'chart' && (
                        <div className="h-32 flex items-end gap-2 px-2">
                          {[30, 60, 40, 85, 55, 100, 70, 90, 60, 80].map((h, idx) => (
                            <div key={idx} className="flex-1 bg-zinc-50 rounded-xl relative group/bar overflow-hidden h-full">
                              <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#0f5c82] to-blue-400 rounded-xl transition-all duration-700 ease-out delay-[idx*100]" style={{ height: `${h}%` }}></div>
                            </div>
                          ))}
                        </div>
                      )}

                      {el.type === 'table' && (
                        <div className="space-y-4">
                          {[1, 2, 3].map(row => (
                            <div key={row} className="grid grid-cols-4 gap-4 items-center">
                              <div className="h-2 bg-zinc-100 rounded-full"></div>
                              <div className="col-span-2 h-2 bg-zinc-50 rounded-full"></div>
                              <div className="h-2 bg-zinc-100 rounded-full"></div>
                            </div>
                          ))}
                        </div>
                      )}

                      {el.type === 'text' && (
                        <div className="space-y-3">
                          <div className="h-2 w-full bg-zinc-50 rounded-full"></div>
                          <div className="h-2 w-5/6 bg-zinc-50 rounded-full"></div>
                          <div className="h-2 w-4/6 bg-zinc-50 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {templates.map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  setSelectedTemplate(t.id);
                  setReportName(`${t.title} Audit`);
                  setActiveModal('create');
                }}
                className="group relative bg-white border border-zinc-200 p-8 rounded-[2rem] hover:ring-2 hover:ring-[#0f5c82] hover:ring-offset-4 transition-all cursor-pointer shadow-sm hover:shadow-2xl overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <t.icon size={120} />
                </div>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-zinc-50 text-zinc-700 group-hover:bg-[#0f5c82] group-hover:text-white transition-all shadow-sm">
                  <t.icon size={24} />
                </div>
                <h3 className="text-xl font-black text-zinc-900 mb-2 tracking-tight">{t.title}</h3>
                <p className="text-sm text-zinc-500 font-medium mb-6 leading-relaxed">{t.desc}</p>

                <div className="grid grid-cols-1 gap-2 border-t border-zinc-50 pt-6">
                  {t.metrics.map((m) => (
                    <div key={m} className="flex items-center gap-3 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                      <div className="w-1.5 h-1.5 bg-[#0f5c82] rounded-full shadow-[0_0_8px_rgba(15,92,130,0.5)]"></div>
                      {m}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-zinc-200 rounded-[2.5rem] p-10 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-zinc-900 tracking-tight">Active Automations</h3>
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1">Scheduled Deliveries & History</p>
              </div>
              <div className="p-3 bg-zinc-50 rounded-2xl text-zinc-400">
                <Clock size={20} />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-zinc-100">
                    <th className="pb-6 px-4">Report & Distribution</th>
                    <th className="pb-6 px-4">Frequency</th>
                    <th className="pb-6 px-4">Format</th>
                    <th className="pb-6 px-4">Status</th>
                    <th className="pb-6 px-4 text-right">Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {savedReports.map((item) => (
                    <tr key={item.id} className="group hover:bg-zinc-50 transition-colors">
                      <td className="py-6 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-black text-zinc-800 tracking-tight">{item.name}</span>
                          <span className="text-[10px] text-zinc-400 font-bold">{item.recipients.join(', ')}</span>
                        </div>
                      </td>
                      <td className="py-6 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-[#0f5c82]" />
                          <span className="text-xs font-bold text-zinc-600">{item.schedule || 'Onetime'}</span>
                        </div>
                      </td>
                      <td className="py-6 px-4">
                        <span className="px-3 py-1 bg-zinc-100 rounded-lg text-[10px] font-black uppercase text-zinc-500 border border-zinc-200">{item.format}</span>
                      </td>
                      <td className="py-6 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                          <span className="text-xs font-bold text-zinc-700">Ready</span>
                        </div>
                      </td>
                      <td className="py-6 px-4 text-right">
                        <button className="p-3 text-zinc-400 hover:text-[#0f5c82] hover:bg-white rounded-2xl transition-all shadow-sm">
                          <Share2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Create / Schedule Modal */}
      {activeModal === 'create' && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xl flex items-center justify-center z-[200] p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] border border-white/20 flex flex-col">
            <div className="p-10 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/30">
              <div>
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Finalize Delivery</h2>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Configure format and automated schedule</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-4 bg-white hover:bg-zinc-100 rounded-3xl transition-colors shadow-sm">
                <X size={24} />
              </button>
            </div>

            <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar">
              <div className="space-y-3">
                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Report Identity</label>
                <input
                  type="text"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="Official Report Title"
                  className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-zinc-800"
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Output Format</label>
                <div className="grid grid-cols-4 gap-3">
                  {['pdf', 'excel', 'csv', 'powerpoint'].map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setReportFormat(fmt as any)}
                      className={`py-4 rounded-[1.25rem] border-2 font-black uppercase text-[10px] tracking-widest transition-all ${reportFormat === fmt
                        ? 'border-[#0f5c82] bg-blue-50 text-[#0f5c82] shadow-lg shadow-blue-100'
                        : 'border-zinc-100 bg-white text-zinc-400 hover:border-zinc-200'
                        }`}
                    >
                      {fmt === 'powerpoint' ? 'PPTX' : fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 ml-1">
                  <Zap size={14} className="text-amber-500" />
                  <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Growth Automation</label>
                </div>
                <div className="p-6 bg-zinc-50 rounded-[2rem] border border-zinc-200 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase">Scheduling Frequency</label>
                    <select
                      value={scheduleFrequency}
                      onChange={(e) => setScheduleFrequency(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl font-bold text-zinc-700 outline-none"
                    >
                      <option value="">Manual Run (No Automation)</option>
                      <option value="Daily @ 8:00 AM">Daily @ 8:00 AM</option>
                      <option value="Weekly (Mon) @ 9:00 AM">Weekly (Mon) @ 9:00 AM</option>
                      <option value="Monthly (1st) @ 9:00 AM">Monthly (1st) @ 9:00 AM</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase">Distribution List</label>
                    <input
                      type="text"
                      value={recipients}
                      onChange={(e) => setRecipients(e.target.value)}
                      placeholder="execs@buildpro.com, board@buildpro.com"
                      className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl font-bold text-zinc-700 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  onClick={handleGenerateReport}
                  disabled={generating}
                  className="flex-1 flex items-center justify-center gap-3 py-5 bg-[#0f5c82] hover:bg-[#0c4a6e] disabled:opacity-50 text-white rounded-[1.5rem] font-black text-sm transition-all shadow-2xl shadow-blue-900/20"
                >
                  {generating ? (
                    <>
                      <Loader2 size={20} className="animate-spin" /> Finalizing...
                    </>
                  ) : (
                    <>
                      <FileDown size={20} /> Deploy & Generate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {activeModal === 'preview' && generatedReport && (
        <div className="fixed inset-0 bg-zinc-900/90 backdrop-blur-2xl flex items-center justify-center z-[250] p-10 animate-in zoom-in-95 duration-300">
          <div className="bg-white rounded-[4rem] max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-zinc-100">
            <div className="p-12 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-zinc-900 tracking-tight">{generatedReport.name}</h2>
                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    <Calendar size={14} /> Created {generatedReport.createdAt}
                  </span>
                  <span className="w-1 h-1 bg-zinc-200 rounded-full"></span>
                  <span className="text-xs font-black text-[#0f5c82] uppercase tracking-widest">{generatedReport.format}</span>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-5 bg-zinc-50 hover:bg-zinc-100 rounded-full transition-colors">
                <X size={32} className="text-zinc-900" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-zinc-50/50">
              <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-zinc-100 min-h-[600px] flex flex-col gap-12">
                <div className="flex items-center justify-between pb-8 border-b-2 border-zinc-50">
                  <div className="h-12 w-48 bg-zinc-900 rounded-2xl flex items-center justify-center text-white font-black text-xl italic tracking-tighter">BUILDPRO</div>
                  <div className="text-right">
                    <p className="text-sm font-black text-zinc-900">Official Report</p>
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Verified Content</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-8">
                  <div className="bg-[#0f5c82] p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-900/20">
                    <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-2">Record Count</p>
                    <p className="text-4xl font-black">1.4k</p>
                  </div>
                  <div className="bg-zinc-900 p-8 rounded-[2.5rem] text-white shadow-xl">
                    <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-2">Performance</p>
                    <p className="text-4xl font-black">98.2%</p>
                  </div>
                  <div className="bg-zinc-50 p-8 rounded-[2.5rem] border border-zinc-100">
                    <p className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Status</p>
                    <p className="text-4xl font-black text-zinc-900">PASS</p>
                  </div>
                </div>

                <div className="flex-1 border-t border-zinc-100 pt-12">
                  <div className="flex items-center gap-4 mb-8">
                    <Brain size={24} className="text-[#0f5c82]" />
                    <h3 className="text-2xl font-black text-zinc-900 tracking-tight italic">AI Executive Intelligence</h3>
                  </div>
                  <div className="bg-zinc-50 border border-zinc-100 p-8 rounded-[2rem] text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap font-medium">
                    {aiSummary || (
                      <div className="space-y-6">
                        <div className="h-4 w-full bg-zinc-100 rounded-full animate-pulse"></div>
                        <div className="h-4 w-full bg-zinc-100 rounded-full animate-pulse"></div>
                        <div className="h-4 w-4/5 bg-zinc-100 rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-auto pt-8 border-t border-zinc-50 text-center">
                  <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.5em]">This report was AI-generated via BuildPro Intelligence Engine</p>
                </div>
              </div>
            </div>

            <div className="p-12 border-t border-zinc-100 bg-white flex gap-6">
              <button className="flex-1 py-5 bg-[#0f5c82] text-white rounded-[2rem] font-black text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-blue-900/20 flex items-center justify-center gap-3">
                <Download size={24} /> Download Final Draft
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="px-12 py-5 bg-zinc-100 text-zinc-900 rounded-[2rem] font-black text-lg hover:bg-zinc-200 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsView;