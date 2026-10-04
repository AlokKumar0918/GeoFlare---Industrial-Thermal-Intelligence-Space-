import React, { useState } from 'react';
import { AnalyticsSummary, ThermalEvent } from '../../types';
import {
  BarChart3,
  TrendingDown,
  ShieldCheck,
  Flame,
  Factory,
  Activity,
  Layers,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';

interface AnalyticsDashboardProps {
  analytics: AnalyticsSummary;
  events: ThermalEvent[];
}

const CATEGORY_COLORS: Record<string, string> = {
  possible_industrial_fire: '#ef4444',
  persistent_industrial_source: '#38bdf8',
  gas_flare: '#f59e0b',
  agricultural_burning: '#84cc16',
  forest_natural: '#10b981',
  mining_extraction: '#a855f7',
  unknown: '#64748b',
};

const CATEGORY_LABELS: Record<string, string> = {
  possible_industrial_fire: 'Industrial Fire / Surge',
  persistent_industrial_source: 'Persistent Industrial',
  gas_flare: 'Gas Flare',
  agricultural_burning: 'Agricultural Crop Stubble',
  forest_natural: 'Forest / Wildland',
  mining_extraction: 'Mining / Coal Seam',
  unknown: 'Other / Unknown',
};

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  analytics,
  events,
}) => {
  const pieData = Object.entries(analytics.classificationBreakdown).map(([key, value]) => ({
    name: CATEGORY_LABELS[key] || key,
    value,
    color: CATEGORY_COLORS[key] || '#94a3b8',
  }));

  const persistencePieData = [
    { name: 'Single Pass', value: analytics.persistenceBreakdown.single, color: '#94a3b8' },
    { name: 'Recurring (2-5 passes)', value: analytics.persistenceBreakdown.recurring, color: '#f59e0b' },
    { name: 'Persistent (>6 passes)', value: analytics.persistenceBreakdown.persistent, color: '#38bdf8' },
  ];

  const priorityPieData = [
    { name: 'Critical (76-100)', value: analytics.priorityBreakdown.critical, color: '#ef4444' },
    { name: 'High (51-75)', value: analytics.priorityBreakdown.high, color: '#f97316' },
    { name: 'Moderate (26-50)', value: analytics.priorityBreakdown.moderate, color: '#eab308' },
    { name: 'Low (0-25)', value: analytics.priorityBreakdown.low, color: '#3b82f6' },
  ];

  return (
    <div className="flex-1 bg-[#020617] p-3 sm:p-6 overflow-y-auto text-slate-300 pb-safe">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f172a] p-3.5 sm:p-4 rounded-xl border border-slate-800 shadow-md">
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2 tracking-tight">
              <BarChart3 className="w-5 h-5 text-orange-500 shrink-0" />
              <span>Operational Impact & Thermal Intelligence Analytics</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              Quantifiable screening workload reduction, classification distributions, and regional thermal intensity indices.
            </p>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 rounded bg-[#020617] text-orange-500 font-mono text-xs border border-slate-800 font-bold">
            NASA FIRMS VIIRS/MODIS Aggregated
          </span>
        </div>

        {/* Top Operational Metrics & Intelligence Performance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#0f172a] p-3.5 sm:p-4 rounded-xl border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Screening Workload Reduction</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono">
              {analytics.manualScreeningReductionPercent}%
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Automated classification filters out rural biomass and routine flares from emergency queues.
            </p>
          </div>

          <div className="bg-[#0f172a] p-3.5 sm:p-4 rounded-xl border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Satellite Detections</span>
              <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white font-mono">
              {analytics.totalObservations}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Observed across all satellite passes and sensor tracks.
            </p>
          </div>

          <div className="bg-[#0f172a] p-3.5 sm:p-4 rounded-xl border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Industrial Associated</span>
              <div className="p-1.5 rounded-lg bg-orange-500/20 text-orange-500">
                <Factory className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-orange-500 font-mono">
              {analytics.industrialAssociated}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Within 1.5 km industrial plant boundary envelopes.
            </p>
          </div>

          <div className="bg-[#0f172a] p-3.5 sm:p-4 rounded-xl border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">High / Critical Triage Queue</span>
              <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-red-400 font-mono">
              {analytics.highOrCriticalPriority}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              High-priority events requiring immediate human investigation.
            </p>
          </div>
        </div>

        {/* Charts Row 1: Classification Breakdown & Priority Tiers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {/* Chart 1: Classification Pie */}
          <div className="bg-[#0f172a] p-3.5 sm:p-4 rounded-xl border border-slate-800 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs uppercase tracking-wider">
                Thermal Source Classification Distribution
              </span>
              <span className="text-[10px] text-slate-400 font-mono">7 Categories</span>
            </div>
            <div className="h-60 sm:h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Priority Tiers Breakdown */}
          <div className="bg-[#0f172a] p-3.5 sm:p-4 rounded-xl border border-slate-800 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs uppercase tracking-wider">
                Investigation Priority Tiers (0 - 100 Score)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Actionable Triage</span>
            </div>
            <div className="h-60 sm:h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityPieData}>
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 9 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                  <Bar dataKey="value" name="Hotspot Count" radius={[4, 4, 0, 0]}>
                    {priorityPieData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Charts Row 2: Regional Breakdown & Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {/* Regional Hotspot Density */}
          <div className="bg-[#0f172a] p-3.5 sm:p-4 rounded-xl border border-slate-800 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs uppercase tracking-wider">
                Regional Distribution & High-Priority Loads
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Major Industrial Hubs</span>
            </div>
            <div className="h-60 sm:h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.regionalBreakdown} layout="vertical">
                  <XAxis type="number" stroke="#64748b" tick={{ fontSize: 9 }} />
                  <YAxis dataKey="region" type="category" stroke="#64748b" tick={{ fontSize: 9 }} width={100} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="count" fill="#38bdf8" name="Total Anomalies" />
                  <Bar dataKey="highPriorityCount" fill="#ef4444" name="High / Critical Queue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Temporal Progression of Categories */}
          <div className="bg-[#0f172a] p-3.5 sm:p-4 rounded-xl border border-slate-800 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs uppercase tracking-wider">
                7-Day Daily Ingestion Activity Stream
              </span>
              <span className="text-[10px] text-orange-500 font-mono font-bold">Aug 18 - Aug 24</span>
            </div>
            <div className="h-60 sm:h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.timeSeries}>
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 9 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Line type="monotone" dataKey="industrialCount" stroke="#ef4444" strokeWidth={2} name="Industrial Anomalies" dot={{ r: 2.5 }} />
                  <Line type="monotone" dataKey="flaresCount" stroke="#38bdf8" strokeWidth={2} name="Routine Flares" dot={{ r: 2.5 }} />
                  <Line type="monotone" dataKey="agriculturalCount" stroke="#84cc16" strokeWidth={1.5} strokeDasharray="3 3" name="Agri Residue" dot={{ r: 2.5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Central Demonstration Scenario Summary Box */}
        <div className="bg-[#0f172a] p-4 sm:p-5 rounded-xl border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-orange-500 font-bold text-sm">
            <Sparkles className="w-4 h-4 text-orange-500 shrink-0" />
            <span>GeoFlare Processing Workflow Architecture</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div className="bg-[#020617] p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 font-mono block">STEP 1</span>
              <strong className="text-white block mt-1">Raw Observations</strong>
              <p className="text-[11px] text-slate-400 mt-1">NASA FIRMS VIIRS & MODIS large-scale thermal anomaly points.</p>
            </div>
            <div className="bg-[#020617] p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 font-mono block">STEP 2</span>
              <strong className="text-sky-300 block mt-1">Geospatial Matching</strong>
              <p className="text-[11px] text-slate-400 mt-1">Spatial collision with Indian industrial complex buffers.</p>
            </div>
            <div className="bg-[#020617] p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 font-mono block">STEP 3</span>
              <strong className="text-orange-400 block mt-1">Temporal Persistence</strong>
              <p className="text-[11px] text-slate-400 mt-1">Computes recurrence, baseline FRP, and trend slope.</p>
            </div>
            <div className="bg-[#020617] p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 font-mono block">STEP 4</span>
              <strong className="text-purple-300 block mt-1">Hybrid Classifier</strong>
              <p className="text-[11px] text-slate-400 mt-1">Differentiates fire vs routine flare vs stubble fire.</p>
            </div>
            <div className="bg-[#020617] p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 font-mono block">STEP 5</span>
              <strong className="text-emerald-300 block mt-1">Explainable Triage</strong>
              <p className="text-[11px] text-slate-400 mt-1">Provides "Why is this important?" evidence for human verification.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
