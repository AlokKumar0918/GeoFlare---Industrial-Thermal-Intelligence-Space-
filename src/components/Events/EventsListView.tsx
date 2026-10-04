import React, { useState } from 'react';
import { ThermalEvent, PriorityTier, VerificationState } from '../../types';
import {
  Search,
  Filter,
  ArrowUpDown,
  Flame,
  ShieldAlert,
  Clock,
  MapPin,
  ExternalLink,
  CheckCircle,
  LayoutGrid,
  List,
} from 'lucide-react';

interface EventsListViewProps {
  events: ThermalEvent[];
  selectedEventId: string | null;
  onSelectEvent: (event: ThermalEvent) => void;
}

export const EventsListView: React.FC<EventsListViewProps> = ({
  events,
  selectedEventId,
  onSelectEvent,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'priority' | 'frp' | 'persistence' | 'time'>('priority');
  const [sortAsc, setSortAsc] = useState(false);
  const [viewMode, setViewMode] = useState<'auto' | 'table' | 'cards'>('auto');

  const filtered = events.filter((e) => {
    const term = searchTerm.toLowerCase();
    return (
      e.id.toLowerCase().includes(term) ||
      e.classification.categoryLabel.toLowerCase().includes(term) ||
      (e.nearestFacility?.name || '').toLowerCase().includes(term) ||
      e.region.toLowerCase().includes(term)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    let diff = 0;
    if (sortField === 'priority') diff = a.priority.score - b.priority.score;
    else if (sortField === 'frp') diff = a.primaryObservation.frp - b.primaryObservation.frp;
    else if (sortField === 'persistence') diff = a.persistence.observationCount - b.persistence.observationCount;
    else if (sortField === 'time') {
      diff = new Date(a.primaryObservation.timestamp).getTime() - new Date(b.primaryObservation.timestamp).getTime();
    }
    return sortAsc ? diff : -diff;
  });

  const getTierBadge = (tier: PriorityTier) => {
    switch (tier) {
      case 'Critical':
        return 'bg-red-600 text-white border-red-500 font-bold';
      case 'High':
        return 'bg-orange-600 text-white border-orange-500 font-bold';
      case 'Moderate':
        return 'bg-yellow-500 text-slate-950 border-yellow-400 font-bold';
      case 'Low':
        return 'bg-blue-600 text-white border-blue-500 font-bold';
    }
  };

  return (
    <div className="flex-1 bg-[#020617] p-3 sm:p-6 overflow-y-auto text-slate-300 pb-safe">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f172a] p-3.5 sm:p-4 rounded-xl border border-slate-800 shadow-md">
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2 tracking-tight">
              <Flame className="w-5 h-5 text-orange-500 shrink-0" />
              <span>Thermal Anomaly Queue & Triage</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              Prioritized satellite thermal observations matched with industrial facilities and temporal persistence models.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search event, plant, region..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#020617] border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 min-h-[38px]"
              />
            </div>

            {/* View Mode Toggle (hidden on very small phones where cards are best) */}
            <div className="hidden sm:flex items-center bg-[#020617] rounded-lg border border-slate-800 p-0.5">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded text-xs transition ${
                  viewMode === 'table' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded text-xs transition ${
                  viewMode === 'cards' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Cards View (Visible on mobile screens < md, or if viewMode === 'cards') */}
        <div className={`${viewMode === 'table' ? 'hidden' : 'block md:hidden'} space-y-3`}>
          {sorted.map((evt) => {
            const isSelected = evt.id === selectedEventId;
            return (
              <div
                key={evt.id}
                onClick={() => onSelectEvent(evt)}
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#0f172a] border-orange-500 ring-1 ring-orange-500/50 shadow-lg shadow-orange-500/10'
                    : 'bg-[#0f172a] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase border ${getTierBadge(evt.priority.tier)}`}>
                      {evt.priority.tier} ({evt.priority.score})
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">{evt.id}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {evt.primaryObservation.satellite}
                  </span>
                </div>

                <div className="font-bold text-white text-sm mb-1">
                  {evt.classification.categoryLabel}
                </div>

                {evt.nearestFacility ? (
                  <div className="flex items-center gap-1.5 text-xs text-slate-300 mb-3">
                    <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span className="truncate">{evt.nearestFacility.name}</span>
                    <span className="text-orange-400 font-mono text-[11px]">
                      ({Math.round(evt.distanceToFacilityMeters || 0)}m)
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic mb-3">Non-industrial rural hotspot</div>
                )}

                <div className="grid grid-cols-3 gap-2 bg-[#020617] p-2.5 rounded-lg border border-slate-800/80 mb-3 text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">FRP</span>
                    <span className="font-mono font-bold text-orange-500 text-xs">
                      {evt.primaryObservation.frp} MW
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Confidence</span>
                    <span className="font-mono text-emerald-400 text-xs font-semibold">
                      {evt.classification.confidencePercent}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Persistence</span>
                    <span className="font-mono text-slate-300 text-xs">
                      {evt.persistence.observationCount} passes
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEvent(evt);
                  }}
                  className="w-full py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-md shadow-orange-600/20 min-h-[42px]"
                >
                  <span>Investigate Hotspot</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Desktop/Tablet Table View */}
        <div className={`bg-[#0f172a] rounded-xl border border-slate-800 overflow-hidden shadow-xl ${
          viewMode === 'cards' ? 'hidden' : 'hidden md:block'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#020617] text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th
                    className="p-3.5 cursor-pointer hover:text-white"
                    onClick={() => {
                      setSortField('priority');
                      setSortAsc(!sortAsc);
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Priority (0-100)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-3.5">Classification & Confidence</th>
                  <th className="p-3.5">Associated Facility / Proximity</th>
                  <th
                    className="p-3.5 cursor-pointer hover:text-white"
                    onClick={() => {
                      setSortField('frp');
                      setSortAsc(!sortAsc);
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>FRP (MW)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="p-3.5 cursor-pointer hover:text-white"
                    onClick={() => {
                      setSortField('persistence');
                      setSortAsc(!sortAsc);
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Persistence</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-3.5">Trend</th>
                  <th className="p-3.5">Verification</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {sorted.map((evt) => {
                  const isSelected = evt.id === selectedEventId;
                  return (
                    <tr
                      key={evt.id}
                      onClick={() => onSelectEvent(evt)}
                      className={`cursor-pointer transition ${
                        isSelected
                          ? 'bg-orange-500/10 border-l-4 border-orange-500'
                          : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase border ${getTierBadge(evt.priority.tier)}`}>
                            {evt.priority.tier} ({evt.priority.score})
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{evt.id}</span>
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-white">{evt.classification.categoryLabel}</div>
                        <div className="text-[11px] text-emerald-400 font-mono">
                          {evt.classification.confidencePercent}% Confidence
                        </div>
                      </td>

                      <td className="p-3.5">
                        {evt.nearestFacility ? (
                          <div>
                            <div className="font-medium text-slate-200">{evt.nearestFacility.name}</div>
                            <div className="text-[10px] text-orange-500 font-mono">
                              📍 {Math.round(evt.distanceToFacilityMeters || 0)}m ({evt.nearestFacility.type})
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Non-industrial rural</span>
                        )}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-mono font-bold text-orange-500 text-sm">
                          {evt.primaryObservation.frp} MW
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {evt.primaryObservation.brightnessTempK} K
                        </div>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-[#020617] text-slate-300 font-medium capitalize text-[11px] border border-slate-800">
                          {evt.persistence.level}
                        </span>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {evt.persistence.observationCount} passes / {evt.persistence.detectionDays}d
                        </div>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className={`font-mono text-[11px] font-semibold uppercase ${
                            evt.persistence.trend === 'spiking'
                              ? 'text-red-400'
                              : evt.persistence.trend === 'increasing'
                              ? 'text-orange-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {evt.persistence.trend}
                        </span>
                        {evt.persistence.deviationFromBaselinePercent !== 0 && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            {evt.persistence.deviationFromBaselinePercent > 0 ? `+${evt.persistence.deviationFromBaselinePercent}%` : `${evt.persistence.deviationFromBaselinePercent}%`} vs base
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold capitalize bg-[#020617] text-slate-300 border border-slate-800 font-mono">
                          {evt.verification.state.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEvent(evt);
                          }}
                          className="px-3 py-1.5 rounded bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1 transition shadow-md shadow-orange-600/20 min-h-[34px]"
                        >
                          Investigate
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
