import React, { useState, useEffect } from 'react';
import { Page } from '@/types';
import {
  Cpu,
  LayoutGrid,
  Construction,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  FileText,
  Camera,
  FolderOpen,
  Search,
  PenTool,
  Repeat,
  Target,
  BarChart4,
  HardHat,
  Coins,
  Network,
  Bot,
  Brain,
  TrendingUp,
  Monitor,
  Globe,
  Mic,
  Zap,
  Package,
  Truck,
  Boxes,
  Recycle,
  Lightbulb,
  Smartphone,
  Eye,
  Smile,
  Printer,
  Microchip,
  Languages,
  Book,
  GraduationCap,
  ShieldCheck,
  Wrench,
  Globe2,
  ArrowRight,
  Sparkles,
  CircuitBoard,
  Activity,
  Layers
} from 'lucide-react';

type FeatureStatus = 'Active' | 'In Progress' | 'Planned';
type FeatureCategory = 'Project Ops' | 'Financial Mgt' | 'Business Dev';

interface Feature {
  id: string;
  title: string;
  category: FeatureCategory;
  status: FeatureStatus;
  icon: React.ReactNode;
  desc?: string;
}

const NeuralNetworkView: React.FC<{ setPage: (page: Page) => void }> = ({ setPage }) => {
  const [currentPage, setCurrentPage] = useState(Page.NEURAL_NETWORK);
  const [activeCategory, setActiveCategory] = useState<string>('All Features');
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

  const menuItems = [
    { id: 'Home', label: 'Home', page: Page.CORTEX_BUILD_HOME },
    { id: 'NeuralNetwork', label: 'AI Engine', page: Page.NEURAL_NETWORK },
    { id: 'PlatformFeatures', label: 'Features', page: Page.PLATFORM_FEATURES },
    { id: 'Connectivity', label: 'Integrations', page: Page.CONNECTIVITY },
    { id: 'DeveloperPlatform', label: 'Developers', page: Page.DEVELOPER_PLATFORM },
    { id: 'GetStarted', label: 'Get Started', page: Page.PUBLIC_LOGIN }
  ];

  const categories = [
    { id: 'All Features', label: 'All Intel', desc: 'Unified Platform', icon: <LayoutGrid size={24} />, activeColor: 'from-blue-600 to-indigo-600', shadow: 'shadow-blue-500/50' },
    { id: 'Project Ops', label: 'Project Ops', desc: 'Auto-Scheduling', icon: <Construction size={24} />, activeColor: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/50' },
    { id: 'Financial Mgt', label: 'Financial Mgt', desc: 'Smart Accounting', icon: <Coins size={24} />, activeColor: 'from-violet-600 to-purple-600', shadow: 'shadow-violet-500/50' },
    { id: 'Business Dev', label: 'Business Dev', desc: 'Neural Growth', icon: <Briefcase size={24} />, activeColor: 'from-orange-500 to-red-600', shadow: 'shadow-orange-500/50' },
  ];

  const features: Feature[] = [
    // --- ACTIVE FEATURES ---
    { id: 'pm', title: 'Project Management', category: 'Project Ops', status: 'Active', icon: <Construction />, desc: 'End-to-end lifecycle automation' },
    { id: 'tt', title: 'Task Tracking', category: 'Project Ops', status: 'Active', icon: <CheckCircle2 />, desc: 'AI-prioritized task queues' },
    { id: 'dl', title: 'Daily Logs', category: 'Project Ops', status: 'Active', icon: <PenTool />, desc: 'Voice-to-text site logging' },
    { id: 'pg', title: 'Photo Gallery', category: 'Project Ops', status: 'Active', icon: <Camera />, desc: 'Computer vision site analysis' },
    { id: 'dm', title: 'Document Management', category: 'Project Ops', status: 'Active', icon: <FolderOpen />, desc: 'Smart indexing and OCR' },
    { id: 'tc', title: 'Team Collaboration', category: 'Project Ops', status: 'Active', icon: <Users />, desc: 'Real-time multi-crew sync' },
    { id: 'rm', title: 'RFI Management', category: 'Project Ops', status: 'Active', icon: <FileText />, desc: 'Automated RFI generation' },
    { id: 'rt', title: 'RFI Tracking', category: 'Project Ops', status: 'Active', icon: <Search />, desc: 'Resolution bottleneck alerts' },
    { id: 'qc', title: 'Quality Control', category: 'Project Ops', status: 'Active', icon: <Target />, desc: 'Spec compliance verification' },
    { id: 'ds', title: 'Daywork Sheets', category: 'Project Ops', status: 'Active', icon: <BarChart4 />, desc: 'Automated variaton tracking' },
    { id: 'lb', title: 'Labor Tracking', category: 'Project Ops', status: 'Active', icon: <Clock />, desc: 'Biometric at-site attendance' },
    { id: 'ib', title: 'Invoicing & Billing', category: 'Financial Mgt', status: 'Active', icon: <FileText />, desc: 'One-click progress billing' },

    // --- IN PROGRESS FEATURES ---
    { id: 'ca', title: 'AI Chatbot Assistant', category: 'Project Ops', status: 'In Progress', icon: <Bot />, desc: 'LLM trained on construction codes' },
    { id: 'da', title: 'Document Analysis', category: 'Project Ops', status: 'In Progress', icon: <FileText />, desc: 'AI contrast & claim detection' },
    { id: 'pa', title: 'Predictive Analytics', category: 'Project Ops', status: 'In Progress', icon: <Brain />, desc: 'Neural risk forecasting models' },
    { id: 'ss', title: 'Smart Scheduling', category: 'Project Ops', status: 'In Progress', icon: <Clock />, desc: 'GAN-optimized project timelines' },
    { id: 'ra', title: 'Risk Assessment', category: 'Project Ops', status: 'In Progress', icon: <AlertCircle />, desc: 'Probability-based hazard scores' },
    { id: 'ta', title: 'Trend Analysis', category: 'Business Dev', status: 'In Progress', icon: <TrendingUp />, desc: 'Market sentiment modeling' },

    // --- PLANNED FEATURES ---
    { id: 'lm', title: 'Lead Management', category: 'Business Dev', status: 'Planned', icon: <Target />, desc: 'AI-sourced project biddings' },
    { id: 'rc', title: 'Robotics Coordination', category: 'Project Ops', status: 'Planned', icon: <Bot />, desc: 'Swarm drone site mapping' },
    { id: 'bc', title: 'Blockchain Contracts', category: 'Financial Mgt', status: 'Planned', icon: <Network />, desc: 'Smart legal self-execution' },
    { id: 'qc_comp', title: 'Quantum Computing', category: 'Project Ops', status: 'Planned', icon: <Microchip />, desc: 'Sub-second route optimization' },
  ];

  const filteredFeatures = activeCategory === 'All Features'
    ? features
    : features.filter(f => f.category === activeCategory);

  const stats = {
    total: features.length,
    active: features.filter(f => f.status === 'Active').length,
    inProgress: features.filter(f => f.status === 'In Progress').length,
    planned: features.filter(f => f.status === 'Planned').length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 font-sans text-white overflow-x-hidden selection:bg-indigo-400/30">
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        .animate-pulse-glow {
          animation: pulse-glow 4s ease-in-out infinite;
        }
        .glass-panel {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
      `}</style>

      {/* --- HIGH-TECH NAVBAR --- */}
      <nav className="bg-white/5 backdrop-blur-2xl border-b border-white/10 sticky top-0 z-[100] transition-all duration-300">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10">
          <div className="flex justify-between items-center h-20">
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => {
                setPage(Page.CORTEX_BUILD_HOME);
                window.scrollTo(0, 0);
              }}
            >
              <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/20 group-hover:rotate-6 transition-all">
                <BrainCircuit className="text-white" size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-white">
                  Cortex<span className="text-indigo-400">Build</span>
                </span>
                <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest leading-none">Neural Core</span>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-10">
              {menuItems.slice(0, 5).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setPage(item.page);
                    setCurrentPage(item.page);
                  }}
                  className={`text-sm font-semibold tracking-wide transition-all relative py-2 ${currentPage === item.page ? "text-indigo-400" : "text-slate-400 hover:text-white"
                    }`}
                >
                  {item.label}
                  {currentPage === item.page && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setPage(Page.LOGIN)}
                className="hidden sm:block text-sm font-bold text-slate-400 px-5 py-2.5 hover:text-white transition-all"
              >
                Login
              </button>
              <button
                onClick={() => setPage(Page.PUBLIC_LOGIN)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-indigo-500/20 transition-all active:scale-95"
              >
                Initialize Node
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* --- HERO / INTRO --- */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-[600px] bg-[radial-gradient(circle_at_70%_0%,rgba(99,102,241,0.15),transparent_70%)] opacity-50"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 relative z-10">
          <div className="lg:flex justify-between items-end gap-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6">
                <Sparkles size={14} /> System Architecture
              </div>
              <h1 className="text-5xl lg:text-7xl font-black mb-8 leading-tight">
                The Neural <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Network Engine</span>
              </h1>
              <p className="text-xl text-slate-400 font-medium leading-relaxed max-w-2xl">
                CortexBuild isn&apos;t just software—it&apos;s a living neural core that connects every aspect of your construction project into a single, intelligent flow.
              </p>
            </div>

            {/* Live Status Board */}
            <div className="hidden lg:grid grid-cols-2 gap-4">
              {[
                { label: 'Active Modules', val: stats.active, icon: Zap, color: 'text-emerald-400' },
                { label: 'Pending Logic', val: stats.inProgress, icon: Activity, color: 'text-amber-400' },
                { label: 'Neural Capacity', val: '99.9%', icon: Cpu, color: 'text-indigo-400' },
                { label: 'Latency', val: '12ms', icon: Clock, color: 'text-pink-400' },
              ].map((stat, i) => (
                <div key={i} className="glass-panel p-6 rounded-3xl min-w-[200px]">
                  <div className="flex justify-between items-center mb-2">
                    <stat.icon className={stat.color} size={20} />
                    <span className="text-2xl font-black">{stat.val}</span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --- CATEGORY SELECTORS: INNOVATIVE TABS --- */}
      <section className="py-12 relative">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10">
          <div className="flex flex-wrap items-center gap-4 mb-12">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`relative px-8 py-5 rounded-3xl transition-all duration-500 group overflow-hidden ${activeCategory === cat.id
                  ? 'bg-gradient-to-br ' + cat.activeColor + ' ' + cat.shadow + ' -translate-y-1'
                  : 'glass-panel hover:bg-white/5'
                  }`}
              >
                {activeCategory === cat.id && (
                  <div className="absolute inset-0 bg-white/10 opacity-50 animate-pulse-glow"></div>
                )}
                <div className="flex items-center gap-4 relative z-10">
                  <div className={`p-3 rounded-2xl ${activeCategory === cat.id ? 'bg-white/20' : 'bg-slate-800 text-slate-400 group-hover:text-white transition-colors'}`}>
                    {cat.icon}
                  </div>
                  <div className="text-left">
                    <div className={`font-black tracking-tight ${activeCategory === cat.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
                      {cat.label}
                    </div>
                    <div className={`text-[10px] font-bold uppercase tracking-tight ${activeCategory === cat.id ? 'text-white/70' : 'text-slate-500'}`}>
                      {cat.desc}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* --- INTELLIGENT FEATURE GRID --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredFeatures.map((feature) => (
              <div
                key={feature.id}
                onMouseEnter={() => setHoveredFeature(feature.id)}
                onMouseLeave={() => setHoveredFeature(null)}
                className={`group relative glass-panel p-8 rounded-[36px] transition-all duration-500 cursor-pointer overflow-hidden ${hoveredFeature === feature.id ? 'bg-white/[0.06] border-indigo-500/30 -translate-y-2' : ''
                  }`}
              >
                {/* Background Glow on Hover */}
                {hoveredFeature === feature.id && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/20 blur-3xl rounded-full translate-x-10 -translate-y-10"></div>
                )}

                <div className="flex flex-col h-full relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg ${hoveredFeature === feature.id
                      ? 'bg-indigo-600 shadow-indigo-500/50 scale-110'
                      : 'bg-slate-900 border border-white/5 text-indigo-400'
                      }`}>
                      {React.cloneElement(feature.icon as React.ReactElement<any>, { size: 28, className: hoveredFeature === feature.id ? 'text-white' : 'text-indigo-400' })}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${feature.status === 'Active' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' :
                        feature.status === 'In Progress' ? 'bg-amber-400' : 'bg-slate-600'
                        }`}></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-300 transition-colors">
                        {feature.status}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-xl font-black mb-3 text-white group-hover:text-indigo-400 transition-colors tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed font-medium mb-8">
                    {feature.desc}
                  </p>

                  <div className="mt-auto flex items-center gap-2 text-indigo-400 font-bold text-xs group-hover:gap-3 transition-all">
                    Initialize Module <ArrowRight size={14} />
                  </div>
                </div>

                {/* Cyber Decorative Lines */}
                <div className="absolute bottom-4 right-4 opacity-10">
                  <CircuitBoard size={48} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- REVEAL SECTION: FUTURE INTELLIGENCE --- */}
      <section className="py-32 relative">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10">
          <div className="glass-panel rounded-[48px] p-12 lg:p-20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-600/10 to-transparent"></div>

            <div className="lg:flex justify-between items-center gap-20">
              <div className="max-w-2xl relative z-10">
                <div className="text-indigo-400 font-black tracking-widest uppercase mb-6 flex items-center gap-2">
                  <Bot size={24} /> Autonomous Construction
                </div>
                <h2 className="text-4xl lg:text-6xl font-black mb-8 leading-tight">
                  Beyond <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Management.</span> Independence.
                </h2>
                <p className="text-xl text-slate-400 leading-relaxed mb-10">
                  Our roadmap moves from assistance to zero-touch coordination. By 2026, CortexBuild will manage material logistics, compliance audits, and budget balancing autonomously.
                </p>
                <div className="flex flex-wrap gap-4">
                  <button onClick={() => setPage(Page.DEVELOPER_PLATFORM)} className="bg-white text-slate-950 px-8 py-4 rounded-2xl font-black text-sm hover:scale-105 transition-all shadow-xl shadow-white/10">
                    View Enterprise Roadmap
                  </button>
                  <button className="bg-white/10 border border-white/10 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-white/20 transition-all">
                    Beta Access Request
                  </button>
                </div>
              </div>

              <div className="hidden lg:block relative flex-1 aspect-square max-w-[400px]">
                <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-[100px] animate-pulse-glow"></div>
                <div className="relative z-10 w-full h-full bg-slate-900/50 rounded-full border border-white/10 flex items-center justify-center backdrop-blur-3xl animate-float">
                  <Network size={160} className="text-indigo-400/30" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Cpu size={80} className="text-white animate-pulse" />
                  </div>
                </div>
                {/* Orbital Rings */}
                <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
                <div className="absolute inset-4 border border-purple-500/10 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- MINIMALIST DARK FOOTER --- */}
      <footer className="py-20 border-t border-white/10 bg-slate-900/50 backdrop-blur-xl">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setPage(Page.CORTEX_BUILD_HOME)}>
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 transition-all">
              <BrainCircuit size={20} className="text-white" />
            </div>
            <span className="font-black text-white text-lg tracking-tight">CortexBuild <span className="text-indigo-400">Pro</span></span>
          </div>
          <div className="flex gap-12 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <span className="hover:text-indigo-400 transition-colors cursor-pointer">Security Protocol</span>
            <span className="hover:text-indigo-400 transition-colors cursor-pointer">API Governance</span>
            <span className="hover:text-indigo-400 transition-colors cursor-pointer">Global Infrastructure</span>
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">
            © 2025 AI Intelligence Platform. All neural pathways reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

interface BriefcaseProps {
  size?: number;
}
function Briefcase({ size = 20 }: BriefcaseProps) {
  return <BriefcaseIcon size={size} />;
}
import { Briefcase as BriefcaseIcon, BrainCircuit } from 'lucide-react';

export default NeuralNetworkView;