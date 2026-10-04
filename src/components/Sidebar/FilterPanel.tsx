import React from 'react';
import {
  Filter,
  Flame,
  ShieldAlert,
  Clock,
  MapPin,
  Sparkles,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertOctagon,
} from 'lucide-react';
import { FilterState, PriorityTier, ThermalCategory, PersistenceLevel } from '../../types';

interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onResetFilters: () => void;
  activeCount: number;
  totalCount: number;
  onClose?: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  activeCount,
  totalCount,
  onClose,
}) => {
  const update = (patch: Partial<FilterState>) => {
    onFilterChange({ ...filters, ...patch });
  };

  // Quick Triage Presets
  const applyPreset = (preset: 'critical_industrial' | 'persistent_flares' | 'agriculture' | 'all') => {
    if (preset === 'critical_industrial') {
      update({
        sourceType: 'possible_industrial_fire',
        riskTier: 'all',
        persistence: 'all',
        industrialProximity: '1000m',
        minConfidence: 80,
      });
    } else if (preset === 'persistent_flares') {
      update({
        sourceType: 'gas_flare',
        riskTier: 'all',
        persistence: 'persistent',
        industrialProximity: 'all',
        minConfidence: 70,
      });
    } else if (preset === 'agriculture') {
      update({
        sourceType: 'agricultural_burning',
        riskTier: 'all',
        persistence: 'all',
        industrialProximity: 'all',
        minConfidence: 0,
      });
    } else {
      onResetFilters();
    }
  };

  return (
    <aside className="w-full lg:w-80 bg-[#0f172a] border-r border-slate-800 flex flex-col h-full text-slate-300 text-xs overflow-y-auto shrink-0 pb-safe">
      {/* Sidebar Header */}
      <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-[#0f172a] sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-orange-500" />
          <span className="font-bold text-white uppercase tracking-wider text-xs">
            GIS Screening Filters
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-orange-500 font-bold border border-slate-700">
            {activeCount} / {totalCount}
          </span>
          <button
            onClick={onResetFilters}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-orange-400 transition"
            title="Reset Filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white"
              title="Close Filters"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Quick Analyst Presets */}
      <div className="p-3.5 border-b border-slate-800 bg-[#020617]/50">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-orange-500" /> Analyst Triage Presets
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => applyPreset('critical_industrial')}
            className="px-2.5 py-1.5 rounded bg-[#020617] hover:bg-red-950/40 border border-red-500/40 text-red-300 text-[11px] font-semibold text-left flex items-center gap-1.5 transition"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="truncate">Industrial Outlier</span>
          </button>
          <button
            onClick={() => applyPreset('persistent_flares')}
            className="px-2.5 py-1.5 rounded bg-[#020617] hover:bg-orange-950/40 border border-orange-500/40 text-orange-300 text-[11px] font-semibold text-left flex items-center gap-1.5 transition"
          >
            <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span className="truncate">Persistent Flares</span>
          </button>
        </div>
      </div>

      {/* Main Filter Controls */}
      <div className="p-4 space-y-4 flex-1">
        {/* Search Filter */}
        <div>
          <label className="block text-slate-400 text-xs font-semibold mb-1.5">
            Search Facility / Region
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="e.g. Jamnagar, Korba, Steel..."
              value={filters.searchQuery}
              onChange={(e) => update({ searchQuery: e.target.value })}
              className="w-full bg-[#020617] border border-slate-800 rounded px-2.5 py-1.5 pl-8 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
            />
          </div>
        </div>

        {/* 1. Source Classification Filter */}
        <div>
          <label className="block text-slate-400 text-xs font-semibold mb-1.5">
            Thermal Source Classification
          </label>
          <select
            value={filters.sourceType}
            onChange={(e) => update({ sourceType: e.target.value })}
            className="w-full bg-[#020617] border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer"
          >
            <option value="all">All Source Categories</option>
            <option value="possible_industrial_fire">🚨 Possible Industrial Fire / Surge</option>
            <option value="persistent_industrial_source">🏭 Persistent Industrial Source</option>
            <option value="gas_flare">🔥 Operational Gas Flare</option>
            <option value="agricultural_burning">🌾 Agricultural Stubble Burning</option>
            <option value="forest_natural">🌲 Forest / Wildland Vegetation</option>
            <option value="mining_extraction">⛏️ Mining / Extraction Heating</option>
            <option value="unknown">❓ Other / Unknown</option>
          </select>
        </div>

        {/* 2. Priority / Risk Tier */}
        <div>
          <label className="block text-slate-400 text-xs font-semibold mb-1.5">
            Investigation Priority Tier
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {['all', 'critical', 'high', 'moderate', 'low'].map((tier) => (
              <button
                key={tier}
                onClick={() => update({ riskTier: tier })}
                className={`py-1.5 rounded text-[11px] font-semibold capitalize border transition ${
                  filters.riskTier.toLowerCase() === tier
                    ? tier === 'critical'
                      ? 'bg-red-600 text-white border-red-500 font-bold'
                      : tier === 'high'
                      ? 'bg-orange-600 text-white border-orange-500 font-bold'
                      : tier === 'moderate'
                      ? 'bg-yellow-500 text-slate-950 border-yellow-400 font-bold'
                      : tier === 'low'
                      ? 'bg-blue-600 text-white border-blue-500 font-bold'
                      : 'bg-slate-800 text-orange-500 border-orange-500/60 font-bold'
                    : 'bg-[#020617] text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                } ${tier === 'all' ? 'col-span-4' : ''}`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Persistence Pattern */}
        <div>
          <label className="block text-slate-400 text-xs font-semibold mb-1.5 flex items-center justify-between">
            <span>Temporal Persistence</span>
            <Clock className="w-3 h-3 text-slate-500" />
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { key: 'all', label: 'All' },
              { key: 'single', label: 'Single' },
              { key: 'recurring', label: 'Recurring' },
              { key: 'persistent', label: 'Persistent' },
            ].map((p) => (
              <button
                key={p.key}
                onClick={() => update({ persistence: p.key })}
                className={`py-1.5 px-1.5 rounded text-[11px] font-semibold border text-center transition ${
                  filters.persistence === p.key
                    ? 'bg-slate-800 border-orange-500/60 text-orange-500 font-bold'
                    : 'bg-[#020617] border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                } ${p.key === 'all' ? 'col-span-3' : ''}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Industrial Proximity Filter */}
        <div>
          <label className="block text-slate-400 text-xs font-semibold mb-1.5 flex items-center justify-between">
            <span>Industrial Proximity Envelope</span>
            <MapPin className="w-3 h-3 text-slate-500" />
          </label>
          <select
            value={filters.industrialProximity}
            onChange={(e) => update({ industrialProximity: e.target.value })}
            className="w-full bg-[#020617] border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer"
          >
            <option value="all">Any Distance / Global</option>
            <option value="500m">Within 500m (High Hazard Perimeter)</option>
            <option value="1000m">Within 1.0 km (Industrial Buffer)</option>
            <option value="2500m">Within 2.5 km (Corridor Vicinity)</option>
          </select>
        </div>

        {/* 5. Minimum FRP Threshold Slider */}
        <div>
          <div className="flex justify-between items-center text-xs font-semibold mb-1">
            <span className="text-slate-400">Min Fire Radiative Power</span>
            <span className="font-mono text-orange-500 font-bold">{filters.minFrp} MW</span>
          </div>
          <input
            type="range"
            min="0"
            max="150"
            step="5"
            value={filters.minFrp}
            onChange={(e) => update({ minFrp: Number(e.target.value) })}
            className="w-full accent-orange-500 bg-[#020617] cursor-pointer h-1.5 rounded"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
            <span>0 MW (All)</span>
            <span>75 MW</span>
            <span>150 MW+</span>
          </div>
        </div>

        {/* 6. Detection Confidence Slider */}
        <div>
          <div className="flex justify-between items-center text-xs font-semibold mb-1">
            <span className="text-slate-400">Min Satellite Confidence</span>
            <span className="font-mono text-orange-500 font-bold">{filters.minConfidence}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={filters.minConfidence}
            onChange={(e) => update({ minConfidence: Number(e.target.value) })}
            className="w-full accent-orange-500 bg-[#020617] cursor-pointer h-1.5 rounded"
          />
        </div>

        {/* 7. Date Range Filter */}
        <div>
          <label className="block text-slate-400 text-xs font-semibold mb-1.5">
            Temporal Window
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: '24h', label: '24h' },
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: 'all', label: 'All' },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => update({ dateRange: d.id as any })}
                className={`py-1.5 rounded text-[11px] font-semibold border transition ${
                  filters.dateRange === d.id
                    ? 'bg-slate-800 border-orange-500/60 text-orange-500 font-bold'
                    : 'bg-[#020617] border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};
