# GeoFlare — Industrial Thermal Intelligence

<div align="center">

**AI-assisted geospatial decision support for detecting, classifying, prioritizing, and investigating persistent industrial thermal anomalies.**

[Live Prototype](#live-prototype) · [Features](#key-features) · [Architecture](#system-workflow) · [Setup](#local-development)

</div>

---

## Live Prototype

> **Add the final Vercel URL here after deployment.**

**GeoFlare:** `https://YOUR-GEOFLARE-URL.vercel.app`

GeoFlare is designed as a working prototype for **SIH26162 — AI-Based Detection and Classification of Industrial Fires and Persistent Thermal Sources**.

For SIH evaluation, the live deployment demonstrates the end-to-end prototype: satellite thermal observations → geospatial context → classification/prioritization → analyst investigation → AI-generated operational briefing.

---

## Why GeoFlare?

Satellite thermal sensors can reveal hotspots, but **detecting a hotspot is not the same as understanding it**. Industrial facilities may generate legitimate thermal signatures from flaring, furnaces, kilns, and other operations, while abnormal or persistent anomalies may require investigation.

GeoFlare adds an intelligence layer around thermal observations by combining:

- Satellite-derived thermal observations
- Industrial-facility proximity and GIS context
- Persistence and historical behaviour
- Thermal intensity / FRP signals
- Rule-based classification and prioritization
- Human verification workflow
- Gemini-powered investigation briefs

The goal is to help analysts answer **“What is this hotspot, how persistent is it, how close is it to industrial assets, and should it be investigated?”** rather than simply showing dots on a map.

> **Safety / positioning:** GeoFlare is a satellite-based screening and decision-support prototype. It does **not** confirm a fire, replace facility alarms, or replace physical/ground verification.

---

## Key Features

### 1. Thermal Intelligence Map

Interactive GIS visualization of thermal events, industrial assets, alerts, and investigation context using Leaflet/OpenStreetMap.

### 2. NASA FIRMS Data Ingestion

Upload NASA FIRMS CSV observations and process them into GeoFlare thermal events. The ingestion pipeline performs parsing, validation, spatial association, temporal/persistence analysis, and event creation.

### 3. Industrial Context

Thermal events are evaluated against the project's industrial facility dataset to identify nearby assets and support operational interpretation.

### 4. Classification & Prioritization

Events are categorized using thermal, spatial, temporal, persistence, and industrial-context signals. A priority score and recommended action help analysts focus attention on higher-value anomalies.

### 5. Persistence & Historical Analysis

The prototype exposes observation history, recurrence, trend, baseline FRP, and deviation-from-baseline information to distinguish isolated observations from recurring thermal behaviour.

### 6. Analyst Verification

Analysts can mark events for investigation, verification, routine operational activity, or false-positive handling, with notes and assignment information.

### 7. AI Investigation Brief

Gemini can generate a concise operational briefing using the event's location, facility proximity, land-use context, FRP, persistence, classification, and priority. If no Gemini key is configured, the prototype falls back to a rule-based synthesis.

### 8. Analytics & Alerts

Dashboard views summarize events, alerts, severity, classifications, and analytical indicators for rapid situational awareness.

### 9. PostGIS-Oriented Spatial Layer

The project includes a PostgreSQL/PostGIS schema and spatial-query service demonstrating how GeoFlare can evolve toward production-grade spatial data infrastructure, including proximity and distance operations and spatial indexing concepts.

---

## System Workflow

```text
NASA FIRMS thermal observations
             │
             ▼
      CSV ingestion / parser
             │
             ▼
   Validation + event generation
             │
             ▼
 ┌──────────────────────────────┐
 │ Geospatial + temporal context│
 │ • Industrial proximity       │
 │ • FRP / confidence           │
 │ • Persistence / recurrence   │
 │ • Land-use context           │
 └──────────────────────────────┘
             │
             ▼
 Classification + Priority Score
             │
       ┌─────┴─────┐
       ▼           ▼
   GIS Map       Alerts
       │           │
       └─────┬─────┘
             ▼
     Analyst Investigation
             │
             ▼
   Gemini Intelligence Brief
             │
             ▼
 Human / Ground Verification
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS |
| Mapping | Leaflet + OpenStreetMap |
| Charts | Recharts |
| Motion / UI | Motion + Lucide React |
| Backend | Node.js + Express |
| AI | Google Gemini API (`@google/genai`) |
| Thermal Data | NASA FIRMS CSV workflow |
| Spatial architecture | PostgreSQL + PostGIS schema/service |
| Deployment | Vercel-compatible Express API + Vite frontend |

---

## Repository Structure

```text
GeoFlare
├── api/                         # Vercel serverless entry point
│   └── index.ts
├── src/
│   ├── components/              # UI, map, analytics, alerts, investigation
│   ├── db/                      # PostGIS schema
│   ├── services/                # FIRMS parser, classification, spatial logic, API
│   ├── types/                   # Shared TypeScript types
│   ├── App.tsx
│   └── index.css
├── server.ts                    # Express application + local/Render startup
├── vercel.json                  # Vercel API routing
├── vite.config.ts
├── package.json
└── .env.example
```

---

## Local Development

### Prerequisites

- Node.js 22+ recommended
- npm
- Gemini API key for AI investigation (optional; rule-based fallback is available)
- NASA FIRMS MAP_KEY only if you later add a direct/live FIRMS retrieval workflow

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` or `.env` as appropriate for your local setup:

```env
GEMINI_API_KEY=your_gemini_api_key
NASA_FIRMS_MAP_KEY=your_nasa_firms_map_key
```

Never commit real API keys to GitHub.

### 3. Start the development server

```bash
npm run dev
```

The local application runs through the Express server with Vite middleware.

### 4. Production build

```bash
npm run build
```

### 5. Type check

```bash
npm run lint
```

---

## API Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Service health and dataset counts |
| `POST /api/ingest/csv` | Ingest NASA FIRMS CSV data |
| `GET /api/thermal-events` | Query/filter thermal events |
| `GET /api/thermal-events/:id` | Retrieve one event |
| `GET /api/thermal-events/:id/history` | Persistence/history information |
| `GET /api/thermal-events/:id/analysis` | Classification and spatial analysis |
| `GET /api/industrial-facilities` | Industrial facility dataset |
| `GET /api/alerts` | Current alerts |
| `GET /api/analytics` | Analytical summary |
| `GET /api/map-data` | Combined map payload |
| `POST /api/verify-event` | Analyst verification workflow |
| `POST /api/ai/investigate` | Gemini/rule-based investigation brief |
| `GET /api/db/schema` | PostGIS schema metadata |
| `GET /api/db/stats` | Spatial database telemetry |
| `POST /api/db/query` | Prototype spatial-query interface |
| `GET /api/db/export-sql` | Export SQL schema |

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Optional | Enables Gemini-powered investigation briefs |
| `NASA_FIRMS_MAP_KEY` | Optional | NASA FIRMS data access where a MAP_KEY is required |

For Vercel, add environment variables in **Project → Settings → Environment Variables**.

---

## Vercel Deployment

The repository includes a Vercel Express entry point at `api/index.ts` and `vercel.json` routing for `/api/*`.

### Deployment flow

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Add `GEMINI_API_KEY` in Vercel Environment Variables if AI investigation is required.
4. Add `NASA_FIRMS_MAP_KEY` only if a direct/live FIRMS retrieval workflow is enabled; the current prototype uses FIRMS CSV ingestion.
5. Deploy.
6. Verify the health endpoint at:

```text
https://YOUR-DOMAIN.vercel.app/api/health
```

7. Test the main map, event filtering, investigation panel, and AI investigation before sharing the URL with judges.

---

## Data & Prototype Limitations

This repository is an **SIH prototype**, not a production emergency-management system.

- Runtime thermal-event and alert state is currently held in memory.
- The included PostGIS layer demonstrates schema/query architecture but is not a live external PostgreSQL database connection.
- Satellite observations are a screening signal and can contain false positives or missed detections.
- AI-generated text is decision support and requires analyst review.
- Industrial facility/context data should be replaced or expanded with authoritative datasets for production deployment.
- Production deployment should add durable storage, authentication, audit logging, rate limiting, observability, automated data ingestion, and stronger data-quality controls.

---

## SIH Problem Statement

**SIH26162 — AI-Based Detection and Classification of Industrial Fires and Persistent Thermal Sources**

GeoFlare addresses the problem by turning satellite thermal observations into an analyst-oriented workflow for **detection, contextual classification, persistence assessment, prioritization, and human verification**.

---

## Project Positioning

> **GeoFlare does not simply detect heat. It helps determine which thermal anomalies deserve attention.**

The core product idea is to reduce the gap between **satellite observation** and **operational investigation** by combining remote-sensing signals with geospatial industrial context and explainable prioritization.

---

## Future Scope

- Live scheduled NASA FIRMS ingestion
- Production PostgreSQL/PostGIS persistence
- Weather and cloud-condition filtering
- Expanded authoritative industrial asset datasets
- Historical multi-season anomaly baselines
- Role-based analyst accounts and audit trails
- Automated alert delivery
- Advanced ML classification using validated labelled datasets
- Early-warning risk modelling for persistent industrial anomalies

---

## Team

**GeoFlare — Industrial Thermal Intelligence**

Built as an SIH 2026 prototype for SIH26162.

---

## License

This project is currently intended as an educational and hackathon prototype. Add a project-specific open-source license before public redistribution if required.
