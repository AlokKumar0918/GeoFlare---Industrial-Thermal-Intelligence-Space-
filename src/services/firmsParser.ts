/**
 * NASA FIRMS CSV Ingestion, Validation & Spatiotemporal Clustering Engine
 * GeoFlare Industrial Thermal Intelligence
 */
import {
  ThermalObservation,
  ThermalEvent,
  SatelliteSensor,
  IndustrialFacility,
} from '../types';
import { calculateHaversineDistance, findNearestFacility } from './spatial';
import { computePersistenceMetrics, RawObservationInput } from './persistence';
import { classifyThermalEvent } from './classifier';
import { calculateInvestigationPriority } from './prioritization';
import { INDIAN_INDUSTRIAL_FACILITIES } from './mockData';

export interface FirmsCsvParseResult {
  success: boolean;
  source: string;
  mode: 'UPLOAD';
  observationsAccepted: number;
  observationsRejected: number;
  eventsCreated: number;
  globalObservations: number;
  indiaObservations: number;
  data: ThermalEvent[];
  error?: string;
}

/**
 * Splits a CSV line taking into account quotes and escaped characters
 */
export function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

/**
 * Maps raw satellite string to standard SatelliteSensor union type
 */
function normalizeSatelliteSensor(rawSat: string): SatelliteSensor {
  const s = rawSat.toUpperCase().trim();
  if (s.includes('NOAA') || s.includes('20') || s === '1' || s === 'J1') {
    return 'VIIRS-NOAA20';
  }
  if (s.includes('AQUA') || s === 'A') {
    return 'MODIS-Aqua';
  }
  if (s.includes('TERRA') || s === 'T') {
    return 'MODIS-Terra';
  }
  if (s.includes('SENTINEL') || s.includes('S2') || s.includes('MSI')) {
    return 'Sentinel-2-MSI';
  }
  return 'VIIRS-SNPP';
}

/**
 * Detects global continental region and country label for non-India observations
 */
function detectGlobalRegion(lat: number, lng: number): { country: string; region: string } {
  // North America
  if (lat >= 14 && lat <= 75 && lng >= -168 && lng <= -52) {
    if (lat >= 49) return { country: 'Canada', region: 'North America - Boreal / Subarctic' };
    if (lat >= 24 && lat < 49 && lng >= -125 && lng <= -66) {
      return { country: 'United States', region: 'North America - Industrial / Energy Basin' };
    }
    return { country: 'North America', region: 'North America Regional Corridor' };
  }
  // South America
  if (lat >= -56 && lat <= 13 && lng >= -82 && lng <= -34) {
    if (lng >= -74 && lng <= -34 && lat >= -34 && lat <= 5) {
      return { country: 'Brazil', region: 'South America - Cerrado / Amazon Basin' };
    }
    return { country: 'South America', region: 'South America Regional Corridor' };
  }
  // Europe
  if (lat >= 35 && lat <= 72 && lng >= -25 && lng <= 45) {
    return { country: 'Europe', region: 'European Continental Basin' };
  }
  // Africa
  if (lat >= -35 && lat <= 38 && lng >= -18 && lng <= 52) {
    return { country: 'Africa', region: 'African Continental Belt' };
  }
  // Australia / Oceania
  if (lat >= -45 && lat <= -10 && lng >= 112 && lng <= 155) {
    return { country: 'Australia', region: 'Australia - Continental Mineral Belt' };
  }
  // East / Southeast / Central Asia (excluding India)
  if (lat >= -10 && lat <= 65 && lng >= 52 && lng <= 145) {
    if (lat >= 20 && lat <= 50 && lng >= 73 && lng <= 135) {
      return { country: 'China / East Asia', region: 'East Asia Industrial Basin' };
    }
    return { country: 'Asia', region: 'Continental Asia Basin' };
  }
  return { country: 'International', region: 'Global Terrestrial Hotspot' };
}

/**
 * Parses raw NASA FIRMS CSV text into validated ThermalObservation records
 */
export function parseFirmsCsv(csvText: string): {
  success: boolean;
  observations: ThermalObservation[];
  acceptedCount: number;
  rejectedCount: number;
  globalCount: number;
  indiaCount: number;
  error?: string;
} {
  if (!csvText || !csvText.trim()) {
    return {
      success: false,
      observations: [],
      acceptedCount: 0,
      rejectedCount: 0,
      globalCount: 0,
      indiaCount: 0,
      error: 'CSV input is empty. Please provide valid NASA FIRMS CSV data.',
    };
  }

  const rawLines = csvText.trim().split(/\r?\n/);
  const lines = rawLines.filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return {
      success: false,
      observations: [],
      acceptedCount: 0,
      rejectedCount: 0,
      globalCount: 0,
      indiaCount: 0,
      error: 'Invalid CSV format: requires a header row and at least one observation row.',
    };
  }

  // Parse header
  const headerCols = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim().replace(/^["']|["']$/g, ''));

  const latIdx = headerCols.findIndex((h) => h === 'latitude' || h === 'lat');
  const lngIdx = headerCols.findIndex((h) => h === 'longitude' || h === 'lon' || h === 'lng' || h === 'long');

  if (latIdx === -1 || lngIdx === -1) {
    return {
      success: false,
      observations: [],
      acceptedCount: 0,
      rejectedCount: 0,
      globalCount: 0,
      indiaCount: 0,
      error: 'CSV must contain "latitude" and "longitude" header columns.',
    };
  }

  const frpIdx = headerCols.findIndex((h) => h === 'frp');
  const confIdx = headerCols.findIndex((h) => h === 'confidence' || h === 'conf');
  const brightIdx = headerCols.findIndex((h) => h === 'brightness' || h === 'bright_ti4' || h === 'bright_t31');
  const dateIdx = headerCols.findIndex((h) => h === 'acq_date' || h === 'date');
  const timeIdx = headerCols.findIndex((h) => h === 'acq_time' || h === 'time');
  const satIdx = headerCols.findIndex((h) => h === 'satellite' || h === 'sensor');
  const dnIdx = headerCols.findIndex((h) => h === 'daynight' || h === 'day_night');
  const scanIdx = headerCols.findIndex((h) => h === 'scan');
  const trackIdx = headerCols.findIndex((h) => h === 'track');

  const observations: ThermalObservation[] = [];
  let rejectedCount = 0;
  let acceptedCount = 0;
  let indiaCount = 0;
  let globalCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]).map((c) => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length <= Math.max(latIdx, lngIdx)) {
      rejectedCount++;
      continue;
    }

    const rawLat = cols[latIdx];
    const rawLng = cols[lngIdx];
    const lat = Number(rawLat);
    const lng = Number(rawLng);

    // Validate coordinates
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      rejectedCount++;
      continue;
    }

    // FRP: numeric when present, 0 when absent
    let frp = 0;
    if (frpIdx !== -1 && cols[frpIdx]) {
      const parsedFrp = Number(cols[frpIdx]);
      if (!isNaN(parsedFrp) && parsedFrp >= 0) {
        frp = Number(parsedFrp.toFixed(2));
      }
    }

    // Confidence: numeric (0-100) or standard FIRMS flags ('l'=35, 'n'=65, 'h'=90)
    let confidence = 75;
    if (confIdx !== -1 && cols[confIdx]) {
      const rawConf = cols[confIdx].toLowerCase();
      const numConf = Number(rawConf);
      if (!isNaN(numConf) && numConf >= 0 && numConf <= 100) {
        confidence = Math.round(numConf);
      } else if (rawConf === 'h' || rawConf === 'high') {
        confidence = 92;
      } else if (rawConf === 'n' || rawConf === 'nominal' || rawConf === 'med' || rawConf === 'm') {
        confidence = 65;
      } else if (rawConf === 'l' || rawConf === 'low') {
        confidence = 35;
      }
    }

    // Brightness temperature in Kelvin
    let brightnessTempK = 325.0;
    if (brightIdx !== -1 && cols[brightIdx]) {
      const numBright = Number(cols[brightIdx]);
      if (!isNaN(numBright) && numBright > 150 && numBright < 650) {
        brightnessTempK = Number(numBright.toFixed(1));
      }
    }

    // Timestamp: parse acq_date and acq_time
    let timestamp = '';
    const rawDate = dateIdx !== -1 ? cols[dateIdx] : '';
    const rawTime = timeIdx !== -1 ? cols[timeIdx] : '';
    if (rawDate && /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(rawDate)) {
      const normalizedDate = rawDate.replace(/\//g, '-');
      if (rawTime) {
        const cleanTime = rawTime.replace(':', '').padStart(4, '0');
        const hh = cleanTime.slice(0, 2);
        const mm = cleanTime.slice(2, 4);
        timestamp = `${normalizedDate}T${hh}:${mm}:00Z`;
      } else {
        timestamp = `${normalizedDate}T00:00:00Z`;
      }
    } else {
      timestamp = new Date().toISOString();
    }

    // Satellite sensor
    const rawSat = satIdx !== -1 ? cols[satIdx] || '' : '';
    const satellite = normalizeSatelliteSensor(rawSat);

    // Day / Night
    let dayNight: 'D' | 'N' = 'D';
    if (dnIdx !== -1 && cols[dnIdx]) {
      const rawDN = cols[dnIdx].toUpperCase();
      if (rawDN.startsWith('N')) {
        dayNight = 'N';
      }
    }

    // Scan & Track
    const scan = scanIdx !== -1 && !isNaN(Number(cols[scanIdx])) ? Number(cols[scanIdx]) : 0.75;
    const track = trackIdx !== -1 && !isNaN(Number(cols[trackIdx])) ? Number(cols[trackIdx]) : 0.75;

    const isIndia = lat >= 6.5 && lat <= 37.5 && lng >= 68.0 && lng <= 97.5;
    if (isIndia) {
      indiaCount++;
    } else {
      globalCount++;
    }

    observations.push({
      id: `OBS-UP-${i}-${Date.now().toString(36)}`,
      latitude: Number(lat.toFixed(5)),
      longitude: Number(lng.toFixed(5)),
      timestamp,
      satellite,
      frp,
      brightnessTempK,
      confidence,
      scan,
      track,
      dayNight,
      dataSource: 'USER_UPLOAD',
    });

    acceptedCount++;
  }

  if (acceptedCount === 0) {
    return {
      success: false,
      observations: [],
      acceptedCount: 0,
      rejectedCount,
      globalCount: 0,
      indiaCount: 0,
      error: `All ${rejectedCount} row(s) were malformed or contained invalid coordinates.`,
    };
  }

  return {
    success: true,
    observations,
    acceptedCount,
    rejectedCount,
    globalCount,
    indiaCount,
  };
}

/**
 * Spatiotemporally clusters ThermalObservation[] into GeoFlare ThermalEvent[]
 * Distance threshold: ~1500 meters.
 */
export function clusterObservationsToEvents(
  observations: ThermalObservation[],
  facilities: IndustrialFacility[] = INDIAN_INDUSTRIAL_FACILITIES
): ThermalEvent[] {
  if (observations.length === 0) return [];

  // Group observations into spatial clusters (within 1500m of each other)
  const CLUSTER_DISTANCE_METERS = 1500;
  const visited = new Set<number>();
  const clusters: ThermalObservation[][] = [];

  for (let i = 0; i < observations.length; i++) {
    if (visited.has(i)) continue;
    visited.add(i);

    const cluster: ThermalObservation[] = [observations[i]];
    const queue: number[] = [i];

    while (queue.length > 0) {
      const currIdx = queue.shift()!;
      const currObs = observations[currIdx];

      for (let j = 0; j < observations.length; j++) {
        if (visited.has(j)) continue;
        const candidate = observations[j];

        // Quick rough bounding box check (~0.02 deg ~ 2.2km)
        if (
          Math.abs(currObs.latitude - candidate.latitude) > 0.02 ||
          Math.abs(currObs.longitude - candidate.longitude) > 0.02
        ) {
          continue;
        }

        const dist = calculateHaversineDistance(
          currObs.latitude,
          currObs.longitude,
          candidate.latitude,
          candidate.longitude
        );

        if (dist <= CLUSTER_DISTANCE_METERS) {
          visited.add(j);
          cluster.push(candidate);
          queue.push(j);
        }
      }
    }

    clusters.push(cluster);
  }

  // Convert each cluster into a full GeoFlare ThermalEvent
  const events: ThermalEvent[] = [];

  for (let cIdx = 0; cIdx < clusters.length; cIdx++) {
    const clusterObs = clusters[cIdx];

    // Chronologically sort observations
    clusterObs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Primary observation: latest observation with valid FRP, or the one with maximum FRP
    const primaryObs = clusterObs.reduce((prev, curr) => {
      if (curr.frp > prev.frp) return curr;
      return curr;
    }, clusterObs[clusterObs.length - 1]);

    // Build raw observation history for persistence metrics engine
    const historyOverpasses: RawObservationInput[] = clusterObs.map((obs) => ({
      timestamp: obs.timestamp,
      frp: obs.frp,
      brightness: obs.brightnessTempK,
      sensor: obs.satellite,
      confidence: obs.confidence,
    }));

    const persistence = computePersistenceMetrics(historyOverpasses, primaryObs.frp);

    // Geographic & Industrial Context
    const isIndia =
      primaryObs.latitude >= 6.5 &&
      primaryObs.latitude <= 37.5 &&
      primaryObs.longitude >= 68.0 &&
      primaryObs.longitude <= 97.5;

    let nearestFacility: IndustrialFacility | undefined = undefined;
    let distanceToFacilityMeters: number | undefined = undefined;
    let landUseContext = 'Global Thermal Observation / Non-Industrial Context';
    let country = 'International';
    let region = 'Global Thermal Hotspot';

    if (isIndia) {
      country = 'India';
      const spatialRes = findNearestFacility(
        primaryObs.latitude,
        primaryObs.longitude,
        facilities
      );

      // Associate industrial facility if within realistic proximity envelope (<= 5000m)
      if (spatialRes.facility && spatialRes.distanceMeters <= 5000) {
        nearestFacility = spatialRes.facility;
        distanceToFacilityMeters = spatialRes.distanceMeters;
        landUseContext = `${nearestFacility.type} vicinity (${nearestFacility.name})`;
        region = `${nearestFacility.state} (${nearestFacility.district})`;
      } else {
        landUseContext = 'Non-Industrial Regional Land Cover';
        region = 'India Regional Hotspot';
      }
    } else {
      const globalInfo = detectGlobalRegion(primaryObs.latitude, primaryObs.longitude);
      country = globalInfo.country;
      region = globalInfo.region;
      landUseContext = 'Global Terrestrial Thermal Anomaly';
    }

    // Classification via GeoFlare Hybrid Classifier
    const classification = classifyThermalEvent({
      frp: primaryObs.frp,
      brightnessTempK: primaryObs.brightnessTempK,
      confidence: primaryObs.confidence,
      dayNight: primaryObs.dayNight,
      distanceToFacilityMeters: distanceToFacilityMeters ?? 99999,
      nearestFacility,
      persistence,
      landUseContext,
    });

    // Investigation Priority Score (0-100)
    const priority = calculateInvestigationPriority({
      observation: primaryObs,
      nearestFacility,
      distanceToFacilityMeters: distanceToFacilityMeters,
      persistence,
      classification,
    });

    const eventId = `EVT-UP-${Date.now().toString(36).toUpperCase()}-${String(cIdx + 1).padStart(3, '0')}`;

    events.push({
      id: eventId,
      country,
      region,
      primaryObservation: primaryObs,
      nearestFacility,
      distanceToFacilityMeters,
      landUseContext,
      persistence,
      classification,
      priority,
      verification: {
        state: 'unreviewed',
      },
    });
  }

  return events;
}

/**
 * End-to-end FIRMS CSV processing pipeline
 */
export function processFirmsIngestion(
  csvText: string,
  facilities: IndustrialFacility[] = INDIAN_INDUSTRIAL_FACILITIES
): FirmsCsvParseResult {
  const parseResult = parseFirmsCsv(csvText);

  if (!parseResult.success) {
    return {
      success: false,
      source: 'NASA FIRMS CSV Upload',
      mode: 'UPLOAD',
      observationsAccepted: 0,
      observationsRejected: parseResult.rejectedCount,
      eventsCreated: 0,
      globalObservations: 0,
      indiaObservations: 0,
      data: [],
      error: parseResult.error,
    };
  }

  const events = clusterObservationsToEvents(parseResult.observations, facilities);

  return {
    success: true,
    source: 'NASA FIRMS CSV Upload',
    mode: 'UPLOAD',
    observationsAccepted: parseResult.acceptedCount,
    observationsRejected: parseResult.rejectedCount,
    eventsCreated: events.length,
    globalObservations: parseResult.globalCount,
    indiaObservations: parseResult.indiaCount,
    data: events,
  };
}
