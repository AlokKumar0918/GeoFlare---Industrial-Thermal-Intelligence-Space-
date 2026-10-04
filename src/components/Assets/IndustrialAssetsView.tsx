import React, { useState } from 'react';
import { IndustrialFacility, ThermalEvent } from '../../types';
import { Factory, Shield, MapPin, Phone, AlertTriangle, Flame, ExternalLink } from 'lucide-react';

interface IndustrialAssetsViewProps {
  facilities: IndustrialFacility[];
  events: ThermalEvent[];
  onSelectFacility: (fac: IndustrialFacility) => void;
  onSelectEvent: (event: ThermalEvent) => void;
}

export const IndustrialAssetsView: React.FC<IndustrialAssetsViewProps> = ({
  facilities,
  events,
  onSelectFacility,
  onSelectEvent,
}) => {
  const [selectedFacId, setSelectedFacId] = useState<string>(facilities[0]?.id || '');

  const selectedFacility = facilities.find((f) => f.id === selectedFacId) || facilities[0];

  // Associated thermal events within 2km of this facility
  const associatedEvents = events.filter((e) => e.nearestFacility?.id === selectedFacility?.id);

  return (
    <div className="flex-1 bg-[#020617] p-3 sm:p-6 overflow-y-auto text-slate-300 pb-safe">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="bg-[#0f172a] p-3.5 sm:p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2 tracking-tight">
              <Factory className="w-5 h-5 text-orange-500 shrink-0" />
              <span>Monitored Industrial Assets & Footprint Directory</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              High-hazard refineries, thermal power stations, steel smelters, and chemical manufacturing corridors.
            </p>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 rounded bg-[#020617] text-orange-500 font-mono text-xs border border-slate-800 font-bold">
            {facilities.length} Monitored Facilities
          </span>
        </div>

        {/* Master-Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Facility List (Left 1 col) */}
          <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-3 space-y-2 max-h-[400px] lg:max-h-[700px] overflow-y-auto shadow-lg">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block px-1 mb-2">
              Industrial Complex Catalog
            </span>
            {facilities.map((fac) => {
              const activeCount = events.filter((e) => e.nearestFacility?.id === fac.id).length;
              const isSelected = fac.id === selectedFacId;
              return (
                <div
                  key={fac.id}
                  onClick={() => {
                    setSelectedFacId(fac.id);
                    onSelectFacility(fac);
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
                    isSelected
                      ? 'bg-orange-500/10 border-orange-500 shadow-md ring-1 ring-orange-500/30'
                      : 'bg-[#020617] border-slate-800 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <span className="font-bold text-white text-xs leading-snug">{fac.name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                        fac.hazardLevel === 'Severe'
                          ? 'bg-rose-600 text-white'
                          : 'bg-orange-600 text-white'
                      }`}
                    >
                      {fac.hazardLevel}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mb-1">{fac.type}</div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                    <span>{fac.state}, {fac.district}</span>
                    {activeCount > 0 ? (
                      <span className="text-orange-500 font-bold flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-500" />
                        {activeCount} Active
                      </span>
                    ) : (
                      <span>No active anomaly</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Facility Profile (Right 2 cols) */}
          {selectedFacility && (
            <div className="lg:col-span-2 bg-[#0f172a] rounded-xl border border-slate-800 p-4 sm:p-5 space-y-4 sm:space-y-5 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-orange-500 font-bold">{selectedFacility.id}</span>
                    <span className="text-[11px] bg-[#020617] text-slate-300 px-2 py-0.5 rounded border border-slate-800">
                      {selectedFacility.complianceZone}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-white">{selectedFacility.name}</h2>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[11px] text-slate-400 block">Operator Entity</span>
                  <span className="text-xs font-semibold text-white">{selectedFacility.operator}</span>
                </div>
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                <div className="bg-[#020617] p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Footprint Radius</span>
                  <span className="text-xs sm:text-sm font-bold text-sky-400 font-mono">
                    {selectedFacility.footprintRadiusMeters} m
                  </span>
                </div>
                <div className="bg-[#020617] p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Hazard Level</span>
                  <span className="text-xs sm:text-sm font-bold text-rose-400 font-mono">
                    {selectedFacility.hazardLevel}
                  </span>
                </div>
                <div className="bg-[#020617] p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Baseline Flares</span>
                  <span className="text-xs sm:text-sm font-bold text-orange-500 font-mono">
                    {selectedFacility.expectedBaselineFlares} permitted
                  </span>
                </div>
                <div className="bg-[#020617] p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Emergency Hotline</span>
                  <span className="text-[11px] sm:text-xs font-bold text-white font-mono flex items-center gap-1 mt-0.5 truncate">
                    <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                    {selectedFacility.emergencyContact}
                  </span>
                </div>
              </div>

              {/* Active Anomalies Associated with this Facility */}
              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span>Active Satellite Thermal Anomalies ({associatedEvents.length})</span>
                  <span className="text-[11px] font-normal text-slate-400 font-mono">
                    GPS: {selectedFacility.latitude.toFixed(4)}°N, {selectedFacility.longitude.toFixed(4)}°E
                  </span>
                </h3>

                {associatedEvents.length === 0 ? (
                  <div className="p-6 text-center bg-[#020617] rounded-lg border border-slate-800 text-slate-400 text-xs">
                    No active thermal anomalies detected near this facility in the current observation window.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {associatedEvents.map((evt) => (
                      <div
                        key={evt.id}
                        onClick={() => onSelectEvent(evt)}
                        className="bg-[#020617] p-3 rounded-lg border border-slate-800 hover:border-orange-500/60 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-orange-500 font-bold">{evt.id}</span>
                            <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded uppercase font-bold">
                              {evt.priority.tier} ({evt.priority.score})
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              📍 {Math.round(evt.distanceToFacilityMeters || 0)}m away
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-white">
                            {evt.classification.categoryLabel}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                          <div className="text-left sm:text-right">
                            <div className="font-mono font-bold text-orange-500 text-xs sm:text-sm">{evt.primaryObservation.frp} MW</div>
                            <div className="text-[10px] text-slate-400 capitalize">{evt.persistence.level}</div>
                          </div>
                          <button className="p-2 rounded-lg bg-orange-600/20 text-orange-400 border border-orange-500/30 hover:bg-orange-600 hover:text-white transition">
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
