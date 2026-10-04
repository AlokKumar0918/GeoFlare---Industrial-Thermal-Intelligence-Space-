/**
 * Comprehensive Dataset & Spatial Database Seed for GeoFlare
 * Grounded in key Indian industrial corridors and satellite detection scenarios.
 */
import {
  IndustrialFacility,
  ThermalEvent,
  ThermalObservation,
  ThermalAlert,
  AnalyticsSummary,
} from '../types';
import { findNearestFacility } from './spatial';
import { computePersistenceMetrics } from './persistence';
import { classifyThermalEvent } from './classifier';
import { calculateInvestigationPriority } from './prioritization';

export const INDIAN_INDUSTRIAL_FACILITIES: IndustrialFacility[] = [
  {
    id: 'FAC-GJ-001',
    name: 'Jamnagar Petrochemical & Refining Complex',
    type: 'Petrochemical Refinery',
    hazardLevel: 'Severe',
    latitude: 22.3845,
    longitude: 69.8322,
    footprintRadiusMeters: 1800,
    state: 'Gujarat',
    district: 'Jamnagar',
    operator: 'Reliance Industries / Nayara Energy',
    expectedBaselineFlares: 8,
    emergencyContact: '+91-288-240100',
    complianceZone: 'Coastal Hazardous Chemical Zone-A',
  },
  {
    id: 'FAC-CG-002',
    name: 'Korba Super Thermal Power & Aluminum Smelter',
    type: 'Coal Thermal Power Plant',
    hazardLevel: 'High',
    latitude: 22.3592,
    longitude: 82.7481,
    footprintRadiusMeters: 1400,
    state: 'Chhattisgarh',
    district: 'Korba',
    operator: 'NTPC Ltd. / BALCO Vedanta',
    expectedBaselineFlares: 2,
    emergencyContact: '+91-7759-224400',
    complianceZone: 'Critically Polluted Industrial Cluster (CEPI)',
  },
  {
    id: 'FAC-AP-003',
    name: 'Visakhapatnam Steel Plant & Pharma SEZ',
    type: 'Integrated Steel Smelter',
    hazardLevel: 'Severe',
    latitude: 17.6328,
    longitude: 83.1895,
    footprintRadiusMeters: 1600,
    state: 'Andhra Pradesh',
    district: 'Visakhapatnam',
    operator: 'Rashtriya Ispat Nigam Ltd (RINL)',
    expectedBaselineFlares: 4,
    emergencyContact: '+91-891-2518200',
    complianceZone: 'Coastal Industrial Heavy Metallurgical Corridor',
  },
  {
    id: 'FAC-MP-004',
    name: 'Singrauli Thermal Power Hub & Coal Mines',
    type: 'Open-Cast Mining & Smelting',
    hazardLevel: 'High',
    latitude: 24.1205,
    longitude: 82.6842,
    footprintRadiusMeters: 2200,
    state: 'Madhya Pradesh',
    district: 'Singrauli',
    operator: 'NCL Coal India / NTPC Shaktinagar',
    expectedBaselineFlares: 1,
    emergencyContact: '+91-7805-256100',
    complianceZone: 'National Coal Energy Reserve & Emission Zone',
  },
  {
    id: 'FAC-TN-005',
    name: 'Manali Petrochemicals & Fertilizer Corridor',
    type: 'Chemical & Pharma Synthesis',
    hazardLevel: 'Severe',
    latitude: 13.1672,
    longitude: 80.2621,
    footprintRadiusMeters: 1100,
    state: 'Tamil Nadu',
    district: 'Chennai / Tiruvallur',
    operator: 'CPCL / Madras Fertilizers / MPL',
    expectedBaselineFlares: 3,
    emergencyContact: '+91-44-25941200',
    complianceZone: 'High Density Urban-Industrial Buffer Zone',
  },
  {
    id: 'FAC-GJ-006',
    name: 'Ankleshwar GIDC Chemical & Bulk Drug Estate',
    type: 'Chemical & Pharma Synthesis',
    hazardLevel: 'Severe',
    latitude: 21.6284,
    longitude: 73.0125,
    footprintRadiusMeters: 1250,
    state: 'Gujarat',
    district: 'Bharuch',
    operator: 'GIDC Industrial Estate Association',
    expectedBaselineFlares: 1,
    emergencyContact: '+91-2646-220500',
    complianceZone: 'Severe Industrial Chemical Hazard Zone',
  },
  {
    id: 'FAC-JH-007',
    name: 'Bokaro Integrated Steel & Heavy Engineering',
    type: 'Integrated Steel Smelter',
    hazardLevel: 'High',
    latitude: 23.6698,
    longitude: 86.1512,
    footprintRadiusMeters: 1500,
    state: 'Jharkhand',
    district: 'Bokaro',
    operator: 'Steel Authority of India Ltd (SAIL)',
    expectedBaselineFlares: 5,
    emergencyContact: '+91-6542-240200',
    complianceZone: 'Damodar Valley Industrial Basin',
  },
  {
    id: 'FAC-GJ-008',
    name: 'Hazira Heavy Manufacturing & LNG Terminal',
    type: 'Gas Processing Terminal',
    hazardLevel: 'Severe',
    latitude: 21.1158,
    longitude: 72.6521,
    footprintRadiusMeters: 1700,
    state: 'Gujarat',
    district: 'Surat',
    operator: 'AM/NS India / Shell LNG / L&T',
    expectedBaselineFlares: 4,
    emergencyContact: '+91-261-6682000',
    complianceZone: 'Gulf of Khambhat Industrial Ingress',
  },
];

/**
 * Raw observation seed data simulating NASA VIIRS & MODIS passes
 */
interface RawThermalSeed {
  id: string;
  lat: number;
  lng: number;
  frp: number;
  brightness: number;
  confidence: number;
  dayNight: 'D' | 'N';
  satellite: 'VIIRS-SNPP' | 'VIIRS-NOAA20' | 'MODIS-Aqua' | 'MODIS-Terra';
  landUse: string;
  region: string;
  country?: string;
  historyOverpasses: Array<{
    timestamp: string;
    frp: number;
    brightness: number;
    sensor: 'VIIRS-SNPP' | 'VIIRS-NOAA20' | 'MODIS-Aqua' | 'MODIS-Terra';
    confidence: number;
  }>;
}

const RAW_SEEDS: RawThermalSeed[] = [
  // 1. CRITICAL DEMO CASE: Severe Abnormal Spike at Jamnagar Refinery Unit #4 (Abnormal Industrial Fire / Thermal Outlier)
  {
    id: 'TH-EVT-2026-001',
    lat: 22.3872,
    lng: 69.8345,
    frp: 184.5,
    brightness: 378.4,
    confidence: 96,
    dayNight: 'N',
    satellite: 'VIIRS-SNPP',
    landUse: 'Heavy Industrial / Hydrocarbon Processing Area',
    region: 'Gujarat Industrial Belt',
    historyOverpasses: [
      { timestamp: '2026-08-14T02:15:00Z', frp: 28.2, brightness: 322, sensor: 'VIIRS-SNPP', confidence: 88 },
      { timestamp: '2026-08-16T14:20:00Z', frp: 31.0, brightness: 325, sensor: 'MODIS-Aqua', confidence: 84 },
      { timestamp: '2026-08-18T01:50:00Z', frp: 29.5, brightness: 324, sensor: 'VIIRS-NOAA20', confidence: 90 },
      { timestamp: '2026-08-20T13:40:00Z', frp: 34.1, brightness: 328, sensor: 'VIIRS-SNPP', confidence: 89 },
      { timestamp: '2026-08-22T02:05:00Z', frp: 62.4, brightness: 342, sensor: 'VIIRS-SNPP', confidence: 92 },
      { timestamp: '2026-08-23T14:10:00Z', frp: 112.8, brightness: 360, sensor: 'MODIS-Aqua', confidence: 94 },
      { timestamp: '2026-08-24T02:30:00Z', frp: 184.5, brightness: 378.4, sensor: 'VIIRS-SNPP', confidence: 96 },
    ],
  },

  // 2. High-Confidence Continuous Flare at Jamnagar Flare Stack #1 (Routine Persistent Flare)
  {
    id: 'TH-EVT-2026-002',
    lat: 22.3789,
    lng: 69.8260,
    frp: 36.4,
    brightness: 331.0,
    confidence: 92,
    dayNight: 'D',
    satellite: 'VIIRS-NOAA20',
    landUse: 'Industrial Utility Zone (Flare Stack Mast)',
    region: 'Gujarat Industrial Belt',
    historyOverpasses: [
      { timestamp: '2026-08-10T13:30:00Z', frp: 34.0, brightness: 329, sensor: 'VIIRS-SNPP', confidence: 90 },
      { timestamp: '2026-08-12T01:45:00Z', frp: 37.2, brightness: 332, sensor: 'VIIRS-NOAA20', confidence: 92 },
      { timestamp: '2026-08-14T13:20:00Z', frp: 35.1, brightness: 330, sensor: 'MODIS-Aqua', confidence: 88 },
      { timestamp: '2026-08-16T02:10:00Z', frp: 36.8, brightness: 331, sensor: 'VIIRS-SNPP', confidence: 91 },
      { timestamp: '2026-08-18T14:05:00Z', frp: 38.0, brightness: 333, sensor: 'VIIRS-NOAA20', confidence: 93 },
      { timestamp: '2026-08-20T01:55:00Z', frp: 34.9, brightness: 330, sensor: 'VIIRS-SNPP', confidence: 89 },
      { timestamp: '2026-08-22T13:50:00Z', frp: 36.0, brightness: 331, sensor: 'MODIS-Aqua', confidence: 90 },
      { timestamp: '2026-08-24T02:15:00Z', frp: 36.4, brightness: 331, sensor: 'VIIRS-NOAA20', confidence: 92 },
    ],
  },

  // 3. High Priority Incident: Chemical Synthesis Solvent Yard at Ankleshwar GIDC
  {
    id: 'TH-EVT-2026-003',
    lat: 21.6310,
    lng: 73.0160,
    frp: 88.2,
    brightness: 358.2,
    confidence: 94,
    dayNight: 'N',
    satellite: 'VIIRS-SNPP',
    landUse: 'Chemical & Hazardous Storage Industrial Estate',
    region: 'Gujarat Industrial Belt',
    historyOverpasses: [
      { timestamp: '2026-08-21T02:40:00Z', frp: 12.0, brightness: 312, sensor: 'VIIRS-SNPP', confidence: 65 },
      { timestamp: '2026-08-23T14:30:00Z', frp: 46.5, brightness: 339, sensor: 'MODIS-Terra', confidence: 88 },
      { timestamp: '2026-08-24T02:20:00Z', frp: 88.2, brightness: 358.2, sensor: 'VIIRS-SNPP', confidence: 94 },
    ],
  },

  // 4. Persistent Industrial Source: Korba Thermal Power Boiler Exhaust & Slag Yard
  {
    id: 'TH-EVT-2026-004',
    lat: 22.3610,
    lng: 82.7512,
    frp: 64.0,
    brightness: 342.5,
    confidence: 91,
    dayNight: 'D',
    satellite: 'MODIS-Aqua',
    landUse: 'Coal Power Generation & Ash Pond',
    region: 'Chhattisgarh Energy Basin',
    historyOverpasses: [
      { timestamp: '2026-08-11T13:00:00Z', frp: 60.5, brightness: 340, sensor: 'MODIS-Aqua', confidence: 89 },
      { timestamp: '2026-08-13T01:30:00Z', frp: 62.0, brightness: 341, sensor: 'VIIRS-SNPP', confidence: 91 },
      { timestamp: '2026-08-16T13:15:00Z', frp: 65.2, brightness: 343, sensor: 'VIIRS-NOAA20', confidence: 92 },
      { timestamp: '2026-08-19T02:00:00Z', frp: 63.8, brightness: 342, sensor: 'VIIRS-SNPP', confidence: 90 },
      { timestamp: '2026-08-22T13:10:00Z', frp: 66.1, brightness: 344, sensor: 'MODIS-Terra', confidence: 88 },
      { timestamp: '2026-08-24T01:45:00Z', frp: 64.0, brightness: 342.5, sensor: 'MODIS-Aqua', confidence: 91 },
    ],
  },

  // 5. Visakhapatnam Blast Furnace Persistent Heat Source
  {
    id: 'TH-EVT-2026-005',
    lat: 17.6345,
    lng: 83.1912,
    frp: 72.8,
    brightness: 348.0,
    confidence: 93,
    dayNight: 'N',
    satellite: 'VIIRS-SNPP',
    landUse: 'Heavy Steel Smelting & Coke Oven Batteries',
    region: 'Andhra Coastal Corridor',
    historyOverpasses: [
      { timestamp: '2026-08-12T02:10:00Z', frp: 70.0, brightness: 346, sensor: 'VIIRS-SNPP', confidence: 92 },
      { timestamp: '2026-08-15T14:00:00Z', frp: 73.5, brightness: 349, sensor: 'VIIRS-NOAA20', confidence: 94 },
      { timestamp: '2026-08-18T02:25:00Z', frp: 71.2, brightness: 347, sensor: 'MODIS-Aqua', confidence: 90 },
      { timestamp: '2026-08-21T14:15:00Z', frp: 74.0, brightness: 348, sensor: 'VIIRS-SNPP', confidence: 93 },
      { timestamp: '2026-08-24T02:35:00Z', frp: 72.8, brightness: 348.0, sensor: 'VIIRS-SNPP', confidence: 93 },
    ],
  },

  // 6. Singrauli Open-Cast Coal Seam Smoldering / Overburden (Mining Activity)
  {
    id: 'TH-EVT-2026-006',
    lat: 24.1240,
    lng: 82.6890,
    frp: 41.5,
    brightness: 334.0,
    confidence: 86,
    dayNight: 'D',
    satellite: 'VIIRS-NOAA20',
    landUse: 'Open-Cast Coal Pit & Overburden Dumps',
    region: 'Central Coalfields',
    historyOverpasses: [
      { timestamp: '2026-08-15T13:45:00Z', frp: 38.0, brightness: 331, sensor: 'VIIRS-SNPP', confidence: 84 },
      { timestamp: '2026-08-18T01:50:00Z', frp: 42.1, brightness: 335, sensor: 'MODIS-Aqua', confidence: 85 },
      { timestamp: '2026-08-21T13:30:00Z', frp: 40.8, brightness: 333, sensor: 'VIIRS-NOAA20', confidence: 87 },
      { timestamp: '2026-08-24T02:00:00Z', frp: 41.5, brightness: 334.0, sensor: 'VIIRS-NOAA20', confidence: 86 },
    ],
  },

  // 7. Manali Industrial Belt (Chennai) - High Hazard Storage Flare Outlier
  {
    id: 'TH-EVT-2026-007',
    lat: 13.1695,
    lng: 80.2648,
    frp: 98.4,
    brightness: 362.1,
    confidence: 95,
    dayNight: 'N',
    satellite: 'VIIRS-SNPP',
    landUse: 'Refinery Tank Farm & Petrochemical synthesis',
    region: 'Tamil Nadu Industrial Corridor',
    historyOverpasses: [
      { timestamp: '2026-08-18T01:40:00Z', frp: 22.0, brightness: 318, sensor: 'VIIRS-SNPP', confidence: 80 },
      { timestamp: '2026-08-21T13:55:00Z', frp: 48.0, brightness: 338, sensor: 'VIIRS-NOAA20', confidence: 89 },
      { timestamp: '2026-08-24T02:10:00Z', frp: 98.4, brightness: 362.1, sensor: 'VIIRS-SNPP', confidence: 95 },
    ],
  },

  // 8. Bokaro Steel Plant Slag Pit
  {
    id: 'TH-EVT-2026-008',
    lat: 23.6720,
    lng: 86.1540,
    frp: 52.0,
    brightness: 338.0,
    confidence: 89,
    dayNight: 'D',
    satellite: 'MODIS-Terra',
    landUse: 'Metallurgical Foundry & Slag Dump',
    region: 'Damodar Industrial Belt',
    historyOverpasses: [
      { timestamp: '2026-08-14T14:10:00Z', frp: 50.2, brightness: 336, sensor: 'VIIRS-SNPP', confidence: 88 },
      { timestamp: '2026-08-19T02:30:00Z', frp: 54.0, brightness: 339, sensor: 'MODIS-Aqua', confidence: 90 },
      { timestamp: '2026-08-24T13:40:00Z', frp: 52.0, brightness: 338.0, sensor: 'MODIS-Terra', confidence: 89 },
    ],
  },

  // 9. CONTRAST CASE 1: Agricultural Stubble Fire in Sangrur, Punjab (Far from industry, single seasonal pass)
  {
    id: 'TH-EVT-2026-009',
    lat: 30.2450,
    lng: 75.8420,
    frp: 28.4,
    brightness: 326.0,
    confidence: 85,
    dayNight: 'D',
    satellite: 'VIIRS-SNPP',
    landUse: 'Agricultural Cropland (Paddy Stubble)',
    region: 'Punjab Agricultural Plains',
    historyOverpasses: [
      { timestamp: '2026-08-24T13:10:00Z', frp: 28.4, brightness: 326.0, sensor: 'VIIRS-SNPP', confidence: 85 },
    ],
  },

  // 10. CONTRAST CASE 2: Agricultural Stubble Fire in Patiala, Punjab
  {
    id: 'TH-EVT-2026-010',
    lat: 30.3380,
    lng: 76.3860,
    frp: 32.1,
    brightness: 329.5,
    confidence: 88,
    dayNight: 'D',
    satellite: 'MODIS-Aqua',
    landUse: 'Agricultural Cropland (Wheat / Rice Fallow)',
    region: 'Punjab Agricultural Plains',
    historyOverpasses: [
      { timestamp: '2026-08-24T13:25:00Z', frp: 32.1, brightness: 329.5, sensor: 'MODIS-Aqua', confidence: 88 },
    ],
  },

  // 11. CONTRAST CASE 3: Forest/Wildland Fire in Simlipal Biosphere Reserve, Odisha
  {
    id: 'TH-EVT-2026-011',
    lat: 21.8450,
    lng: 86.3210,
    frp: 45.8,
    brightness: 336.2,
    confidence: 90,
    dayNight: 'D',
    satellite: 'VIIRS-NOAA20',
    landUse: 'Dense Deciduous Forest Canopy / National Reserve',
    region: 'Eastern Ghats Wilderness',
    historyOverpasses: [
      { timestamp: '2026-08-23T13:50:00Z', frp: 38.0, brightness: 330, sensor: 'VIIRS-SNPP', confidence: 87 },
      { timestamp: '2026-08-24T13:45:00Z', frp: 45.8, brightness: 336.2, sensor: 'VIIRS-NOAA20', confidence: 90 },
    ],
  },

  // 12. Hazira LNG Terminal Marine Flare
  {
    id: 'TH-EVT-2026-012',
    lat: 21.1180,
    lng: 72.6550,
    frp: 44.2,
    brightness: 337.5,
    confidence: 92,
    dayNight: 'N',
    satellite: 'VIIRS-SNPP',
    landUse: 'Marine Gas Liquefaction & Jetty Operations',
    region: 'Gujarat Industrial Belt',
    historyOverpasses: [
      { timestamp: '2026-08-12T02:00:00Z', frp: 42.0, brightness: 335, sensor: 'VIIRS-SNPP', confidence: 90 },
      { timestamp: '2026-08-16T14:10:00Z', frp: 45.1, brightness: 338, sensor: 'VIIRS-NOAA20', confidence: 92 },
      { timestamp: '2026-08-20T02:15:00Z', frp: 43.8, brightness: 337, sensor: 'MODIS-Aqua', confidence: 91 },
      { timestamp: '2026-08-24T02:25:00Z', frp: 44.2, brightness: 337.5, sensor: 'VIIRS-SNPP', confidence: 92 },
    ],
  },

  // 13. Jharia Underground Coal Smolder (Mining Activity)
  {
    id: 'TH-EVT-2026-013',
    lat: 23.7420,
    lng: 86.4180,
    frp: 35.0,
    brightness: 330.0,
    confidence: 84,
    dayNight: 'N',
    satellite: 'VIIRS-NOAA20',
    landUse: 'Uncontrolled Subsurface Coal Seam Fire Zone',
    region: 'Jharkhand Mining Belt',
    historyOverpasses: [
      { timestamp: '2026-08-08T02:10:00Z', frp: 33.0, brightness: 328, sensor: 'VIIRS-SNPP', confidence: 82 },
      { timestamp: '2026-08-14T02:20:00Z', frp: 36.2, brightness: 331, sensor: 'MODIS-Aqua', confidence: 85 },
      { timestamp: '2026-08-19T02:15:00Z', frp: 34.8, brightness: 329, sensor: 'VIIRS-NOAA20', confidence: 83 },
      { timestamp: '2026-08-24T02:05:00Z', frp: 35.0, brightness: 330.0, sensor: 'VIIRS-NOAA20', confidence: 84 },
    ],
  },

  // 14. Isolated Rural Waste Fire (Unknown / Low Priority)
  {
    id: 'TH-EVT-2026-014',
    lat: 25.5920,
    lng: 85.1430,
    frp: 14.2,
    brightness: 316.4,
    confidence: 68,
    dayNight: 'D',
    satellite: 'MODIS-Terra',
    landUse: 'Peri-urban Fallow Land / Open Scrub',
    region: 'Bihar Gangetic Basin',
    country: 'India',
    historyOverpasses: [
      { timestamp: '2026-08-24T14:00:00Z', frp: 14.2, brightness: 316.4, sensor: 'MODIS-Terra', confidence: 68 },
    ],
  },

  // =========================================================================
  // GROUNDED GLOBAL SATELLITE THERMAL OBSERVATION SEEDS (NASA VIIRS / MODIS)
  // Major international hydrocarbon, refining, metallurgical, and wildfire corridors
  // =========================================================================

  // GL01. Basra / Rumaila Major Petroleum Flaring Corridor, Iraq
  {
    id: 'TH-EVT-2026-GL01',
    lat: 30.5211,
    lng: 47.4320,
    frp: 148.5,
    brightness: 374.0,
    confidence: 96,
    dayNight: 'N',
    satellite: 'VIIRS-SNPP',
    landUse: 'Petroleum Extraction & Continuous Flare Stack Field',
    region: 'Middle East - Persian Gulf Corridor',
    country: 'Iraq',
    historyOverpasses: [
      { timestamp: '2026-08-15T00:30:00Z', frp: 142.0, brightness: 371, sensor: 'VIIRS-SNPP', confidence: 95 },
      { timestamp: '2026-08-18T12:40:00Z', frp: 150.2, brightness: 375, sensor: 'VIIRS-NOAA20', confidence: 97 },
      { timestamp: '2026-08-21T01:10:00Z', frp: 146.0, brightness: 373, sensor: 'MODIS-Aqua', confidence: 94 },
      { timestamp: '2026-08-24T00:45:00Z', frp: 148.5, brightness: 374.0, sensor: 'VIIRS-SNPP', confidence: 96 },
    ],
  },

  // GL02. Permian Basin Abnormal Flaring Surge, Midland, Texas, United States
  {
    id: 'TH-EVT-2026-GL02',
    lat: 31.8920,
    lng: -102.1240,
    frp: 122.4,
    brightness: 366.5,
    confidence: 94,
    dayNight: 'N',
    satellite: 'VIIRS-NOAA20',
    landUse: 'Hydrocarbon Processing & Shale Well Gas Flaring',
    region: 'North America - Permian Basin',
    country: 'United States',
    historyOverpasses: [
      { timestamp: '2026-08-16T08:15:00Z', frp: 35.0, brightness: 328, sensor: 'VIIRS-SNPP', confidence: 88 },
      { timestamp: '2026-08-20T20:30:00Z', frp: 42.0, brightness: 334, sensor: 'MODIS-Terra', confidence: 89 },
      { timestamp: '2026-08-23T08:20:00Z', frp: 110.5, brightness: 362, sensor: 'VIIRS-SNPP', confidence: 93 },
      { timestamp: '2026-08-24T08:05:00Z', frp: 122.4, brightness: 366.5, sensor: 'VIIRS-NOAA20', confidence: 94 },
    ],
  },

  // GL03. Ras Tanura Petrochemical & Refinery Complex, Saudi Arabia
  {
    id: 'TH-EVT-2026-GL03',
    lat: 26.6740,
    lng: 50.1580,
    frp: 88.6,
    brightness: 352.0,
    confidence: 93,
    dayNight: 'N',
    satellite: 'MODIS-Aqua',
    landUse: 'Major Petrochemical Refinery & Marine Terminal Flaring',
    region: 'Middle East - Persian Gulf Corridor',
    country: 'Saudi Arabia',
    historyOverpasses: [
      { timestamp: '2026-08-14T23:45:00Z', frp: 85.0, brightness: 350, sensor: 'VIIRS-SNPP', confidence: 92 },
      { timestamp: '2026-08-19T11:50:00Z', frp: 87.2, brightness: 351, sensor: 'VIIRS-NOAA20', confidence: 93 },
      { timestamp: '2026-08-24T00:15:00Z', frp: 88.6, brightness: 352.0, sensor: 'MODIS-Aqua', confidence: 93 },
    ],
  },

  // GL04. Port of Rotterdam Petrochemical Hub, Netherlands
  {
    id: 'TH-EVT-2026-GL04',
    lat: 51.9540,
    lng: 4.1480,
    frp: 62.5,
    brightness: 341.0,
    confidence: 91,
    dayNight: 'D',
    satellite: 'VIIRS-SNPP',
    landUse: 'Petrochemical Cracker & Refinery Thermal Stack',
    region: 'Western Europe Industrial Zone',
    country: 'Netherlands',
    historyOverpasses: [
      { timestamp: '2026-08-15T12:30:00Z', frp: 60.0, brightness: 339, sensor: 'VIIRS-SNPP', confidence: 90 },
      { timestamp: '2026-08-20T01:15:00Z', frp: 64.1, brightness: 342, sensor: 'VIIRS-NOAA20', confidence: 92 },
      { timestamp: '2026-08-24T12:50:00Z', frp: 62.5, brightness: 341.0, sensor: 'VIIRS-SNPP', confidence: 91 },
    ],
  },

  // GL05. Jurong Island Petrochemical Complex, Singapore
  {
    id: 'TH-EVT-2026-GL05',
    lat: 1.2680,
    lng: 103.7120,
    frp: 56.4,
    brightness: 339.2,
    confidence: 90,
    dayNight: 'N',
    satellite: 'VIIRS-NOAA20',
    landUse: 'Petrochemical Synthesis & Ethylene Flaring System',
    region: 'Southeast Asia Maritime Hub',
    country: 'Singapore',
    historyOverpasses: [
      { timestamp: '2026-08-17T18:20:00Z', frp: 54.0, brightness: 337, sensor: 'VIIRS-SNPP', confidence: 89 },
      { timestamp: '2026-08-22T06:10:00Z', frp: 58.2, brightness: 340, sensor: 'MODIS-Aqua', confidence: 91 },
      { timestamp: '2026-08-24T06:30:00Z', frp: 56.4, brightness: 339.2, sensor: 'VIIRS-NOAA20', confidence: 90 },
    ],
  },

  // GL06. Athabasca Oil Sands Bitumen Extraction Upgrader, Alberta, Canada
  {
    id: 'TH-EVT-2026-GL06',
    lat: 57.0120,
    lng: -111.5800,
    frp: 94.0,
    brightness: 356.5,
    confidence: 94,
    dayNight: 'D',
    satellite: 'MODIS-Terra',
    landUse: 'Bitumen Upgrading & Mining Thermal Infrastructure',
    region: 'North America - Western Canada',
    country: 'Canada',
    historyOverpasses: [
      { timestamp: '2026-08-16T19:40:00Z', frp: 91.5, brightness: 354, sensor: 'VIIRS-SNPP', confidence: 93 },
      { timestamp: '2026-08-21T07:20:00Z', frp: 96.0, brightness: 358, sensor: 'VIIRS-NOAA20', confidence: 95 },
      { timestamp: '2026-08-24T19:15:00Z', frp: 94.0, brightness: 356.5, sensor: 'MODIS-Terra', confidence: 94 },
    ],
  },

  // GL07. Pilbara Heavy Metallurgical & Iron Ore Pelleting, Western Australia
  {
    id: 'TH-EVT-2026-GL07',
    lat: -20.6500,
    lng: 116.7200,
    frp: 76.0,
    brightness: 348.0,
    confidence: 92,
    dayNight: 'D',
    satellite: 'VIIRS-SNPP',
    landUse: 'Heavy Metallurgical Sintering & Mining Operations',
    region: 'Australia - Pilbara Mineral Belt',
    country: 'Australia',
    historyOverpasses: [
      { timestamp: '2026-08-15T05:10:00Z', frp: 72.0, brightness: 345, sensor: 'VIIRS-SNPP', confidence: 90 },
      { timestamp: '2026-08-20T17:30:00Z', frp: 78.4, brightness: 349, sensor: 'MODIS-Aqua', confidence: 93 },
      { timestamp: '2026-08-24T05:25:00Z', frp: 76.0, brightness: 348.0, sensor: 'VIIRS-SNPP', confidence: 92 },
    ],
  },

  // GL08. South Pars / Asaluyeh Gas Processing Terminal, Iran
  {
    id: 'TH-EVT-2026-GL08',
    lat: 27.5020,
    lng: 52.6100,
    frp: 136.0,
    brightness: 369.0,
    confidence: 95,
    dayNight: 'N',
    satellite: 'MODIS-Aqua',
    landUse: 'Major Offshore Gas Treatment & Flare Field',
    region: 'Middle East - Persian Gulf Corridor',
    country: 'Iran',
    historyOverpasses: [
      { timestamp: '2026-08-16T22:30:00Z', frp: 130.0, brightness: 366, sensor: 'VIIRS-SNPP', confidence: 94 },
      { timestamp: '2026-08-21T10:45:00Z', frp: 138.5, brightness: 370, sensor: 'VIIRS-NOAA20', confidence: 96 },
      { timestamp: '2026-08-23T23:00:00Z', frp: 136.0, brightness: 369.0, sensor: 'MODIS-Aqua', confidence: 95 },
    ],
  },

  // GL09. Mato Grosso Agricultural Fallow Land Burning, Brazil
  {
    id: 'TH-EVT-2026-GL09',
    lat: -12.5400,
    lng: -55.7200,
    frp: 38.5,
    brightness: 329.0,
    confidence: 86,
    dayNight: 'D',
    satellite: 'VIIRS-SNPP',
    landUse: 'Cropland & Agricultural Pasture Clearing',
    region: 'South America - Cerrado Basin',
    country: 'Brazil',
    historyOverpasses: [
      { timestamp: '2026-08-23T17:10:00Z', frp: 38.5, brightness: 329.0, sensor: 'VIIRS-SNPP', confidence: 86 },
    ],
  },

  // GL10. Attica Wildfire / Forest Fire Context, Greece
  {
    id: 'TH-EVT-2026-GL10',
    lat: 38.1500,
    lng: 23.8600,
    frp: 86.0,
    brightness: 353.0,
    confidence: 92,
    dayNight: 'D',
    satellite: 'MODIS-Terra',
    landUse: 'Mediterranean Forest & Wildland Vegetation',
    region: 'Southern Europe - Aegean Basin',
    country: 'Greece',
    historyOverpasses: [
      { timestamp: '2026-08-23T10:30:00Z', frp: 86.0, brightness: 353.0, sensor: 'MODIS-Terra', confidence: 92 },
    ],
  },

  // GL11. Shanxi Heavy Coking & Metallurgy Complex, Linfen, China
  {
    id: 'TH-EVT-2026-GL11',
    lat: 36.0820,
    lng: 111.5180,
    frp: 98.0,
    brightness: 358.0,
    confidence: 93,
    dayNight: 'N',
    satellite: 'VIIRS-NOAA20',
    landUse: 'Heavy Coal Coking & Steel Blast Furnace Operations',
    region: 'East Asia Industrial Basin',
    country: 'China',
    historyOverpasses: [
      { timestamp: '2026-08-18T17:15:00Z', frp: 95.0, brightness: 355, sensor: 'VIIRS-SNPP', confidence: 92 },
      { timestamp: '2026-08-22T05:40:00Z', frp: 101.0, brightness: 360, sensor: 'MODIS-Aqua', confidence: 94 },
      { timestamp: '2026-08-24T17:20:00Z', frp: 98.0, brightness: 358.0, sensor: 'VIIRS-NOAA20', confidence: 93 },
    ],
  },

  // GL12. Isolated Remote Desert Heat Anomaly (Unknown / Insufficient Evidence)
  {
    id: 'TH-EVT-2026-GL12',
    lat: 21.2000,
    lng: 51.1000,
    frp: 18.5,
    brightness: 319.0,
    confidence: 64,
    dayNight: 'D',
    satellite: 'MODIS-Terra',
    landUse: 'Arid Open Desert Scrub / Unclassified',
    region: 'Arabian Peninsula Arid Interior',
    country: 'Saudi Arabia',
    historyOverpasses: [
      { timestamp: '2026-08-23T11:00:00Z', frp: 18.5, brightness: 319.0, sensor: 'MODIS-Terra', confidence: 64 },
    ],
  },
];

/**
 * Builds fully evaluated ThermalEvents with all spatial, temporal, classification, and priority attributes
 */
export function buildThermalEventsDatabase(): ThermalEvent[] {
  const events: ThermalEvent[] = [];

  for (const seed of RAW_SEEDS) {
    const isIndia = seed.country === 'India' || !seed.country;

    // Only compute nearest Indian industrial facility if located in India
    let nearestFacility: IndustrialFacility | undefined = undefined;
    let distanceMeters: number | undefined = undefined;

    if (isIndia) {
      const spatialRes = findNearestFacility(
        seed.lat,
        seed.lng,
        INDIAN_INDUSTRIAL_FACILITIES
      );
      nearestFacility = spatialRes.facility;
      distanceMeters = spatialRes.distanceMeters;
    }

    const persistence = computePersistenceMetrics(seed.historyOverpasses, seed.frp);

    const classification = classifyThermalEvent({
      frp: seed.frp,
      brightnessTempK: seed.brightness,
      confidence: seed.confidence,
      dayNight: seed.dayNight,
      distanceToFacilityMeters: distanceMeters ?? 99999,
      nearestFacility,
      persistence,
      landUseContext: seed.landUse,
    });

    const primaryObs: ThermalObservation = {
      id: `OBS-${seed.id}`,
      latitude: seed.lat,
      longitude: seed.lng,
      timestamp: seed.historyOverpasses[seed.historyOverpasses.length - 1].timestamp,
      satellite: seed.satellite,
      frp: seed.frp,
      brightnessTempK: seed.brightness,
      confidence: seed.confidence,
      scan: 0.75,
      track: 0.75,
      dayNight: seed.dayNight,
      dataSource: 'DEMO_SYNTHETIC',
    };

    const priority = calculateInvestigationPriority({
      observation: primaryObs,
      nearestFacility,
      distanceToFacilityMeters: distanceMeters,
      persistence,
      classification,
    });

    events.push({
      id: seed.id,
      country: seed.country || (isIndia ? 'India' : 'International'),
      primaryObservation: primaryObs,
      nearestFacility,
      distanceToFacilityMeters: distanceMeters,
      landUseContext: seed.landUse,
      persistence,
      classification,
      priority,
      verification: {
        state: seed.id === 'TH-EVT-2026-001' ? 'under_investigation' : 'unreviewed',
        assignedTeam: seed.id === 'TH-EVT-2026-001' ? 'State Fire & HAZMAT Dispatch - Sector 4' : undefined,
        notes: seed.id === 'TH-EVT-2026-001' ? 'Initial alert generated. Requested site thermal camera confirmation.' : undefined,
      },
      region: seed.region,
    });
  }

  return events;
}

/**
 * Builds prioritized Alerts stream from events
 */
export function buildAlertsDatabase(events: ThermalEvent[]): ThermalAlert[] {
  const alerts: ThermalAlert[] = [];

  for (const evt of events) {
    if (evt.priority.tier === 'Critical' || evt.priority.tier === 'High') {
      alerts.push({
        id: `ALT-${evt.id}`,
        eventId: evt.id,
        title: `${evt.priority.tier.toUpperCase()} PRIORITY: ${evt.classification.categoryLabel}`,
        severity: evt.priority.tier,
        facilityName: evt.nearestFacility?.name,
        region: evt.region,
        timestamp: evt.primaryObservation.timestamp,
        classificationLabel: evt.classification.categoryLabel,
        priorityScore: evt.priority.score,
        persistenceLevel: evt.persistence.level,
        summaryReason: evt.priority.whyImportant.slice(0, 2).join('; '),
        recommendedAction: evt.priority.recommendedAction,
        status: evt.verification.state === 'under_investigation' ? 'dispatched' : 'active',
      });
    }
  }

  return alerts.sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * Computes live operational analytics summary
 */
export function computeAnalyticsSummary(events: ThermalEvent[]): AnalyticsSummary {
  const totalObservations = events.reduce((sum, e) => sum + e.persistence.observationCount, 0);
  const industrialAssociated = events.filter((e) => (e.distanceToFacilityMeters || Infinity) <= 1500).length;
  const persistentSources = events.filter((e) => e.persistence.level === 'persistent').length;
  const highOrCriticalPriority = events.filter((e) => e.priority.tier === 'High' || e.priority.tier === 'Critical').length;

  // Screening reduction: instead of reviewing all raw satellite points (e.g. 100 observations),
  // analyst only reviews high/critical actionable industrial items
  const manualScreeningReductionPercent = totalObservations > 0
    ? Math.round(((totalObservations - highOrCriticalPriority) / totalObservations) * 100)
    : 84;

  const classificationBreakdown = {
    possible_industrial_fire: 0,
    persistent_industrial_source: 0,
    gas_flare: 0,
    agricultural_burning: 0,
    forest_natural: 0,
    mining_extraction: 0,
    unknown: 0,
  };

  const persistenceBreakdown = {
    single: 0,
    recurring: 0,
    persistent: 0,
  };

  const priorityBreakdown = {
    low: 0,
    moderate: 0,
    high: 0,
    critical: 0,
  };

  const regionalMap = new Map<string, { count: number; highPriorityCount: number }>();

  for (const evt of events) {
    classificationBreakdown[evt.classification.category] =
      (classificationBreakdown[evt.classification.category] || 0) + 1;

    persistenceBreakdown[evt.persistence.level] =
      (persistenceBreakdown[evt.persistence.level] || 0) + 1;

    const tierKey = evt.priority.tier.toLowerCase() as keyof typeof priorityBreakdown;
    priorityBreakdown[tierKey] = (priorityBreakdown[tierKey] || 0) + 1;

    const reg = evt.region || 'Other';
    const curr = regionalMap.get(reg) || { count: 0, highPriorityCount: 0 };
    curr.count += 1;
    if (evt.priority.tier === 'High' || evt.priority.tier === 'Critical') {
      curr.highPriorityCount += 1;
    }
    regionalMap.set(reg, curr);
  }

  const regionalBreakdown = Array.from(regionalMap.entries()).map(([region, data]) => ({
    region,
    count: data.count,
    highPriorityCount: data.highPriorityCount,
  }));

  const timeSeries = [
    { date: 'Aug 18', industrialCount: 4, agriculturalCount: 8, naturalCount: 2, flaresCount: 5, avgFrp: 42.1 },
    { date: 'Aug 19', industrialCount: 5, agriculturalCount: 12, naturalCount: 1, flaresCount: 6, avgFrp: 45.3 },
    { date: 'Aug 20', industrialCount: 4, agriculturalCount: 15, naturalCount: 3, flaresCount: 6, avgFrp: 48.0 },
    { date: 'Aug 21', industrialCount: 6, agriculturalCount: 11, naturalCount: 2, flaresCount: 5, avgFrp: 52.4 },
    { date: 'Aug 22', industrialCount: 7, agriculturalCount: 9, naturalCount: 1, flaresCount: 6, avgFrp: 58.2 },
    { date: 'Aug 23', industrialCount: 8, agriculturalCount: 14, naturalCount: 4, flaresCount: 6, avgFrp: 66.8 },
    { date: 'Aug 24', industrialCount: 9, agriculturalCount: 10, naturalCount: 2, flaresCount: 6, avgFrp: 74.5 },
  ];

  return {
    totalObservations,
    industrialAssociated,
    persistentSources,
    highOrCriticalPriority,
    manualScreeningReductionPercent,
    classificationBreakdown,
    regionalBreakdown,
    timeSeries,
    persistenceBreakdown,
    priorityBreakdown,
  };
}
