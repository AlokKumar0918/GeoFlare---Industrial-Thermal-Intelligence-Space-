import React, { useState } from 'react';
import { IndustrialFacility, ThermalEvent } from '../../types';
import {
  History,
  TrendingUp,
  Calendar,
  Layers,
  Flame,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';

interface HistoricalAnalysisViewProps {
  facilities: IndustrialFacility[];
  events: ThermalEvent[];
  onSelectEvent: (event: ThermalEvent) => void;
}

export const HistoricalAnalysisView: React.FC<HistoricalAnalysisViewProps> = ({
  facilities,
  events,
  onSelectEvent,
}) => {
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(facilities[0]?.id || '');
  const [timeWindow, setTimeWindow] = useState<'30d' | '90d' | '180d'>('30d');

  const facility = facilities.find((f) => f.id === selectedFacilityId) || facilities[0];
  const facilityEvents = events.filter((e) => e.nearestFacility?.id === facility?.id);

  // Synthesize realistic historical observations data across 30 days
  const historySeries = [
    { date: 'Aug 01', detections: 2, avgFrp: 32, maxFrp: 35, flaringEvents: 2, abnormalEvents: 0 },
    { date: 'Aug 05', detections: 1, avgFrp: 28, maxFrp: 28, flaringEvents: 1, abnormalEvents: 0 },
    { date: 'Aug 09', detections: 3, avgFrp: 34, maxFrp: 38, flaringEvents: 3, abnormalEvents: 0 },
    { date: 'Aug 13', detections: 2, avgFrp: 30, maxFrp: 33, flaringEvents: 2, abnormalEvents: 0 },
    { date: 'Aug 17', detections: 4, avgFrp: 36, maxFrp: 42, flaringEvents: 4, abnormalEvents: 0 },
    { date: 'Aug 21', detections: 3, avgFrp: 58, maxFrp: 74, flaringEvents: 2, abnormalEvents: 1 },
    { date: 'Aug 24', detections: 5, avgFrp: 98, maxFrp: 184, flaringEvents: 3, abnormalEvents: 2 },
  ];

  const totalDetections = historySeries.reduce((acc, curr) => acc + curr.detections, 0);
  const totalAbnormal = historySeries.reduce((acc, curr) => acc + curr.abnormalEvents, 0);
  const maxRecordedFrp = Math.max(...historySeries.map((h) => h.maxFrp));

  return (
    <div className="flex-1 bg-[#020617] p-4 sm:p-6 overflow-y-auto text-slate-300">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f172a] p-4 rounded border border-slate-800 shadow-md">
          <div>
            <h1 className="text-lg font-extrabold text-white flex items-center gap-2 tracking-tight">
              <History className="w-5 h-5 text-orange-500" />
              Multi-Temporal Persistence & Historical Baseline Analysis
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Track recurrence patterns, baseline flaring versus acute thermal surges, and intensity regressions over time.
            </p>
          </div>

          {/* Facility Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold hidden md:inline">Select Asset:</span>
            <select
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              className="bg-[#020617] border border-slate-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.state})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Executive 30-Day Summary Card */}
        {facility && (
          <div className="bg-[#0f172a] p-5 rounded border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-orange-500 font-bold">{facility.id}</span>
                <h2 className="text-base font-bold text-white">{facility.name}</h2>
                <span className="text-xs text-slate-400">{facility.type} &bull; {facility.complianceZone}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2 sm:mt-0">
                <span className="px-2.5 py-1 rounded bg-[#020617] text-slate-300 text-xs font-mono border border-slate-800">
                  Window: Last 30 Days
                </span>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#020617] p-3 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Detections</span>
                <span className="text-base font-bold text-white font-mono">{totalDetections} observations</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">VIIRS & MODIS passes</span>
              </div>

              <div className="bg-[#020617] p-3 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Recurring / Persistent</span>
                <span className="text-base font-bold text-sky-400 font-mono">
                  {totalDetections - totalAbnormal} routine flaring
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Matches flare stack profile</span>
              </div>

              <div className="bg-[#020617] p-3 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Abnormal Surges</span>
                <span className={`text-base font-bold font-mono ${totalAbnormal > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {totalAbnormal} high-priority
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Exceeds operational threshold</span>
              </div>

              <div className="bg-[#020617] p-3 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Peak Radiative Power</span>
                <span className="text-base font-bold text-orange-500 font-mono">{maxRecordedFrp} MW</span>
                <span className="text-[10px] text-rose-400 flex items-center gap-0.5 mt-0.5">
                  <ArrowUpRight className="w-3 h-3" /> Increasing trend
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Charts: Multi-temporal Observation Count & FRP Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Chart 1: Detection Frequency by Class */}
          <div className="bg-[#0f172a] p-4 rounded border border-slate-800 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs uppercase tracking-wider">
                Thermal Observation Frequency by Type
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Aug 01 - Aug 24, 2026</span>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historySeries}>
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '6px', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#cbd5e1' }} />
                  <Bar dataKey="flaringEvents" fill="#38bdf8" name="Routine Operational Flares" stackId="a" />
                  <Bar dataKey="abnormalEvents" fill="#ef4444" name="Abnormal Surges / Outliers" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Fire Radiative Power (FRP) Intensity Trend */}
          <div className="bg-[#0f172a] p-4 rounded border border-slate-800 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs uppercase tracking-wider">
                Fire Radiative Power (FRP) MW Progression
              </span>
              <span className="text-[10px] text-orange-500 font-mono font-bold">Max: {maxRecordedFrp} MW</span>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historySeries}>
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit=" MW" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '6px', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#cbd5e1' }} />
                  <Line type="monotone" dataKey="avgFrp" stroke="#ea580c" strokeWidth={2} name="Average FRP (MW)" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="maxFrp" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" name="Peak Pass FRP (MW)" dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Active Events at this Facility Table */}
        <div className="bg-[#0f172a] rounded border border-slate-800 p-4 space-y-3 shadow-md">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider">
            Current Active Anomalies at {facility?.name} ({facilityEvents.length})
          </h3>
          {facilityEvents.length === 0 ? (
            <p className="text-xs text-slate-500 py-3">No active anomalies currently detected within footprint.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {facilityEvents.map((e) => (
                <div
                  key={e.id}
                  onClick={() => onSelectEvent(e)}
                  className="bg-[#020617] p-3 rounded border border-slate-800 hover:border-orange-500/80 cursor-pointer transition flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-orange-500 font-bold">{e.id}</span>
                      <span className="text-[10px] bg-red-600 text-white px-2 py-0.2 rounded uppercase font-bold">
                        {e.priority.tier} ({e.priority.score})
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-white">{e.classification.categoryLabel}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-orange-500 text-sm">{e.primaryObservation.frp} MW</span>
                    <span className="text-[10px] text-slate-400 block">{e.persistence.observationCount} passes</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
