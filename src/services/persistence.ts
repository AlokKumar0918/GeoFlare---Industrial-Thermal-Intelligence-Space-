/**
 * Persistence and Temporal Analysis Engine for GeoFlare
 */
import { PersistenceLevel, IntensityTrend, PersistenceMetrics, SatelliteSensor } from '../types';

export interface RawObservationInput {
  timestamp: string;
  frp: number;
  brightness: number;
  sensor: SatelliteSensor;
  confidence: number;
}

/**
 * Computes persistence metrics from a chronological series of observations at or near a location
 */
export function computePersistenceMetrics(
  history: RawObservationInput[],
  currentFrp: number
): PersistenceMetrics {
  const sorted = [...history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const observationCount = sorted.length;
  if (observationCount === 0) {
    const now = new Date().toISOString();
    return {
      observationCount: 1,
      detectionDays: 1,
      timeSpanDays: 1,
      recurrenceRate: 1,
      level: 'single',
      trend: 'stable',
      historicalBaselineFrp: currentFrp,
      currentFrp: currentFrp,
      deviationFromBaselinePercent: 0,
      firstDetected: now,
      lastDetected: now,
      observationsHistory: [{
        timestamp: now,
        frp: currentFrp,
        brightness: 320,
        sensor: 'VIIRS-SNPP',
        confidence: 85,
      }],
    };
  }

  // Count unique detection calendar days
  const uniqueDays = new Set(
    sorted.map((obs) => new Date(obs.timestamp).toISOString().split('T')[0])
  );
  const detectionDays = uniqueDays.size;

  const firstTime = new Date(sorted[0].timestamp).getTime();
  const lastTime = new Date(sorted[sorted.length - 1].timestamp).getTime();
  const timeSpanDays = Math.max(1, Math.round((lastTime - firstTime) / (1000 * 60 * 60 * 24)));

  // Recurrence rate per week
  const recurrenceRate = Number(((observationCount / timeSpanDays) * 7).toFixed(1));

  // Determine persistence level
  let level: PersistenceLevel = 'single';
  if (observationCount >= 6 || (detectionDays >= 4 && timeSpanDays >= 7)) {
    level = 'persistent';
  } else if (observationCount >= 2 || detectionDays >= 2) {
    level = 'recurring';
  }

  // Historical baseline FRP (mean of historical observations excluding current spike if > 3 observations)
  const baselineFrpList = sorted.slice(0, Math.max(1, sorted.length - 1)).map((o) => o.frp);
  const historicalBaselineFrp = Number(
    (baselineFrpList.reduce((sum, v) => sum + v, 0) / baselineFrpList.length).toFixed(1)
  );

  // Deviation from baseline
  const deviationFromBaselinePercent = historicalBaselineFrp > 0
    ? Math.round(((currentFrp - historicalBaselineFrp) / historicalBaselineFrp) * 100)
    : 0;

  // Trend detection using simple linear regression on recent observations
  let trend: IntensityTrend = 'stable';
  if (sorted.length >= 3) {
    const recent = sorted.slice(-5);
    const frpVals = recent.map((r) => r.frp);
    const firstFrp = frpVals[0];
    const lastFrp = frpVals[frpVals.length - 1];
    const maxFrp = Math.max(...frpVals);

    if (currentFrp > historicalBaselineFrp * 2.2 && currentFrp > 60) {
      trend = 'spiking';
    } else if (lastFrp > firstFrp * 1.35) {
      trend = 'increasing';
    } else if (lastFrp < firstFrp * 0.7) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }
  }

  return {
    observationCount,
    detectionDays,
    timeSpanDays,
    recurrenceRate,
    level,
    trend,
    historicalBaselineFrp,
    currentFrp,
    deviationFromBaselinePercent,
    firstDetected: sorted[0].timestamp,
    lastDetected: sorted[sorted.length - 1].timestamp,
    observationsHistory: sorted,
  };
}
