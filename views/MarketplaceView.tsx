import React, { useState, useEffect } from 'react';
import {
  Store,
  Search,
  Download,
  Star,
  X,
  CheckCircle2,
  Loader2,
  Settings,
  Trash2,
  Eye,
  Code,
  Users,
  TrendingUp,
  Shield,
  Zap,
  Plus,
  Clock,
  Globe,
  Package,
  Sparkles,
  ArrowRight,
  Monitor,
  Cpu,
  Layers,
  Box,
  BrainCircuit,
  Activity,
  Network
} from 'lucide-react';
import { db } from '@/services/db';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Page } from '@/types';

interface AppListing {
  id: string;
  name: string;
  category: string;
  description: string;
  fullDescription: string;
  rating: number;
  reviews_count: number;
  downloads: number;
  icon: string;
  version: string;
  developer_name: string;
  updated_at: string;
  price: number;
  is_free: boolean;
  permissions: string[];
  features: string[];
  webhooks: boolean;
  apiAccess: boolean;
  verified: boolean;
  popularity: number;
}

interface InstalledApp {
  id: string;
  module_id: string;
  name: string;
  version: string;
  installedAt: string;
  isActive: boolean;
  config: any;
}

interface MarketplaceViewProps {
  setPage: (page: Page) => void;
  toggleInstall: (appName: string) => void;
}

const MarketplaceView: React.FC<MarketplaceViewProps> = ({ setPage, toggleInstall }) => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [category, setCategory] = useState('All');
  const [apps, setApps] = useState<AppListing[]>([]);
  const [installedAppsList, setInstalledAppsList] = useState<InstalledApp[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);

  const [selectedApp, setSelectedApp] = useState<AppListing | null>(null);
  const [showAppDetails, setShowAppDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configModule, setConfigModule] = useState<InstalledApp | null>(null);
  const [moduleConfig, setModuleConfig] = useState<any>({});

  // Initial Data Fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        const [catsData, modulesData] = await Promise.all([
          db.getMarketplaceCategories(),
          db.getMarketplaceModules()
        ]);

        if (catsData) {
          setCategories(['All', ...catsData.map((c: any) => c.name)]);
        }

        if (modulesData) {
          const transformedApps: AppListing[] = modulesData.map((m: any) => ({
            id: m.id,
            name: m.name,
            category: m.category,
            description: m.description,
            fullDescription: m.description,
            rating: m.rating || 0,
            reviews_count: m.reviews_count || 0,
            downloads: m.downloads || 0,
            icon: m.icon || 'Box',
            version: m.version,
            developer_name: m.developer_name || 'NeuralCore',
            updated_at: m.updated_at ? new Date(m.updated_at).toLocaleDateString() : 'N/A',
            price: m.price,
            is_free: Boolean(m.is_free),
            permissions: [],
            features: [],
            webhooks: true,
            apiAccess: true,
            verified: true,
            popularity: Math.min(100, ((m.downloads || 0) / 100) * 10 + ((m.rating || 0) * 10))
          }));
          setApps(transformedApps);
        }

        if (user?.companyId) {
          const installedData = await db.getInstalledModules(user.companyId);
          if (installedData) {
            setInstalledAppsList(installedData.map((i: any) => ({
              id: i.id,
              module_id: i.module_id || i.id,
              name: i.name,
              version: i.version,
              installedAt: i.installedAt ? new Date(i.installedAt).toLocaleDateString() : 'N/A',
              isActive: Boolean(i.isActive),
              config: i.config
            })));
          }
        }
      } catch (error) {
        console.error('Failed to load marketplace', error);
        addToast("Connectivity variance detected. Retrying node sync.", "error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user?.companyId]);

  const handleInstallApp = async (app: AppListing) => {
    if (!user?.companyId) return;
    setLoadingAction(app.id);
    try {
      const installedModule = await db.installModule(app.id, user.companyId);
      addToast(`${app.name} initialized successfully! Configuring core protocols.`, 'success');
      const newModule: InstalledApp = {
        id: installedModule.id || `temp-${Date.now()}`,
        module_id: app.id,
        name: app.name,
        version: app.version,
        installedAt: new Date().toLocaleDateString(),
        isActive: true,
        config: installedModule.config || {}
      };
      setInstalledAppsList(prev => [...prev, newModule]);
      toggleInstall(app.name);
      setShowAppDetails(false);
      // Open config modal
      setConfigModule(newModule);
      setModuleConfig(newModule.config || {});
      setShowConfigModal(true);
    } catch (e: any) {
      addToast(e.message || 'Initialization failed', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleUninstallApp = async (moduleId: string) => {
    if (!user?.companyId) return;
    if (!window.confirm('Confirm detachment of this module node?')) return;
    try {
      await db.uninstallModule(moduleId, user.companyId);
      addToast('Module detached from core infrastructure', 'success');
      setInstalledAppsList(prev => prev.filter(a => a.module_id !== moduleId));
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  const handleConfigureModule = (module: InstalledApp) => {
    setConfigModule(module);
    setModuleConfig(module.config || {});
    setShowConfigModal(true);
    setShowSettings(false);
  };

  const handleSaveConfig = async () => {
    if (!configModule || !user?.companyId) return;
    try {
      await db.configureModule(configModule.module_id, user.companyId, moduleConfig);
      addToast('Module configuration synchronized', 'success');
      setInstalledAppsList(prev => prev.map(m =>
        m.module_id === configModule.module_id ? { ...m, config: moduleConfig } : m
      ));
      setShowConfigModal(false);
    } catch (e: any) {
      addToast(e.message || 'Configuration sync failed', 'error');
    }
  };

  const filteredApps = apps.filter(a =>
    (category === 'All' || a.category === category) &&
    (a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden selection:bg-indigo-500/30">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .glass-panel {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>

      {/* --- PREMIERE HEADER --- */}
      <header className="relative pt-24 pb-16 overflow-hidden border-b border-white/5">
        <div className="absolute top-0 left-0 w-full h-[600px] bg-[radial-gradient(circle_at_50%_-20%,rgba(99,102,241,0.15),transparent_70%)] opacity-50"></div>
        <div className="absolute top-0 right-0 w-full h-full bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]"></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row justify-between items-end gap-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-widest mb-6 animate-pulse">
              <Sparkles size={12} /> Global Intelligence Hub
            </div>
            <h1 className="text-5xl lg:text-7xl font-black mb-6 leading-tight tracking-tight">
              Modular <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Construction</span>
            </h1>
            <p className="text-lg text-slate-400 font-medium leading-relaxed max-w-xl">
              Power up your project with the world&apos;s most advanced construction modules. Real-time tools for real-time builders.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="glass-panel p-4 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 animate-float">
                <Box size={20} />
              </div>
              <div className="text-left">
                <div className="text-2xl font-black">{apps.length}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Available Modules</div>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="glass-panel p-4 rounded-2xl hover:bg-white/5 transition-all text-left flex items-center gap-4 group"
            >
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <Zap size={20} />
              </div>
              <div>
                <div className="text-2xl font-black">{installedAppsList.length}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Installs</div>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* --- NAVIGATION & SEARCH --- */}
      <section className="sticky top-0 z-50 glass-panel border-x-0 border-t-0 bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col lg:flex-row gap-6 items-center">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar w-full lg:w-auto">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${category === cat
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
            <input
              type="text"
              placeholder="Search by module name, feature, or AI capability..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white/10 transition-all font-medium"
            />
          </div>
        </div>
      </section>

      {/* --- MODULE GRID --- */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <BrainCircuit className="text-indigo-400 animate-pulse" size={24} />
              </div>
            </div>
            <div className="text-xl font-black tracking-tighter text-slate-400">Synthesizing Marketplace...</div>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="text-center py-32 glass-panel rounded-[48px] border-dashed border-2">
            <Box size={64} className="mx-auto text-slate-700 mb-6 opacity-50" />
            <h3 className="text-2xl font-black text-slate-500">No compatible modules found</h3>
            <p className="text-slate-600 font-medium">Try broadening your neural search parameters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredApps.map((app) => {
              const isInstalled = installedAppsList.some(a => a.module_id === app.id);
              return (
                <div key={app.id} onClick={() => { setSelectedApp(app); setShowAppDetails(true); }} className="group relative glass-panel p-8 rounded-[36px] transition-all duration-500 cursor-pointer overflow-hidden hover:bg-white/[0.06] hover:border-indigo-500/30 hover:-translate-y-2">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                      {app.icon && app.icon.length > 20 ? <img src={app.icon} alt="icon" className="w-8 h-8 object-contain" /> : <Package size={28} />}
                    </div>
                    {isInstalled ? (
                      <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle2 size={12} /> Active
                      </div>
                    ) : app.verified ? (
                      <Shield size={18} className="text-indigo-400/50" />
                    ) : null}
                  </div>

                  <h3 className="text-xl font-black mb-1 group-hover:text-indigo-400 transition-colors">{app.name}</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">{app.category}</p>
                  <p className="text-sm text-slate-400 leading-relaxed line-clamp-3 mb-6 font-medium">
                    {app.description}
                  </p>

                  <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-sm font-black text-amber-500">
                        <Star size={12} className="fill-current" /> {app.rating}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                        {app.downloads}+ installs
                      </div>
                    </div>
                    <div className="text-indigo-400 group-hover:translate-x-1 transition-transform">
                      <ArrowRight size={20} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* --- MODALS (Glassmorphic) --- */}
      {showAppDetails && selectedApp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setShowAppDetails(false)}></div>
          <div className="bg-slate-900 w-full max-w-2xl rounded-[48px] shadow-2xl border border-white/10 overflow-hidden relative z-10 animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-white/5 bg-gradient-to-br from-indigo-500/10 to-transparent flex justify-between items-start">
              <div className="flex items-start gap-8">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[32px] flex items-center justify-center text-white shadow-2xl shadow-indigo-500/20">
                  <Package size={48} />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-3xl font-black tracking-tight">{selectedApp.name}</h3>
                    {selectedApp.verified && <Shield size={24} className="text-emerald-400" />}
                  </div>
                  <p className="text-indigo-400 font-bold uppercase tracking-widest text-xs mb-4">{selectedApp.category} • v{selectedApp.version}</p>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                      <Star size={16} className="text-amber-500 fill-current" /> {selectedApp.rating} Rated
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                      <Download size={16} className="text-indigo-400" /> {selectedApp.downloads} Detached Installs
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowAppDetails(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="p-10 space-y-10">
              <div className="space-y-4">
                <h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Module Neural Specs</h4>
                <p className="text-lg text-slate-300 leading-relaxed font-medium">
                  {selectedApp.description}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: Code, label: 'API Protocols', val: 'gRPC/REST' },
                  { icon: Globe, label: 'Edge Nodes', val: 'Global' },
                  { icon: Shield, label: 'Security', val: 'AES-256' },
                  { icon: Clock, label: 'Sync Inc.', val: '60ms' },
                ].map((spec, i) => (
                  <div key={i} className="bg-white/5 rounded-3xl p-6 border border-white/5">
                    <spec.icon size={20} className="text-indigo-400 mb-4" />
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{spec.label}</div>
                    <div className="font-black text-white">{spec.val}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-white/5 flex gap-4">
              <button onClick={() => setShowAppDetails(false)} className="flex-1 py-5 rounded-3xl font-black text-slate-400 hover:text-white transition-all">
                Cancel Initialization
              </button>
              {installedAppsList.some(a => a.module_id === selectedApp.id) ? (
                <button onClick={() => handleUninstallApp(selectedApp.id)} className="flex-1 bg-red-500/10 border border-red-500/20 text-red-500 py-5 rounded-3xl font-black hover:bg-red-500/20 transition-all flex items-center justify-center gap-2">
                  <Trash2 size={20} /> Detach Module
                </button>
              ) : (
                <button
                  onClick={() => handleInstallApp(selectedApp)}
                  disabled={!!loadingAction}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-5 rounded-3xl font-black shadow-xl shadow-indigo-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loadingAction === selectedApp.id ? <><Loader2 className="animate-spin" /> Initializing...</> : <><Download size={20} /> Install Module</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- SETTINGS MODAL (Installed) --- */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setShowSettings(false)}></div>
          <div className="bg-slate-900 w-full max-w-xl rounded-[48px] shadow-2xl border border-white/10 overflow-hidden relative z-10">
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-2xl font-black flex items-center gap-4"><Settings size={28} className="text-indigo-400" /> Active Infrastructure</h3>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/5 rounded-xl text-slate-500"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto">
              {installedAppsList.length === 0 ? (
                <div className="text-center py-20 opacity-30">
                  <Layers size={48} className="mx-auto mb-4" />
                  <p className="font-bold uppercase tracking-widest text-xs">No active nodes detected</p>
                </div>
              ) : (
                installedAppsList.map(item => (
                  <div key={item.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex justify-between items-center group">
                    <div>
                      <h4 className="font-black text-lg group-hover:text-indigo-400 transition-colors">{item.name}</h4>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">v{item.version} • Initialized {item.installedAt}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleConfigureModule(item)} className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-500 hover:text-white">
                        <Settings size={18} />
                      </button>
                      <button onClick={() => handleUninstallApp(item.module_id)} className="p-3 bg-red-500/10 text-red-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODULE CONFIGURATION MODAL --- */}
      {showConfigModal && configModule && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setShowConfigModal(false)}></div>
          <div className="bg-slate-900 w-full max-w-2xl rounded-[48px] shadow-2xl border border-white/10 overflow-hidden relative z-10">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-br from-indigo-500/10 to-transparent">
              <div>
                <h3 className="text-2xl font-black flex items-center gap-3">
                  <Settings size={28} className="text-indigo-400" /> Configure {configModule.name}
                </h3>
                <p className="text-sm text-slate-400 mt-1">Version {configModule.version} • Customize module settings</p>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="p-2 hover:bg-white/5 rounded-xl text-slate-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-slate-500 mb-2">Module Status</label>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setModuleConfig({ ...moduleConfig, enabled: true })}
                      className={`flex-1 p-4 rounded-2xl font-bold transition-all ${moduleConfig.enabled !== false
                        ? 'bg-emerald-500/20 border-2 border-emerald-500/50 text-emerald-400'
                        : 'bg-white/5 border border-white/10 text-slate-400'
                        }`}
                    >
                      <CheckCircle2 className="inline mr-2" size={18} /> Enabled
                    </button>
                    <button
                      onClick={() => setModuleConfig({ ...moduleConfig, enabled: false })}
                      className={`flex-1 p-4 rounded-2xl font-bold transition-all ${moduleConfig.enabled === false
                        ? 'bg-red-500/20 border-2 border-red-500/50 text-red-400'
                        : 'bg-white/5 border border-white/10 text-slate-400'
                        }`}
                    >
                      <X className="inline mr-2" size={18} /> Disabled
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-slate-500 mb-2">API Access Level</label>
                  <select
                    value={moduleConfig.apiAccessLevel || 'standard'}
                    onChange={(e) => setModuleConfig({ ...moduleConfig, apiAccessLevel: e.target.value })}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="read-only" className="bg-slate-800">Read Only</option>
                    <option value="standard" className="bg-slate-800">Standard</option>
                    <option value="elevated" className="bg-slate-800">Elevated</option>
                    <option value="full" className="bg-slate-800">Full Access</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-slate-500 mb-2">Webhook URL (Optional)</label>
                  <input
                    type="url"
                    value={moduleConfig.webhookUrl || ''}
                    onChange={(e) => setModuleConfig({ ...moduleConfig, webhookUrl: e.target.value })}
                    placeholder="https://your-service.com/webhook"
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder:text-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-slate-500 mb-2">Custom Configuration (JSON)</label>
                  <textarea
                    value={JSON.stringify(moduleConfig.custom || {}, null, 2)}
                    onChange={(e) => {
                      try {
                        const custom = JSON.parse(e.target.value);
                        setModuleConfig({ ...moduleConfig, custom });
                      } catch {
                        // Ignore malformed JSON
                      }
                    }}
                    rows={4}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder='{"key": "value"}'
                  />
                </div>
              </div>
            </div>
            <div className="p-6 bg-white/5 flex gap-4">
              <button onClick={() => setShowConfigModal(false)} className="flex-1 py-5 rounded-3xl font-black text-slate-400 hover:text-white transition-all">
                Cancel
              </button>
              <button onClick={handleSaveConfig} className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-5 rounded-3xl font-black shadow-xl shadow-indigo-500/20 hover:scale-[1.02] transition-all">
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MarketplaceView;

