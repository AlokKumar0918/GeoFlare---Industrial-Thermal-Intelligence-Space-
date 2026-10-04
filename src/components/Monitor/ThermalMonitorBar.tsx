import React from 'react';
import {
  Flame,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Database,
  Radio,
  HelpCircle,
  Layers,
} from 'lucide-react';

export type TimeWindow = '24h' | '48h' | '7d';

interface ThermalMonitorBarProps {
  scope: 'global' | 'india';
  timeWindow: TimeWindow;
  onTimeWindowChange: (w: TimeWindow) => void;
  anomaliesCount: number | null;
  highPriorityCount: number | null;
  persistentSourcesCount: number | null;
  needsReviewCount: number | null;
  dataSourceMode: 'demo' | 'live' | 'upload';
  latestObservationTime?: string | null;
}

export const ThermalMonitorBar: React.FC<ThermalMonitorBarProps> = ({
  scope,
  timeWindow,
  onTimeWindowChange,
  anomaliesCount,
  highPriorityCount,
  persistentSourcesCount,
  needsReviewCount,
  dataSourceMode,
  latestObservationTime,
}) => {
  const windowLabel =
    timeWindow === '24h' ? '24 HOURS' : timeWindow === '48h' ? '48 HOURS' : '7 DAYS';

  const isDataAvailable = anomaliesCount !== null;
  const isZero = isDataAvailable && anomaliesCount === 0;

  return (
    <div
      id="thermal-monitor-command-strip"
      className="w-full shrink-0 bg-[#080d1a] border-b border-slate-800/90 px-3 sm:px-4 py-2 sm:py-2.5 z-10 select-none text-slate-300"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 max-w-full">
        {/* LEFT: HERO KPI SECTION */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-slate-400 uppercase font-mono flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    scope === 'global' ? 'bg-sky-400' : 'bg-orange-500'
                  }`}
                />
                {scope === 'global'
                  ? 'GLOBAL THERMAL ANOMALIES'
                  : 'INDIA THERMAL ANOMALIES'}
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono text-orange-400/90 font-bold uppercase bg-orange-950/70 px-1.5 py-0.5 rounded border border-orange-500/30">
                {windowLabel}
              </span>
            </div>

            <div className="flex items-baseline gap-2.5 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white leading-none">
                {isDataAvailable ? anomaliesCount : '—'}
              </span>

              {/* Time Window Selector */}
              <div className="flex items-center bg-[#020617] rounded-md border border-slate-800 p-0.5 ml-1">
                {(['24h', '48h', '7d'] as TimeWindow[]).map((w) => {
                  const isActive = timeWindow === w;
                  const label = w.toUpperCase();
                  return (
                    <button
                      key={w}
                      id={`time-window-${w}`}
                      onClick={() => onTimeWindowChange(w)}
                      className={`px-2 py-0.5 text-[10px] sm:text-[11px] font-mono font-bold rounded transition min-h-[22px] ${
                        isActive
                          ? 'bg-orange-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                      title={`Filter thermal observations from past ${
                        w === '24h' ? '24 Hours' : w === '48h' ? '48 Hours' : '7 Days'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Empty / Low Data Context Note if zero */}
              {isZero && (
                <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
                  CURRENT DATA WINDOW: No qualifying observations in selected window.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* MIDDLE: COMPACT GLOBAL SUMMARY METRICS */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3 text-xs">
          {/* 1. Thermal Anomalies */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#020617] border border-slate-800/80">
            <Radio className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="text-slate-400 text-[11px]">Thermal Anomalies:</span>
            <span className="font-mono font-bold text-white text-[11px]">
              {isDataAvailable ? anomaliesCount : '—'}
            </span>
          </div>

          {/* 2. High-Priority */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#020617] border border-slate-800/80">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="text-slate-400 text-[11px]">High-Priority:</span>
            <span className="font-mono font-bold text-red-400 text-[11px]">
              {highPriorityCount !== null ? highPriorityCount : '—'}
            </span>
          </div>

          {/* 3. Persistent Sources */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#020617] border border-slate-800/80">
            <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span className="text-slate-400 text-[11px]">Persistent Sources:</span>
            <span className="font-mono font-bold text-orange-400 text-[11px]">
              {persistentSourcesCount !== null ? persistentSourcesCount : '—'}
            </span>
          </div>

          {/* 4. Needs Review */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#020617] border border-slate-800/80">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-slate-400 text-[11px]">Needs Review:</span>
            <span className="font-mono font-bold text-amber-400 text-[11px]">
              {needsReviewCount !== null ? needsReviewCount : '—'}
            </span>
          </div>
        </div>

        {/* RIGHT: DATA PROVENANCE & SENSOR STATUS */}
        <div className="hidden xl:flex items-center gap-2 text-[10px] font-mono text-slate-400 shrink-0 bg-[#020617] px-2.5 py-1 rounded-md border border-slate-800/70">
          <Database className={`w-3.5 h-3.5 shrink-0 ${dataSourceMode === 'upload' ? 'text-orange-400' : 'text-emerald-400'}`} />
          <div className="flex items-center gap-2">
            <span>
              <strong className="text-slate-200 font-semibold">NASA FIRMS</strong> (VIIRS / MODIS)
            </span>
            <span className="text-slate-600">&bull;</span>
            {dataSourceMode === 'upload' ? (
              <span className="text-orange-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
                UPLOAD &bull; NASA FIRMS CSV
              </span>
            ) : (
              <span className="text-emerald-400 font-medium">
                {dataSourceMode === 'live' ? 'Live Sat Feed' : 'Calibrated Overpass Feed'}
              </span>
            )}
            {latestObservationTime && (
              <>
                <span className="text-slate-600">&bull;</span>
                <span className="text-slate-400">
                  Latest: {latestObservationTime.slice(0, 16).replace('T', ' ')} UTC
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
