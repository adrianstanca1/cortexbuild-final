import React, { useState } from 'react';
import { Page } from '@/types';
import {
  Cpu,
  Puzzle,
  Wrench,
  Coins,
  Globe,
  Terminal,
  Box,
  Activity,
  Rocket,
  CheckCircle2,
  Code2,
  BrainCircuit,
  ArrowRight,
  Sparkles,
  Command,
  Braces
} from 'lucide-react';

const DeveloperPlatformView: React.FC<{ setPage: (page: Page) => void }> = ({ setPage }) => {
  const [currentPage, setCurrentPage] = useState(Page.DEVELOPER_PLATFORM);

  const menuItems = [
    { id: 'Home', label: 'Home', page: Page.CORTEX_BUILD_HOME },
    { id: 'NeuralNetwork', label: 'AI Engine', page: Page.NEURAL_NETWORK },
    { id: 'PlatformFeatures', label: 'Features', page: Page.PLATFORM_FEATURES },
    { id: 'Connectivity', label: 'Integrations', page: Page.CONNECTIVITY },
    { id: 'DeveloperPlatform', label: 'Developers', page: Page.DEVELOPER_PLATFORM },
    { id: 'GetStarted', label: 'Get Started', page: Page.PUBLIC_LOGIN }
  ];

  const reasons = [
    {
      title: 'Neural Architecture',
      desc: 'Build self-contained modules that synthesize perfectly with our neural core for real-time site logic.',
      icon: <Puzzle className="text-white" size={24} />,
      iconBg: 'bg-blue-600'
    },
    {
      title: 'Unified SDK',
      desc: 'Access low-latency APIs, reactive hooks, and comprehensive docs to extend the construction ecosystem.',
      icon: <Wrench className="text-white" size={24} />,
      iconBg: 'bg-indigo-600'
    },
    {
      title: 'Global Economy',
      desc: 'Deploy to our marketplace and earn from your innovation with industry-leading 70% rev-share.',
      icon: <Coins className="text-white" size={24} />,
      iconBg: 'bg-emerald-500'
    },
    {
      title: 'Site-wide Impact',
      desc: 'Reach thousands of enterprise tiers globally, driving the future of automated physical labor.',
      icon: <Globe className="text-white" size={24} />,
      iconBg: 'bg-violet-600'
    }
  ];

  const sandboxFeatures = [
    { title: 'Neural Sandbox', desc: 'Secure environment for building and testing agent logic without affecting site data.', icon: <Box size={24} /> },
    { title: 'Telemetry Metrics', desc: 'Track API usage, error rates, and neural weight performance in real-time.', icon: <Activity className="text-indigo-400" size={24} /> },
    { title: 'Atomic Deployment', desc: 'Instant versioning and rollback for mission-critical production environments.', icon: <Rocket className="text-emerald-500" size={24} /> }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 font-sans text-white overflow-x-hidden selection:bg-indigo-400/30">
      <style>{`
        .glass-panel {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        @keyframes glow {
          0%, 100% { filter: drop-shadow(0 0 10px rgba(99,102,241,0.2)); }
          50% { filter: drop-shadow(0 0 20px rgba(99,102,241,0.5)); }
        }
        .animate-glow {
          animation: glow 4s ease-in-out infinite;
        }
      `}</style>

      {/* --- PREMIERE NAVBAR --- */}
      <nav className="bg-white/5 backdrop-blur-2xl border-b border-white/10 sticky top-0 z-[100] transition-all duration-300">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10">
          <div className="flex justify-between items-center h-20">
            <div
              className="flex items-center gap-4 cursor-pointer group"
              onClick={() => {
                setPage(Page.CORTEX_BUILD_HOME);
                window.scrollTo(0, 0);
              }}
            >
              <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                <BrainCircuit className="text-white" size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black text-white tracking-tight leading-none uppercase">CortexBuild</span>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Dev Ecosystem</span>
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
                className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-indigo-500/20 hover:scale-[1.02] transition-all"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-20 relative">
        <div className="absolute top-0 right-0 w-full h-[600px] bg-[radial-gradient(circle_at_80%_0%,rgba(99,102,241,0.1),transparent_70%)] opacity-30"></div>

        {/* --- HERO --- */}
        <div className="max-w-4xl mb-24 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-widest mb-6 animate-pulse">
            <Terminal size={12} /> Protocol Interface
          </div>
          <h1 className="text-6xl lg:text-8xl font-black mb-8 leading-tight tracking-tight uppercase">
            Code the <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Physical World.</span>
          </h1>
          <p className="text-xl text-slate-400 font-medium leading-relaxed max-w-2xl">
            Join the decentralized developer network transforming site logic into scalable enterprise intelligence. From sensors to software.
          </p>
        </div>

        {/* --- WHY BUILD --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-32 relative z-10">
          {reasons.map((reason, i) => (
            <div key={i} className="group relative glass-panel p-10 rounded-[48px] transition-all duration-500 hover:bg-white/[0.06] hover:-translate-y-2 flex items-start gap-8">
              <div className={`w-16 h-16 ${reason.iconBg} rounded-2xl flex items-center justify-center shrink-0 shadow-2xl group-hover:scale-110 transition-transform`}>
                {reason.icon}
              </div>
              <div>
                <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter">{reason.title}</h3>
                <p className="text-lg text-slate-400 font-medium leading-relaxed group-hover:text-slate-300 transition-colors">
                  {reason.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* --- CODE TERMINAL --- */}
        <section className="mb-32 relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[48px] opacity-20 group-hover:opacity-40 blur transition duration-1000"></div>
          <div className="relative bg-slate-900 rounded-[48px] p-8 md:p-14 shadow-2xl overflow-hidden border border-white/5">
            <div className="flex items-center justify-between mb-10">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              </div>
              <div className="bg-white/5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500 border border-white/5 flex items-center gap-2">
                <Braces size={12} /> protocol_v2_core.ts
              </div>
            </div>

            <pre className="font-mono text-base md:text-xl text-slate-300 overflow-x-auto leading-relaxed">
              <code>{`import { CortexCore } from '@cortex/neural-sdk';

export class IntelligenceNode {
  async onSiteEvent(trigger: ProtocolTrigger) {
    // Access high-fidelity site metrics
    const telematics = await trigger.getSiteData();

    // Synthesize through Neural Model
    const analysis = await CortexCore.analyze(telematics, {
      priority: 'CRITICAL',
      autonomous: true
    });

    // Execute field-level correction
    return trigger.broadcast(analysis.vector);
  }
}`}</code>
            </pre>

            <div className="flex flex-wrap gap-4 mt-12 pt-8 border-t border-white/5">
              {[
                { label: 'Neural APIs', icon: Sparkles, color: 'text-indigo-400' },
                { label: 'Reactive Streams', icon: Activity, color: 'text-sky-400' },
                { label: 'Atomic Execution', icon: Command, color: 'text-emerald-400' },
              ].map((pill, i) => (
                <span key={i} className={`bg-white/5 border border-white/10 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 ${pill.color}`}>
                  <pill.icon size={16} /> {pill.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* --- ECOSYSTEM --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-32 relative z-10">
          <div className="glass-panel p-12 rounded-[56px] border border-white/5">
            <div className="inline-flex items-center gap-2 text-indigo-400 font-black uppercase tracking-widest text-xs mb-8">
              Internal Prototype Lab
            </div>
            <h3 className="text-3xl font-black mb-10 tracking-tighter uppercase">Developer Sandbox</h3>

            <div className="space-y-4">
              {sandboxFeatures.map((feat, i) => (
                <div key={i} className="flex items-center gap-6 p-6 bg-white/5 rounded-3xl border border-white/5 hover:border-indigo-500/20 hover:bg-white/[0.08] transition-all group">
                  <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shrink-0 border border-white/10 shadow-xl group-hover:scale-105 transition-transform text-slate-400">
                    {feat.icon}
                  </div>
                  <div>
                    <h4 className="font-black text-white text-lg tracking-tight uppercase">{feat.title}</h4>
                    <p className="text-sm font-medium text-slate-400">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-12 rounded-[56px] shadow-2xl text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-[80px] translate-x-1/2 -translate-y-1/2"></div>

            <div className="inline-flex items-center gap-2 text-indigo-200 font-black uppercase tracking-widest text-xs mb-8">
              Capitalization Node
            </div>
            <h3 className="text-3xl font-black mb-10 tracking-tighter uppercase">Marketplace Node</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/10 group-hover:translate-y-[-4px] transition-transform">
                <div className="text-4xl font-black mb-2 tracking-tighter">70%</div>
                <div className="text-[10px] uppercase tracking-widest font-black text-indigo-200">Revenue Yield</div>
              </div>
              <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/10 group-hover:translate-y-[-4px] transition-transform delay-75">
                <div className="text-4xl font-black mb-2 tracking-tighter">1.2k+</div>
                <div className="text-[10px] uppercase tracking-widest font-black text-indigo-200">Active Modules</div>
              </div>
              <div className="col-span-2 bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/10 flex items-center gap-6 group-hover:translate-y-[-4px] transition-transform delay-150">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                  <Code2 size={32} />
                </div>
                <div>
                  <div className="font-black text-xl tracking-tight uppercase">Atomic Installation</div>
                  <div className="text-sm text-indigo-100/70 font-medium">Distributed module registry for site nodes.</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setPage(Page.MARKETPLACE)}
              className="w-full mt-12 bg-white text-indigo-600 py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-indigo-50 transition-all active:scale-[0.98]"
            >
              Enter Global Hub
            </button>
          </div>
        </div>

        {/* --- CTA --- */}
        <div className="relative">
          <div className="glass-panel rounded-[64px] p-16 lg:p-24 text-center border-indigo-500/20 overflow-hidden group">
            <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <h2 className="text-4xl lg:text-7xl font-black text-white mb-8 uppercase tracking-tighter">Initialize Your Hub</h2>
            <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
              Synthesize your specialized construction logic into the global CortexBuild ecosystem.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <button
                onClick={() => setPage(Page.PUBLIC_LOGIN)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 px-12 rounded-3xl shadow-2xl shadow-indigo-500/20 transition-all uppercase tracking-widest text-sm hover:scale-105 active:scale-95"
              >
                Request API Node
              </button>
              <button
                onClick={() => setPage(Page.PUBLIC_LOGIN)}
                className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black py-5 px-12 rounded-3xl transition-all uppercase tracking-widest text-sm"
              >
                Read Specification
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* --- FOOTER --- */}
      <footer className="py-20 border-t border-white/10 bg-slate-900/50 backdrop-blur-xl mt-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setPage(Page.CORTEX_BUILD_HOME)}>
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 transition-all">
              <BrainCircuit size={20} className="text-white" />
            </div>
            <span className="font-black text-white text-lg tracking-tight uppercase leading-none">CortexBuild Pro</span>
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700">
            © 2025 AI Intelligence Platform • Global Infrastructure Node
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DeveloperPlatformView;