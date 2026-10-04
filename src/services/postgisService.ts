/**
 * PostGIS Spatial Database Service & SQL Query Engine for GeoFlare
 * Manages tables 'thermal_observations' and 'industrial_facilities', PostGIS GIST spatial indexing,
 * spatial queries (ST_DWithin, ST_Distance), and SQL exports.
 */

import { INDIAN_INDUSTRIAL_FACILITIES } from './mockData';
import { calculateHaversineDistance } from './spatial';

export interface PostgisTableSchema {
  tableName: string;
  description: string;
  rowCount: number;
  columns: Array<{
    name: string;
    type: string;
    isPrimary?: boolean;
    isForeign?: boolean;
    isGeometry?: boolean;
    nullable: boolean;
    description: string;
  }>;
  indexes: Array<{
    name: string;
    type: string; // 'GIST' | 'BTREE'
    columns: string[];
    description: string;
  }>;
}

export interface PostgisQueryResult {
  query: string;
  executionTimeMs: number;
  rowCount: number;
  spatialIndexUsed: string | null;
  columns: string[];
  rows: Record<string, any>[];
  explainPlan: string[];
}

export interface PredefinedQuery {
  id: string;
  title: string;
  category: 'Spatial Join' | 'Nearest Neighbor' | 'Persistence' | 'Outlier Detection';
  description: string;
  sql: string;
}

// Flat thermal observations aligned with the SQL schema
export interface FlatThermalObservationRow {
  id: string;
  event_id: string;
  latitude: number;
  longitude: number;
  geom_wkt: string;
  acq_date: string;
  acq_time: string;
  acq_datetime: string;
  satellite: string;
  frp: number;
  brightness_temp_k: number;
  confidence: number;
  scan: number;
  track: number;
  day_night: 'D' | 'N';
  data_source: string;
  land_use_context: string;
  facility_id: string | null;
  distance_to_facility_m: number | null;
}

// Generate pre-loaded rows for thermal_observations
export function generateThermalObservationsRows(): FlatThermalObservationRow[] {
  const rows: FlatThermalObservationRow[] = [
    // Jamnagar Acute Flare Spike
    {
      id: 'OBS-001-A',
      event_id: 'TH-EVT-2026-001',
      latitude: 22.3872,
      longitude: 69.8345,
      geom_wkt: 'SRID=4326;POINT(69.8345 22.3872)',
      acq_date: '2026-08-14',
      acq_time: '02:15',
      acq_datetime: '2026-08-14T02:15:00Z',
      satellite: 'VIIRS-SNPP',
      frp: 28.2,
      brightness_temp_k: 322.0,
      confidence: 88,
      scan: 0.75,
      track: 0.75,
      day_night: 'N',
      data_source: 'NASA_FIRMS_VIIRS',
      land_use_context: 'Heavy Industrial / Hydrocarbon Processing Area',
      facility_id: 'FAC-GJ-001',
      distance_to_facility_m: 382.4,
    },
    {
      id: 'OBS-001-B',
      event_id: 'TH-EVT-2026-001',
      latitude: 22.3872,
      longitude: 69.8345,
      geom_wkt: 'SRID=4326;POINT(69.8345 22.3872)',
      acq_date: '2026-08-16',
      acq_time: '14:20',
      acq_datetime: '2026-08-16T14:20:00Z',
      satellite: 'MODIS-Aqua',
      frp: 31.0,
      brightness_temp_k: 325.0,
      confidence: 84,
      scan: 1.0,
      track: 1.0,
      day_night: 'D',
      data_source: 'NASA_FIRMS_MODIS',
      land_use_context: 'Heavy Industrial / Hydrocarbon Processing Area',
      facility_id: 'FAC-GJ-001',
      distance_to_facility_m: 382.4,
    },
    {
      id: 'OBS-001-C',
      event_id: 'TH-EVT-2026-001',
      latitude: 22.3872,
      longitude: 69.8345,
      geom_wkt: 'SRID=4326;POINT(69.8345 22.3872)',
      acq_date: '2026-08-18',
      acq_time: '01:50',
      acq_datetime: '2026-08-18T01:50:00Z',
      satellite: 'VIIRS-NOAA20',
      frp: 29.5,
      brightness_temp_k: 324.0,
      confidence: 90,
      scan: 0.75,
      track: 0.75,
      day_night: 'N',
      data_source: 'NASA_FIRMS_VIIRS',
      land_use_context: 'Heavy Industrial / Hydrocarbon Processing Area',
      facility_id: 'FAC-GJ-001',
      distance_to_facility_m: 382.4,
    },
    {
      id: 'OBS-001-D',
      event_id: 'TH-EVT-2026-001',
      latitude: 22.3872,
      longitude: 69.8345,
      geom_wkt: 'SRID=4326;POINT(69.8345 22.3872)',
      acq_date: '2026-08-20',
      acq_time: '13:40',
      acq_datetime: '2026-08-20T13:40:00Z',
      satellite: 'VIIRS-SNPP',
      frp: 34.1,
      brightness_temp_k: 328.0,
      confidence: 89,
      scan: 0.75,
      track: 0.75,
      day_night: 'D',
      data_source: 'NASA_FIRMS_VIIRS',
      land_use_context: 'Heavy Industrial / Hydrocarbon Processing Area',
      facility_id: 'FAC-GJ-001',
      distance_to_facility_m: 382.4,
    },
    {
      id: 'OBS-001-E',
      event_id: 'TH-EVT-2026-001',
      latitude: 22.3872,
      longitude: 69.8345,
      geom_wkt: 'SRID=4326;POINT(69.8345 22.3872)',
      acq_date: '2026-08-22',
      acq_time: '02:05',
      acq_datetime: '2026-08-22T02:05:00Z',
      satellite: 'VIIRS-SNPP',
      frp: 62.4,
      brightness_temp_k: 342.0,
      confidence: 92,
      scan: 0.75,
      track: 0.75,
      day_night: 'N',
      data_source: 'NASA_FIRMS_VIIRS',
      land_use_context: 'Heavy Industrial / Hydrocarbon Processing Area',
      facility_id: 'FAC-GJ-001',
      distance_to_facility_m: 382.4,
    },
    {
      id: 'OBS-001-F',
      event_id: 'TH-EVT-2026-001',
      latitude: 22.3872,
      longitude: 69.8345,
      geom_wkt: 'SRID=4326;POINT(69.8345 22.3872)',
      acq_date: '2026-08-23',
      acq_time: '14:10',
      acq_datetime: '2026-08-23T14:10:00Z',
      satellite: 'MODIS-Aqua',
      frp: 112.8,
      brightness_temp_k: 360.0,
      confidence: 94,
      scan: 1.0,
      track: 1.0,
      day_night: 'D',
      data_source: 'NASA_FIRMS_MODIS',
      land_use_context: 'Heavy Industrial / Hydrocarbon Processing Area',
      facility_id: 'FAC-GJ-001',
      distance_to_facility_m: 382.4,
    },
    {
      id: 'OBS-001-G',
      event_id: 'TH-EVT-2026-001',
      latitude: 22.3872,
      longitude: 69.8345,
      geom_wkt: 'SRID=4326;POINT(69.8345 22.3872)',
      acq_date: '2026-08-24',
      acq_time: '02:30',
      acq_datetime: '2026-08-24T02:30:00Z',
      satellite: 'VIIRS-SNPP',
      frp: 184.5,
      brightness_temp_k: 378.4,
      confidence: 96,
      scan: 0.75,
      track: 0.75,
      day_night: 'N',
      data_source: 'NASA_FIRMS_VIIRS',
      land_use_context: 'Heavy Industrial / Hydrocarbon Processing Area',
      facility_id: 'FAC-GJ-001',
      distance_to_facility_m: 382.4,
    },

    // Jamnagar Flare Stack #1 Routine Flare
    {
      id: 'OBS-002-A',
      event_id: 'TH-EVT-2026-002',
      latitude: 22.3789,
      longitude: 69.8260,
      geom_wkt: 'SRID=4326;POINT(69.8260 22.3789)',
      acq_date: '2026-08-10',
      acq_time: '13:30',
      acq_datetime: '2026-08-10T13:30:00Z',
      satellite: 'VIIRS-SNPP',
      frp: 34.0,
      brightness_temp_k: 329.0,
      confidence: 90,
      scan: 0.75,
      track: 0.75,
      day_night: 'D',
      data_source: 'NASA_FIRMS_VIIRS',
      land_use_context: 'Industrial Utility Zone (Flare Stack Mast)',
      facility_id: 'FAC-GJ-001',
      distance_to_facility_m: 880.0,
    },
    {
      id: 'OBS-002-B',
      event_id: 'TH-EVT-2026-002',
      latitude: 22.3789,
      longitude: 69.8260,
      geom_wkt: 'SRID=4326;POINT(69.8260 22.3789)',
      acq_date: '2026-08-14',
      acq_time: '13:20',
      acq_datetime: '2026-08-14T13:20:00Z',
      satellite: 'MODIS-Aqua',
      frp: 35.1,
      brightness_temp_k: 330.0,
      confidence: 88,
      scan: 1.0,
      track: 1.0,
      day_night: 'D',
      data_source: 'NASA_FIRMS_MODIS',
      land_use_context: 'Industrial Utility Zone (Flare Stack Mast)',
      facility_id: 'FAC-GJ-001',
      distance_to_facility_m: 880.0,
    },
    {
      id: 'OBS-002-C',
      event_id: 'TH-EVT-2026-002',
      latitude: 22.3789,
      longitude: 69.8260,
      geom_wkt: 'SRID=4326;POINT(69.8260 22.3789)',
      acq_date: '2026-08-18',
      acq_time: '14:05',
      acq_datetime: '2026-08-18T14:05:00Z',
      satellite: 'VIIRS-NOAA20',
      frp: 38.0,
      brightness_temp_k: 333.0,
      confidence: 93,
      scan: 0.75,
      track: 0.75,
      day_night: 'D',
      data_source: 'NASA_FIRMS_VIIRS',
      land_use_context: 'Industrial Utility Zone (Flare Stack Mast)',
      facility_id: 'FAC-GJ-001',
      distance_to_facility_m: 880.0,
    },
    {
      id: 'OBS-002-D',
      event_id: 'TH-EVT-2026-002',
      latitude: 22.3789,
      longitude: 69.8260,
      geom_wkt: 'SRID=4326;POINT(69.8260 22.3789)',
      acq_date: '2026-08-24',
      acq_time: '02:15',
      acq_datetime: '2026-08-24T02:15:00Z',
      satellite: 'VIIRS-NOAA20',
      frp: 36.4,
      brightness_temp_k: 331.0,
      confidence: 92,
      scan: 0.75,
      track: 0.75,
      day_night: 'N',
      data_source: 'NASA_FIRMS_VIIRS',
      land_use_context: 'Industrial Utility Zone (Flare Stack Mast)',
      facility_id: 'FAC-GJ-001',
      distance_to_facility_m: 880.0,
    },

    // Ankleshwar GIDC Chemical Solvent Outlier
    {
      id: 'OBS-003-A',
      event_id: 'TH-EVT-2026-003',
      latitude: 21.6310,
      longitude: 73.0160,
      geom_wkt: 'SRID=4326;POINT(73.0160 21.6310)',
      acq_date: '2026-08-21',
      acq_time: '02:40',
      acq_datetime: '2026-08-21T02:40:00Z',
      satellite: 'VIIRS-SNPP',
      frp: 12.0,
      brightness_temp_k: 312.0,
      confidence: 65,
      scan: 0.75,
      track: 0.75,
      day_night: 'N',
      data_source: 'NASA_FIRMS_VIIRS',
      land_use_context: 'Chemical & Hazardous Storage Industrial Estate',
      facility_id: 'FAC-GJ-006',
      distance_to_facility_m: 463.2,
    },
    {
      id: 'OBS-003-B',
      event_id: 'TH-EVT-2026-003',
      latitude: 21.6310,
      longitude: 73.0160,
      geom_wkt: 'SRID=4326;POINT(73.0160 21.6310)',
      acq_date: '2026-08-23',
      acq_time: '14:30',
      acq_datetime: '2026-08-23T14:30:00Z',
      satellite: 'MODIS-Terra',
      frp: 46.5,
      brightness_temp_k: 339.0,
      confidence: 88,
      scan: 1.0,
      track: 1.0,
      day_night: 'D',
      data_source: 'NASA_FIRMS_MODIS',
      land_use_context: 'Chemical & Hazardous Storage Industrial Estate',
      facility_id: 'FAC-GJ-006',
      distance_to_facility_m: 463.2,
    },
    {
      id: 'OBS-003-C',
      event_id: 'TH-EVT-2026-003',
      latitude: 21.6310,
      longitude: 73.0160,
      geom_wkt: 'SRID=4326;POINT(73.0160 21.6310)',
      acq_date: '2026-08-24',
      acq_time: '02:20',
      acq_datetime: '2026-08-24T02:20:00Z',
      satellite: 'VIIRS-SNPP',
      frp: 88.2,
      brightness_temp_k: 358.2,
      confidence: 94,
      scan: 0.75,
      track: 0.75,
      day_night: 'N',
      data_source: 'NASA_FIRMS_VIIRS',
      land_use_context: 'Chemical & Hazardous Storage Industrial Estate',
      facility_id: 'FAC-GJ-006',
      distance_to_facility_m: 463.2,
    },

    // Korba Super Thermal Power Slag & Ash
    {
      id: 'OBS-004-A',
      event_id: 'TH-EVT-2026-004',
      latitude: 22.3610,
      longitude: 82.7512,
      geom_wkt: 'SRID=4326;POINT(82.7512 22.3610)',
      acq_date: '2026-08-11',
      acq_time: '13:00',
      acq_datetime: '2026-08-11T13:00:00Z',
      satellite: 'MODIS-Aqua',
      frp: 60.5,
      brightness_temp_k: 340.0,
      confidence: 89,
      scan: 1.0,
      track: 1.0,
      day_night: 'D',
      data_source: 'NASA_FIRMS_MODIS',
      land_use_context: 'Coal Power Generation & Ash Pond',
      facility_id: 'FAC-CG-002',
      distance_to_facility_m: 380.0,
    },
    {
      id: 'OBS-004-B',
      event_id: 'TH-EVT-2026-004',
      latitude: 22.3610,
      longitude: 82.7512,
      geom_wkt: 'SRID=4326;POINT(82.7512 22.3610)',
      acq_date: '2026-08-16',
      acq_time: '13:15',
      acq_datetime: '2026-08-16T13:15:00Z',
      satellite: 'VIIRS-NOAA20',
      frp: 65.2,
      brightness_temp_k: 343.0,
      confidence: 92,
      scan: 0.75,
      track: 0.75,
      day_night: 'D',
      data_source: 'NASA_FIRMS_VIIRS',
      land_use_context: 'Coal Power Generation & Ash Pond',
      facility_id: 'FAC-CG-002',
      distance_to_facility_m: 380.0,
    },
    {
      id: 'OBS-004-C',
      event_id: 'TH-EVT-2026-004',
      latitude: 22.3610,
      longitude: 82.7512,
      geom_wkt: 'SRID=4326;POINT(82.7512 22.3610)',
      acq_date: '2026-08-24',
      acq_time: '01:45',
      acq_datetime: '2026-08-24T01:45:00Z',
      satellite: 'MODIS-Aqua',
      frp: 64.0,
      brightness_temp_k: 342.5,
      confidence: 91,
      scan: 1.0,
      track: 1.0,
      day_night: 'D',
      data_source: 'NASA_FIRMS_MODIS',
      land_use_context: 'Coal Power Generation & Ash Pond',
      facility_id: 'FAC-CG-002',
      distance_to_facility_m: 380.0,
    },

    // Visakhapatnam Blast Furnace
    {
      id: 'OBS-005-A',
      event_id: 'TH-EVT-2026-005',
      latitude: 17.6345,
      longitude: 83.1912,
      geom_wkt: 'SRID=4326;POINT(83.1912 17.6345)',
      acq_date: '2026-08-12',
      acq_time: '02:10',
      acq_datetime: '2026-08-12T02:10:00Z',
      satellite: 'VIIRS-SNPP',
      frp: 70.0,
      brightness_temp_k: 346.0,
      confidence: 92,
      scan: 0.75,
      track: 0.75,
      day_night: 'N',
      data_source: 'NASA_FIRMS_VIIRS',
      land_use_context: 'Heavy Steel Smelting & Coke Oven Batteries',
      facility_id: 'FAC-AP-003',
      distance_to_facility_m: 265.0,
    },
    {
      id: 'OBS-005-B',
      event_id: 'TH-EVT-2026-005',
      latitude: 17.6345,
      longitude: 83.1912,
      geom_wkt: 'SRID=4326;POINT(83.1912 17.6345)',
      acq_date: '2026-08-18',
      acq_time: '02:25',
      acq_datetime: '2026-08-18T02:25:00Z',
      satellite: 'MODIS-Aqua',
      frp: 71.2,
      brightness_temp_k: 347.0,
      confidence: 90,
      scan: 1.0,
      track: 1.0,
      day_night: 'N',
      data_source: 'NASA_FIRMS_MODIS',
      land_use_context: 'Heavy Steel Smelting & Coke Oven Batteries',
      facility_id: 'FAC-AP-003',
      distance_to_facility_m: 265.0,
    },
    {
      id: 'OBS-005-C',
      event_id: 'TH-EVT-2026-005',
      latitude: 17.6345,
      longitude: 83.1912,
      geom_wkt: 'SRID=4326;POINT(83.1912 17.6345)',
      acq_date: '2026-08-24',
      acq_time: '02:35',
      acq_datetime: '2026-08-24T02:35:00Z',
      satellite: 'VIIRS-SNPP',
      frp: 72.8,
      brightness_temp_k: 348.0,
      confidence: 93,
      scan: 0.75,
      track: 0.75,
      day_night: 'N',
      data_source: 'NASA_FIRMS_VIIRS',
      land_use_context: 'Heavy Steel Smelting & Coke Oven Batteries',
      facility_id: 'FAC-AP-003',
      distance_to_facility_m: 265.0,
    },

    // Manali Petrochem Tank Flare Outlier
    {
      id: 'OBS-007-A',
      event_id: 'TH-EVT-2026-007',
      latitude: 13.1695,
      longitude: 80.2648,
      geom_wkt: 'SRID=4326;POINT(80.2648 13.1695)',
      acq_date: '2026-08-18',
      acq_time: '01:40',
      acq_datetime: '2026-08-18T01:40:00Z',
      satellite: 'VIIRS-SNPP',
      frp: 22.0,
      brightness_temp_k: 318.0,
      confidence: 80,
      scan: 0.75,
      track: 0.75,
      day_night: 'N',
      data_source: 'NASA_FIRMS_VIIRS',
      land_use_context: 'Refinery Tank Farm & Petrochemical synthesis',
      facility_id: 'FAC-TN-005',
      distance_to_facility_m: 380.0,
    },
    {
      id: 'OBS-007-B',
      event_id: 'TH-EVT-2026-007',
      latitude: 13.1695,
      longitude: 80.2648,
      geom_wkt: 'SRID=4326;POINT(80.2648 13.1695)',
      acq_date: '2026-08-21',
      acq_time: '13:55',
      acq_datetime: '2026-08-21T13:55:00Z',
      satellite: 'VIIRS-NOAA20',
      frp: 48.0,
      brightness_temp_k: 338.0,
      confidence: 89,
      scan: 0.75,
      track: 0.75,
      day_night: 'D',
      data_source: 'NASA_FIRMS_VIIRS',
      land_use_context: 'Refinery Tank Farm & Petrochemical synthesis',
      facility_id: 'FAC-TN-005',
      distance_to_facility_m: 380.0,
    },
    {
      id: 'OBS-007-C',
      event_id: 'TH-EVT-2026-007',
      latitude: 13.1695,
      longitude: 80.2648,
      geom_wkt: 'SRID=4326;POINT(80.2648 13.1695)',
      acq_date: '2026-08-24',
      acq_time: '02:10',
      acq_datetime: '2026-08-24T02:10:00Z',
      satellite: 'VIIRS-SNPP',
      frp: 98.4,
      brightness_temp_k: 362.1,
      confidence: 95,
      scan: 0.75,
      track: 0.75,
      day_night: 'N',
      data_source: 'NASA_FIRMS_VIIRS',
      land_use_context: 'Refinery Tank Farm & Petrochemical synthesis',
      facility_id: 'FAC-TN-005',
      distance_to_facility_m: 380.0,
    },

    // Agricultural Crop Fire (Far from industry)
    {
      id: 'OBS-009-A',
      event_id: 'TH-EVT-2026-009',
      latitude: 30.2450,
      longitude: 75.8420,
      geom_wkt: 'SRID=4326;POINT(75.8420 30.2450)',
      acq_date: '2026-08-24',
      acq_time: '13:10',
      acq_datetime: '2026-08-24T13:10:00Z',
      satellite: 'VIIRS-SNPP',
      frp: 28.4,
      brightness_temp_k: 326.0,
      confidence: 85,
      scan: 0.75,
      track: 0.75,
      day_night: 'D',
      data_source: 'NASA_FIRMS_VIIRS',
      land_use_context: 'Agricultural Cropland (Paddy Stubble)',
      facility_id: null,
      distance_to_facility_m: 842000.0,
    },
  ];

  return rows;
}

export const POSTGIS_TABLE_SCHEMAS: PostgisTableSchema[] = [
  {
    tableName: 'industrial_facilities',
    description: 'Master spatial catalog of georeferenced refineries, power plants, chemical estates, and steel smelters.',
    rowCount: INDIAN_INDUSTRIAL_FACILITIES.length,
    columns: [
      { name: 'id', type: 'VARCHAR(32)', isPrimary: true, nullable: false, description: 'Unique Facility identifier (e.g. FAC-GJ-001)' },
      { name: 'name', type: 'VARCHAR(255)', nullable: false, description: 'Official complex / plant name' },
      { name: 'type', type: 'VARCHAR(100)', nullable: false, description: 'Industry classification type' },
      { name: 'hazard_level', type: 'VARCHAR(32)', nullable: false, description: 'Risk tier (Low | Moderate | High | Severe)' },
      { name: 'latitude', type: 'DOUBLE PRECISION', nullable: false, description: 'WGS84 Latitude' },
      { name: 'longitude', type: 'DOUBLE PRECISION', nullable: false, description: 'WGS84 Longitude' },
      { name: 'geom', type: 'geometry(Point, 4326)', isGeometry: true, nullable: false, description: 'PostGIS 2D Point Geometry in EPSG:4326' },
      { name: 'footprint_radius_m', type: 'INTEGER', nullable: false, description: 'Industrial perimeter screening buffer radius in meters' },
      { name: 'state', type: 'VARCHAR(100)', nullable: false, description: 'State jurisdiction' },
      { name: 'district', type: 'VARCHAR(100)', nullable: false, description: 'District administration' },
      { name: 'operator', type: 'VARCHAR(255)', nullable: false, description: 'Operating industrial corporate entity' },
      { name: 'expected_baseline_flares', type: 'INTEGER', nullable: false, description: 'Standard permitted operational flare count' },
      { name: 'emergency_contact', type: 'VARCHAR(64)', nullable: false, description: 'On-duty emergency control phone' },
      { name: 'compliance_zone', type: 'VARCHAR(255)', nullable: false, description: 'Environmental CEPI / Hazardous chemical zone classification' },
      { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE', nullable: false, description: 'Record initialization timestamp' },
    ],
    indexes: [
      { name: 'idx_facilities_geom', type: 'GIST', columns: ['geom'], description: 'PostGIS Spatial GIST Index for high-speed ST_DWithin and bounding box filtering' },
      { name: 'idx_facilities_state', type: 'BTREE', columns: ['state'], description: 'B-Tree index for regional filtering' },
      { name: 'idx_facilities_hazard', type: 'BTREE', columns: ['hazard_level'], description: 'B-Tree index for hazard tier queries' },
    ],
  },
  {
    tableName: 'thermal_observations',
    description: 'Radiometric satellite thermal detection points from NASA VIIRS & MODIS passes with FRP telemetry.',
    rowCount: generateThermalObservationsRows().length,
    columns: [
      { name: 'id', type: 'VARCHAR(64)', isPrimary: true, nullable: false, description: 'Unique Observation ID (e.g. OBS-001-A)' },
      { name: 'event_id', type: 'VARCHAR(64)', nullable: false, description: 'Grouped thermal cluster / event tracking ID' },
      { name: 'latitude', type: 'DOUBLE PRECISION', nullable: false, description: 'WGS84 Detection Latitude' },
      { name: 'longitude', type: 'DOUBLE PRECISION', nullable: false, description: 'WGS84 Detection Longitude' },
      { name: 'geom', type: 'geometry(Point, 4326)', isGeometry: true, nullable: false, description: 'PostGIS 2D Point Geometry in EPSG:4326' },
      { name: 'acq_date', type: 'DATE', nullable: false, description: 'Acquisition Date (YYYY-MM-DD)' },
      { name: 'acq_time', type: 'VARCHAR(8)', nullable: false, description: 'Acquisition UTC Time (HHMM)' },
      { name: 'acq_datetime', type: 'TIMESTAMP WITH TIME ZONE', nullable: false, description: 'ISO 8601 Timestamp of satellite overpass' },
      { name: 'satellite', type: 'VARCHAR(64)', nullable: false, description: 'Sensor platform (VIIRS-SNPP, MODIS-Aqua, etc.)' },
      { name: 'frp', type: 'DOUBLE PRECISION', nullable: false, description: 'Fire Radiative Power (Megawatts - MW)' },
      { name: 'brightness_temp_k', type: 'DOUBLE PRECISION', nullable: false, description: 'Radiometric Brightness Temperature (Kelvin)' },
      { name: 'confidence', type: 'INTEGER', nullable: false, description: 'NASA FIRMS Detection Confidence (0-100%)' },
      { name: 'scan', type: 'DOUBLE PRECISION', nullable: true, description: 'Along-scan pixel resolution (km)' },
      { name: 'track', type: 'DOUBLE PRECISION', nullable: true, description: 'Along-track pixel resolution (km)' },
      { name: 'day_night', type: 'CHAR(1)', nullable: false, description: 'Day ("D") or Night ("N") pass' },
      { name: 'data_source', type: 'VARCHAR(64)', nullable: false, description: 'Origin (NASA_FIRMS_VIIRS, NASA_FIRMS_MODIS)' },
      { name: 'land_use_context', type: 'VARCHAR(255)', nullable: true, description: 'Geospatial land-use / zoning context' },
      { name: 'facility_id', type: 'VARCHAR(32)', isForeign: true, nullable: true, description: 'Nearest facility foreign key' },
      { name: 'distance_to_facility_m', type: 'DOUBLE PRECISION', nullable: true, description: 'Spatial distance to nearest facility footprint in meters' },
      { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE', nullable: false, description: 'Ingestion timestamp' },
    ],
    indexes: [
      { name: 'idx_thermal_obs_geom', type: 'GIST', columns: ['geom'], description: 'PostGIS Spatial GIST Index for spatial join & distance metrics' },
      { name: 'idx_thermal_obs_datetime', type: 'BTREE', columns: ['acq_datetime'], description: 'Temporal index for time-series persistence window queries' },
      { name: 'idx_thermal_obs_frp', type: 'BTREE', columns: ['frp'], description: 'B-Tree index for sorting acute thermal emission intensity' },
      { name: 'idx_thermal_obs_facility', type: 'BTREE', columns: ['facility_id'], description: 'Foreign key lookup acceleration' },
    ],
  },
];

export const PREDEFINED_POSTGIS_QUERIES: PredefinedQuery[] = [
  {
    id: 'spatial_join_buffer',
    title: 'Spatial Collision Join: ST_DWithin Industrial Buffers',
    category: 'Spatial Join',
    description: 'Finds all satellite thermal anomalies occurring within the configured hazardous perimeter buffer (1.5x footprint) of industrial facilities using PostGIS spatial GIST indexing.',
    sql: `SELECT 
    obs.id AS observation_id,
    obs.event_id,
    obs.satellite,
    obs.frp AS frp_mw,
    obs.brightness_temp_k,
    obs.confidence,
    fac.name AS facility_name,
    fac.type AS facility_type,
    fac.hazard_level,
    ROUND(ST_Distance(obs.geom::geography, fac.geom::geography)::numeric, 1) AS distance_meters
FROM thermal_observations obs
JOIN industrial_facilities fac
  ON ST_DWithin(obs.geom::geography, fac.geom::geography, fac.footprint_radius_m * 1.5)
ORDER BY obs.frp DESC;`,
  },
  {
    id: 'knn_nearest_facility',
    title: 'K-Nearest Facility (KNN) Distance Analysis',
    category: 'Nearest Neighbor',
    description: 'Calculates the exact geodesic distance in meters from each satellite observation to its nearest facility using ST_Distance geography.',
    sql: `SELECT 
    obs.id,
    obs.satellite,
    obs.frp AS frp_mw,
    obs.acq_datetime,
    fac.name AS nearest_facility,
    fac.operator,
    ROUND(ST_Distance(obs.geom::geography, fac.geom::geography)::numeric, 1) AS distance_meters,
    CASE 
        WHEN ST_DWithin(obs.geom::geography, fac.geom::geography, 1000) THEN 'Within Core Perimeter'
        WHEN ST_DWithin(obs.geom::geography, fac.geom::geography, 2500) THEN 'Secondary Buffer Zone'
        ELSE 'Regional Surrounding'
    END AS proximity_zone
FROM thermal_observations obs
CROSS JOIN LATERAL (
    SELECT id, name, operator, geom
    FROM industrial_facilities
    ORDER BY obs.geom <-> geom
    LIMIT 1
) fac
ORDER BY distance_meters ASC;`,
  },
  {
    id: 'temporal_persistence_cluster',
    title: 'Temporal Persistence & Multi-Pass Heat Aggregation',
    category: 'Persistence',
    description: 'Aggregates multi-pass satellite visits over the 14-day observation window to classify continuous operational flares vs temporary spikes.',
    sql: `SELECT 
    fac.name AS facility_name,
    fac.type AS facility_type,
    COUNT(obs.id) AS satellite_overpass_count,
    COUNT(DISTINCT obs.acq_date) AS unique_active_days,
    ROUND(AVG(obs.frp)::numeric, 2) AS avg_frp_mw,
    MAX(obs.frp) AS peak_frp_mw,
    MIN(obs.acq_datetime) AS first_observed,
    MAX(obs.acq_datetime) AS latest_observed,
    CASE 
        WHEN COUNT(DISTINCT obs.acq_date) >= 4 THEN 'PERSISTENT'
        WHEN COUNT(DISTINCT obs.acq_date) >= 2 THEN 'RECURRING'
        ELSE 'SINGLE_PASS'
    END AS persistence_status
FROM industrial_facilities fac
LEFT JOIN thermal_observations obs 
  ON ST_DWithin(obs.geom::geography, fac.geom::geography, 2500)
GROUP BY fac.name, fac.type
ORDER BY peak_frp_mw DESC NULLS LAST;`,
  },
  {
    id: 'outlier_flare_spike',
    title: 'Severe Radiative Power (FRP > 80 MW) Outlier Screening',
    category: 'Outlier Detection',
    description: 'Filters for acute high-energy thermal anomalies requiring immediate human verification triage.',
    sql: `SELECT 
    obs.id,
    obs.event_id,
    obs.satellite,
    obs.frp AS frp_mw,
    obs.brightness_temp_k,
    obs.confidence,
    obs.day_night,
    fac.name AS facility_name,
    fac.hazard_level
FROM thermal_observations obs
JOIN industrial_facilities fac ON obs.facility_id = fac.id
WHERE obs.frp >= 80.0 AND fac.hazard_level = 'Severe'
ORDER BY obs.frp DESC;`,
  },
];

/**
 * Execute simulated PostGIS queries in-engine
 */
export function executePostgisQuery(querySql: string): PostgisQueryResult {
  const startTime = performance.now();
  const normalizedSql = querySql.trim().replace(/\s+/g, ' ');

  const observations = generateThermalObservationsRows();
  const facilities = INDIAN_INDUSTRIAL_FACILITIES;

  let rows: Record<string, any>[] = [];
  let spatialIndexUsed: string | null = 'idx_thermal_obs_geom (GIST)';

  if (normalizedSql.includes('ST_DWithin') && normalizedSql.includes('industrial_facilities') && !normalizedSql.includes('GROUP BY')) {
    // Spatial Join
    for (const obs of observations) {
      for (const fac of facilities) {
        const dist = calculateHaversineDistance(obs.latitude, obs.longitude, fac.latitude, fac.longitude);
        if (dist <= fac.footprintRadiusMeters * 1.5) {
          rows.push({
            observation_id: obs.id,
            event_id: obs.event_id,
            satellite: obs.satellite,
            frp_mw: obs.frp,
            brightness_temp_k: obs.brightness_temp_k,
            confidence: obs.confidence,
            facility_name: fac.name,
            facility_type: fac.type,
            hazard_level: fac.hazardLevel,
            distance_meters: Math.round(dist * 10) / 10,
          });
        }
      }
    }
    rows.sort((a, b) => b.frp_mw - a.frp_mw);
  } else if (normalizedSql.includes('GROUP BY') || normalizedSql.includes('persistence_status')) {
    // Persistence aggregation
    for (const fac of facilities) {
      const matchingObs = observations.filter((obs) => {
        const dist = calculateHaversineDistance(obs.latitude, obs.longitude, fac.latitude, fac.longitude);
        return dist <= 2500;
      });

      if (matchingObs.length > 0) {
        const dates = new Set(matchingObs.map((o) => o.acq_date));
        const peakFrp = Math.max(...matchingObs.map((o) => o.frp));
        const avgFrp = matchingObs.reduce((sum, o) => sum + o.frp, 0) / matchingObs.length;
        const firstObs = matchingObs.reduce((min, o) => (o.acq_datetime < min ? o.acq_datetime : min), matchingObs[0].acq_datetime);
        const latestObs = matchingObs.reduce((max, o) => (o.acq_datetime > max ? o.acq_datetime : max), matchingObs[0].acq_datetime);

        rows.push({
          facility_name: fac.name,
          facility_type: fac.type,
          satellite_overpass_count: matchingObs.length,
          unique_active_days: dates.size,
          avg_frp_mw: Math.round(avgFrp * 100) / 100,
          peak_frp_mw: peakFrp,
          first_observed: firstObs,
          latest_observed: latestObs,
          persistence_status: dates.size >= 4 ? 'PERSISTENT' : dates.size >= 2 ? 'RECURRING' : 'SINGLE_PASS',
        });
      }
    }
    rows.sort((a, b) => b.peak_frp_mw - a.peak_frp_mw);
  } else if (normalizedSql.includes('LATERAL') || normalizedSql.includes('<->') || normalizedSql.includes('KNN')) {
    // KNN
    for (const obs of observations) {
      let minDist = Infinity;
      let nearestFac = facilities[0];
      for (const fac of facilities) {
        const d = calculateHaversineDistance(obs.latitude, obs.longitude, fac.latitude, fac.longitude);
        if (d < minDist) {
          minDist = d;
          nearestFac = fac;
        }
      }

      rows.push({
        id: obs.id,
        satellite: obs.satellite,
        frp_mw: obs.frp,
        acq_datetime: obs.acq_datetime,
        nearest_facility: nearestFac.name,
        operator: nearestFac.operator,
        distance_meters: Math.round(minDist * 10) / 10,
        proximity_zone: minDist <= 1000 ? 'Within Core Perimeter' : minDist <= 2500 ? 'Secondary Buffer Zone' : 'Regional Surrounding',
      });
    }
    rows.sort((a, b) => a.distance_meters - b.distance_meters);
  } else if (normalizedSql.includes('WHERE obs.frp >= 80') || normalizedSql.includes('frp >= 80')) {
    // High FRP Outlier
    for (const obs of observations.filter((o) => o.frp >= 80.0)) {
      const fac = facilities.find((f) => f.id === obs.facility_id);
      if (fac && fac.hazardLevel === 'Severe') {
        rows.push({
          id: obs.id,
          event_id: obs.event_id,
          satellite: obs.satellite,
          frp_mw: obs.frp,
          brightness_temp_k: obs.brightness_temp_k,
          confidence: obs.confidence,
          day_night: obs.day_night,
          facility_name: fac.name,
          hazard_level: fac.hazardLevel,
        });
      }
    }
  } else {
    // General SELECT fallback
    rows = observations.slice(0, 10).map((o) => ({
      id: o.id,
      event_id: o.event_id,
      satellite: o.satellite,
      latitude: o.latitude,
      longitude: o.longitude,
      frp_mw: o.frp,
      confidence: o.confidence,
      facility_id: o.facility_id,
      distance_m: o.distance_to_facility_m,
    }));
  }

  const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100 + 1.25;
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  const explainPlan = [
    '->  Nested Loop Join (cost=0.15..12.80 rows=' + rows.length + ' width=142)',
    '      Join Filter: ST_DWithin(obs.geom::geography, fac.geom::geography, (fac.footprint_radius_m * 1.5))',
    '      ->  Index Scan using idx_thermal_obs_geom on thermal_observations obs (cost=0.15..6.20 rows=' + observations.length + ')',
    '      ->  Index Scan using idx_facilities_geom on industrial_facilities fac (cost=0.15..4.50 rows=' + facilities.length + ')',
    'Planning Time: 0.182 ms',
    'Execution Time: ' + executionTimeMs.toFixed(3) + ' ms',
  ];

  return {
    query: querySql,
    executionTimeMs,
    rowCount: rows.length,
    spatialIndexUsed,
    columns,
    rows,
    explainPlan,
  };
}
