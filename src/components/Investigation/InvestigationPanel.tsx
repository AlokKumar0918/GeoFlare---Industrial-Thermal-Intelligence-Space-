import React, { useState } from 'react';
import {
  ThermalEvent,
  VerificationState,
  ScoreContributor,
} from '../../types';
import { isIndiaEvent } from '../../services/spatial';
import {
  X,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Clock,
  MapPin,
  Flame,
  Shield,
  Activity,
  ChevronRight,
  Sparkles,
  Send,
  FileText,
  Eye,
  Radio,
  TrendingUp,
  Cpu,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  AreaChart,
  Area,
} from 'recharts';

interface InvestigationPanelProps {
  event: ThermalEvent | null;
  onClose: () => void;
  onVerify: (
    eventId: string,
    state: VerificationState,
    notes?: string,
    assignedTeam?: string
  ) => void;
  onAIBriefRequest: (eventId: string) => Promise<{ source: string; brief: string }>;
  currentScope?: 'global' | 'india';
  onOpenIndiaInvestigation?: (event: ThermalEvent) => void;
}

export const InvestigationPanel: React.FC<InvestigationPanelProps> = ({
  event,
  onClose,
  onVerify,
  onAIBriefRequest,
  currentScope,
  onOpenIndiaInvestigation,
}) => {
  if (!event) return null;

  const [activeTab, setActiveTab] = useState<'why' | 'persistence' | 'satellite' | 'verify' | 'ai'>('why');
  const [verificationNotes, setVerificationNotes] = useState(event.verification.notes || '');
  const [assignedTeam, setAssignedTeam] = useState(event.verification.assignedTeam || '');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiBriefResult, setAiBriefResult] = useState<{ source: string; brief: string } | null>(null);

  const isIndia = isIndiaEvent(event);

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'Critical':
        return 'bg-red-600 text-white border-red-500 font-bold';
      case 'High':
        return 'bg-orange-600 text-white border-orange-500 font-bold';
      case 'Moderate':
        return 'bg-yellow-500 text-slate-950 border-yellow-400 font-bold';
      default:
        return 'bg-blue-600 text-white border-blue-500 font-bold';
    }
  };

  const handleGenerateAIBrief = async () => {
    setAiLoading(true);
    try {
      const res = await onAIBriefRequest(event.id);
      setAiBriefResult(res);
      setActiveTab('ai');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveVerification = (newState: VerificationState) => {
    onVerify(event.id, newState, verificationNotes, assignedTeam);
  };

  // Format Recharts data for temporal history
  const chartData = event.persistence.observationsHistory.map((obs, idx) => ({
    time: obs.timestamp.split('T')[0].slice(5) + ' ' + obs.timestamp.split('T')[1].slice(0, 5),
    frp: obs.frp,
    baseline: event.persistence.historicalBaselineFrp,
    sensor: obs.sensor,
    confidence: obs.confidence,
  }));

  return (
    <div className="w-full h-full bg-[#0f172a] flex flex-col text-slate-300 shadow-2xl z-30 overflow-hidden">
      {/* Investigation Panel Header */}
      <div className="p-4 border-b border-slate-800 bg-[#0f172a] flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-orange-500 font-bold tracking-wider">
              {event.id}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] uppercase border ${getTierBadge(event.priority.tier)}`}>
              {event.priority.tier} Priority ({event.priority.score}/100)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {event.primaryObservation.satellite}
            </span>
          </div>
          <h2 className="text-base font-extrabold text-white tracking-tight leading-snug">
            {event.classification.categoryLabel}
          </h2>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          title="Close Investigation Panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Global-to-India Workflow Banner: OPEN INDIA INVESTIGATION */}
      {isIndia && currentScope === 'global' && (
        <div className="bg-orange-950/50 border-b border-orange-500/40 p-3 shrink-0 flex items-center justify-between gap-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-orange-400">
              <span>🇮🇳</span>
              <span className="truncate">INDIA REGIONAL CORRIDOR DETECTED</span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 truncate">
              {event.nearestFacility
                ? `${event.nearestFacility.name} (${event.distanceToFacilityMeters ? Math.round(event.distanceToFacilityMeters) + 'm' : 'In perimeter'})`
                : 'Corridor within Indian territory with full GIS asset layers'}
            </p>
          </div>
          <button
            id="btn-open-india-investigation"
            onClick={() => onOpenIndiaInvestigation?.(event)}
            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold font-mono rounded shadow flex items-center gap-1.5 shrink-0 transition"
            title="Switch scope to India, center map on anomaly, and load CEPI & industrial layers"
          >
            <span>OPEN INDIA INVESTIGATION</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center border-b border-slate-800 bg-[#020617]/80 px-2 text-xs shrink-0 overflow-x-auto">
        <button
          onClick={() => setActiveTab('why')}
          className={`py-2.5 px-3 font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'why'
              ? 'border-orange-500 text-orange-500 bg-orange-500/10 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Why Important?
        </button>

        <button
          onClick={() => setActiveTab('persistence')}
          className={`py-2.5 px-3 font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'persistence'
              ? 'border-orange-500 text-orange-500 bg-orange-500/10 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Temporal History ({event.persistence.observationCount})
        </button>

        <button
          onClick={() => setActiveTab('satellite')}
          className={`py-2.5 px-3 font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'satellite'
              ? 'border-orange-500 text-orange-500 bg-orange-500/10 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Spatial Context
        </button>

        <button
          onClick={() => setActiveTab('verify')}
          className={`py-2.5 px-3 font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'verify'
              ? 'border-orange-500 text-orange-500 bg-orange-500/10 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Verification Triage
        </button>

        <button
          onClick={handleGenerateAIBrief}
          disabled={aiLoading}
          className={`py-2.5 px-3 font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'ai'
              ? 'border-orange-500 text-orange-500 bg-orange-500/10 font-bold'
              : 'border-transparent text-orange-400 hover:text-orange-300'
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
          AI Brief
        </button>
      </div>

      {/* Main Tab Content (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* ======================================================== */}
        {/* TAB 1: WHY IS THIS THERMAL EVENT IMPORTANT? (Signature)  */}
        {/* ======================================================== */}
        {activeTab === 'why' && (
          <div className="space-y-4">
            {/* Top Quick Stats Strip */}
            <div className="grid grid-cols-3 gap-2 bg-[#020617] p-3 rounded border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Thermal Radiative</span>
                <span className="text-sm font-bold text-orange-500 font-mono">
                  {event.primaryObservation.frp} MW
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {event.primaryObservation.brightnessTempK} K
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Model Confidence</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">
                  {event.classification.confidencePercent}%
                </span>
                <span className="text-[10px] text-slate-400 block">
                  ±{(event.classification.uncertaintyMargin * 100).toFixed(0)}% Margin
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Persistence Level</span>
                <span className="text-sm font-bold text-sky-400 font-mono capitalize">
                  {event.persistence.level}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {event.persistence.observationCount} passes / {event.persistence.detectionDays}d
                </span>
              </div>
            </div>

            {/* Signature Feature: "WHY IS THIS THERMAL EVENT IMPORTANT?" */}
            <div className="bg-[#020617] p-3.5 rounded border border-slate-800 shadow-lg">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-500" />
                  Why is this thermal event important?
                </h3>
                <span className="font-mono text-xs font-bold text-orange-500">
                  Priority: {event.priority.score}/100
                </span>
              </div>

              {/* Dynamic Rule-Grounded Evidentiary Reasons */}
              <ul className="space-y-1.5 mb-3">
                {event.priority.whyImportant.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-200">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{reason}</span>
                  </li>
                ))}
              </ul>

              {/* Mathematical Priority Contributors Breakdown */}
              <div className="mt-3 pt-2.5 border-t border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-widest block mb-2">
                  Investigation Priority Score Breakdown (0–100)
                </span>
                <div className="space-y-1.5">
                  {event.priority.contributors.map((contrib, idx) => (
                    <div key={idx} className="bg-[#0f172a] p-2 rounded border border-slate-800">
                      <div className="flex justify-between items-center text-xs mb-0.5">
                        <span className="font-medium text-slate-200">{contrib.factor}</span>
                        <span className="font-mono font-bold text-orange-500">+{contrib.points} pts</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{contrib.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommended Verification Action Card */}
            <div className="bg-slate-800 p-3 rounded-md text-xs text-white leading-relaxed italic border-l-4 border-orange-500">
              <div className="flex items-center gap-1.5 text-orange-500 font-bold not-italic mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span>Recommended Verification Action</span>
              </div>
              <p className="text-slate-200 text-xs leading-relaxed">
                "{event.priority.recommendedAction}"
              </p>
              <div className="mt-2 text-[10px] text-slate-400 not-italic">
                False alarm screening risk factor: <strong className="text-slate-200">{event.priority.falseAlarmRisk}%</strong>
              </div>
            </div>

            {/* Classification & ML Feature Attributions */}
            <div className="bg-[#020617] p-3 rounded border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white">Hybrid Classifier Attribution</span>
                <span className="text-[10px] text-slate-400 font-mono">Random Forest + Spatial Heuristic</span>
              </div>
              <div className="space-y-1.5">
                {event.classification.featureAttributions.map((attr, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-slate-300">{attr.feature}</span>
                      <span className="font-mono text-orange-500 font-semibold">{(attr.impact * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded overflow-hidden">
                      <div
                        className="bg-orange-500 h-full rounded"
                        style={{ width: `${attr.impact * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: TEMPORAL / PERSISTENCE HISTORY                    */}
        {/* ======================================================== */}
        {activeTab === 'persistence' && (
          <div className="space-y-4">
            <div className="bg-[#020617] p-3.5 rounded border border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white">Radiative Power (FRP) vs Baseline Trend</span>
                <span className="text-[10px] font-mono text-orange-500 font-bold uppercase">
                  Trend: {event.persistence.trend}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Historical baseline FRP is <strong className="text-white">{event.persistence.historicalBaselineFrp} MW</strong>. Current pass is{' '}
                <strong className={event.persistence.deviationFromBaselinePercent > 50 ? 'text-red-400' : 'text-slate-200'}>
                  {event.persistence.deviationFromBaselinePercent > 0 ? `+${event.persistence.deviationFromBaselinePercent}%` : `${event.persistence.deviationFromBaselinePercent}%`}
                </strong> from baseline.
              </p>

              {/* Recharts Temporal Chart */}
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="frpGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ea580c" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit=" MW" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '6px', fontSize: '11px' }}
                    />
                    <ReferenceLine y={event.persistence.historicalBaselineFrp} stroke="#38bdf8" strokeDasharray="3 3" label={{ value: 'Baseline', fill: '#38bdf8', fontSize: 10 }} />
                    <Area type="monotone" dataKey="frp" stroke="#ea580c" strokeWidth={2} fillOpacity={1} fill="url(#frpGradient)" name="FRP (MW)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Overpasses Log Table */}
            <div className="bg-[#020617] p-3 rounded border border-slate-800">
              <span className="font-bold text-white block mb-2">Chronological Overpass Observations</span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {event.persistence.observationsHistory.map((obs, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-[#0f172a] px-2.5 py-1.5 rounded border border-slate-800 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400">{obs.timestamp.replace('T', ' ').replace('Z', '')}</span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-300">{obs.sensor}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-orange-500 font-bold">{obs.frp} MW</span>
                      <span className="font-mono text-slate-400">{obs.brightness} K</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: SPATIAL CONTEXT & SATELLITE IMAGE VIEW            */}
        {/* ======================================================== */}
        {activeTab === 'satellite' && (
          <div className="space-y-4">
            <div className="bg-[#020617] p-3.5 rounded border border-slate-800">
              <span className="font-bold text-white block mb-1">Geospatial Association</span>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Nearest Industrial Facility:</span>
                  <span className="font-semibold text-white">{event.nearestFacility?.name || 'None within 2.5km'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Distance to Facility Perimeter:</span>
                  <span className="font-mono font-bold text-orange-500">
                    {event.distanceToFacilityMeters ? `${Math.round(event.distanceToFacilityMeters)} meters` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Facility Type & Hazard Level:</span>
                  <span className="text-slate-200">
                    {event.nearestFacility ? `${event.nearestFacility.type} (${event.nearestFacility.hazardLevel} Hazard)` : 'Non-industrial'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Regulatory Compliance Zone:</span>
                  <span className="text-slate-300">{event.nearestFacility?.complianceZone || 'General Rural Zone'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Land-Cover Classification:</span>
                  <span className="text-slate-300">{event.landUseContext}</span>
                </div>
              </div>
            </div>

            {/* Representative High-Res Context Mock Imagery */}
            <div className="bg-[#020617] p-3.5 rounded border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-orange-500" />
                  Satellite Context Tile
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
                  Sentinel-2 / Esri High-Res Context
                </span>
              </div>
              <div className="relative w-full h-44 rounded-lg overflow-hidden border border-slate-800 bg-[#0f172a] flex items-center justify-center">
                {/* Visual Representation of the satellite context */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/60 to-[#020617]/95 z-10 flex flex-col justify-between p-3">
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-300">
                    <span>LAT: {event.primaryObservation.latitude.toFixed(4)}</span>
                    <span>LON: {event.primaryObservation.longitude.toFixed(4)}</span>
                  </div>
                  <div className="text-center">
                    <div className="w-8 h-8 rounded-full border-2 border-red-500 bg-red-500/30 mx-auto flex items-center justify-center animate-ping" />
                    <span className="text-xs font-bold text-orange-400 bg-[#0f172a] px-2.5 py-1 rounded border border-slate-700 mt-1 inline-block">
                      Anomaly Epicenter (+ {event.primaryObservation.frp} MW)
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Buffer: {event.nearestFacility?.footprintRadiusMeters || 500}m</span>
                    <span>Operator: {event.nearestFacility?.operator || 'Public Domain'}</span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 italic">
                * Note: Context tile visualizes surrounding plant units, roads, and buffer zone for human verification.
              </p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: HUMAN VERIFICATION TRIAGE WORKFLOW                */}
        {/* ======================================================== */}
        {activeTab === 'verify' && (
          <div className="space-y-4">
            <div className="bg-[#020617] p-3.5 rounded border border-slate-800">
              <span className="font-bold text-white block mb-2">Current Verification State</span>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2.5 py-1 rounded text-xs font-bold capitalize bg-slate-800 text-orange-500 border border-slate-700 font-mono">
                  {event.verification.state.replace(/_/g, ' ')}
                </span>
                {event.verification.verifiedBy && (
                  <span className="text-[11px] text-slate-400">
                    By: {event.verification.verifiedBy} ({new Date(event.verification.verifiedAt || '').toLocaleDateString()})
                  </span>
                )}
              </div>

              <span className="text-xs font-semibold text-slate-400 block mb-2">
                Set New Verification Status:
              </span>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => handleSaveVerification('under_investigation')}
                  className="px-3 py-2 rounded bg-[#0f172a] hover:bg-orange-950/40 border border-orange-500/40 text-orange-300 text-left font-semibold text-xs transition"
                >
                  ⏳ Mark Under Investigation
                </button>
                <button
                  onClick={() => handleSaveVerification('verified_incident')}
                  className="px-3 py-2 rounded bg-[#0f172a] hover:bg-red-950/40 border border-red-500/40 text-red-300 text-left font-semibold text-xs transition"
                >
                  🚨 Verified Industrial Incident
                </button>
                <button
                  onClick={() => handleSaveVerification('routine_operational_flare')}
                  className="px-3 py-2 rounded bg-[#0f172a] hover:bg-sky-950/40 border border-sky-500/40 text-sky-300 text-left font-semibold text-xs transition"
                >
                  🏭 Normal Operational Flare / Stack
                </button>
                <button
                  onClick={() => handleSaveVerification('false_positive')}
                  className="px-3 py-2 rounded bg-[#0f172a] hover:bg-slate-800 border border-slate-700 text-slate-300 text-left font-semibold text-xs transition"
                >
                  ❌ False Positive / Artifact
                </button>
              </div>

              {/* Dispatch Team Assignment */}
              <div className="mb-3">
                <label className="block text-slate-400 text-xs font-semibold mb-1">
                  Assign Investigation Team / District Emergency Unit
                </label>
                <input
                  type="text"
                  placeholder="e.g. State HAZMAT Unit 4, District Fire Officer"
                  value={assignedTeam}
                  onChange={(e) => setAssignedTeam(e.target.value)}
                  className="w-full bg-[#020617] border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Analyst Notes */}
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">
                  Analyst Log Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Record facility dispatch contact, CCTV cross-check notes, or shift logs..."
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  className="w-full bg-[#020617] border border-slate-800 rounded p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: AI GEOSPATIAL INTELLIGENCE BRIEFING               */}
        {/* ======================================================== */}
        {activeTab === 'ai' && (
          <div className="space-y-4">
            <div className="bg-[#020617] p-3.5 rounded border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  Operational Intelligence Brief
                </span>
                <span className="text-[10px] text-orange-500 font-mono">
                  {aiBriefResult?.source || 'Gemini 2.5 Flash'}
                </span>
              </div>

              {aiBriefResult ? (
                <div className="bg-[#0f172a] p-3.5 rounded border border-slate-800 text-slate-200 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                  {aiBriefResult.brief}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400">
                  <p>Click below to generate a real-time operational briefing grounded in model features.</p>
                  <button
                    onClick={handleGenerateAIBrief}
                    disabled={aiLoading}
                    className="mt-3 px-4 py-2 rounded bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1.5 transition shadow-lg shadow-orange-600/30"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {aiLoading ? 'Synthesizing...' : 'Generate AI Brief'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="p-3.5 border-t border-slate-800 bg-[#020617] flex items-center justify-between shrink-0">
        <div className="text-xs text-slate-400">
          Status:{' '}
          <strong className="text-white capitalize font-mono">
            {event.verification.state.replace(/_/g, ' ')}
          </strong>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('verify')}
            className="px-4 py-1.5 rounded bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition shadow-md shadow-orange-600/30"
          >
            <Shield className="w-3.5 h-3.5" />
            Triage & Verify
          </button>
        </div>
      </div>
    </div>
  );
};
