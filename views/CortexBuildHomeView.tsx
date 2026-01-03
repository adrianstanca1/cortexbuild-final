import React, { useState, useEffect } from 'react';
import { Page } from '@/types';
import {
  Rocket,
  Target,
  Zap,
  Shield,
  Cpu,
  Activity,
  Database,
  Code2,
  Globe,
  ArrowRight,
  Monitor,
  Layout,
  Layers,
  CheckCircle2,
  BarChart3,
  Clock,
  BrainCircuit,
  Lightbulb,
  Wrench,
  Building2,
  Calculator,
  FileCheck,
  Users,
  TrendingUp,
  Bot,
  Sparkles,
  Boxes,
  Network
} from 'lucide-react';

const CortexBuildHomeView: React.FC<{ setPage: (page: Page) => void }> = ({ setPage }) => {
  const [currentPage, setCurrentPage] = useState(Page.CORTEX_BUILD_HOME);
  const [activeModule, setActiveModule] = useState(0);

  // Auto-rotate modules display
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveModule((prev) => (prev + 1) % 6);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { id: 'Home', label: 'Home', page: Page.CORTEX_BUILD_HOME },
    { id: 'NeuralNetwork', label: 'AI Engine', page: Page.NEURAL_NETWORK },
    { id: 'PlatformFeatures', label: 'Features', page: Page.PLATFORM_FEATURES },
    { id: 'Connectivity', label: 'Integrations', page: Page.CONNECTIVITY },
    { id: 'DeveloperPlatform', label: 'Developers', page: Page.DEVELOPER_PLATFORM },
    { id: 'GetStarted', label: 'Get Started', page: Page.PUBLIC_LOGIN }
  ];

  const intelligentModules = [
    { icon: BrainCircuit, name: 'Predictive Analytics', desc: 'AI predicts project risks before they happen', color: 'from-purple-500 to-indigo-500' },
    { icon: Calculator, name: 'Smart Budgeting', desc: 'Auto-adjusting cost forecasts in real-time', color: 'from-blue-500 to-cyan-500' },
    { icon: FileCheck, name: 'Compliance Automation', desc: 'Zero-touch safety and regulatory compliance', color: 'from-green-500 to-emerald-500' },
    { icon: Users, name: 'Workforce Optimizer', desc: 'AI-powered crew scheduling and allocation', color: 'from-orange-500 to-red-500' },
    { icon: Activity, name: 'Real-time Monitoring', desc: 'Live project health with IoT sensor integration', color: 'from-pink-500 to-rose-500' },
    { icon: TrendingUp, name: 'Growth Intelligence', desc: 'Market insights and expansion opportunities', color: 'from-violet-500 to-purple-500' }
  ];

  const automationFeatures = [
    { title: 'Document Processing', desc: 'AI extracts data from contracts, invoices, and blueprints automatically', icon: FileCheck, stat: '99.8% accuracy' },
    { title: 'Schedule Optimization', desc: 'Machine learning adjusts timelines based on weather, resources, and dependencies', icon: Clock, stat: '40% faster delivery' },
    { title: 'Safety Monitoring', desc: 'Computer vision identifies hazards in photos and enforces compliance', icon: Shield, stat: '76% fewer incidents' },
    { title: 'Cost Analytics', desc: 'Predictive models forecast budget overruns weeks in advance', icon: Calculator, stat: '$2.4M avg. savings' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 font-sans text-white overflow-x-hidden selection:bg-indigo-400/30">
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.4); }
          50% { box-shadow: 0 0 80px rgba(99, 102, 241, 0.8); }
        }
        .animate-scroll {
          animation: scroll 40s linear infinite;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-glow {
          animation: glow 3s ease-in-out infinite;
        }
      `}</style>

      {/* --- GLASSMORPHIC NAVBAR --- */}
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
              <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/50 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 animate-glow">
                <BrainCircuit className="text-white" size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-white">
                  Cortex<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Build</span>
                </span>
                <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">AI Construction Intelligence</span>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-8">
              {menuItems.slice(0, 5).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setPage(item.page);
                    setCurrentPage(item.page);
                  }}
                  className={`text-sm font-semibold tracking-wide transition-all duration-300 relative hover:text-indigo-300 ${currentPage === item.page ? "text-white" : "text-slate-400"
                    }`}
                >
                  {item.label}
                  {currentPage === item.page && (
                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-400 to-purple-400"></span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setPage(Page.LOGIN)}
                className="hidden sm:block text-sm font-bold text-white/80 px-5 py-2.5 hover:bg-white/10 rounded-xl transition-all backdrop-blur-sm"
              >
                Login
              </button>
              <button
                onClick={() => setPage(Page.PUBLIC_LOGIN)}
                className="relative overflow-hidden group bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-2xl shadow-indigo-500/50 transition-all"
              >
                <span className="relative z-10">Start Free Trial</span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform"></div>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION: AI-POWERED --- */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        {/* Animated Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:64px_64px]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-900/20 to-slate-900"></div>

        {/* Floating Orbs */}
        <div className="absolute top-20 left-20 w-96 h-96 bg-indigo-500/30 rounded-full blur-[120px] animate-float"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/30 rounded-full blur-[120px] animate-float" style={{ animationDelay: '1.5s' }}></div>

        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 relative z-10">
          <div className="text-center max-w-5xl mx-auto mb-16">
            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/20 border border-indigo-400/30 backdrop-blur-md text-indigo-300 text-xs font-bold uppercase tracking-widest mb-8 animate-pulse">
              <Sparkles size={14} className="text-yellow-400" />
              Powered by Neural Intelligence Engine 3.0
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-6xl lg:text-7xl xl:text-8xl font-black text-white leading-[1.05] tracking-tight mb-8">
              Intelligence{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 animate-gradient">
                Meets
              </span>
              <br />
              Construction
            </h1>

            <p className="text-xl lg:text-2xl text-slate-300 font-medium leading-relaxed max-w-4xl mx-auto mb-12">
              The world&apos;s first <span className="text-indigo-400 font-bold">AI-native</span> platform built exclusively for construction.
              Automate workflows, predict risks, and optimize every project with <span className="text-purple-400 font-bold">intelligent tools</span> that continuously learn from your data.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
              <button
                onClick={() => setPage(Page.PUBLIC_LOGIN)}
                className="group relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-10 py-5 rounded-2xl font-bold text-lg shadow-2xl shadow-indigo-500/50 flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95"
              >
                <BrainCircuit size={24} />
                Start Building Smarter
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
              </button>
              <button
                onClick={() => setPage(Page.NEURAL_NETWORK)}
                className="bg-white/10 backdrop-blur-md text-white border-2 border-white/20 hover:bg-white/20 px-10 py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all hover:scale-105"
              >
                <Monitor size={20} />
                Explore AI Engine
              </button>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {[
                { value: '500+', label: 'Active Projects' },
                { value: '99.8%', label: 'Accuracy Rate' },
                { value: '40%', label: 'Time Saved' },
                { value: '$2.4M', label: 'Avg. Savings' }
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
                  <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --- INTELLIGENT MODULES SHOWCASE --- */}
      <section className="py-24 bg-gradient-to-b from-slate-900 to-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#4f46e520,transparent_70%)]"></div>

        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-bold uppercase tracking-widest mb-4">
              <Boxes size={14} />
              Modular Intelligence
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
              Your Digital <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Construction Team</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Each module is an AI-powered specialist. Together, they form a complete intelligent workforce for your projects.
            </p>
          </div>

          {/* Modules Grid with Active State */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {intelligentModules.map((module, i) => (
              <div
                key={i}
                onMouseEnter={() => setActiveModule(i)}
                className={`group relative p-8 rounded-3xl bg-gradient-to-br ${module.color} transition-all duration-300 cursor-pointer ${activeModule === i
                  ? 'scale-105 shadow-2xl shadow-indigo-500/50 ring-2 ring-white/50'
                  : 'scale-100 opacity-80 hover:opacity-100'
                  }`}
              >
                <div className="absolute inset-0 bg-black/40 rounded-3xl"></div>
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <module.icon size={28} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-3">{module.name}</h3>
                  <p className="text-white/80 text-sm font-medium leading-relaxed">{module.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button
              onClick={() => setPage(Page.MARKETPLACE)}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold hover:bg-white/20 transition-all"
            >
              <Globe size={20} />
              Explore All 50+ Modules
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* --- AUTOMATION IN ACTION --- */}
      <section className="py-32 bg-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:80px_80px]"></div>

        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-400/30 text-green-300 text-xs font-bold uppercase tracking-widest mb-4">
              <Bot size={14} />
              Automation Powered
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
              Work Smarter, Not <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">Harder</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Let AI handle the repetitive work while you focus on what matters: building exceptional projects.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {automationFeatures.map((feature, i) => (
              <div key={i} className="group relative p-10 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-indigo-400/50 transition-all duration-300">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <feature.icon size={28} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                    <p className="text-slate-300 text-sm leading-relaxed mb-4">{feature.desc}</p>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 text-green-300 text-xs font-bold">
                      <TrendingUp size={12} />
                      {feature.stat}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- DEVELOPER ECOSYSTEM --- */}
      <section className="py-32 bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[150px]"></div>

        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 relative z-10">
          <div className="lg:flex justify-between items-end mb-20">
            <div className="max-w-2xl">
              <div className="text-indigo-300 font-bold tracking-widest uppercase mb-4 flex items-center gap-2">
                <Code2 size={20} />
                Open Platform
              </div>
              <h2 className="text-5xl font-black mb-6">Build Custom Solutions</h2>
              <p className="text-xl text-slate-300">
                Extend the platform with your own modules, integrate your tools, and customize workflows.
              </p>
            </div>
            <button
              onClick={() => setPage(Page.DEVELOPER_PLATFORM)}
              className="mt-8 lg:mt-0 bg-white text-indigo-600 px-8 py-4 rounded-2xl font-bold hover:bg-indigo-50 transition-all shadow-xl"
            >
              API Documentation
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { Icon: Code2, title: "REST & GraphQL API", desc: "Full programmatic access to all platform data" },
              { Icon: Layers, title: "React Components", desc: "Inject custom UI into any view or dashboard" },
              { Icon: Globe, title: "Marketplace", desc: "Publish and monetize your modules globally" },
              { Icon: Network, title: "Webhook System", desc: "Real-time event streams for integrations" }
            ].map((card, i) => (
              <div key={i} className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-indigo-400/50 transition-all group">
                <card.Icon className="text-indigo-300 mb-6 group-hover:scale-110 transition-transform" size={36} />
                <h4 className="text-xl font-bold mb-3">{card.title}</h4>
                <p className="text-slate-400 text-sm leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FINAL CTA --- */}
      <section className="py-32 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/20 to-transparent"></div>

        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 text-center relative z-10">
          <h2 className="text-5xl md:text-6xl font-black text-white mb-8">
            Ready to Build the <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Future?</span>
          </h2>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-12">
            Join thousands of construction professionals who&apos;ve already made the switch to intelligent project management.
          </p>
          <button
            onClick={() => setPage(Page.PUBLIC_LOGIN)}
            className="group relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-12 py-6 rounded-2xl font-bold text-xl shadow-2xl shadow-indigo-500/50 hover:scale-105 transition-all flex items-center gap-3 mx-auto"
          >
            <Rocket size={24} />
            Start Your Free 30-Day Trial
            <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
          </button>
          <p className="text-sm text-slate-400 mt-6">No credit card required • Cancel anytime • Deploy in minutes</p>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-12 bg-slate-950 border-t border-white/10">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 opacity-80">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
              <BrainCircuit className="text-white" size={20} />
            </div>
            <span className="font-bold text-white">CortexBuild <span className="text-indigo-400">Pro</span></span>
          </div>
          <div className="text-slate-500 font-medium text-sm">
            © 2025 CortexBuild AI Intelligence. Revolutionizing construction.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CortexBuildHomeView;
