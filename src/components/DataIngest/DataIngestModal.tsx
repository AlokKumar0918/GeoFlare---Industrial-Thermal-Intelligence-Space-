import React, { useState } from 'react';
import { X, UploadCloud, CheckCircle, AlertTriangle, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { ThermalEvent } from '../../types';
import { apiClient } from '../../services/apiClient';
import { FirmsCsvParseResult } from '../../services/firmsParser';

const SAMPLE_GLOBAL_CSV = `latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,confidence,version,bright_t31,frp,daynight
22.3872,69.8345,378.4,0.75,0.75,2026-08-24,0230,N,96,2.0NRT,298.2,184.5,N
29.7604,-95.3698,362.5,0.75,0.75,2026-08-24,0420,N,94,2.0NRT,295.0,142.0,N
-12.9714,-51.5833,338.2,0.80,0.75,2026-08-24,1710,N,85,2.0NRT,293.4,48.6,D
-20.7256,116.8465,370.1,0.75,0.75,2026-08-24,1530,N,91,2.0NRT,296.8,110.2,N
4.8396,6.0427,381.0,0.75,0.75,2026-08-24,0115,N,98,2.0NRT,299.1,195.4,N
48.8566,2.3522,320.4,0.75,0.75,2026-08-24,1130,N,70,2.0NRT,289.0,12.5,D`;

const SAMPLE_INDIA_CSV = `latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,confidence,version,bright_t31,frp,daynight
22.3872,69.8345,378.4,0.75,0.75,2026-08-24,0230,N,96,2.0NRT,298.2,184.5,N
22.3845,69.8322,364.1,0.80,0.78,2026-08-24,1415,N,92,2.0NRT,295.1,120.3,D
21.6210,73.0120,332.0,0.75,0.75,2026-08-24,0310,N,88,2.0NRT,292.0,38.2,N
22.3592,82.7481,345.8,0.75,0.75,2026-08-24,0150,N,94,2.0NRT,294.5,65.4,N
30.8800,75.8500,318.5,0.75,0.75,2026-08-24,0730,N,72,2.0NRT,290.1,14.8,D`;

interface DataIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngestCustomData: (parsedEvents: ThermalEvent[]) => void;
  onLoadScenario: (scenarioKey: string) => void;
}

export const DataIngestModal: React.FC<DataIngestModalProps> = ({
  isOpen,
  onClose,
  onIngestCustomData,
  onLoadScenario,
}) => {
  if (!isOpen) return null;

  const [csvText, setCsvText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<FirmsCsvParseResult | null>(null);

  const handleProcessCsv = async () => {
    if (!csvText.trim()) {
      setErrorMessage('Please paste NASA FIRMS CSV data before running pipeline.');
      setSummary(null);
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSummary(null);

    try {
      const result = await apiClient.ingestFirmsCsv(csvText);

      if (!result.success || !result.data || result.data.length === 0) {
        setErrorMessage(result.error || 'Failed to ingest CSV: No valid thermal observations could be parsed.');
        setIsProcessing(false);
        return;
      }

      // Update application state with real parsed events
      onIngestCustomData(result.data);
      setSummary(result);
    } catch (err: any) {
      setErrorMessage(`Ingestion error: ${err.message || 'Unknown network or parsing error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinishAndClose = () => {
    setSummary(null);
    setErrorMessage(null);
    setCsvText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl max-w-2xl w-full p-4 sm:p-6 text-slate-300 shadow-2xl space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto my-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-500 shrink-0">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">Satellite Data Ingestion & Demo Scenarios</h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Import custom NASA FIRMS CSV observations or test calibrated industrial scenarios.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scenarios Preset Selection */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Preloaded Industrial Scenarios (Operational Verification)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => {
                onLoadScenario('jamnagar_surge');
                onClose();
              }}
              className="p-3 rounded-lg bg-[#020617] hover:bg-slate-800/80 border border-slate-800 hover:border-orange-500/40 text-left transition"
            >
              <div className="font-bold text-xs text-red-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>Scenario A: Jamnagar Acute Flare Outlier</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Refinery surge +260% over 28 MW baseline triggering Critical priority.
              </p>
            </button>

            <button
              onClick={() => {
                onLoadScenario('ankleshwar_chemical');
                onClose();
              }}
              className="p-3 rounded-lg bg-[#020617] hover:bg-slate-800/80 border border-slate-800 hover:border-orange-500/40 text-left transition"
            >
              <div className="font-bold text-xs text-orange-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>Scenario B: Ankleshwar Chemical Anomaly</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Hazardous solvent storage uncontained thermal rise without baseline.
              </p>
            </button>

            <button
              onClick={() => {
                onLoadScenario('persistent_flaring');
                onClose();
              }}
              className="p-3 rounded-lg bg-[#020617] hover:bg-slate-800/80 border border-slate-800 hover:border-orange-500/40 text-left transition"
            >
              <div className="font-bold text-xs text-sky-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Scenario C: Steady Permitted Flaring</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Persistent 8-pass stable flare stack categorized as operational flare.
              </p>
            </button>

            <button
              onClick={() => {
                onLoadScenario('agri_filtering');
                onClose();
              }}
              className="p-3 rounded-lg bg-[#020617] hover:bg-slate-800/80 border border-slate-800 hover:border-orange-500/40 text-left transition"
            >
              <div className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Scenario D: Agricultural Stubble Rejection</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Punjab cropland stubble filtered out to avoid false industrial alarm.
              </p>
            </button>
          </div>
        </div>

        {/* Custom FIRMS CSV Ingestion Form */}
        <div className="space-y-2 border-t border-slate-800 pt-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-300">
              Paste NASA FIRMS CSV Data (VIIRS / MODIS format)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCsvText(SAMPLE_GLOBAL_CSV);
                  setErrorMessage(null);
                  setSummary(null);
                }}
                className="text-[10px] text-orange-400 hover:text-orange-300 underline font-mono"
              >
                Insert Sample Global CSV
              </button>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                onClick={() => {
                  setCsvText(SAMPLE_INDIA_CSV);
                  setErrorMessage(null);
                  setSummary(null);
                }}
                className="text-[10px] text-sky-400 hover:text-sky-300 underline font-mono"
              >
                Insert Sample India CSV
              </button>
            </div>
          </div>

          <textarea
            rows={4}
            placeholder="latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,confidence,version,bright_t31,frp,daynight&#10;22.3872,69.8345,378.4,0.75,0.75,2026-08-24,0230,N,96,2.0NRT,298.2,184.5,N"
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            disabled={isProcessing}
            className="w-full bg-[#020617] border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-orange-500 disabled:opacity-50"
          />

          {/* Actual Error Message */}
          {errorMessage && (
            <div className="text-xs text-rose-400 font-medium bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/30 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Ingestion Failed</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Real Ingestion Summary & Confirmation (Requirement 14) */}
          {summary && (
            <div className="bg-[#020617] border border-emerald-500/40 rounded-lg p-3 space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Successfully ingested and clustered into spatial pipeline!</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                <div className="bg-slate-900/90 border border-slate-800 p-2 rounded">
                  <span className="text-slate-500 text-[9px] block uppercase font-sans">OBSERVATIONS ACCEPTED</span>
                  <span className="text-emerald-400 font-bold text-sm">{summary.observationsAccepted}</span>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 p-2 rounded">
                  <span className="text-slate-500 text-[9px] block uppercase font-sans">OBSERVATIONS REJECTED</span>
                  <span className={summary.observationsRejected > 0 ? 'text-amber-400 font-bold text-sm' : 'text-slate-400 font-bold text-sm'}>
                    {summary.observationsRejected}
                  </span>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 p-2 rounded">
                  <span className="text-slate-500 text-[9px] block uppercase font-sans">EVENTS CREATED</span>
                  <span className="text-orange-400 font-bold text-sm">{summary.eventsCreated}</span>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 p-2 rounded">
                  <span className="text-slate-500 text-[9px] block uppercase font-sans">DATA MODE</span>
                  <span className="text-orange-400 font-bold text-sm">UPLOAD</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono px-1">
                <span>Spatial Distribution:</span>
                <span className="text-sky-300">
                  {summary.indiaObservations} India &bull; {summary.globalObservations} Global
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <span className="text-[11px] text-slate-500">
            Data is strictly ingested through spatial-temporal verification pipeline.
          </span>
          <div className="flex items-center justify-end gap-2">
            {summary ? (
              <button
                onClick={handleFinishAndClose}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition min-h-[38px] flex items-center gap-1.5"
              >
                <span>View On Map</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  onClick={onClose}
                  disabled={isProcessing}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium min-h-[38px] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProcessCsv}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition min-h-[38px] flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Ingest & Run Pipeline</span>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
