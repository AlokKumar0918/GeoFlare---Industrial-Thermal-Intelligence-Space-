/**
 * Hybrid Classification Engine for GeoFlare
 * Integrates spatial context, facility footprint proximity, thermal intensity (FRP),
 * temporal persistence patterns, and land-use features.
 */
import {
  ThermalCategory,
  ClassificationResult,
  PersistenceMetrics,
  IndustrialFacility,
  SatelliteSensor,
} from '../types';

export interface ClassifierInput {
  frp: number; // Fire Radiative Power (MW)
  brightnessTempK: number; // Kelvin
  confidence: number; // Satellite detection confidence (0-100)
  dayNight: 'D' | 'N';
  distanceToFacilityMeters: number;
  nearestFacility?: IndustrialFacility;
  persistence: PersistenceMetrics;
  landUseContext: string;
}

export function classifyThermalEvent(input: ClassifierInput): ClassificationResult {
  const {
    frp,
    brightnessTempK,
    confidence,
    dayNight,
    distanceToFacilityMeters,
    nearestFacility,
    persistence,
    landUseContext,
  } = input;

  const isNearIndustrial = distanceToFacilityMeters <= 1000;
  const isDirectlyOnFacility = distanceToFacilityMeters <= (nearestFacility?.footprintRadiusMeters || 450);
  const isPersistent = persistence.level === 'persistent';
  const isRecurring = persistence.level === 'recurring';
  const isSpiking = persistence.trend === 'spiking' || persistence.trend === 'increasing';
  const isElevatedAboveBaseline = persistence.deviationFromBaselinePercent > 80;

  let category: ThermalCategory = 'unknown';
  let categoryLabel = 'Unknown Thermal Anomaly';
  let confidencePercent = 60;
  let uncertaintyMargin = 0.2;
  let secondaryCategory: ThermalCategory | undefined;
  let secondaryConfidence: number | undefined;

  const featureAttributions: Array<{ feature: string; impact: number }> = [];

  // Decision logic modeling hybrid spatial-temporal-thermal classifier
  if (isDirectlyOnFacility || isNearIndustrial) {
    const facilityType = nearestFacility?.type || 'Petrochemical Refinery';

    if (
      facilityType === 'Petrochemical Refinery' ||
      facilityType === 'Gas Processing Terminal'
    ) {
      if (isSpiking && (frp > 120 || isElevatedAboveBaseline)) {
        category = 'possible_industrial_fire';
        categoryLabel = 'Possible Industrial Fire / Abnormal Thermal Surge';
        confidencePercent = Math.min(94, Math.round(75 + (confidence * 0.1) + (isDirectlyOnFacility ? 10 : 5)));
        uncertaintyMargin = 0.12;
        secondaryCategory = 'gas_flare';
        secondaryConfidence = 68;

        featureAttributions.push(
          { feature: 'Proximity to high-hazard petrochemical unit', impact: 0.35 },
          { feature: 'FRP surge (+ ' + persistence.deviationFromBaselinePercent + '% above baseline)', impact: 0.3 },
          { feature: 'High brightness temperature (' + brightnessTempK + ' K)', impact: 0.2 },
          { feature: 'Satellite detection confidence (' + confidence + '%)', impact: 0.15 }
        );
      } else if (isPersistent && !isSpiking) {
        category = 'gas_flare';
        categoryLabel = 'Operational Gas Flare';
        confidencePercent = Math.min(96, Math.round(80 + (persistence.observationCount > 8 ? 12 : 6)));
        uncertaintyMargin = 0.08;
        secondaryCategory = 'persistent_industrial_source';
        secondaryConfidence = 74;

        featureAttributions.push(
          { feature: 'High temporal persistence (' + persistence.observationCount + ' passes)', impact: 0.4 },
          { feature: 'Stable FRP profile (~' + persistence.historicalBaselineFrp + ' MW)', impact: 0.3 },
          { feature: 'Refinery flaring stack coordinates match', impact: 0.2 },
          { feature: 'Continuous day/night emission profile', impact: 0.1 }
        );
      } else {
        category = 'persistent_industrial_source';
        categoryLabel = 'Persistent Industrial Thermal Source';
        confidencePercent = 84;
        uncertaintyMargin = 0.14;
        secondaryCategory = 'possible_industrial_fire';
        secondaryConfidence = 55;

        featureAttributions.push(
          { feature: 'Industrial facility boundary envelope', impact: 0.4 },
          { feature: 'Recurrent thermal detection pattern', impact: 0.3 },
          { feature: 'Moderate localized FRP emission', impact: 0.2 },
          { feature: 'Industrial land-use zoning context', impact: 0.1 }
        );
      }
    } else if (
      facilityType === 'Coal Thermal Power Plant' ||
      facilityType === 'Integrated Steel Smelter' ||
      facilityType === 'Cement & Lime Kiln'
    ) {
      if (isSpiking && frp > 150) {
        category = 'possible_industrial_fire';
        categoryLabel = 'Possible Industrial Fire / Thermal Outlier';
        confidencePercent = 86;
        uncertaintyMargin = 0.15;
        secondaryCategory = 'persistent_industrial_source';
        secondaryConfidence = 64;

        featureAttributions.push(
          { feature: 'Extreme FRP spike at industrial plant', impact: 0.4 },
          { feature: 'Deviation from continuous operational baseline', impact: 0.3 },
          { feature: 'Thermal power / metallurgical plant perimeter', impact: 0.2 },
          { feature: 'Satellite sensor spatial accuracy', impact: 0.1 }
        );
      } else {
        category = 'persistent_industrial_source';
        categoryLabel = 'Persistent Industrial Thermal Source (Stack/Kiln/Furnace)';
        confidencePercent = 91;
        uncertaintyMargin = 0.1;
        secondaryCategory = 'gas_flare';
        secondaryConfidence = 42;

        featureAttributions.push(
          { feature: 'Permanent metallurgical/combustion infrastructure', impact: 0.45 },
          { feature: 'High temporal persistence (' + persistence.detectionDays + ' distinct days)', impact: 0.35 },
          { feature: 'Moderate thermal intensity matching furnace output', impact: 0.2 }
        );
      }
    } else if (facilityType === 'Open-Cast Mining & Smelting') {
      category = 'mining_extraction';
      categoryLabel = 'Mining / Extraction Thermal Activity';
      confidencePercent = 88;
      uncertaintyMargin = 0.12;
      secondaryCategory = 'persistent_industrial_source';
      secondaryConfidence = 60;

      featureAttributions.push(
        { feature: 'Open-cast coal/mineral extraction zone', impact: 0.45 },
        { feature: 'Intermittent coal seam / overburden heating', impact: 0.35 },
        { feature: 'Spatial cluster correlation', impact: 0.2 }
      );
    } else {
      // Chemical & Pharma Synthesis, SEZ, etc.
      if (frp > 45 || isSpiking) {
        category = 'possible_industrial_fire';
        categoryLabel = 'Possible Industrial Fire / Chemical Plant Anomaly';
        confidencePercent = 83;
        uncertaintyMargin = 0.16;
        secondaryCategory = 'persistent_industrial_source';
        secondaryConfidence = 52;

        featureAttributions.push(
          { feature: 'High-hazard chemical synthesis zone', impact: 0.4 },
          { feature: 'Unexpected thermal emission above nil baseline', impact: 0.35 },
          { feature: 'Industrial zone proximity (< ' + Math.round(distanceToFacilityMeters) + 'm)', impact: 0.25 }
        );
      } else {
        category = 'persistent_industrial_source';
        categoryLabel = 'Persistent Industrial Thermal Source';
        confidencePercent = 78;
        uncertaintyMargin = 0.18;
      }
    }
  } else if (
    landUseContext.toLowerCase().includes('flare') ||
    landUseContext.toLowerCase().includes('refinery') ||
    landUseContext.toLowerCase().includes('petrochem') ||
    landUseContext.toLowerCase().includes('hydrocarbon') ||
    landUseContext.toLowerCase().includes('coking') ||
    landUseContext.toLowerCase().includes('metallurg')
  ) {
    if (isSpiking && (frp > 110 || isElevatedAboveBaseline)) {
      category = 'possible_industrial_fire';
      categoryLabel = 'Potential Industrial Fire';
      confidencePercent = Math.min(94, Math.round(78 + (confidence * 0.1)));
      uncertaintyMargin = 0.12;
      secondaryCategory = 'gas_flare';
      secondaryConfidence = 66;
      featureAttributions.push(
        { feature: 'High-intensity thermal surge in hydrocarbon corridor', impact: 0.4 },
        { feature: 'FRP elevated above historical baseline', impact: 0.35 },
        { feature: 'Satellite thermal detection confidence', impact: 0.25 }
      );
    } else if (isPersistent) {
      category = 'persistent_industrial_source';
      categoryLabel = 'Persistent Industrial Thermal Source';
      confidencePercent = 90;
      uncertaintyMargin = 0.1;
      secondaryCategory = 'gas_flare';
      secondaryConfidence = 75;
      featureAttributions.push(
        { feature: 'High temporal persistence across orbital passes', impact: 0.45 },
        { feature: 'Industrial hydrocarbon/refinery emission profile', impact: 0.35 },
        { feature: 'Continuous day/night thermal detection', impact: 0.2 }
      );
    } else {
      category = 'persistent_industrial_source';
      categoryLabel = 'Persistent Industrial Thermal Source';
      confidencePercent = 82;
      uncertaintyMargin = 0.15;
      secondaryCategory = 'unknown';
      secondaryConfidence = 45;
    }
  } else if (landUseContext.toLowerCase().includes('cropland') || landUseContext.toLowerCase().includes('agricultural')) {
    category = 'agricultural_burning';
    categoryLabel = 'Agricultural Burning';
    confidencePercent = Math.min(95, Math.round(82 + (frp < 60 ? 8 : 2)));
    uncertaintyMargin = 0.1;
    secondaryCategory = 'forest_natural';
    secondaryConfidence = 35;

    featureAttributions.push(
      { feature: 'Intensive cropland / agricultural land cover', impact: 0.5 },
      { feature: 'Transient single/low-recurrence profile', impact: 0.25 },
      { feature: 'Diffuse spatial pattern & moderate FRP (' + frp + ' MW)', impact: 0.25 }
    );
  } else if (
    landUseContext.toLowerCase().includes('forest') ||
    landUseContext.toLowerCase().includes('woodland') ||
    landUseContext.toLowerCase().includes('wildland') ||
    landUseContext.toLowerCase().includes('wildfire')
  ) {
    category = 'forest_natural';
    categoryLabel = 'Vegetation / Wildfire Context';
    confidencePercent = 89;
    uncertaintyMargin = 0.12;
    secondaryCategory = 'agricultural_burning';
    secondaryConfidence = 40;

    featureAttributions.push(
      { feature: 'Dense forest canopy / wildland zone', impact: 0.55 },
      { feature: 'Spatial distance from industrial facilities', impact: 0.3 },
      { feature: 'Thermal dispersion signature', impact: 0.15 }
    );
  } else if (landUseContext.toLowerCase().includes('mining') || landUseContext.toLowerCase().includes('quarry')) {
    category = 'mining_extraction';
    categoryLabel = 'Mining / Extraction';
    confidencePercent = 87;
    uncertaintyMargin = 0.13;
    secondaryCategory = 'persistent_industrial_source';
    secondaryConfidence = 50;

    featureAttributions.push(
      { feature: 'Mining leasehold boundary', impact: 0.5 },
      { feature: 'Spontaneous combustion in coal/ore stockyard', impact: 0.3 },
      { feature: 'Satellite thermal observation density', impact: 0.2 }
    );
  } else {
    category = 'unknown';
    categoryLabel = 'Unknown / Insufficient Evidence';
    confidencePercent = 52;
    uncertaintyMargin = 0.28;
    secondaryCategory = 'agricultural_burning';
    secondaryConfidence = 40;

    featureAttributions.push(
      { feature: 'Ambiguous land-use signature without industrial anchor', impact: 0.45 },
      { feature: 'Single or uncorroborated satellite overpass', impact: 0.35 },
      { feature: 'Requires additional orbital passes for confirmation', impact: 0.2 }
    );
  }

  return {
    category,
    categoryLabel,
    confidencePercent,
    uncertaintyMargin,
    secondaryCategory,
    secondaryConfidence,
    method: 'hybrid_spatial_temporal_rf',
    featureAttributions,
  };
}
