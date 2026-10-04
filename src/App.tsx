import React, { useState, useEffect } from 'react';
import {
  ThermalEvent,
  IndustrialFacility,
  ThermalAlert,
  AnalyticsSummary,
  FilterState,
  VerificationState,
} from './types';
import { apiClient } from './services/apiClient';
import { Navbar, ActiveTab } from './components/Navigation/Navbar';
import { FilterPanel } from './components/Sidebar/FilterPanel';
import { ThermalMap } from './components/Map/ThermalMap';
import { InvestigationPanel } from './components/Investigation/InvestigationPanel';
import { EventsListView } from './components/Events/EventsListView';
import { IndustrialAssetsView } from './components/Assets/IndustrialAssetsView';
import { HistoricalAnalysisView } from './components/History/HistoricalAnalysisView';
import { AlertsView } from './components/Alerts/AlertsView';
import { AnalyticsDashboard } from './components/Analytics/AnalyticsDashboard';
import { PostgisDatabaseView } from './components/Database/PostgisDatabaseView';
import { DataIngestModal } from './components/DataIngest/DataIngestModal';
import { UserGuideModal } from './components/UserGuide/UserGuideModal';
import { computeAnalyticsSummary, buildAlertsDatabase } from './services/mockData';
import { isIndiaEvent } from './services/spatial';
import { ThermalMonitorBar, TimeWindow } from './components/Monitor/ThermalMonitorBar';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('map');
  const [scope, setScope] = useState<'global' | 'india'>('global');
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('24h');
  const [events, setEvents] = useState<ThermalEvent[]>([]);
  const [facilities, setFacilities] = useState<IndustrialFacility[]>([]);
  const [alerts, setAlerts] = useState<ThermalAlert[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);

  const [selectedEventId, setSelectedEventId] = useState<string | null>('TH-EVT-2026-001');
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>('FAC-GJ-001');

  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isLeftFilterCollapsed, setIsLeftFilterCollapsed] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [dataSourceMode, setDataSourceMode] = useState<'demo' | 'live' | 'upload'>('demo');

  // Unified Filter State
  const [filters, setFilters] = useState<FilterState>({
    sourceType: 'all',
    riskTier: 'all',
    persistence: 'all',
    minConfidence: 0,
    minFrp: 0,
    industrialProximity: 'all',
    region: 'all',
    dateRange: 'all',
    searchQuery: '',
    dataSourceMode: 'demo',
  });

  // Fetch Initial Data from Backend
  useEffect(() => {
    async function loadData() {
      const data = await apiClient.getMapData();
      setEvents(data.events);
      setFacilities(data.facilities);
      setAlerts(data.alerts);
      setAnalytics(computeAnalyticsSummary(data.events));
    }
    loadData();
  }, []);

  // Reference timestamp for time window filter (latest observation time in dataset)
  const latestTimestampMs = events.reduce((max, evt) => {
    const t = new Date(evt.primaryObservation.timestamp).getTime();
    return isNaN(t) ? max : Math.max(max, t);
  }, 0);

  const latestObservationTime = events.length > 0 && latestTimestampMs > 0
    ? new Date(latestTimestampMs).toISOString()
    : null;

  // Filter application
  const filteredEvents = events.filter((evt) => {
    // 0. Scope filter: India vs Global
    if (scope === 'india' && !isIndiaEvent(evt)) {
      return false;
    }

    // 0b. Time Window filter (24H / 48H / 7D)
    if (latestTimestampMs > 0) {
      const evtTimeMs = new Date(evt.primaryObservation.timestamp).getTime();
      if (!isNaN(evtTimeMs)) {
        const diffHours = (latestTimestampMs - evtTimeMs) / (1000 * 60 * 60);
        if (timeWindow === '24h' && diffHours > 24) return false;
        if (timeWindow === '48h' && diffHours > 48) return false;
        if (timeWindow === '7d' && diffHours > 168) return false;
      }
    }

    // 1. Source type filter
    if (filters.sourceType !== 'all' && evt.classification.category !== filters.sourceType) {
      return false;
    }

    // 2. Risk tier filter
    if (filters.riskTier !== 'all' && evt.priority.tier.toLowerCase() !== filters.riskTier.toLowerCase()) {
      return false;
    }

    // 3. Persistence filter
    if (filters.persistence !== 'all' && evt.persistence.level !== filters.persistence) {
      return false;
    }

    // 4. Min confidence filter
    if (evt.primaryObservation.confidence < filters.minConfidence) {
      return false;
    }

    // 5. Min FRP filter
    if (evt.primaryObservation.frp < filters.minFrp) {
      return false;
    }

    // 6. Industrial proximity envelope
    if (filters.industrialProximity === '500m' && (evt.distanceToFacilityMeters || Infinity) > 500) {
      return false;
    }
    if (filters.industrialProximity === '1000m' && (evt.distanceToFacilityMeters || Infinity) > 1000) {
      return false;
    }
    if (filters.industrialProximity === '2500m' && (evt.distanceToFacilityMeters || Infinity) > 2500) {
      return false;
    }

    // 7. Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchId = evt.id.toLowerCase().includes(query);
      const matchCat = evt.classification.categoryLabel.toLowerCase().includes(query);
      const matchFac = (evt.nearestFacility?.name || '').toLowerCase().includes(query);
      const matchReg = evt.region.toLowerCase().includes(query);
      if (!matchId && !matchCat && !matchFac && !matchReg) return false;
    }

    return true;
  });

  const selectedEvent = events.find((e) => e.id === selectedEventId) || null;

  const handleSelectEvent = (event: ThermalEvent) => {
    setSelectedEventId(event.id);
  };

  const handleOpenIndiaInvestigation = (event: ThermalEvent) => {
    setScope('india');
    setSelectedEventId(event.id);
    setActiveTab('map');
  };

  const handleSelectFacility = (fac: IndustrialFacility) => {
    setSelectedFacilityId(fac.id);
    // Find nearest event if exists
    const nearby = events.find((e) => e.nearestFacility?.id === fac.id);
    if (nearby) {
      setSelectedEventId(nearby.id);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      sourceType: 'all',
      riskTier: 'all',
      persistence: 'all',
      minConfidence: 0,
      minFrp: 0,
      industrialProximity: 'all',
      region: 'all',
      dateRange: 'all',
      searchQuery: '',
      dataSourceMode: 'demo',
    });
  };

  const handleVerifyEvent = async (
    eventId: string,
    state: VerificationState,
    notes?: string,
    assignedTeam?: string
  ) => {
    const updated = await apiClient.updateVerification(eventId, state, notes, 'Duty Officer', assignedTeam);
    if (updated) {
      setEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
    }
  };

  const handleAIBriefRequest = async (eventId: string) => {
    return await apiClient.getAIBrief(eventId);
  };

  const handleLoadScenario = (scenarioKey: string) => {
    if (scenarioKey === 'jamnagar_surge') {
      setSelectedEventId('TH-EVT-2026-001');
      setActiveTab('map');
      setFilters((prev) => ({ ...prev, sourceType: 'all', riskTier: 'all' }));
    } else if (scenarioKey === 'ankleshwar_chemical') {
      setSelectedEventId('TH-EVT-2026-003');
      setActiveTab('map');
    } else if (scenarioKey === 'persistent_flaring') {
      setSelectedEventId('TH-EVT-2026-002');
      setActiveTab('map');
    } else if (scenarioKey === 'agri_filtering') {
      setSelectedEventId('TH-EVT-2026-009');
      setActiveTab('map');
    }
  };

  const criticalAlertsCount = alerts.filter((a) => a.severity === 'Critical' || a.severity === 'High').length;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#020617] text-slate-300 overflow-hidden font-sans">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        criticalAlertsCount={criticalAlertsCount}
        totalEventsCount={events.length}
        dataSourceMode={dataSourceMode}
        setDataSourceMode={setDataSourceMode}
        scope={scope}
        setScope={setScope}
        onOpenIngestModal={() => setIsIngestModalOpen(true)}
        onOpenUserGuide={() => setIsUserGuideOpen(true)}
      />

      {/* Hero KPI & Global Summary Command Strip */}
      {activeTab === 'map' && (
        <ThermalMonitorBar
          scope={scope}
          timeWindow={timeWindow}
          onTimeWindowChange={setTimeWindow}
          anomaliesCount={filteredEvents.length}
          highPriorityCount={
            filteredEvents.filter(
              (e) => e.priority.tier === 'Critical' || e.priority.tier === 'High'
            ).length
          }
          persistentSourcesCount={
            filteredEvents.filter(
              (e) => e.persistence.level === 'persistent' || e.persistence.observationCount >= 4
            ).length
          }
          needsReviewCount={
            filteredEvents.filter(
              (e) => e.verification.state === 'unreviewed' || e.verification.state === 'needs_field_check'
            ).length
          }
          dataSourceMode={dataSourceMode}
          latestObservationTime={latestObservationTime}
        />
      )}

      {/* Main Content Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Filter Sidebar (Desktop View with smooth sliding transition) */}
        {activeTab === 'map' && !isMapExpanded && (
          <div
            className={`hidden lg:flex transition-all duration-300 ease-in-out shrink-0 h-full border-r border-slate-800 ${
              isLeftFilterCollapsed ? 'w-0 overflow-hidden border-r-0' : 'w-80'
            }`}
          >
            <FilterPanel
              filters={filters}
              onFilterChange={setFilters}
              onResetFilters={handleResetFilters}
              activeCount={filteredEvents.length}
              totalCount={events.length}
            />
          </div>
        )}

        {/* Mobile Filter Drawer Overlay */}
        {activeTab === 'map' && isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
              onClick={() => setIsMobileFilterOpen(false)}
            />
            <div className="relative w-full max-w-xs sm:max-w-sm bg-[#0f172a] h-full shadow-2xl z-10 flex flex-col">
              <FilterPanel
                filters={filters}
                onFilterChange={setFilters}
                onResetFilters={handleResetFilters}
                activeCount={filteredEvents.length}
                totalCount={events.length}
                onClose={() => setIsMobileFilterOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Tab 1: GIS Interactive Map & Investigation Panel */}
        {activeTab === 'map' && (
          <main className="flex-1 flex flex-col lg:flex-row relative overflow-hidden h-full">
            <div className="flex-1 h-full relative min-h-[300px] flex flex-col overflow-hidden">
              <ThermalMap
                events={filteredEvents}
                facilities={facilities}
                selectedEventId={selectedEventId}
                onSelectEvent={handleSelectEvent}
                selectedFacilityId={selectedFacilityId}
                onSelectFacility={handleSelectFacility}
                onOpenMobileFilters={() => setIsMobileFilterOpen(true)}
                activeFiltersCount={filteredEvents.length}
                isFilterCollapsed={isLeftFilterCollapsed || isMapExpanded}
                onToggleFilterCollapse={() => {
                  if (isMapExpanded) {
                    setIsMapExpanded(false);
                    setIsLeftFilterCollapsed(false);
                  } else {
                    setIsLeftFilterCollapsed(!isLeftFilterCollapsed);
                  }
                }}
                isExpanded={isMapExpanded}
                onToggleExpand={() => setIsMapExpanded(!isMapExpanded)}
                scope={scope}
                timeWindow={timeWindow}
                dataSourceMode={dataSourceMode}
              />
            </div>

            {/* Desktop Right Investigation Panel */}
            {selectedEvent && !isMapExpanded && (
              <div className="hidden lg:flex lg:w-[460px] xl:w-[520px] shrink-0 h-full border-l border-slate-800 transition-all duration-300">
                <InvestigationPanel
                  event={selectedEvent}
                  onClose={() => setSelectedEventId(null)}
                  onVerify={handleVerifyEvent}
                  onAIBriefRequest={handleAIBriefRequest}
                  currentScope={scope}
                  onOpenIndiaInvestigation={handleOpenIndiaInvestigation}
                />
              </div>
            )}

            {/* Mobile/Tablet Investigation Panel Drawer Modal */}
            {selectedEvent && (
              <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
                <div
                  className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
                  onClick={() => setSelectedEventId(null)}
                />
                <div className="relative w-full max-h-[85vh] sm:max-h-[90vh] bg-[#0f172a] rounded-t-2xl shadow-2xl z-10 flex flex-col border-t border-slate-700 overflow-hidden pb-safe">
                  {/* Top Mobile Drag Handle */}
                  <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2 shrink-0" />
                  <div className="flex-1 overflow-hidden flex flex-col">
                    <InvestigationPanel
                      event={selectedEvent}
                      onClose={() => setSelectedEventId(null)}
                      onVerify={handleVerifyEvent}
                      onAIBriefRequest={handleAIBriefRequest}
                      currentScope={scope}
                      onOpenIndiaInvestigation={handleOpenIndiaInvestigation}
                    />
                  </div>
                </div>
              </div>
            )}
          </main>
        )}

        {/* Tab 2: Tabular Event Stream / Queue */}
        {activeTab === 'events' && (
          <EventsListView
            events={filteredEvents}
            selectedEventId={selectedEventId}
            onSelectEvent={(evt) => {
              setSelectedEventId(evt.id);
              setActiveTab('map');
            }}
          />
        )}

        {/* Tab 3: Industrial Assets Directory */}
        {activeTab === 'assets' && (
          <IndustrialAssetsView
            facilities={facilities}
            events={events}
            onSelectFacility={handleSelectFacility}
            onSelectEvent={(evt) => {
              setSelectedEventId(evt.id);
              setActiveTab('map');
            }}
          />
        )}

        {/* Tab 4: Historical & Persistence Analysis */}
        {activeTab === 'history' && (
          <HistoricalAnalysisView
            facilities={facilities}
            events={events}
            onSelectEvent={(evt) => {
              setSelectedEventId(evt.id);
              setActiveTab('map');
            }}
          />
        )}

        {/* Tab 5: Prioritized Alerts Feed */}
        {activeTab === 'alerts' && (
          <AlertsView
            alerts={alerts}
            events={events}
            onSelectEvent={(evt) => {
              setSelectedEventId(evt.id);
              setActiveTab('map');
            }}
          />
        )}

        {/* Tab 6: Operational Analytics Dashboard */}
        {activeTab === 'analytics' && analytics && (
          <AnalyticsDashboard analytics={analytics} events={events} />
        )}

        {/* Tab 7: PostgreSQL + PostGIS Spatial Database View */}
        {activeTab === 'database' && <PostgisDatabaseView />}
      </div>

      {/* Data Ingest / Scenario Selection Modal */}
      <DataIngestModal
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
        onIngestCustomData={(parsed) => {
          if (parsed && parsed.length > 0) {
            setEvents((prev) => {
              const combined = [...parsed, ...prev];
              setAlerts(buildAlertsDatabase(combined));
              setAnalytics(computeAnalyticsSummary(combined));
              return combined;
            });
            setDataSourceMode('upload');
            setFilters((prev) => ({ ...prev, dataSourceMode: 'upload' }));
            setSelectedEventId(parsed[0].id);
          }
        }}
        onLoadScenario={handleLoadScenario}
      />

      {/* User Guide & Operational Manual Modal */}
      <UserGuideModal
        isOpen={isUserGuideOpen}
        onClose={() => setIsUserGuideOpen(false)}
      />
    </div>
  );
}
