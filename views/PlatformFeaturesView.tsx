import React, { useState } from 'react';
import { Page } from '@/types';
import {
  Cpu,
  Construction,
  Coins,
  FileText,
  ShieldCheck,
  TrendingUp,
  Bot,
  RefreshCw,
  Zap,
  Target,
  Sparkles,
  Layers,
  BrainCircuit,
  Activity,
  ArrowRight,
  Database,
  Network
} from 'lucide-react';

const PlatformFeaturesView: React.FC<{ setPage: (page: Page) => void }> = ({ setPage }) => {
  const [currentPage, setCurrentPage] = useState(Page.PLATFORM_FEATURES);

  const menuItems = [
    { id: 'Home', label: 'Home', page: Page.CORTEX_BUILD_HOME },
    { id: 'NeuralNetwork', label: 'AI Engine', page: Page.NEURAL_NETWORK },
    { id: 'PlatformFeatures', label: 'Features', page: Page.PLATFORM_FEATURES },
    { id: 'Connectivity', label: 'Integrations', page: Page.CONNECTIVITY },
    { id: 'DeveloperPlatform', label: 'Developers', page: Page.DEVELOPER_PLATFORM },
    { id: 'GetStarted', label: 'Get Started', page: Page.PUBLIC_LOGIN }
  ];

  const agents = [
    {
      title: 'Project Intelligence',
      subtitle: 'AI Project Manager',
      desc: 'Monitors project health, predicts delays, optimizes schedules, and identifies risks before they become critical issues using real-time field data.',
      icon: <Construction size={24} />,
      iconBg: 'bg-blue-600',
      tags: ['Schedule Opto', 'Risk Detection', 'Resource Planning'],
      tagColor: 'text-blue-400 border-blue-500/30'
    },
    {
      title: 'Financial Advisor',
      subtitle: 'AI Accountant',
      desc: 'Analyzes cash flow, forecasts budgets, detects anomalies, and provides real-time financial insights for high-stakes decision-making.',
      icon: <Coins size={24} />,
      iconBg: 'bg-emerald-500',
      tags: ['Cash Flow', 'Budget Forecast', 'Cost Opto'],
      tagColor: 'text-emerald-400 border-emerald-500/30'
    },
    {
      title: 'Document Intelligence',
      subtitle: 'AI Document Analyst',
      desc: 'Extracts data from contracts, drawings, and RFIs. Answers queries instantly by searching through your entire neural archive.',
      icon: <FileText size={24} />,
      iconBg: 'bg-violet-600',
      tags: ['Neural Search', 'OCR Extraction', 'Auto-Tagging'],
      tagColor: 'text-violet-400 border-violet-500/30'
    },
    {
      title: 'Safety Monitor',
      subtitle: 'AI Safety Officer',
      desc: 'Uses computer vision and ML to detect safety violations, predict incidents, and ensure absolute compliance with site regulations.',
      icon: <ShieldCheck size={24} />,
      iconBg: 'bg-red-500',
      tags: ['Hazard Detection', 'Compliance', 'Prevention'],
      tagColor: 'text-red-400 border-red-500/30'
    },
    {
      title: 'Business Strategist',
      subtitle: 'AI Business Advisor',
      desc: 'Analyzes market trends, identifies high-value opportunities, scores leads, and provides strategic recommendations for enterprise growth.',
      icon: <TrendingUp size={24} />,
      iconBg: 'bg-orange-600',
      tags: ['Market Intel', 'Lead Scoring', 'Growth Strategy'],
      tagColor: 'text-orange-400 border-orange-500/30'
    },
    {
      title: 'Conversational Assistant',
      subtitle: 'AI Chat Interface',
      desc: 'Your natural language bridge to the entire platform. Execute complex commands and get deep project insights through simple conversation.',
      icon: <Bot size={24} />,
      iconBg: 'bg-indigo-600',
      tags: ['Natural Language', 'Voice Link', '24/7 Support'],
      tagColor: 'text-indigo-400 border-indigo-500/30'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 font-sans text-white overflow-x-hidden selection:bg-indigo-400/30">
      <style>{`
        .glass-panel {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>

      {/* --- REUSED PREMIUM NAVBAR --- */}
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
              <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 onto-purple-500 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <BrainCircuit className="text-white" size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-white">
                  Cortex<span className="text-indigo-400">Build</span>
                </span>
                <span className="text-[10px] font-bold tracking-[0.2em] text-indigo-400 uppercase leading-none">Intelligence Hub</span>
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
                className="hidden sm:block text-sm font-bold text-slate-400 px-5 py-2 hover:text-white transition-all"
              >
                Login
              </button>
              <button
                onClick={() => setPage(Page.PUBLIC_LOGIN)}
                className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-indigo-200"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-20 relative">
        <div className="absolute top-0 right-0 w-full h-[600px] bg-[radial-gradient(circle_at_70%_0%,rgba(99,102,241,0.1),transparent_70%)] opacity-30"></div>

        {/* --- HEADER --- */}
        <div className="max-w-4xl mb-24 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-widest mb-6 animate-pulse">
            <Sparkles size={12} /> Architectural Features
          </div>
          <h1 className="text-6xl lg:text-8xl font-black mb-8 leading-tight tracking-tight">
            The AI Core: <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Expert Agent Fleet</span>
          </h1>
          <p className="text-xl text-slate-400 font-medium leading-relaxed max-w-2xl">
            Powered by advanced neural architectures, our specialized agents work in parallel to optimize every facet of your construction enterprise.
          </p>
        </div>

        {/* --- AGENTS GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24 relative z-10">
          {agents.map((agent, i) => (
            <div
              key={i}
              className="group relative glass-panel p-10 rounded-[48px] transition-all duration-500 hover:bg-white/[0.06] hover:border-indigo-500/30 hover:-translate-y-2"
            >
              <div className="flex items-center gap-5 mb-8">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-2xl transition-all duration-500 group-hover:scale-110 ${agent.iconBg} shadow-indigo-500/20`}>
                  {agent.icon}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tighter">{agent.title}</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{agent.subtitle}</p>
                </div>
              </div>

              <p className="text-slate-400 font-medium leading-relaxed mb-10 text-lg">
                {agent.desc}
              </p>

              <div className="flex flex-wrap gap-2 mb-8">
                {agent.tags.map((tag, j) => (
                  <span key={j} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${agent.tagColor}`}>
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-auto flex items-center gap-3 text-indigo-400 font-bold text-xs group-hover:gap-4 transition-all uppercase tracking-widest">
                Initialize Protocol <ArrowRight size={14} />
              </div>
            </div>
          ))}
        </div>

        {/* --- COLLABORATION SECTION --- */}
        <section className="relative">
          <div className="glass-panel rounded-[64px] p-12 lg:p-20 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>

            <div className="max-w-3xl mb-16 relative z-10">
              <h2 className="text-4xl lg:text-6xl font-black text-white tracking-tight mb-6">Autonomous <span className="text-indigo-400">Collaboration</span></h2>
              <p className="text-xl text-slate-400 font-medium">How our decentralized agents synthesize site data into enterprise-level intelligence.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
              {[
                { title: 'Neural Sync', desc: 'All agents share a cryptographically secured knowledge base for zero-lag insights.', icon: Network },
                { title: 'Edge Processing', desc: 'Real-time decision making occurs at the site level, minimizing latency and maximizing response.', icon: Activity },
                { title: 'Global Database', desc: 'A unified ledger of every interaction, document, and site event for absolute traceability.', icon: Database },
              ].map((feat, i) => (
                <div key={i} className="bg-white/5 p-8 rounded-[40px] border border-white/5 hover:border-indigo-500/20 transition-all group">
                  <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center mb-8 border border-white/5 group-hover:scale-110 transition-transform">
                    <feat.icon className="text-indigo-400" size={32} />
                  </div>
                  <h4 className="text-xl font-black text-white mb-4 uppercase tracking-tighter">{feat.title}</h4>
                  <p className="text-slate-400 font-medium leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* --- FOOTER --- */}
      <footer className="py-20 border-t border-white/10 bg-slate-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setPage(Page.CORTEX_BUILD_HOME)}>
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 transition-all">
              <BrainCircuit size={20} className="text-white" />
            </div>
            <span className="font-black text-white text-lg tracking-tight">CortexBuild <span className="text-indigo-400">Pro</span></span>
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700">
            © 2025 AI Intelligence Platform • Global Infrastructure Node
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PlatformFeaturesView;