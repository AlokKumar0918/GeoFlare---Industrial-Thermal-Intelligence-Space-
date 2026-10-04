import React, { useState } from 'react';
import {
  Flame,
  Activity,
  Layers,
  Factory,
  History,
  Bell,
  BarChart3,
  Database,
  ShieldCheck,
  Radio,
  Download,
  UploadCloud,
  AlertTriangle,
  Info,
  Menu,
  X,
  Compass,
  BookOpen,
} from 'lucide-react';
import { PriorityTier } from '../../types';

export type ActiveTab = 'map' | 'events' | 'assets' | 'history' | 'alerts' | 'analytics' | 'database';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  criticalAlertsCount: number;
  totalEventsCount: number;
  dataSourceMode: 'demo' | 'live' | 'upload';
  setDataSourceMode: (mode: 'demo' | 'live' | 'upload') => void;
  scope: 'global' | 'india';
  setScope: (scope: 'global' | 'india') => void;
  onOpenIngestModal: () => void;
  onOpenUserGuide: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  criticalAlertsCount,
  totalEventsCount,
  dataSourceMode,
  setDataSourceMode,
  scope,
  setScope,
  onOpenIngestModal,
  onOpenUserGuide,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const navTabs: Array<{ id: ActiveTab; label: string; icon: React.ReactNode; badge?: React.ReactNode }> = [
    { id: 'map', label: 'Monitor', icon: <Radio className="w-4 h-4" /> },
    {
      id: 'events',
      label: 'Event Queue',
      icon: <Layers className="w-4 h-4" />,
      badge: (
        <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-mono">
          {totalEventsCount}
        </span>
      ),
    },
    { id: 'assets', label: 'Industrial Assets', icon: <Factory className="w-4 h-4" /> },
    { id: 'history', label: 'Historical Analysis', icon: <History className="w-4 h-4" /> },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: <Bell className="w-4 h-4" />,
      badge: criticalAlertsCount > 0 ? (
        <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-red-600 text-white font-bold animate-pulse">
          {criticalAlertsCount}
        </span>
      ) : undefined,
    },
    { id: 'analytics', label: 'Operational Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'database', label: 'Data Explorer', icon: <Database className="w-4 h-4" /> },
  ];

  return (
    <header className="bg-[#0f172a] border-b border-slate-800 text-slate-300 z-50 sticky top-0 overflow-hidden">
      {/* Top Product Positioning Disclaimer Bar */}
      <div className="bg-[#020617] border-b border-slate-800/80 px-3 sm:px-6 py-1 text-[11px] sm:text-xs text-slate-400 flex flex-wrap items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <Info className="w-3.5 h-3.5 text-orange-500 shrink-0" />
          <span className="truncate sm:overflow-visible">
            <strong className="text-slate-200 font-semibold">Decision-Support:</strong> Satellite thermal anomaly detection & persistent source screening.
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-[10px] sm:text-[11px] text-slate-400 shrink-0">
          <span className="font-mono text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            <span className="hidden xs:inline">NASA FIRMS</span> Active
          </span>
          <span className="text-slate-400 font-mono hidden sm:inline">Operational Intelligence</span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="w-full px-3 sm:px-4 xl:px-6 flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-3 xl:gap-4">
        {/* Brand Section: compact, non-expanding block */}
        <div className="brand-section flex items-center gap-2 sm:gap-2.5 shrink min-w-0 max-w-[200px] xl:max-w-[240px] 2xl:max-w-[280px]">
          <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/30 ring-1 ring-orange-500/50 shrink-0">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white flex items-center shrink-0">
                Geo<span className="text-orange-500">Flare</span>
              </span>
              <span className="bg-slate-800 border border-slate-700 text-slate-300 text-[9px] font-mono px-1 py-0.5 rounded font-semibold uppercase tracking-wider shrink-0">
                Command
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-normal truncate leading-tight hidden sm:block" title="Industrial Thermal Intelligence & Persistent Source Monitoring">
              Industrial Thermal Intelligence &amp; Persistent Source Monitoring
            </p>
          </div>
        </div>

        {/* Center Main Navigation: flexible center space with compact responsive spacing */}
        <nav className="main-navigation hidden lg:flex items-center justify-center flex-1 min-w-0 gap-1 lg:gap-1.5 xl:gap-2 2xl:gap-3 text-xs xl:text-sm font-semibold">
          {navTabs.map((tab) => (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => handleSelectTab(tab.id)}
              className={`flex items-center gap-1 xl:gap-1.5 px-1.5 lg:px-2 xl:px-2.5 py-1 min-h-[36px] whitespace-nowrap transition-colors shrink-0 ${
                activeTab === tab.id
                  ? 'text-orange-500 border-b-2 border-orange-500 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="shrink-0">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge}
            </button>
          ))}
        </nav>

        {/* Right Action Tools & Scope / Data Mode Switcher: prioritized and non-shrinking */}
        <div className="header-actions flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Scope Switch: [ 🌍 Global ] [ 🇮🇳 India ] */}
          <div className="flex items-center bg-[#020617] border border-slate-800 rounded p-0.5 shadow-inner shrink-0">
            <button
              id="scope-switch-global"
              onClick={() => setScope('global')}
              className={`px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded transition min-h-[30px] flex items-center gap-1.5 shrink-0 ${
                scope === 'global'
                  ? 'bg-orange-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
              title="Global Thermal Overview: Planetary thermal anomaly monitoring and international corridor screening"
            >
              <span>🌍</span>
              <span className="tracking-wide">Global</span>
            </button>
            <button
              id="scope-switch-india"
              onClick={() => setScope('india')}
              className={`px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded transition min-h-[30px] flex items-center gap-1.5 shrink-0 ${
                scope === 'india'
                  ? 'bg-orange-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
              title="India Deep-Dive: Regional screening, CEPI industrial clusters, and facility perimeters"
            >
              <span>🇮🇳</span>
              <span className="tracking-wide">India</span>
            </button>
          </div>

          {/* Data Mode Switcher */}
          <div className="flex items-center bg-[#020617] border border-slate-800 rounded p-0.5 shrink-0">
            <button
              onClick={() => setDataSourceMode('demo')}
              className={`px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded transition min-h-[30px] flex items-center shrink-0 ${
                dataSourceMode === 'demo'
                  ? 'bg-slate-800 text-orange-400 border border-slate-700 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Grounded preloaded industrial thermal observations"
            >
              Demo
            </button>
            <button
              onClick={() => setDataSourceMode('live')}
              className={`px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded transition flex items-center gap-1 min-h-[30px] shrink-0 ${
                dataSourceMode === 'live'
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="NASA FIRMS Live Satellite API Feed"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Live
            </button>
            {dataSourceMode === 'upload' && (
              <button
                onClick={() => setDataSourceMode('upload')}
                className="px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded transition flex items-center gap-1 min-h-[30px] shrink-0 bg-orange-950/80 text-orange-400 border border-orange-500/40 font-bold"
                title="NASA FIRMS Uploaded CSV Dataset"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                Upload
              </button>
            )}
          </div>

          {/* User Guide & Operational Manual Button */}
          <button
            onClick={onOpenUserGuide}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-2 xl:px-2.5 py-1 rounded border border-slate-700 text-xs font-semibold transition shadow-sm min-h-[30px] shrink-0"
            title="Open Complete User Guide & Operational Manual"
          >
            <BookOpen className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden xl:inline">User Guide</span>
          </button>

          {/* Ingest / Upload FIRMS CSV Button */}
          <button
            onClick={onOpenIngestModal}
            className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white px-2 xl:px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider transition shadow-md shadow-orange-600/20 min-h-[30px] shrink-0"
            title="Import custom FIRMS CSV or select scenario"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Ingest Data</span>
          </button>

          {/* Mobile Hamburger Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700 min-w-[34px] min-h-[34px] flex items-center justify-center shrink-0"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Horizontal Scroll Tab Strip */}
      <div className="lg:hidden flex items-center overflow-x-auto no-scrollbar px-3 py-1.5 bg-[#020617] border-t border-slate-800 gap-1.5 text-xs">
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSelectTab(tab.id)}
              className={`px-3 py-1.5 rounded-md whitespace-nowrap flex items-center gap-1.5 transition min-h-[36px] font-medium ${
                isActive
                  ? 'bg-orange-600 text-white font-bold shadow-md shadow-orange-600/20'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge}
            </button>
          );
        })}
      </div>

      {/* Mobile Full Navigation Overlay Sheet */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-[90px] bg-slate-950/95 backdrop-blur-md z-50 p-4 overflow-y-auto pb-safe">
          <div className="max-w-md mx-auto space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Application Navigation
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs text-slate-400 hover:text-white p-1"
              >
                Close ✕
              </button>
            </div>

            {/* Mobile Scope Switch */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Monitoring Scope:</span>
              <div className="flex items-center bg-[#020617] border border-slate-800 rounded p-0.5">
                <button
                  onClick={() => {
                    setScope('global');
                    setMobileMenuOpen(false);
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded ${
                    scope === 'global' ? 'bg-orange-600 text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  🌍 Global
                </button>
                <button
                  onClick={() => {
                    setScope('india');
                    setMobileMenuOpen(false);
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded ${
                    scope === 'india' ? 'bg-orange-600 text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  🇮🇳 India
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {navTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleSelectTab(tab.id)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-sm font-semibold transition ${
                      isActive
                        ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-600/20'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isActive ? 'bg-orange-700 text-white' : 'bg-slate-800 text-orange-400'}`}>
                        {tab.icon}
                      </div>
                      <span>{tab.label}</span>
                    </div>
                    {tab.badge}
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenUserGuide();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-orange-400" />
                  <span>Open User Guide & Manual</span>
                </div>
                <span className="text-orange-400 font-mono text-[10px] uppercase bg-orange-950/60 px-2 py-0.5 rounded border border-orange-500/30">
                  Read
                </span>
              </button>

              <div className="flex items-center justify-between bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span>NASA Satellite Feed:</span>
                <span className="font-mono text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                  VIIRS & MODIS Online
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
