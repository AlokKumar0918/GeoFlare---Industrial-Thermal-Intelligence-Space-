import React, { useState, useEffect } from 'react';
import {
  Database,
  Terminal,
  Layers,
  Code2,
  Play,
  Download,
  Copy,
  Check,
  Sparkles,
  Search,
  CheckCircle2,
  Table as TableIcon,
  HardDrive,
  Cpu,
  Clock,
  Compass,
  FileCode,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import {
  PostgisTableSchema,
  PostgisQueryResult,
  PredefinedQuery,
} from '../../services/postgisService';

export const PostgisDatabaseView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'console' | 'schema' | 'export'>('console');
  const [schemaData, setSchemaData] = useState<{
    engine: string;
    extensions: Array<{ name: string; version: string; description: string }>;
    tables: PostgisTableSchema[];
    predefinedQueries: PredefinedQuery[];
  } | null>(null);

  const [selectedQueryId, setSelectedQueryId] = useState<string>('spatial_join_buffer');
  const [sqlInput, setSqlInput] = useState<string>('');
  const [queryResult, setQueryResult] = useState<PostgisQueryResult | null>(null);
  const [isLoadingQuery, setIsLoadingQuery] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showExplain, setShowExplain] = useState(false);

  useEffect(() => {
    async function init() {
      const data = await apiClient.getPostgisSchema();
      setSchemaData(data);
      if (data.predefinedQueries.length > 0) {
        const initial = data.predefinedQueries[0];
        setSelectedQueryId(initial.id);
        setSqlInput(initial.sql);
        // Run initial query
        const res = await apiClient.runSpatialQuery(initial.sql);
        setQueryResult(res);
      }
    }
    init();
  }, []);

  const handleSelectPredefined = async (pq: PredefinedQuery) => {
    setSelectedQueryId(pq.id);
    setSqlInput(pq.sql);
    setIsLoadingQuery(true);
    const res = await apiClient.runSpatialQuery(pq.sql);
    setQueryResult(res);
    setIsLoadingQuery(false);
  };

  const handleRunCustomSql = async () => {
    if (!sqlInput.trim()) return;
    setIsLoadingQuery(true);
    const res = await apiClient.runSpatialQuery(sqlInput);
    setQueryResult(res);
    setIsLoadingQuery(false);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlInput);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleDownloadSchemaSql = () => {
    window.open('/api/db/export-sql', '_blank');
  };

  return (
    <div className="flex-1 bg-[#020617] p-4 sm:p-6 overflow-y-auto text-slate-300">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Top Header Card */}
        <div className="bg-[#0f172a] p-4 sm:p-5 rounded border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-orange-500/20 flex items-center justify-center text-orange-500 ring-1 ring-orange-500/40">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-white tracking-tight">
                  PostgreSQL + PostGIS Spatial Database
                </h1>
                <span className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase">
                  DEMO MODE Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Tables <code className="text-orange-400 font-mono">thermal_observations</code> and{' '}
                <code className="text-orange-400 font-mono">industrial_facilities</code> with spatial GIST indexing.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-[#020617] px-3 py-1.5 rounded border border-slate-800 text-xs font-mono text-slate-300">
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              <span>SRID: 4326 (WGS84)</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#020617] px-3 py-1.5 rounded border border-slate-800 text-xs font-mono text-emerald-400">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>PostGIS 3.4 Enabled</span>
            </div>
            <button
              onClick={handleDownloadSchemaSql}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded text-xs font-semibold border border-slate-700 transition"
              title="Download production schema.sql file"
            >
              <Download className="w-3.5 h-3.5 text-orange-500" />
              <span>Export schema.sql</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs for Database Module */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('console')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-bold transition uppercase tracking-wider ${
                activeSubTab === 'console'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Spatial SQL Console
            </button>
            <button
              onClick={() => setActiveSubTab('schema')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-bold transition uppercase tracking-wider ${
                activeSubTab === 'schema'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Table Schemas & GIST Indexes
            </button>
            <button
              onClick={() => setActiveSubTab('export')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-bold transition uppercase tracking-wider ${
                activeSubTab === 'export'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              Raw DDL Script
            </button>
          </div>
        </div>

        {/* TAB 1: Spatial SQL Console */}
        {activeSubTab === 'console' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left: Pre-Configured Queries */}
            <div className="bg-[#0f172a] rounded border border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  Pre-Loaded Spatial Queries
                </span>
                <span className="text-[10px] text-slate-400 font-mono">1-Click Run</span>
              </div>

              <div className="space-y-2">
                {schemaData?.predefinedQueries.map((pq) => {
                  const isSelected = selectedQueryId === pq.id;
                  return (
                    <button
                      key={pq.id}
                      onClick={() => handleSelectPredefined(pq)}
                      className={`w-full text-left p-3 rounded border transition space-y-1 block ${
                        isSelected
                          ? 'bg-[#020617] border-orange-500/80 shadow-md ring-1 ring-orange-500/20'
                          : 'bg-[#020617]/50 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold ${
                            isSelected ? 'text-orange-400' : 'text-slate-200'
                          }`}
                        >
                          {pq.title}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {pq.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {pq.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Spatial Architecture Note */}
              <div className="p-3 bg-[#020617] rounded border border-slate-800 space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center gap-1 text-slate-200 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>PostGIS Spatial Optimization</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Queries leverage <code className="text-orange-400">ST_DWithin(geom::geography, buffer)</code> and{' '}
                  <code className="text-orange-400">GIST(geom)</code> indexes to filter millions of satellite points in sub-millisecond times.
                </p>
              </div>
            </div>

            {/* Right: SQL Editor & Live Results */}
            <div className="lg:col-span-2 space-y-4">
              {/* SQL Input Area */}
              <div className="bg-[#0f172a] rounded border border-slate-800 p-4 space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                    <Code2 className="w-4 h-4 text-orange-500" />
                    <span>SQL Query Editor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopySql}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition"
                      title="Copy SQL Query"
                    >
                      {copiedSql ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy SQL</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleRunCustomSql}
                      disabled={isLoadingQuery}
                      className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition shadow-md shadow-orange-600/20"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isLoadingQuery ? 'Executing...' : 'Execute Query'}</span>
                    </button>
                  </div>
                </div>

                <textarea
                  value={sqlInput}
                  onChange={(e) => setSqlInput(e.target.value)}
                  rows={6}
                  className="w-full bg-[#020617] border border-slate-800 rounded p-3 font-mono text-xs text-orange-200 focus:outline-none focus:border-orange-500 leading-relaxed resize-y"
                  placeholder="SELECT * FROM thermal_observations..."
                />

                {/* Execution Telemetry Bar */}
                {queryResult && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-400 border-t border-slate-800/80 font-mono">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {queryResult.rowCount} rows returned
                      </span>
                      <span className="flex items-center gap-1 text-sky-400">
                        <Clock className="w-3.5 h-3.5" />
                        {queryResult.executionTimeMs} ms
                      </span>
                      {queryResult.spatialIndexUsed && (
                        <span className="bg-slate-800 text-orange-400 px-2 py-0.5 rounded text-[11px] border border-slate-700">
                          Index: {queryResult.spatialIndexUsed}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setShowExplain(!showExplain)}
                      className="text-[11px] text-slate-400 hover:text-slate-200 underline decoration-slate-600"
                    >
                      {showExplain ? 'Hide EXPLAIN Plan' : 'View EXPLAIN Plan'}
                    </button>
                  </div>
                )}
              </div>

              {/* Optional EXPLAIN Plan */}
              {showExplain && queryResult?.explainPlan && (
                <div className="bg-[#020617] rounded border border-slate-800 p-3 text-xs font-mono text-slate-300 space-y-1">
                  <div className="text-orange-400 font-bold text-[11px] uppercase tracking-wider mb-1">
                    PostGIS Query Execution Plan (EXPLAIN ANALYZE)
                  </div>
                  {queryResult.explainPlan.map((line, idx) => (
                    <div key={idx} className="text-slate-400 pl-2 border-l border-slate-700">
                      {line}
                    </div>
                  ))}
                </div>
              )}

              {/* Tabular Result Set */}
              <div className="bg-[#0f172a] rounded border border-slate-800 overflow-hidden shadow-md">
                <div className="p-3 border-b border-slate-800 bg-[#020617]/70 flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <TableIcon className="w-3.5 h-3.5 text-orange-500" />
                    Query Results Grid
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Live Record Evaluation
                  </span>
                </div>

                {queryResult && queryResult.rows.length > 0 ? (
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#020617] border-b border-slate-800 text-slate-400 sticky top-0">
                        <tr>
                          {queryResult.columns.map((col) => (
                            <th key={col} className="px-3 py-2 font-semibold text-slate-300 whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {queryResult.rows.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className="hover:bg-slate-800/40 transition text-slate-300"
                          >
                            {queryResult.columns.map((col) => {
                              const val = row[col];
                              let displayVal = String(val ?? 'NULL');
                              const isHighFrp = col.includes('frp') && Number(val) > 70;
                              const isSevere = val === 'Severe' || val === 'Critical';

                              return (
                                <td key={col} className="px-3 py-2 whitespace-nowrap">
                                  {isHighFrp ? (
                                    <span className="text-orange-400 font-bold bg-orange-950/60 px-1.5 py-0.5 rounded border border-orange-500/40">
                                      {displayVal} MW
                                    </span>
                                  ) : isSevere ? (
                                    <span className="text-red-400 font-bold bg-red-950/60 px-1.5 py-0.5 rounded border border-red-500/40">
                                      {displayVal}
                                    </span>
                                  ) : (
                                    <span className={val === null ? 'text-slate-600 italic' : ''}>
                                      {displayVal}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No query results returned. Click "Execute Query" above.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Table Schemas & GIST Index Inspector */}
        {activeSubTab === 'schema' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {schemaData?.tables.map((table) => (
              <div key={table.tableName} className="bg-[#0f172a] rounded border border-slate-800 p-5 space-y-4 shadow-md">
                <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-sm">
                        {table.tableName}
                      </span>
                      <span className="px-2 py-0.5 bg-orange-950/80 text-orange-400 font-mono text-[10px] rounded border border-orange-500/40 font-bold">
                        {table.rowCount} Pre-Loaded Rows
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{table.description}</p>
                  </div>
                </div>

                {/* Columns List */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Columns Definition
                  </span>
                  <div className="bg-[#020617] rounded border border-slate-800 divide-y divide-slate-800/80 overflow-hidden text-xs font-mono">
                    {table.columns.map((col) => (
                      <div key={col.name} className="p-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{col.name}</span>
                          {col.isPrimary && (
                            <span className="bg-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0.2 rounded border border-amber-500/30">
                              PK
                            </span>
                          )}
                          {col.isForeign && (
                            <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.2 rounded border border-blue-500/30">
                              FK
                            </span>
                          )}
                          {col.isGeometry && (
                            <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.2 rounded border border-emerald-500/30 font-bold">
                              POSTGIS GEOM
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                          <span className="text-orange-400">{col.type}</span>
                          <span className="text-slate-600">{col.nullable ? 'NULL' : 'NOT NULL'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Spatial Indexes */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Configured Database Indexes
                  </span>
                  <div className="bg-[#020617] rounded border border-slate-800 p-3 space-y-2 text-xs font-mono">
                    {table.indexes.map((idx) => (
                      <div key={idx.name} className="flex items-start justify-between gap-2 border-b border-slate-800/60 pb-2 last:border-b-0 last:pb-0">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-emerald-400 font-bold">{idx.name}</span>
                            <span className="text-[10px] px-1.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {idx.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{idx.description}</p>
                        </div>
                        <span className="text-slate-500 text-[10px] shrink-0">
                          ({idx.columns.join(', ')})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: Raw DDL Script */}
        {activeSubTab === 'export' && (
          <div className="bg-[#0f172a] rounded border border-slate-800 p-5 space-y-4 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white font-mono">
                  /src/db/schema.sql (Production PostGIS DDL & Seed Script)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete standard SQL compatible with PostgreSQL 14+, PostGIS 3.2+, Supabase, and AWS RDS/Aurora.
                </p>
              </div>
              <button
                onClick={handleDownloadSchemaSql}
                className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .SQL File</span>
              </button>
            </div>

            <div className="bg-[#020617] rounded border border-slate-800 p-4 font-mono text-xs text-slate-300 max-h-[500px] overflow-y-auto leading-relaxed">
              <pre className="text-slate-300">
{`-- 1. Enable Spatial Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Industrial Facilities Spatial Catalog
CREATE TABLE industrial_facilities (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    hazard_level VARCHAR(32) NOT NULL,
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

CREATE INDEX idx_facilities_geom ON industrial_facilities USING GIST (geom);

-- 3. Satellite Thermal Observations
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
    frp DOUBLE PRECISION NOT NULL,
    brightness_temp_k DOUBLE PRECISION NOT NULL,
    confidence INTEGER NOT NULL,
    scan DOUBLE PRECISION DEFAULT 0.75,
    track DOUBLE PRECISION DEFAULT 0.75,
    day_night CHAR(1) NOT NULL,
    data_source VARCHAR(64) NOT NULL DEFAULT 'NASA_FIRMS_VIIRS',
    land_use_context VARCHAR(255),
    facility_id VARCHAR(32) REFERENCES industrial_facilities(id),
    distance_to_facility_m DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_thermal_obs_geom ON thermal_observations USING GIST (geom);
CREATE INDEX idx_thermal_obs_datetime ON thermal_observations (acq_datetime);
CREATE INDEX idx_thermal_obs_frp ON thermal_observations (frp);

-- 4. Spatial Collision View (ST_DWithin)
CREATE OR REPLACE VIEW v_active_industrial_anomalies AS
SELECT 
    obs.id AS observation_id,
    obs.event_id,
    obs.satellite,
    obs.frp AS frp_mw,
    fac.name AS facility_name,
    fac.hazard_level,
    ROUND(ST_Distance(obs.geom::geography, fac.geom::geography)::numeric, 2) AS distance_meters
FROM thermal_observations obs
JOIN industrial_facilities fac
  ON ST_DWithin(obs.geom::geography, fac.geom::geography, fac.footprint_radius_m * 1.5)
ORDER BY obs.frp DESC;`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
