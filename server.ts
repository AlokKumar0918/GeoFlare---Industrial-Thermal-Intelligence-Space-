import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  buildThermalEventsDatabase,
  buildAlertsDatabase,
  computeAnalyticsSummary,
  INDIAN_INDUSTRIAL_FACILITIES,
} from './src/services/mockData.js';
import {
  POSTGIS_TABLE_SCHEMAS,
  PREDEFINED_POSTGIS_QUERIES,
  executePostgisQuery,
  generateThermalObservationsRows,
} from './src/services/postgisService.js';
import { processFirmsIngestion } from './src/services/firmsParser.js';
import { ThermalEvent, VerificationState } from './src/types/index.js';

export const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.text({ limit: '10mb' }));

// In-memory persistent state during server runtime
let thermalEventsStore: ThermalEvent[] = buildThermalEventsDatabase();
let alertsStore = buildAlertsDatabase(thermalEventsStore);

// Helper for Gemini AI client (lazy initialization)
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'GeoFlare Thermal Intelligence Server',
    eventsCount: thermalEventsStore.length,
    facilitiesCount: INDIAN_INDUSTRIAL_FACILITIES.length,
    timestamp: new Date().toISOString(),
  });
});

// 1b. POST /api/ingest/csv (NASA FIRMS CSV ingestion, parsing, spatiotemporal clustering & session persistence)
app.post('/api/ingest/csv', (req, res) => {
  try {
    let csvText = '';
    if (typeof req.body === 'string') {
      csvText = req.body;
    } else if (req.body && typeof req.body.csvText === 'string') {
      csvText = req.body.csvText;
    } else {
      return res.status(400).json({
        success: false,
        source: 'NASA FIRMS CSV Upload',
        mode: 'UPLOAD',
        observationsAccepted: 0,
        observationsRejected: 0,
        eventsCreated: 0,
        globalObservations: 0,
        indiaObservations: 0,
        data: [],
        error: 'Missing CSV text in request body (expected { csvText: string } or raw CSV text)',
      });
    }

    const result = processFirmsIngestion(csvText, INDIAN_INDUSTRIAL_FACILITIES);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Persist newly created events into in-memory store for the active server session
    thermalEventsStore = [...result.data, ...thermalEventsStore];
    alertsStore = buildAlertsDatabase(thermalEventsStore);

    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      source: 'NASA FIRMS CSV Upload',
      mode: 'UPLOAD',
      observationsAccepted: 0,
      observationsRejected: 0,
      eventsCreated: 0,
      globalObservations: 0,
      indiaObservations: 0,
      data: [],
      error: err.message || 'Internal server error processing NASA FIRMS CSV',
    });
  }
});

// 2. GET /api/thermal-events (with query filters)
app.get('/api/thermal-events', (req, res) => {
  try {
    const { sourceType, riskTier, persistence, region, industrialOnly } = req.query;

    let filtered = [...thermalEventsStore];

    if (sourceType && sourceType !== 'all') {
      filtered = filtered.filter((e) => e.classification.category === sourceType);
    }
    if (riskTier && riskTier !== 'all') {
      filtered = filtered.filter((e) => e.priority.tier.toLowerCase() === String(riskTier).toLowerCase());
    }
    if (persistence && persistence !== 'all') {
      filtered = filtered.filter((e) => e.persistence.level === persistence);
    }
    if (region && region !== 'all') {
      filtered = filtered.filter((e) => e.region === region);
    }
    if (industrialOnly === 'true') {
      filtered = filtered.filter((e) => (e.distanceToFacilityMeters || Infinity) <= 1500);
    }

    res.json({
      success: true,
      count: filtered.length,
      data: filtered,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. GET /api/thermal-events/:id
app.get('/api/thermal-events/:id', (req, res) => {
  const event = thermalEventsStore.find((e) => e.id === req.params.id);
  if (!event) {
    return res.status(404).json({ success: false, error: 'Thermal event not found' });
  }
  res.json({ success: true, data: event });
});

// 4. GET /api/industrial-facilities
app.get('/api/industrial-facilities', (req, res) => {
  res.json({
    success: true,
    count: INDIAN_INDUSTRIAL_FACILITIES.length,
    data: INDIAN_INDUSTRIAL_FACILITIES,
  });
});

// 5. GET /api/thermal-events/:id/history
app.get('/api/thermal-events/:id/history', (req, res) => {
  const event = thermalEventsStore.find((e) => e.id === req.params.id);
  if (!event) {
    return res.status(404).json({ success: false, error: 'Thermal event not found' });
  }
  res.json({
    success: true,
    eventId: event.id,
    observationsHistory: event.persistence.observationsHistory,
    baselineFrp: event.persistence.historicalBaselineFrp,
    trend: event.persistence.trend,
    recurrenceRate: event.persistence.recurrenceRate,
  });
});

// 6. GET /api/thermal-events/:id/analysis
app.get('/api/thermal-events/:id/analysis', (req, res) => {
  const event = thermalEventsStore.find((e) => e.id === req.params.id);
  if (!event) {
    return res.status(404).json({ success: false, error: 'Thermal event not found' });
  }
  res.json({
    success: true,
    eventId: event.id,
    classification: event.classification,
    priority: event.priority,
    persistence: event.persistence,
    nearestFacility: event.nearestFacility,
    distanceMeters: event.distanceToFacilityMeters,
    landUse: event.landUseContext,
  });
});

// 7. GET /api/alerts
app.get('/api/alerts', (req, res) => {
  res.json({
    success: true,
    count: alertsStore.length,
    data: alertsStore,
  });
});

// 8. GET /api/analytics
app.get('/api/analytics', (req, res) => {
  const summary = computeAnalyticsSummary(thermalEventsStore);
  res.json({ success: true, data: summary });
});

// 9. GET /api/map-data (combined payload optimized for GIS map rendering)
app.get('/api/map-data', (req, res) => {
  res.json({
    success: true,
    events: thermalEventsStore,
    facilities: INDIAN_INDUSTRIAL_FACILITIES,
    alerts: alertsStore,
  });
});

// 10. POST /api/verify-event (Analyst human verification triage)
app.post('/api/verify-event', (req, res) => {
  const { eventId, state, notes, verifiedBy, assignedTeam } = req.body as {
    eventId: string;
    state: VerificationState;
    notes?: string;
    verifiedBy?: string;
    assignedTeam?: string;
  };

  const index = thermalEventsStore.findIndex((e) => e.id === eventId);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }

  thermalEventsStore[index].verification = {
    state,
    notes,
    verifiedBy: verifiedBy || 'Duty Officer / GIS Analyst',
    verifiedAt: new Date().toISOString(),
    assignedTeam,
  };

  // Update associated alert status if applicable
  const alertIndex = alertsStore.findIndex((a) => a.eventId === eventId);
  if (alertIndex !== -1) {
    if (state === 'verified_incident' || state === 'under_investigation') {
      alertsStore[alertIndex].status = 'dispatched';
    } else if (state === 'routine_operational_flare' || state === 'false_positive') {
      alertsStore[alertIndex].status = 'resolved';
    }
  }

  res.json({
    success: true,
    message: `Verification status updated to ${state}`,
    data: thermalEventsStore[index],
  });
});

// 11. POST /api/ai/investigate (AI Geospatial Briefing via Gemini API)
app.post('/api/ai/investigate', async (req, res) => {
  try {
    const { eventId } = req.body;
    const event = thermalEventsStore.find((e) => e.id === eventId);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const ai = getAIClient();
    if (!ai) {
      // Return rule-based synthesis if Gemini key is not configured
      return res.json({
        success: true,
        source: 'Rule-Engine Synthesis (GEMINI_API_KEY optional)',
        brief: `SATELLITE THERMAL INTELLIGENCE ASSESSMENT:
Event ID: ${event.id}
Primary Sensor: ${event.primaryObservation.satellite} (FRP: ${event.primaryObservation.frp} MW, Conf: ${event.primaryObservation.confidence}%)
Geospatial Proximity: Located ${event.distanceToFacilityMeters ? Math.round(event.distanceToFacilityMeters) + 'm from ' + (event.nearestFacility?.name || 'facility') : 'outside designated industrial perimeters'}.
Temporal Classification: ${event.classification.categoryLabel} with ${event.classification.confidencePercent}% confidence.
Persistence Signature: ${event.persistence.level.toUpperCase()} (${event.persistence.observationCount} observations over ${event.persistence.detectionDays} days).
Action Recommendation: ${event.priority.recommendedAction}
Note: External satellite data is a screening/prioritization aid and requires human/ground verification before declaring incident status.`,
      });
    }

    const prompt = `You are a Senior Remote Sensing & Industrial Safety Analyst for SIH26162 (GeoFlare).
Write a 3-paragraph executive operational brief for human decision-makers regarding this thermal event:
Event ID: ${event.id}
Location: Lat ${event.primaryObservation.latitude}, Lng ${event.primaryObservation.longitude} (${event.region})
Nearest Facility: ${event.nearestFacility?.name || 'None within 2.5km'} (${event.nearestFacility?.type || 'N/A'}, Hazard: ${event.nearestFacility?.hazardLevel || 'N/A'})
Distance to Facility: ${event.distanceToFacilityMeters ? Math.round(event.distanceToFacilityMeters) + ' meters' : 'N/A'}
Land-Use Context: ${event.landUseContext}
Fire Radiative Power (FRP): ${event.primaryObservation.frp} MW
Historical Baseline FRP: ${event.persistence.historicalBaselineFrp} MW (+${event.persistence.deviationFromBaselinePercent}% deviation)
Persistence: ${event.persistence.level} (${event.persistence.observationCount} detections over ${event.persistence.timeSpanDays} days, Trend: ${event.persistence.trend})
Classification: ${event.classification.categoryLabel} (${event.classification.confidencePercent}% confidence)
Investigation Priority Score: ${event.priority.score}/100 (${event.priority.tier})

Instructions:
1. State clearly why this event is or is not prioritized for physical verification.
2. Differentiate whether this is consistent with operational flaring/furnaces or an uncontained anomaly.
3. Explicitly adhere to product positioning: external satellite decision-support only; not a confirmed fire or replacement for facility alarms. Provide concrete verification checklist.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({
      success: true,
      source: 'Gemini-2.5-Flash Intelligence Brief',
      brief: response.text,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// POSTGIS SPATIAL DATABASE API ENDPOINTS
// -------------------------------------------------------------

// 12. GET /api/db/schema - Full PostGIS metadata & table definitions
app.get('/api/db/schema', (req, res) => {
  res.json({
    success: true,
    engine: 'PostgreSQL 16.2 / PostGIS 3.4.0 (Spatial Vector Enabled)',
    extensions: [
      { name: 'postgis', version: '3.4.0', description: 'PostGIS geometry and spatial processing functions' },
      { name: 'uuid-ossp', version: '1.1', description: 'UUID generation functions' },
    ],
    tables: POSTGIS_TABLE_SCHEMAS,
    predefinedQueries: PREDEFINED_POSTGIS_QUERIES,
  });
});

// 13. GET /api/db/stats - Live database and spatial index telemetry
app.get('/api/db/stats', (req, res) => {
  const observations = generateThermalObservationsRows();
  res.json({
    success: true,
    database: 'geoflare_spatial_db',
    tables: {
      industrial_facilities: {
        rows: INDIAN_INDUSTRIAL_FACILITIES.length,
        spatialIndex: 'idx_facilities_geom (GIST)',
        srid: 4326,
        type: 'Point',
      },
      thermal_observations: {
        rows: observations.length,
        spatialIndex: 'idx_thermal_obs_geom (GIST)',
        srid: 4326,
        type: 'Point',
      },
    },
    spatialFunctionsSupported: ['ST_DWithin', 'ST_Distance', 'ST_Buffer', 'ST_SetSRID', 'ST_MakePoint', 'ST_AsGeoJSON', '<-> (KNN)'],
    indexesActive: ['idx_facilities_geom (GIST)', 'idx_thermal_obs_geom (GIST)', 'idx_thermal_obs_datetime (BTREE)', 'idx_thermal_obs_frp (BTREE)'],
  });
});

// 14. POST /api/db/query - Execute spatial queries
app.post('/api/db/query', (req, res) => {
  try {
    const { sql } = req.body;
    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({ success: false, error: 'SQL query string is required' });
    }
    const result = executePostgisQuery(sql);
    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 15. GET /api/db/export-sql - Raw schema.sql export
app.get('/api/db/export-sql', (req, res) => {
  try {
    const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sqlContent = fs.readFileSync(schemaPath, 'utf8');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="geoflare_postgis_schema.sql"');
      return res.send(sqlContent);
    } else {
      res.status(404).json({ success: false, error: 'schema.sql not found on disk' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// VITE MIDDLEWARE & SERVER STARTUP
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GeoFlare server active on http://0.0.0.0:${PORT}`);
  });
}

// Vercel imports this file as a serverless function, so it must export the
// Express app without starting a persistent listener. Local/Render runs
// still use the traditional server startup path.
if (!process.env.VERCEL) {
  startServer();
}
