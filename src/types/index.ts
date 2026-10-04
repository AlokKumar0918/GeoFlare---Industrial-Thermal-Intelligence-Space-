/**
 * GeoFlare - Core Type Definitions
 * Industrial Thermal Intelligence & Persistent Source Monitoring
 */

export type SatelliteSensor = 'VIIRS-SNPP' | 'VIIRS-NOAA20' | 'MODIS-Aqua' | 'MODIS-Terra' | 'Sentinel-2-MSI';

export type ThermalCategory =
  | 'possible_industrial_fire'
  | 'persistent_industrial_source'
  | 'gas_flare'
  | 'agricultural_burning'
  | 'forest_natural'
  | 'mining_extraction'
  | 'unknown';

export type PersistenceLevel = 'single' | 'recurring' | 'persistent';

export type IntensityTrend = 'increasing' | 'stable' | 'decreasing' | 'spiking';

export type PriorityTier = 'Low' | 'Moderate' | 'High' | 'Critical';

export type FacilityType =
  | 'Petrochemical Refinery'
  | 'Coal Thermal Power Plant'
  | 'Integrated Steel Smelter'
  | 'Gas Processing Terminal'
  | 'Chemical & Pharma Synthesis'
  | 'Fertilizer Complex'
  | 'Cement & Lime Kiln'
  | 'Open-Cast Mining & Smelting'
  | 'Special Economic Zone / GIDC';

export type VerificationState =
  | 'unreviewed'
  | 'under_investigation'
  | 'verified_incident'
  | 'routine_operational_flare'
  | 'agricultural_controlled'
  | 'false_positive';

export interface ScoreContributor {
  factor: string;
  points: number;
  description: string;
}

export interface InvestigationPriority {
  score: number; // 0 - 100
  tier: PriorityTier;
  contributors: ScoreContributor[];
  whyImportant: string[];
  recommendedAction: string;
  falseAlarmRisk: number; // 0 - 100%
}

export interface PersistenceMetrics {
  observationCount: number;
  detectionDays: number;
  timeSpanDays: number;
  recurrenceRate: number; // detections per week
  level: PersistenceLevel;
  trend: IntensityTrend;
  historicalBaselineFrp: number; // MW
  currentFrp: number; // MW
  deviationFromBaselinePercent: number; // e.g. +140%
  firstDetected: string;
  lastDetected: string;
  observationsHistory: Array<{
    timestamp: string;
    frp: number;
    brightness: number;
    sensor: SatelliteSensor;
    confidence: number;
  }>;
}

export interface ClassificationResult {
  category: ThermalCategory;
  categoryLabel: string;
  confidencePercent: number;
  uncertaintyMargin: number;
  secondaryCategory?: ThermalCategory;
  secondaryConfidence?: number;
  method: 'hybrid_spatial_temporal_rf' | 'rule_grounded_heuristic' | 'deep_ensemble';
  featureAttributions: Array<{ feature: string; impact: number }>;
}

export interface IndustrialFacility {
  id: string;
  name: string;
  type: FacilityType;
  hazardLevel: 'High' | 'Severe' | 'Moderate' | 'Low';
  latitude: number;
  longitude: number;
  footprintRadiusMeters: number;
  state: string;
  district: string;
  operator: string;
  expectedBaselineFlares: number;
  emergencyContact: string;
  complianceZone: string;
}

export interface ThermalObservation {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  satellite: SatelliteSensor;
  frp: number; // Fire Radiative Power in MW
  brightnessTempK: number; // Kelvin
  confidence: number; // 0 - 100%
  scan: number;
  track: number;
  dayNight: 'D' | 'N';
  dataSource: 'NASA_FIRMS_VIIRS' | 'NASA_FIRMS_MODIS' | 'DEMO_SYNTHETIC' | 'USER_UPLOAD';
}

export interface ThermalEvent {
  id: string;
  country?: string;
  primaryObservation: ThermalObservation;
  nearestFacility?: IndustrialFacility;
  distanceToFacilityMeters?: number;
  landUseContext: string;
  persistence: PersistenceMetrics;
  classification: ClassificationResult;
  priority: InvestigationPriority;
  verification: {
    state: VerificationState;
    verifiedBy?: string;
    verifiedAt?: string;
    notes?: string;
    assignedTeam?: string;
  };
  region: string;
  satelliteContextImageUrl?: string;
}

export interface ThermalAlert {
  id: string;
  eventId: string;
  title: string;
  severity: PriorityTier;
  facilityName?: string;
  region: string;
  timestamp: string;
  classificationLabel: string;
  priorityScore: number;
  persistenceLevel: PersistenceLevel;
  summaryReason: string;
  recommendedAction: string;
  status: 'active' | 'acknowledged' | 'dispatched' | 'resolved';
}

export interface FilterState {
  sourceType: string;
  riskTier: string;
  persistence: string;
  minConfidence: number;
  minFrp: number;
  industrialProximity: string; // 'all' | '500m' | '1000m' | '2500m'
  region: string;
  dateRange: '24h' | '7d' | '30d' | 'all';
  searchQuery: string;
  dataSourceMode: 'demo' | 'live' | 'upload';
}

export interface AnalyticsSummary {
  totalObservations: number;
  industrialAssociated: number;
  persistentSources: number;
  highOrCriticalPriority: number;
  manualScreeningReductionPercent: number;
  classificationBreakdown: Record<ThermalCategory, number>;
  regionalBreakdown: Array<{ region: string; count: number; highPriorityCount: number }>;
  timeSeries: Array<{
    date: string;
    industrialCount: number;
    agriculturalCount: number;
    naturalCount: number;
    flaresCount: number;
    avgFrp: number;
  }>;
  persistenceBreakdown: {
    single: number;
    recurring: number;
    persistent: number;
  };
  priorityBreakdown: {
    low: number;
    moderate: number;
    high: number;
    critical: number;
  };
}
