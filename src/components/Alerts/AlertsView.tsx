import React from 'react';
import { ThermalAlert, ThermalEvent } from '../../types';
import {
  Bell,
  AlertTriangle,
  Flame,
  CheckCircle,
  ExternalLink,
  Shield,
  MapPin,
  Clock,
  Send,
  Radio,
} from 'lucide-react';

interface AlertsViewProps {
  alerts: ThermalAlert[];
  events: ThermalEvent[];
  onSelectEvent: (event: ThermalEvent) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  events,
  onSelectEvent,
}) => {
  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'Critical':
        return 'bg-red-600 text-white font-bold animate-pulse';
      case 'High':
        return 'bg-orange-600 text-white font-bold';
      case 'Moderate':
        return 'bg-yellow-500 text-slate-950 font-bold';
      default:
        return 'bg-blue-600 text-white font-bold';
    }
  };

  return (
    <div className="flex-1 bg-[#020617] p-3 sm:p-6 overflow-y-auto text-slate-300 pb-safe">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f172a] p-3.5 sm:p-4 rounded-xl border border-slate-800 shadow-md">
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2 tracking-tight">
              <Bell className="w-5 h-5 text-orange-500 shrink-0" />
              <span>Prioritized Dispatch & Verification Alert Feed</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              Automated high-priority notifications for state disaster authorities, pollution control boards, and industrial safety officers.
            </p>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 rounded bg-[#020617] text-orange-500 font-mono text-xs border border-slate-800 font-bold">
            {alerts.length} Actionable Alerts
          </span>
        </div>

        {/* Alerts List */}
        <div className="space-y-3">
          {alerts.map((alert) => {
            const matchedEvent = events.find((e) => e.id === alert.eventId);
            return (
              <div
                key={alert.id}
                className="bg-[#0f172a] rounded-xl border border-slate-800 p-4 sm:p-5 shadow-xl hover:border-orange-500/60 transition space-y-3"
              >
                {/* Alert Card Top Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded text-[11px] uppercase tracking-wider ${getSeverityBadge(alert.severity)}`}>
                      {alert.severity} Priority
                    </span>
                    <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight">{alert.title}</h2>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-400 font-mono">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {alert.timestamp.replace('T', ' ').slice(0, 16)} UTC
                    </span>
                    <span className="bg-[#020617] px-2.5 py-0.5 rounded text-orange-500 font-bold border border-slate-800 font-mono text-xs">
                      Score: {alert.priorityScore}/100
                    </span>
                  </div>
                </div>

                {/* Main Body */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 text-xs">
                  <div className="bg-[#020617] p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">
                      Geographic Location
                    </span>
                    <span className="font-bold text-white block text-xs truncate">
                      {alert.facilityName || 'Regional Industrial Zone'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{alert.region}</span>
                  </div>

                  <div className="bg-[#020617] p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">
                      Persistence & Classification
                    </span>
                    <span className="font-bold text-white block text-xs">
                      {alert.classificationLabel}
                    </span>
                    <span className="text-xs text-sky-400 capitalize font-mono">
                      Persistence: {alert.persistenceLevel}
                    </span>
                  </div>

                  <div className="bg-[#020617] p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">
                      Dispatch / Status State
                    </span>
                    <span className="font-bold capitalize text-orange-400 block text-xs">
                      {alert.status}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      External Satellite Decision-Support
                    </span>
                  </div>
                </div>

                {/* Evidentiary Reason & Recommendation */}
                <div className="bg-[#020617] p-3 rounded-lg border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-start gap-1.5 text-slate-300">
                    <strong className="text-orange-500 shrink-0">Reason:</strong>
                    <span>{alert.summaryReason}</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-slate-300">
                    <strong className="text-emerald-400 shrink-0">Action:</strong>
                    <span>"{alert.recommendedAction}"</span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                  <span className="text-[11px] text-slate-500 italic">
                    * Not a confirmed fire declaration — requires physical or facility-side verification.
                  </span>
                  {matchedEvent && (
                    <button
                      onClick={() => onSelectEvent(matchedEvent)}
                      className="w-full sm:w-auto px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider inline-flex items-center justify-center gap-1.5 transition shadow-md shadow-orange-600/20 min-h-[40px]"
                    >
                      <span>Open Full GIS Investigation</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
