-- ============================================================================
-- GeoFlare: PostgreSQL + PostGIS Spatial Database Schema
-- AI Industrial Thermal Intelligence & Persistent Source Monitoring
-- Target Database: PostgreSQL 14+ / PostGIS 3.2+
-- ============================================================================

-- 1. Enable Spatial Extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean existing objects (if re-initializing)
DROP VIEW IF EXISTS v_active_industrial_anomalies CASCADE;
DROP VIEW IF EXISTS v_thermal_persistence_summary CASCADE;
DROP TABLE IF EXISTS thermal_observations CASCADE;
DROP TABLE IF EXISTS industrial_facilities CASCADE;

-- ============================================================================
-- 2. Table: industrial_facilities
-- Stores georeferenced industrial complexes, refineries, smelters, and hazard perimeters
-- ============================================================================
CREATE TABLE industrial_facilities (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    hazard_level VARCHAR(32) NOT NULL CHECK (hazard_level IN ('Low', 'Moderate', 'High', 'Severe')),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom geometry(Point, 4326) NOT NULL,
    footprint_radius_m INTEGER NOT NULL DEFAULT 1500,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    operator VARCHAR(255) NOT NULL,
    expected_baseline_flares INTEGER NOT NULL DEFAULT 1,
    emergency_contact VARCHAR(64) NOT NULL,
    compliance_zone VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial GIST Index for high-performance radius & bounding box searches
CREATE INDEX idx_facilities_geom ON industrial_facilities USING GIST (geom);
CREATE INDEX idx_facilities_state ON industrial_facilities (state);
CREATE INDEX idx_facilities_hazard ON industrial_facilities (hazard_level);

-- ============================================================================
-- 3. Table: thermal_observations
-- Ingests NASA FIRMS VIIRS & MODIS satellite passes with thermal radiometric telemetry
-- ============================================================================
CREATE TABLE thermal_observations (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom geometry(Point, 4326) NOT NULL,
    acq_date DATE NOT NULL,
    acq_time VARCHAR(8) NOT NULL,
    acq_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    satellite VARCHAR(64) NOT NULL,
    frp DOUBLE PRECISION NOT NULL, -- Fire Radiative Power in Megawatts (MW)
    brightness_temp_k DOUBLE PRECISION NOT NULL, -- Brightness Temperature (Kelvin)
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    scan DOUBLE PRECISION DEFAULT 0.75,
    track DOUBLE PRECISION DEFAULT 0.75,
    day_night CHAR(1) NOT NULL CHECK (day_night IN ('D', 'N')),
    data_source VARCHAR(64) NOT NULL DEFAULT 'NASA_FIRMS_VIIRS',
    land_use_context VARCHAR(255),
    facility_id VARCHAR(32) REFERENCES industrial_facilities(id) ON DELETE SET NULL,
    distance_to_facility_m DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial & Composite Query Indexes
CREATE INDEX idx_thermal_obs_geom ON thermal_observations USING GIST (geom);
CREATE INDEX idx_thermal_obs_datetime ON thermal_observations (acq_datetime);
CREATE INDEX idx_thermal_obs_frp ON thermal_observations (frp);
CREATE INDEX idx_thermal_obs_facility ON thermal_observations (facility_id);
CREATE INDEX idx_thermal_obs_event ON thermal_observations (event_id);
CREATE INDEX idx_thermal_obs_satellite ON thermal_observations (satellite);

-- ============================================================================
-- 4. PostGIS Spatial Views
-- ============================================================================

-- View: Thermal anomalies within industrial buffer zones (Spatial Collision Join)
CREATE OR REPLACE VIEW v_active_industrial_anomalies AS
SELECT 
    obs.id AS observation_id,
    obs.event_id,
    obs.acq_datetime,
    obs.satellite,
    obs.frp AS frp_mw,
    obs.brightness_temp_k,
    obs.confidence,
    obs.day_night,
    fac.id AS facility_id,
    fac.name AS facility_name,
    fac.type AS facility_type,
    fac.hazard_level,
    fac.operator,
    fac.footprint_radius_m,
    ROUND(ST_Distance(obs.geom::geography, fac.geom::geography)::numeric, 2) AS distance_meters,
    ST_AsGeoJSON(obs.geom) AS observation_geojson,
    ST_AsGeoJSON(fac.geom) AS facility_geojson
FROM thermal_observations obs
JOIN industrial_facilities fac
  ON ST_DWithin(obs.geom::geography, fac.geom::geography, fac.footprint_radius_m * 1.5)
ORDER BY obs.frp DESC;

-- View: Multi-Temporal Persistence Aggregations per Facility
CREATE OR REPLACE VIEW v_thermal_persistence_summary AS
SELECT 
    fac.id AS facility_id,
    fac.name AS facility_name,
    fac.type AS facility_type,
    fac.hazard_level,
    COUNT(obs.id) AS total_satellite_passes,
    COUNT(DISTINCT obs.acq_date) AS active_detection_days,
    ROUND(AVG(obs.frp)::numeric, 2) AS average_frp_mw,
    MAX(obs.frp) AS peak_frp_mw,
    MAX(obs.brightness_temp_k) AS peak_temp_kelvin,
    MIN(obs.acq_datetime) AS first_observed,
    MAX(obs.acq_datetime) AS latest_observed,
    CASE 
        WHEN COUNT(DISTINCT obs.acq_date) >= 4 THEN 'persistent'
        WHEN COUNT(DISTINCT obs.acq_date) >= 2 THEN 'recurring'
        ELSE 'single'
    END AS persistence_classification
FROM industrial_facilities fac
LEFT JOIN thermal_observations obs 
  ON ST_DWithin(obs.geom::geography, fac.geom::geography, fac.footprint_radius_m * 1.5)
GROUP BY fac.id, fac.name, fac.type, fac.hazard_level
ORDER BY peak_frp_mw DESC NULLS LAST;

-- ============================================================================
-- 5. Stored Spatial Functions
-- ============================================================================

-- Function: Find nearby facilities for any GPS coordinate within radius
CREATE OR REPLACE FUNCTION fn_find_nearby_facilities(
    p_lat DOUBLE PRECISION,
    p_lon DOUBLE PRECISION,
    p_radius_meters DOUBLE PRECISION DEFAULT 5000.0
)
RETURNS TABLE (
    facility_id VARCHAR,
    facility_name VARCHAR,
    facility_type VARCHAR,
    hazard_level VARCHAR,
    distance_meters DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fac.id,
        fac.name,
        fac.type,
        fac.hazard_level,
        ST_Distance(
            ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
            fac.geom::geography
        ) AS distance_meters
    FROM industrial_facilities fac
    WHERE ST_DWithin(
        ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
        fac.geom::geography,
        p_radius_meters
    )
    ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. PRE-LOADED DEMO DATASET SEEDS
-- Key Indian industrial corridors, chemical zones, refineries & satellite passes
-- ============================================================================

-- Seed: Industrial Facilities
INSERT INTO industrial_facilities (
    id, name, type, hazard_level, latitude, longitude, geom, 
    footprint_radius_m, state, district, operator, expected_baseline_flares, 
    emergency_contact, compliance_zone
) VALUES 
('FAC-GJ-001', 'Jamnagar Petrochemical & Refining Complex', 'Petrochemical Refinery', 'Severe', 22.3845, 69.8322, ST_SetSRID(ST_MakePoint(69.8322, 22.3845), 4326), 1800, 'Gujarat', 'Jamnagar', 'Reliance Industries / Nayara Energy', 8, '+91-288-240100', 'Coastal Hazardous Chemical Zone-A'),
('FAC-CG-002', 'Korba Super Thermal Power & Aluminum Smelter', 'Coal Thermal Power Plant', 'High', 22.3592, 82.7481, ST_SetSRID(ST_MakePoint(82.7481, 22.3592), 4326), 1400, 'Chhattisgarh', 'Korba', 'NTPC Ltd. / BALCO Vedanta', 2, '+91-7759-224400', 'Critically Polluted Industrial Cluster (CEPI)'),
('FAC-AP-003', 'Visakhapatnam Steel Plant & Pharma SEZ', 'Integrated Steel Smelter', 'Severe', 17.6328, 83.1895, ST_SetSRID(ST_MakePoint(83.1895, 17.6328), 4326), 1600, 'Andhra Pradesh', 'Visakhapatnam', 'Rashtriya Ispat Nigam Ltd (RINL)', 4, '+91-891-2518200', 'Coastal Industrial Heavy Metallurgical Corridor'),
('FAC-MP-004', 'Singrauli Thermal Power Hub & Coal Mines', 'Open-Cast Mining & Smelting', 'High', 24.1205, 82.6842, ST_SetSRID(ST_MakePoint(82.6842, 24.1205), 4326), 2200, 'Madhya Pradesh', 'Singrauli', 'NCL Coal India / NTPC Shaktinagar', 1, '+91-7805-256100', 'National Coal Energy Reserve & Emission Zone'),
('FAC-TN-005', 'Manali Petrochemicals & Fertilizer Corridor', 'Chemical & Pharma Synthesis', 'Severe', 13.1672, 80.2621, ST_SetSRID(ST_MakePoint(80.2621, 13.1672), 4326), 1100, 'Tamil Nadu', 'Chennai / Tiruvallur', 'CPCL / Madras Fertilizers / MPL', 3, '+91-44-25941200', 'High Density Urban-Industrial Buffer Zone'),
('FAC-GJ-006', 'Ankleshwar GIDC Chemical & Bulk Drug Estate', 'Chemical & Pharma Synthesis', 'Severe', 21.6284, 73.0125, ST_SetSRID(ST_MakePoint(73.0125, 21.6284), 4326), 1250, 'Gujarat', 'Bharuch', 'GIDC Industrial Estate Association', 1, '+91-2646-220500', 'Severe Industrial Chemical Hazard Zone'),
('FAC-JH-007', 'Bokaro Integrated Steel & Heavy Engineering', 'Integrated Steel Smelter', 'High', 23.6698, 86.1512, ST_SetSRID(ST_MakePoint(86.1512, 23.6698), 4326), 1500, 'Jharkhand', 'Bokaro', 'Steel Authority of India Ltd (SAIL)', 5, '+91-6542-240200', 'Damodar Valley Industrial Basin'),
('FAC-GJ-008', 'Hazira Heavy Manufacturing & LNG Terminal', 'Gas Processing Terminal', 'Severe', 21.1158, 72.6521, ST_SetSRID(ST_MakePoint(72.6521, 21.1158), 4326), 1700, 'Gujarat', 'Surat', 'AM/NS India / Shell LNG / L&T', 4, '+91-261-6682000', 'Gulf of Khambhat Industrial Ingress');

-- Seed: Thermal Observations (Multi-Temporal Satellite Passes)
INSERT INTO thermal_observations (
    id, event_id, latitude, longitude, geom, acq_date, acq_time, acq_datetime, 
    satellite, frp, brightness_temp_k, confidence, scan, track, day_night, 
    data_source, land_use_context, facility_id, distance_to_facility_m
) VALUES 
-- Jamnagar Acute Spike (TH-EVT-2026-001)
('OBS-001-A', 'TH-EVT-2026-001', 22.3872, 69.8345, ST_SetSRID(ST_MakePoint(69.8345, 22.3872), 4326), '2026-08-14', '02:15', '2026-08-14 02:15:00+00', 'VIIRS-SNPP', 28.2, 322.0, 88, 0.75, 0.75, 'N', 'NASA_FIRMS_VIIRS', 'Heavy Industrial / Hydrocarbon Processing Area', 'FAC-GJ-001', 382.4),
('OBS-001-B', 'TH-EVT-2026-001', 22.3872, 69.8345, ST_SetSRID(ST_MakePoint(69.8345, 22.3872), 4326), '2026-08-16', '14:20', '2026-08-16 14:20:00+00', 'MODIS-Aqua', 31.0, 325.0, 84, 1.00, 1.00, 'D', 'NASA_FIRMS_MODIS', 'Heavy Industrial / Hydrocarbon Processing Area', 'FAC-GJ-001', 382.4),
('OBS-001-C', 'TH-EVT-2026-001', 22.3872, 69.8345, ST_SetSRID(ST_MakePoint(69.8345, 22.3872), 4326), '2026-08-18', '01:50', '2026-08-18 01:50:00+00', 'VIIRS-NOAA20', 29.5, 324.0, 90, 0.75, 0.75, 'N', 'NASA_FIRMS_VIIRS', 'Heavy Industrial / Hydrocarbon Processing Area', 'FAC-GJ-001', 382.4),
('OBS-001-D', 'TH-EVT-2026-001', 22.3872, 69.8345, ST_SetSRID(ST_MakePoint(69.8345, 22.3872), 4326), '2026-08-20', '13:40', '2026-08-20 13:40:00+00', 'VIIRS-SNPP', 34.1, 328.0, 89, 0.75, 0.75, 'D', 'NASA_FIRMS_VIIRS', 'Heavy Industrial / Hydrocarbon Processing Area', 'FAC-GJ-001', 382.4),
('OBS-001-E', 'TH-EVT-2026-001', 22.3872, 69.8345, ST_SetSRID(ST_MakePoint(69.8345, 22.3872), 4326), '2026-08-22', '02:05', '2026-08-22 02:05:00+00', 'VIIRS-SNPP', 62.4, 342.0, 92, 0.75, 0.75, 'N', 'NASA_FIRMS_VIIRS', 'Heavy Industrial / Hydrocarbon Processing Area', 'FAC-GJ-001', 382.4),
('OBS-001-F', 'TH-EVT-2026-001', 22.3872, 69.8345, ST_SetSRID(ST_MakePoint(69.8345, 22.3872), 4326), '2026-08-23', '14:10', '2026-08-23 14:10:00+00', 'MODIS-Aqua', 112.8, 360.0, 94, 1.00, 1.00, 'D', 'NASA_FIRMS_MODIS', 'Heavy Industrial / Hydrocarbon Processing Area', 'FAC-GJ-001', 382.4),
('OBS-001-G', 'TH-EVT-2026-001', 22.3872, 69.8345, ST_SetSRID(ST_MakePoint(69.8345, 22.3872), 4326), '2026-08-24', '02:30', '2026-08-24 02:30:00+00', 'VIIRS-SNPP', 184.5, 378.4, 96, 0.75, 0.75, 'N', 'NASA_FIRMS_VIIRS', 'Heavy Industrial / Hydrocarbon Processing Area', 'FAC-GJ-001', 382.4),

-- Jamnagar Flare Stack #1 Routine Flare (TH-EVT-2026-002)
('OBS-002-A', 'TH-EVT-2026-002', 22.3789, 69.8260, ST_SetSRID(ST_MakePoint(69.8260, 22.3789), 4326), '2026-08-10', '13:30', '2026-08-10 13:30:00+00', 'VIIRS-SNPP', 34.0, 329.0, 90, 0.75, 0.75, 'D', 'NASA_FIRMS_VIIRS', 'Industrial Utility Zone (Flare Stack Mast)', 'FAC-GJ-001', 880.0),
('OBS-002-B', 'TH-EVT-2026-002', 22.3789, 69.8260, ST_SetSRID(ST_MakePoint(69.8260, 22.3789), 4326), '2026-08-14', '13:20', '2026-08-14 13:20:00+00', 'MODIS-Aqua', 35.1, 330.0, 88, 1.00, 1.00, 'D', 'NASA_FIRMS_MODIS', 'Industrial Utility Zone (Flare Stack Mast)', 'FAC-GJ-001', 880.0),
('OBS-002-C', 'TH-EVT-2026-002', 22.3789, 69.8260, ST_SetSRID(ST_MakePoint(69.8260, 22.3789), 4326), '2026-08-18', '14:05', '2026-08-18 14:05:00+00', 'VIIRS-NOAA20', 38.0, 333.0, 93, 0.75, 0.75, 'D', 'NASA_FIRMS_VIIRS', 'Industrial Utility Zone (Flare Stack Mast)', 'FAC-GJ-001', 880.0),
('OBS-002-D', 'TH-EVT-2026-002', 22.3789, 69.8260, ST_SetSRID(ST_MakePoint(69.8260, 22.3789), 4326), '2026-08-24', '02:15', '2026-08-24 02:15:00+00', 'VIIRS-NOAA20', 36.4, 331.0, 92, 0.75, 0.75, 'N', 'NASA_FIRMS_VIIRS', 'Industrial Utility Zone (Flare Stack Mast)', 'FAC-GJ-001', 880.0),

-- Ankleshwar GIDC Chemical Solvent Outlier (TH-EVT-2026-003)
('OBS-003-A', 'TH-EVT-2026-003', 21.6310, 73.0160, ST_SetSRID(ST_MakePoint(73.0160, 21.6310), 4326), '2026-08-21', '02:40', '2026-08-21 02:40:00+00', 'VIIRS-SNPP', 12.0, 312.0, 65, 0.75, 0.75, 'N', 'NASA_FIRMS_VIIRS', 'Chemical & Hazardous Storage Industrial Estate', 'FAC-GJ-006', 463.2),
('OBS-003-B', 'TH-EVT-2026-003', 21.6310, 73.0160, ST_SetSRID(ST_MakePoint(73.0160, 21.6310), 4326), '2026-08-23', '14:30', '2026-08-23 14:30:00+00', 'MODIS-Terra', 46.5, 339.0, 88, 1.00, 1.00, 'D', 'NASA_FIRMS_MODIS', 'Chemical & Hazardous Storage Industrial Estate', 'FAC-GJ-006', 463.2),
('OBS-003-C', 'TH-EVT-2026-003', 21.6310, 73.0160, ST_SetSRID(ST_MakePoint(73.0160, 21.6310), 4326), '2026-08-24', '02:20', '2026-08-24 02:20:00+00', 'VIIRS-SNPP', 88.2, 358.2, 94, 0.75, 0.75, 'N', 'NASA_FIRMS_VIIRS', 'Chemical & Hazardous Storage Industrial Estate', 'FAC-GJ-006', 463.2),

-- Korba Super Thermal Power Slag & Ash (TH-EVT-2026-004)
('OBS-004-A', 'TH-EVT-2026-004', 22.3610, 82.7512, ST_SetSRID(ST_MakePoint(82.7512, 22.3610), 4326), '2026-08-11', '13:00', '2026-08-11 13:00:00+00', 'MODIS-Aqua', 60.5, 340.0, 89, 1.00, 1.00, 'D', 'NASA_FIRMS_MODIS', 'Coal Power Generation & Ash Pond', 'FAC-CG-002', 380.0),
('OBS-004-B', 'TH-EVT-2026-004', 22.3610, 82.7512, ST_SetSRID(ST_MakePoint(82.7512, 22.3610), 4326), '2026-08-16', '13:15', '2026-08-16 13:15:00+00', 'VIIRS-NOAA20', 65.2, 343.0, 92, 0.75, 0.75, 'D', 'NASA_FIRMS_VIIRS', 'Coal Power Generation & Ash Pond', 'FAC-CG-002', 380.0),
('OBS-004-C', 'TH-EVT-2026-004', 22.3610, 82.7512, ST_SetSRID(ST_MakePoint(82.7512, 22.3610), 4326), '2026-08-24', '01:45', '2026-08-24 01:45:00+00', 'MODIS-Aqua', 64.0, 342.5, 91, 1.00, 1.00, 'D', 'NASA_FIRMS_MODIS', 'Coal Power Generation & Ash Pond', 'FAC-CG-002', 380.0),

-- Visakhapatnam Blast Furnace Persistent Heat (TH-EVT-2026-005)
('OBS-005-A', 'TH-EVT-2026-005', 17.6345, 83.1912, ST_SetSRID(ST_MakePoint(83.1912, 17.6345), 4326), '2026-08-12', '02:10', '2026-08-12 02:10:00+00', 'VIIRS-SNPP', 70.0, 346.0, 92, 0.75, 0.75, 'N', 'NASA_FIRMS_VIIRS', 'Heavy Steel Smelting & Coke Oven Batteries', 'FAC-AP-003', 265.0),
('OBS-005-B', 'TH-EVT-2026-005', 17.6345, 83.1912, ST_SetSRID(ST_MakePoint(83.1912, 17.6345), 4326), '2026-08-18', '02:25', '2026-08-18 02:25:00+00', 'MODIS-Aqua', 71.2, 347.0, 90, 1.00, 1.00, 'N', 'NASA_FIRMS_MODIS', 'Heavy Steel Smelting & Coke Oven Batteries', 'FAC-AP-003', 265.0),
('OBS-005-C', 'TH-EVT-2026-005', 17.6345, 83.1912, ST_SetSRID(ST_MakePoint(83.1912, 17.6345), 4326), '2026-08-24', '02:35', '2026-08-24 02:35:00+00', 'VIIRS-SNPP', 72.8, 348.0, 93, 0.75, 0.75, 'N', 'NASA_FIRMS_VIIRS', 'Heavy Steel Smelting & Coke Oven Batteries', 'FAC-AP-003', 265.0),

-- Manali High-Hazard Tank Flare Outlier (TH-EVT-2026-007)
('OBS-007-A', 'TH-EVT-2026-007', 13.1695, 80.2648, ST_SetSRID(ST_MakePoint(80.2648, 13.1695), 4326), '2026-08-18', '01:40', '2026-08-18 01:40:00+00', 'VIIRS-SNPP', 22.0, 318.0, 80, 0.75, 0.75, 'N', 'NASA_FIRMS_VIIRS', 'Refinery Tank Farm & Petrochemical synthesis', 'FAC-TN-005', 380.0),
('OBS-007-B', 'TH-EVT-2026-007', 13.1695, 80.2648, ST_SetSRID(ST_MakePoint(80.2648, 13.1695), 4326), '2026-08-21', '13:55', '2026-08-21 13:55:00+00', 'VIIRS-NOAA20', 48.0, 338.0, 89, 0.75, 0.75, 'D', 'NASA_FIRMS_VIIRS', 'Refinery Tank Farm & Petrochemical synthesis', 'FAC-TN-005', 380.0),
('OBS-007-C', 'TH-EVT-2026-007', 13.1695, 80.2648, ST_SetSRID(ST_MakePoint(80.2648, 13.1695), 4326), '2026-08-24', '02:10', '2026-08-24 02:10:00+00', 'VIIRS-SNPP', 98.4, 362.1, 95, 0.75, 0.75, 'N', 'NASA_FIRMS_VIIRS', 'Refinery Tank Farm & Petrochemical synthesis', 'FAC-TN-005', 380.0),

-- Agricultural Crop Fire Contrast Case (TH-EVT-2026-009)
('OBS-009-A', 'TH-EVT-2026-009', 30.2450, 75.8420, ST_SetSRID(ST_MakePoint(75.8420, 30.2450), 4326), '2026-08-24', '13:10', '2026-08-24 13:10:00+00', 'VIIRS-SNPP', 28.4, 326.0, 85, 0.75, 0.75, 'D', 'NASA_FIRMS_VIIRS', 'Agricultural Cropland (Paddy Stubble)', NULL, 842000.0);

-- ============================================================================
-- 7. Verification & Sanity Check Query
-- ============================================================================
-- Test spatial query:
SELECT 
    f.name AS facility_name,
    COUNT(o.id) AS satellite_passes,
    MAX(o.frp) AS peak_frp_mw,
    ROUND(AVG(ST_Distance(o.geom::geography, f.geom::geography))::numeric, 1) AS avg_distance_m
FROM industrial_facilities f
JOIN thermal_observations o 
  ON ST_DWithin(o.geom::geography, f.geom::geography, 2500)
GROUP BY f.name
ORDER BY peak_frp_mw DESC;
