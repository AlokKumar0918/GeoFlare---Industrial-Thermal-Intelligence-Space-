/**
 * Explainable Investigation Priority Score Engine for GeoFlare
 * Computes transparent 0-100 priority scores with exact mathematical contributing factors
 * and rule-grounded natural language explanations for human verification triage.
 */
import {
  ClassificationResult,
  IndustrialFacility,
  InvestigationPriority,
  PersistenceMetrics,
  PriorityTier,
  ScoreContributor,
  ThermalObservation,
} from '../types';

export interface PrioritizationInput {
  observation: ThermalObservation;
  nearestFacility?: IndustrialFacility;
  distanceToFacilityMeters: number;
  persistence: PersistenceMetrics;
  classification: ClassificationResult;
}

export function calculateInvestigationPriority(input: PrioritizationInput): InvestigationPriority {
  const {
    observation,
    nearestFacility,
    distanceToFacilityMeters,
    persistence,
    classification,
  } = input;

  const contributors: ScoreContributor[] = [];
  const whyImportant: string[] = [];

  let rawScore = 0;

  // 1. Industrial Proximity & Facility Hazard Weight (Up to 30 pts)
  if (distanceToFacilityMeters !== undefined && !isNaN(distanceToFacilityMeters)) {
    if (distanceToFacilityMeters <= 500) {
      const pts = nearestFacility?.hazardLevel === 'Severe' ? 30 : nearestFacility?.hazardLevel === 'High' ? 26 : 22;
      rawScore += pts;
      contributors.push({
        factor: 'Industrial Proximity & High-Hazard Zone',
        points: pts,
        description: `Within ${Math.round(distanceToFacilityMeters)}m of ${nearestFacility?.name || 'industrial facility'} (${nearestFacility?.hazardLevel || 'High'} hazard)`,
      });
      whyImportant.push(
        `Located within ${Math.round(distanceToFacilityMeters)} m of ${nearestFacility?.name} (${nearestFacility?.type})`
      );
    } else if (distanceToFacilityMeters <= 1200) {
      const pts = 18;
      rawScore += pts;
      contributors.push({
        factor: 'Industrial Perimeter Vicinity',
        points: pts,
        description: `Within ${Math.round(distanceToFacilityMeters)}m of ${nearestFacility?.name}`,
      });
      whyImportant.push(
        `Located in industrial buffer zone (${(distanceToFacilityMeters / 1000).toFixed(1)} km from ${nearestFacility?.name})`
      );
    } else if (distanceToFacilityMeters <= 2500) {
      const pts = 8;
      rawScore += pts;
      contributors.push({
        factor: 'Regional Industrial Corridor',
        points: pts,
        description: `Within ${(distanceToFacilityMeters / 1000).toFixed(1)}km of industrial infrastructure`,
      });
    } else {
      // Non-industrial background
      whyImportant.push(
        `Isolated from industrial infrastructure (${(distanceToFacilityMeters / 1000).toFixed(1)} km away)`
      );
    }
  } else {
    whyImportant.push('Isolated from monitored industrial infrastructure');
  }

  // 2. Persistence & Recurrence Patterns (Up to 25 pts)
  if (persistence.level === 'persistent') {
    const pts = 24;
    rawScore += pts;
    contributors.push({
      factor: 'High Persistence & Repeated Detection',
      points: pts,
      description: `Detected in ${persistence.observationCount} passes across ${persistence.detectionDays} unique days`,
    });
    whyImportant.push(
      `Persistent thermal footprint detected across ${persistence.observationCount} satellite overpasses`
    );
  } else if (persistence.level === 'recurring') {
    const pts = 15;
    rawScore += pts;
    contributors.push({
      factor: 'Recurring Thermal Signature',
      points: pts,
      description: `Observed ${persistence.observationCount} times in last ${persistence.timeSpanDays} days`,
    });
    whyImportant.push(
      `Recurring thermal signature (${persistence.observationCount} observations recorded)`
    );
  } else {
    // Single observation
    if (classification.category === 'possible_industrial_fire') {
      const pts = 12;
      rawScore += pts;
      contributors.push({
        factor: 'Acute Sudden Onset',
        points: pts,
        description: 'New unobserved thermal anomaly at industrial location',
      });
      whyImportant.push('Acute sudden onset without prior persistent baseline at this exact point');
    }
  }

  // 3. Thermal Intensity (FRP) and Baseline Deviation (Up to 25 pts)
  if (persistence.deviationFromBaselinePercent > 100 && observation.frp > 50) {
    const pts = 23;
    rawScore += pts;
    contributors.push({
      factor: 'Abnormal Intensity Surge vs Baseline',
      points: pts,
      description: `FRP ${observation.frp} MW is +${persistence.deviationFromBaselinePercent}% above local baseline (${persistence.historicalBaselineFrp} MW)`,
    });
    whyImportant.push(
      `Thermal intensity (${observation.frp} MW FRP) exceeds local historical baseline by +${persistence.deviationFromBaselinePercent}%`
    );
  } else if (observation.frp >= 100) {
    const pts = 18;
    rawScore += pts;
    contributors.push({
      factor: 'Elevated Fire Radiative Power (FRP)',
      points: pts,
      description: `High thermal output: ${observation.frp} MW`,
    });
    whyImportant.push(`High thermal radiative power (${observation.frp} MW FRP)`);
  } else if (observation.frp >= 35) {
    const pts = 10;
    rawScore += pts;
    contributors.push({
      factor: 'Moderate Thermal Radiative Power',
      points: pts,
      description: `Thermal output: ${observation.frp} MW`,
    });
  }

  // 4. Intensity Trend (Up to 10 pts)
  if (persistence.trend === 'spiking') {
    const pts = 10;
    rawScore += pts;
    contributors.push({
      factor: 'Rapid Intensity Escalation',
      points: pts,
      description: 'Thermal curve indicates sudden spike / accelerating radiative flux',
    });
    whyImportant.push('Temporal trend shows sharp accelerating thermal spike');
  } else if (persistence.trend === 'increasing') {
    const pts = 6;
    rawScore += pts;
    contributors.push({
      factor: 'Upward Thermal Trend',
      points: pts,
      description: 'Progressively increasing thermal radiative energy over recent passes',
    });
    whyImportant.push('Recent passes show steady thermal intensification');
  }

  // 5. Detection Confidence & Sensor Quality (Up to 10 pts)
  const confPoints = Math.round((observation.confidence / 100) * 10);
  rawScore += confPoints;
  contributors.push({
    factor: 'Satellite Detection Confidence',
    points: confPoints,
    description: `${observation.satellite} orbital sensor confidence rating of ${observation.confidence}%`,
  });
  if (observation.confidence >= 85) {
    whyImportant.push(`High orbital detection confidence (${observation.confidence}%) from ${observation.satellite}`);
  }

  // Adjust score based on classification category:
  // e.g., routine agricultural burning or operational flare receives appropriate triage adjustment
  if (classification.category === 'agricultural_burning') {
    rawScore = Math.min(42, Math.round(rawScore * 0.45));
    whyImportant.push('Classified as seasonal agricultural residue burning (low industrial emergency priority)');
  } else if (classification.category === 'gas_flare' && persistence.trend === 'stable') {
    rawScore = Math.min(58, Math.round(rawScore * 0.7));
    whyImportant.push('Thermal pattern matches continuous permitted flare stack baseline');
  } else if (classification.category === 'forest_natural') {
    rawScore = Math.min(48, Math.round(rawScore * 0.5));
    whyImportant.push('Located in rural/wildland biomass sector; routed to forestry triage');
  }

  // Clamp score 0 - 100
  const finalScore = Math.max(5, Math.min(98, Math.round(rawScore)));

  // Tier determination
  let tier: PriorityTier = 'Low';
  if (finalScore >= 76) tier = 'Critical';
  else if (finalScore >= 51) tier = 'High';
  else if (finalScore >= 26) tier = 'Moderate';
  else tier = 'Low';

  // Recommended verification action based on tier & category
  let recommendedAction = 'Continue routine regional satellite monitoring.';
  if (tier === 'Critical') {
    recommendedAction = `Immediate dispatch priority: Request facility-side perimeter verification at ${nearestFacility?.name || 'target coordinates'}, inspect live CCTV/thermal telemetry, and notify state regulatory control room.`;
  } else if (tier === 'High') {
    recommendedAction = `Priority investigation: Cross-reference facility shift flaring logs with ${nearestFacility?.name || 'operator'} and schedule drone/ground verification if unexplained.`;
  } else if (tier === 'Moderate') {
    recommendedAction = 'Track across next orbital overpass to monitor if thermal emission persists or stabilizes against operational baseline.';
  } else {
    recommendedAction = 'Low priority background observation. Log in historical database for seasonal trend modeling.';
  }

  // Estimate false alarm probability for human decision support
  let falseAlarmRisk = 12;
  if (observation.confidence < 70) falseAlarmRisk += 25;
  if (distanceToFacilityMeters > 3000 && classification.category === 'unknown') falseAlarmRisk += 30;
  if (observation.frp < 15) falseAlarmRisk += 15;
  falseAlarmRisk = Math.min(85, Math.max(5, falseAlarmRisk));

  return {
    score: finalScore,
    tier,
    contributors,
    whyImportant,
    recommendedAction,
    falseAlarmRisk,
  };
}
