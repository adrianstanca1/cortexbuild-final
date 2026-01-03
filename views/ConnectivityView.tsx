import React, { useState } from 'react';
import { Page } from '@/types';
import {
  Cpu,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Search,
  Save,
  Key,
  Globe,
  Zap,
  LayoutGrid,
  Database,
  Briefcase,
  Building2,
  PlugZap,
  Share2,
  BookOpen,
  BrainCircuit,
  ArrowRight,
  Activity,
  Server,
  Cloud
} from 'lucide-react';

const ConnectivityView: React.FC<{ setPage: (page: Page) => void }> = ({ setPage }) => {
  const [currentPage, setCurrentPage] = useState(Page.CONNECTIVITY);

  const menuItems = [
    { id: 'Home', label: 'Home', page: Page.CORTEX_BUILD_HOME },
    { id: 'NeuralNetwork', label: 'AI Engine', page: Page.NEURAL_NETWORK },
    { id: 'PlatformFeatures', label: 'Features', page: Page.PLATFORM_FEATURES },
    { id: 'Connectivity', label: 'Integrations', page: Page.CONNECTIVITY },
    { id: 'DeveloperPlatform', label: 'Developers', page: Page.DEVELOPER_PLATFORM },
    { id: 'GetStarted', label: 'Get Started', page: Page.PUBLIC_LOGIN }
  ];

  const integrationCategories = [
    {
      title: 'Financial Logic',
      icon: <Building2 className="text-white" size={24} />,
      iconBg: 'bg-emerald-500',
      items: ['Real-time Banking APIs', 'Direct Sage & Xero Sync', 'AI Payment Gateways', 'Global Tax Compliance']
    },
    {
      title: 'Business Comms',
      icon: <Briefcase className="text-white" size={24} />,
      iconBg: 'bg-blue-600',
      items: ['Microsoft 365 Core', 'Google Workspace Hub', 'Mission Control Slack', 'Encrypted Email Hub']
    },
    {
      title: 'Site Operations',
      icon: <LayoutGrid className="text-white" size={24} />,
      iconBg: 'bg-orange-600',
      items: ['Live BIM (Autodesk)', 'Project Logic Tools', 'Telematics Sync', 'Supplier Neural Link']
    },
    {
      title: 'Intelligence Core',
      icon: <Database className="text-white" size={24} />,
      iconBg: 'bg-violet-600',
      items: ['Google Gemini Ultra', 'Custom Neural Models', 'Live Data Lakes', 'Predictive Analysis']
    }
  ];

  const securityFeatures = [
    { title: 'Neural Encryption', desc: 'Symmetric/Asymmetric encryption (AES-256-GCM) at every node.', icon: <Lock className="text-yellow-500" /> },
    { title: 'Zero Trust Access', desc: 'Secure entry via MFA, SSO, and localized neural authorization.', icon: <ShieldCheck className="text-red-500" /> },
    { title: 'Certified Nodes', desc: 'SOC 2 Type II, GDPR, and ISO 27001 compliant infrastructure.', icon: <CheckCircle2 className="text-emerald-500" /> },
    { title: 'Real-time Guard', desc: 'Continuous AI security monitoring with 12ms event detection.', icon: <Search className="text-slate-500" /> },
    { title: 'Atomic Backups', desc: 'Snapshot-level recovery with decentralized redundancy across 12 regions.', icon: <Save className="text-slate-400" /> },
    { title: 'Data Sovereignty', desc: 'You own the neural weight. We provide the architecture.', icon: <Key className="text-amber-500" /> }
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
          animation: float 5s ease-in-out infinite;
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
                <span className="text-xl font-black text-white tracking-tight leading-none">CortexBuild</span>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Global Connectivity</span>
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
        <div className="absolute top-0 left-0 w-full h-[600px] bg-[radial-gradient(circle_at_20%_0%,rgba(99,102,241,0.1),transparent_70%)] opacity-30"></div>

        {/* --- HERO --- */}
        <div className="max-w-4xl mb-24 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-widest mb-6 animate-pulse">
            <Globe size={12} /> Enterprise Infrastructure
          </div>
          <h1 className="text-6xl lg:text-8xl font-black mb-8 leading-tight tracking-tight">
            Seamless Hub. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Neural Scale.</span>
          </h1>
          <p className="text-xl text-slate-400 font-medium leading-relaxed max-w-2xl">
            Integrations that evolve. Connect your existing tactical tools to the CortexBuild core and scale your operations with zero friction.
          </p>
        </div>

        {/* --- INTEGRATIONS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-32 relative z-10">
          {integrationCategories.map((cat, i) => (
            <div key={i} className="group relative glass-panel p-10 rounded-[48px] transition-all duration-500 hover:bg-white/[0.06] hover:-translate-y-2">
              <div className={`w-16 h-16 ${cat.iconBg} rounded-[2rem] flex items-center justify-center mb-10 shadow-xl group-hover:scale-110 transition-transform`}>
                {cat.icon}
              </div>
              <h3 className="text-xl font-black text-white mb-8 tracking-tighter uppercase">{cat.title}</h3>
              <ul className="space-y-6">
                {cat.items.map((item, j) => (
                  <li key={j} className="flex items-center gap-4">
                    <CheckCircle2 className="text-indigo-400" size={16} />
                    <span className="text-sm font-semibold text-slate-400 group-hover:text-slate-200 transition-colors uppercase tracking-tight">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* --- SECURITY --- */}
        <section className="relative mb-32">
          <div className="glass-panel rounded-[64px] p-12 lg:p-20 relative overflow-hidden group border-amber-500/10">
            <div className="absolute top-0 right-0 p-20 opacity-5">
              <ShieldCheck size={300} className="text-white" />
            </div>

            <div className="max-w-3xl mb-16 relative z-10">
              <h2 className="text-4xl lg:text-6xl font-black text-white mb-6 uppercase tracking-tight">Neural <span className="text-amber-500">Defense</span> Unit</h2>
              <p className="text-xl text-slate-400 font-medium">Enterprise-grade security and decentralized compliance for mission-critical site data.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
              {securityFeatures.map((feat, i) => (
                <div key={i} className="bg-white/5 p-10 rounded-[40px] border border-white/5 hover:border-amber-500/20 transition-all flex flex-col items-start group">
                  <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center mb-8 border border-white/10 group-hover:bg-amber-500/10 transition-all">
                    {React.cloneElement(feat.icon as React.ReactElement<any>, { size: 28 })}
                  </div>
                  <h4 className="text-xl font-black text-white mb-4 uppercase tracking-tighter">{feat.title}</h4>
                  <p className="text-slate-400 font-medium leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 relative z-10">
              {[
                { label: 'Neural Uptime', val: '99.99%', color: 'text-indigo-400' },
                { label: 'Latency Map', val: '<24ms', color: 'text-emerald-400' },
                { label: 'Sync Nodes', val: 'Unfiltered', color: 'text-violet-400' },
                { label: 'Total Memory', val: 'Zettabyte', color: 'text-rose-400' }
              ].map((stat, i) => (
                <div key={i} className="glass-panel p-8 rounded-[32px] text-center hover:bg-white/5 transition-all">
                  <div className={`text-3xl font-black ${stat.color} mb-2 tracking-tighter`}>{stat.val}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- DEV TOOLS --- */}
        <section className="relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-20">
            <h2 className="text-5xl lg:text-7xl font-black mb-12 uppercase tracking-tighter">API Infrastructure</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'gRPC/REST Hub', desc: 'Synthesized endpoint logic with auto-generated documentation for enterprise teams.', icon: PlugZap, color: 'text-sky-400' },
              { title: 'Event Streams', desc: 'Low-latency webhooks and reactive streams for real-time site synchronization.', icon: Zap, color: 'text-amber-500' },
              { title: 'Protocol Sandbox', desc: 'Secure environment for testing neural integrations before enterprise deployment.', icon: BookOpen, color: 'text-emerald-500' }
            ].map((tool, i) => (
              <div key={i} className="group glass-panel p-12 rounded-[48px] hover:bg-white/5 hover:border-indigo-500/30 transition-all flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center mb-10 border border-white/5 shadow-2xl group-hover:scale-110 transition-transform">
                  <tool.icon className={tool.color} size={40} />
                </div>
                <h4 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter">{tool.title}</h4>
                <p className="text-slate-400 font-medium leading-relaxed text-lg">
                  {tool.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* --- FOOTER --- */}
      <footer className="py-20 border-t border-white/10 bg-slate-900/50 backdrop-blur-xl mt-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setPage(Page.CORTEX_BUILD_HOME)}>
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 transition-all">
              <BrainCircuit size={20} className="text-white" />
            </div>
            <span className="font-black text-white text-lg tracking-tight leading-none uppercase">CortexBuild Core</span>
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700">
            © 2025 AI Intelligence Platform • SOC2 Compliant Node
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ConnectivityView;