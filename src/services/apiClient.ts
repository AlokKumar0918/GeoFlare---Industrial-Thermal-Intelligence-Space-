/**
 * Client API & Data Layer for GeoFlare
 * Seamlessly interfaces with Express backend with automatic local fallback.
 */
import {
  ThermalEvent,
  IndustrialFacility,
  ThermalAlert,
  AnalyticsSummary,
  FilterState,
  VerificationState,
} from '../types';
import {
  buildThermalEventsDatabase,
  buildAlertsDatabase,
  computeAnalyticsSummary,
  INDIAN_INDUSTRIAL_FACILITIES,
} from './mockData';
import {
  POSTGIS_TABLE_SCHEMAS,
  PREDEFINED_POSTGIS_QUERIES,
  executePostgisQuery,
  PostgisTableSchema,
  PostgisQueryResult,
  PredefinedQuery,
} from './postgisService';
import { processFirmsIngestion, FirmsCsvParseResult } from './firmsParser';

class ApiClient {
  private fallbackEvents: ThermalEvent[] = buildThermalEventsDatabase();
  private fallbackAlerts: ThermalAlert[] = buildAlertsDatabase(this.fallbackEvents);

  async getPostgisSchema(): Promise<{
    engine: string;
    extensions: Array<{ name: string; version: string; description: string }>;
    tables: PostgisTableSchema[];
    predefinedQueries: PredefinedQuery[];
  }> {
    try {
      const res = await fetch('/api/db/schema');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          return {
            engine: json.engine,
            extensions: json.extensions,
            tables: json.tables,
            predefinedQueries: json.predefinedQueries,
          };
        }
      }
    } catch {
      // Fallback
    }

    return {
      engine: 'PostgreSQL 16.2 / PostGIS 3.4.0 (Spatial Vector Enabled)',
      extensions: [
        { name: 'postgis', version: '3.4.0', description: 'PostGIS geometry and spatial processing functions' },
        { name: 'uuid-ossp', version: '1.1', description: 'UUID generation functions' },
      ],
      tables: POSTGIS_TABLE_SCHEMAS,
      predefinedQueries: PREDEFINED_POSTGIS_QUERIES,
    };
  }

  async runSpatialQuery(sql: string): Promise<PostgisQueryResult> {
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) return json.data;
      }
    } catch {
      // Fallback
    }
    return executePostgisQuery(sql);
  }

  async getMapData(): Promise<{
    events: ThermalEvent[];
    facilities: IndustrialFacility[];
    alerts: ThermalAlert[];
  }> {
    try {
      const res = await fetch('/api/map-data');
      if (!res.ok) throw new Error('Backend offline');
      const json = await res.json();
      if (json.success) {
        return {
          events: json.events,
          facilities: json.facilities,
          alerts: json.alerts,
        };
      }
    } catch {
      // Return local memory store
    }
    return {
      events: this.fallbackEvents,
      facilities: INDIAN_INDUSTRIAL_FACILITIES,
      alerts: this.fallbackAlerts,
    };
  }

  async getThermalEvents(filters?: Partial<FilterState>): Promise<ThermalEvent[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.sourceType) params.set('sourceType', filters.sourceType);
      if (filters?.riskTier) params.set('riskTier', filters.riskTier);
      if (filters?.persistence) params.set('persistence', filters.persistence);
      if (filters?.region) params.set('region', filters.region);

      const res = await fetch(`/api/thermal-events?${params.toString()}`);
      if (!res.ok) throw new Error('API failed');
      const json = await res.json();
      if (json.success) return json.data;
    } catch {
      // Fallback
    }
    return this.fallbackEvents;
  }

  async getFacilities(): Promise<IndustrialFacility[]> {
    try {
      const res = await fetch('/api/industrial-facilities');
      if (res.ok) {
        const json = await res.json();
        if (json.success) return json.data;
      }
    } catch {
      // Fallback
    }
    return INDIAN_INDUSTRIAL_FACILITIES;
  }

  async getAlerts(): Promise<ThermalAlert[]> {
    try {
      const res = await fetch('/api/alerts');
      if (res.ok) {
        const json = await res.json();
        if (json.success) return json.data;
      }
    } catch {
      // Fallback
    }
    return this.fallbackAlerts;
  }

  async getAnalytics(): Promise<AnalyticsSummary> {
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) {
        const json = await res.json();
        if (json.success) return json.data;
      }
    } catch {
      // Fallback
    }
    return computeAnalyticsSummary(this.fallbackEvents);
  }

  async updateVerification(
    eventId: string,
    state: VerificationState,
    notes?: string,
    verifiedBy?: string,
    assignedTeam?: string
  ): Promise<ThermalEvent | null> {
    try {
      const res = await fetch('/api/verify-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, state, notes, verifiedBy, assignedTeam }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) return json.data;
      }
    } catch {
      // Fallback update in local state
    }

    const item = this.fallbackEvents.find((e) => e.id === eventId);
    if (item) {
      item.verification = {
        state,
        notes,
        verifiedBy: verifiedBy || 'Duty Officer / GIS Analyst',
        verifiedAt: new Date().toISOString(),
        assignedTeam,
      };
      return item;
    }
    return null;
  }

  async getAIBrief(eventId: string): Promise<{ source: string; brief: string }> {
    try {
      const res = await fetch('/api/ai/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) return { source: json.source, brief: json.brief };
      }
    } catch {
      // Fallback
    }

    const event = this.fallbackEvents.find((e) => e.id === eventId);
    if (!event) return { source: 'Error', brief: 'Event not found.' };

    return {
      source: 'Local Rule-Engine Synthesis (GeoFlare Intelligence Protocol)',
      brief: `EXECUTIVE THERMAL INTELLIGENCE ASSESSMENT:
Event ID: ${event.id}
Classification: ${event.classification.categoryLabel} (${event.classification.confidencePercent}% Confidence)
Priority Score: ${event.priority.score}/100 (${event.priority.tier})

Geospatial Context:
${event.distanceToFacilityMeters ? `Detected ${Math.round(event.distanceToFacilityMeters)} meters from ${event.nearestFacility?.name} (${event.nearestFacility?.type}, ${event.nearestFacility?.hazardLevel} Hazard).` : 'Located in non-industrial rural land use.'}

Temporal Persistence:
Observed ${event.persistence.observationCount} times over ${event.persistence.detectionDays} unique days. Current Fire Radiative Power (FRP) is ${event.primaryObservation.frp} MW (Historical baseline: ${event.persistence.historicalBaselineFrp} MW, Deviation: +${event.persistence.deviationFromBaselinePercent}%).

Operational Directive:
${event.priority.recommendedAction}

Positioning Reminder: Satellite observation serves as external decision support for screening and prioritizing large-scale anomalies; it must be verified with on-site facility personnel before declaring emergency incident status.`,
    };
  }

  async ingestFirmsCsv(csvText: string): Promise<FirmsCsvParseResult> {
    try {
      const res = await fetch('/api/ingest/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        // Also update local fallback store to stay consistent
        this.fallbackEvents = [...json.data, ...this.fallbackEvents];
        this.fallbackAlerts = buildAlertsDatabase(this.fallbackEvents);
        return json;
      } else if (!res.ok) {
        return {
          success: false,
          source: 'NASA FIRMS CSV Upload',
          mode: 'UPLOAD',
          observationsAccepted: json.observationsAccepted || 0,
          observationsRejected: json.observationsRejected || 0,
          eventsCreated: 0,
          globalObservations: 0,
          indiaObservations: 0,
          data: [],
          error: json.error || `Server responded with error status ${res.status}`,
        };
      }
    } catch {
      // Offline fallback: execute parsing & clustering locally
    }

    const localResult = processFirmsIngestion(csvText, INDIAN_INDUSTRIAL_FACILITIES);
    if (localResult.success) {
      this.fallbackEvents = [...localResult.data, ...this.fallbackEvents];
      this.fallbackAlerts = buildAlertsDatabase(this.fallbackEvents);
    }
    return localResult;
  }
}

export const apiClient = new ApiClient();
