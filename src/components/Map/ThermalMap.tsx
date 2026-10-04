import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  ThermalEvent,
  IndustrialFacility,
  PriorityTier,
  ThermalCategory,
} from '../../types';
import {
  Layers,
  Crosshair,
  Maximize2,
  Minimize2,
  Compass,
  Flame,
  Shield,
  Eye,
  Sliders,
  Filter,
  RotateCcw,
  Factory,
  Globe,
  Map as MapIcon,
  Sun,
  Moon,
  Plus,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  Info,
} from 'lucide-react';

interface ThermalMapProps {
  events: ThermalEvent[];
  facilities: IndustrialFacility[];
  selectedEventId: string | null;
  onSelectEvent: (event: ThermalEvent) => void;
  selectedFacilityId: string | null;
  onSelectFacility: (facility: IndustrialFacility) => void;
  onOpenMobileFilters?: () => void;
  activeFiltersCount?: number;
  isFilterCollapsed?: boolean;
  onToggleFilterCollapse?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  scope?: 'global' | 'india';
  timeWindow?: '24h' | '48h' | '7d';
  dataSourceMode?: 'demo' | 'live' | 'upload';
}

const INDIA_REGIONS: Record<string, { lat: number; lng: number; zoom: number; name: string }> = {
  all_india: { lat: 21.7679, lng: 78.8718, zoom: 5, name: 'All India Overview' },
  jamnagar: { lat: 22.3845, lng: 69.8322, zoom: 13, name: 'Jamnagar Petrochem' },
  korba: { lat: 22.3592, lng: 82.7481, zoom: 13, name: 'Korba Thermal/Smelter' },
  vizag: { lat: 17.6328, lng: 83.1895, zoom: 13, name: 'Visakhapatnam Steel' },
  singrauli: { lat: 24.1205, lng: 82.6842, zoom: 13, name: 'Singrauli Mining Belt' },
  chennai: { lat: 13.1672, lng: 80.2621, zoom: 13, name: 'Chennai Manali Cluster' },
  ankleshwar: { lat: 21.6284, lng: 73.0125, zoom: 13, name: 'Ankleshwar GIDC Chemical' },
  punjab: { lat: 30.28, lng: 76.10, zoom: 10, name: 'Punjab Agri Burning Plains' },
};

const GLOBAL_REGIONS: Record<string, { lat: number; lng: number; zoom: number; name: string }> = {
  world_overview: { lat: 20, lng: 10, zoom: 2.5, name: 'World Overview' },
  middle_east: { lat: 28.5, lng: 49.0, zoom: 5, name: 'Middle East (Persian Gulf)' },
  north_america: { lat: 35.0, lng: -98.0, zoom: 4, name: 'North America (Permian/Alberta)' },
  europe: { lat: 52.0, lng: 10.0, zoom: 4, name: 'Western Europe (North Sea)' },
  asia_pacific: { lat: 15.0, lng: 105.0, zoom: 4, name: 'Asia Pacific Corridor' },
  south_america: { lat: -15.0, lng: -55.0, zoom: 4, name: 'South America (Cerrado)' },
  india_corridor: { lat: 21.7679, lng: 78.8718, zoom: 5, name: 'India Industrial Corridor' },
};

export const ThermalMap: React.FC<ThermalMapProps> = ({
  events,
  facilities,
  selectedEventId,
  onSelectEvent,
  selectedFacilityId,
  onSelectFacility,
  onOpenMobileFilters,
  activeFiltersCount,
  isFilterCollapsed,
  onToggleFilterCollapse,
  isExpanded,
  onToggleExpand,
  scope = 'global',
  timeWindow = '24h',
  dataSourceMode = 'demo',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const facilitiesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const buffersLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [activeBaseMap, setActiveBaseMap] = useState<'dark' | 'satellite' | 'street'>('dark');
  const [showBuffers, setShowBuffers] = useState(true);
  const [showFacilities, setShowFacilities] = useState(true);
  const [showHeatGlow, setShowHeatGlow] = useState(true);
  const [activeRegionKey, setActiveRegionKey] = useState<string>('all_india');
  const [showLegend, setShowLegend] = useState(false);

  // Map state telemetry for bottom status bar
  const [mapZoom, setMapZoom] = useState(5);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 21.7679,
    lng: 78.8718,
  });

  // Base map Tile URLs (Public, zero API-key OpenStreetMap and Esri tiles)
  const tileUrls = {
    dark: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  };

  const tileAttributions = {
    dark: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    satellite: 'Tiles &copy; Esri &mdash; Source: Esri, USGS, GeoEye, GIS Community',
    street: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
  };

  // Helper for Priority Colors
  const getTierColor = (tier: PriorityTier) => {
    switch (tier) {
      case 'Critical':
        return '#ef4444'; // red-500
      case 'High':
        return '#f97316'; // orange-500
      case 'Moderate':
        return '#eab308'; // yellow-500
      case 'Low':
        return '#3b82f6'; // blue-500
    }
  };

  // Initialize Map and attach ResizeObserver for dynamic responsiveness
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter: [number, number] = scope === 'global' ? [20, 10] : [21.7679, 78.8718];
    const initialZoom = scope === 'global' ? 2.5 : 5;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
    });

    // Custom Zoom control placed neatly at bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map);

    const initialTile = L.tileLayer(tileUrls.dark, {
      attribution: tileAttributions.dark,
      maxZoom: 19,
      className: 'dark-tiles',
    }).addTo(map);
    tileLayerRef.current = initialTile;

    // Layer groups for dynamic toggles
    buffersLayerGroupRef.current = L.layerGroup().addTo(map);
    facilitiesLayerGroupRef.current = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    // Sync zoom and center to status bar
    const updateTelemetry = () => {
      const c = map.getCenter();
      setMapCenter({ lat: Number(c.lat.toFixed(4)), lng: Number(c.lng.toFixed(4)) });
      setMapZoom(map.getZoom());
    };

    map.on('moveend', updateTelemetry);
    map.on('zoomend', updateTelemetry);

    // Resize observer to ensure Leaflet recalculates dimensions when container expands or slides
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // React to scope change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (scope === 'global') {
      mapInstanceRef.current.flyTo([20, 10], 2.5, { duration: 1.2 });
      setActiveRegionKey('world_overview');
    } else {
      mapInstanceRef.current.flyTo([21.7679, 78.8718], 5, { duration: 1.2 });
      setActiveRegionKey('all_india');
    }
  }, [scope]);

  // Update Base Map Tile Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    mapInstanceRef.current.removeLayer(tileLayerRef.current);

    const newTile = L.tileLayer(tileUrls[activeBaseMap], {
      attribution: tileAttributions[activeBaseMap],
      maxZoom: 19,
      className: activeBaseMap === 'dark' ? 'dark-tiles' : '',
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newTile;
  }, [activeBaseMap]);

  // Render Facilities & Safety Buffer Circles
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (!facilitiesLayerGroupRef.current || !buffersLayerGroupRef.current) return;

    facilitiesLayerGroupRef.current.clearLayers();
    buffersLayerGroupRef.current.clearLayers();

    // In global scope with low zoom, suppress dense industrial polygons to keep thermal observations dominant
    if (scope === 'global' && mapZoom < 6) {
      return;
    }

    if (showFacilities) {
      facilities.forEach((fac) => {
        // Facility center icon
        const facilityIcon = L.divIcon({
          className: 'custom-facility-marker',
          html: `
            <div style="
              width: 28px;
              height: 28px;
              background: #1e293b;
              border: 2px solid ${fac.hazardLevel === 'Severe' ? '#f43f5e' : '#38bdf8'};
              border-radius: 6px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 12px rgba(0,0,0,0.5);
              cursor: pointer;
            ">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${fac.hazardLevel === 'Severe' ? '#f43f5e' : '#38bdf8'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path>
                <path d="M17 18h1"></path>
                <path d="M12 18h1"></path>
                <path d="M7 18h1"></path>
              </svg>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([fac.latitude, fac.longitude], { icon: facilityIcon });
        marker.bindTooltip(
          `<strong>${fac.name}</strong><br/><span style="color:#94a3b8; font-size:11px;">${fac.type} | Hazard: ${fac.hazardLevel}</span>`,
          { className: 'leaflet-tooltip-dark', direction: 'top' }
        );

        marker.on('click', () => {
          onSelectFacility(fac);
        });

        facilitiesLayerGroupRef.current?.addLayer(marker);

        // Safety Envelope Buffers (500m high-risk inner buffer + footprint radius outer buffer)
        if (showBuffers) {
          const innerCircle = L.circle([fac.latitude, fac.longitude], {
            radius: 500,
            color: fac.hazardLevel === 'Severe' ? '#f43f5e' : '#f59e0b',
            weight: 1.2,
            dashArray: '4, 6',
            fillColor: fac.hazardLevel === 'Severe' ? '#f43f5e' : '#f59e0b',
            fillOpacity: 0.05,
          });

          const outerCircle = L.circle([fac.latitude, fac.longitude], {
            radius: fac.footprintRadiusMeters,
            color: '#38bdf8',
            weight: 1,
            fillColor: '#38bdf8',
            fillOpacity: 0.03,
          });

          buffersLayerGroupRef.current?.addLayer(innerCircle);
          buffersLayerGroupRef.current?.addLayer(outerCircle);
        }
      });
    }
  }, [facilities, showFacilities, showBuffers, scope, mapZoom]);

  // Render Thermal Anomaly Markers & Heat Signatures (with intelligent clustering at low zoom)
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerGroupRef.current) return;
    markersLayerGroupRef.current.clearLayers();

    // At global/continental zoom (mapZoom < 6), cluster nearby observations for readability
    if (mapZoom < 6) {
      const cellSize = mapZoom <= 3 ? 10 : 5; // grid size in degrees
      const clusterMap = new Map<string, { lat: number; lng: number; events: ThermalEvent[] }>();

      events.forEach((evt) => {
        const gridKey = `${Math.floor(evt.primaryObservation.latitude / cellSize)},${Math.floor(evt.primaryObservation.longitude / cellSize)}`;
        const existing = clusterMap.get(gridKey);
        if (existing) {
          existing.events.push(evt);
        } else {
          clusterMap.set(gridKey, {
            lat: evt.primaryObservation.latitude,
            lng: evt.primaryObservation.longitude,
            events: [evt],
          });
        }
      });

      clusterMap.forEach((cluster) => {
        if (cluster.events.length === 1) {
          const evt = cluster.events[0];
          const isSelected = evt.id === selectedEventId;
          const tierColor = getTierColor(evt.priority.tier);
          const isCritical = evt.priority.tier === 'Critical' || evt.priority.tier === 'High';

          const markerHtml = `
            <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              ${isCritical ? `<div style="position: absolute; width: 30px; height: 30px; border-radius: 50%; background: ${tierColor}; opacity: 0.4; animation: thermal-pulse 2s infinite;"></div>` : ''}
              <div style="
                width: ${isSelected ? '22px' : '16px'};
                height: ${isSelected ? '22px' : '16px'};
                background: ${tierColor};
                border: 2px solid #ffffff;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 12px ${tierColor}, 0 2px 6px rgba(0,0,0,0.8);
              ">
                <div style="width: 5px; height: 5px; background: #ffffff; border-radius: 50%;"></div>
              </div>
            </div>
          `;

          const customIcon = L.divIcon({
            className: 'custom-thermal-marker',
            html: markerHtml,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          });

          const marker = L.marker([evt.primaryObservation.latitude, evt.primaryObservation.longitude], {
            icon: customIcon,
            zIndexOffset: isSelected ? 1000 : evt.priority.score,
          });

          marker.bindTooltip(
            `<div style="padding: 4px 8px; font-family: sans-serif;"><strong>${evt.classification.categoryLabel}</strong><br/>FRP: ${evt.primaryObservation.frp} MW (${evt.priority.tier})</div>`,
            { className: 'leaflet-tooltip-dark', direction: 'top', offset: [0, -10] }
          );

          marker.on('click', () => onSelectEvent(evt));
          markersLayerGroupRef.current?.addLayer(marker);
        } else {
          // Multi-event cluster
          const criticalCount = cluster.events.filter((e) => e.priority.tier === 'Critical' || e.priority.tier === 'High').length;
          const dominantColor = criticalCount > 0 ? '#ef4444' : '#f97316';

          const clusterHtml = `
            <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: ${dominantColor}; opacity: 0.3; animation: thermal-pulse 2.5s infinite;"></div>
              <div style="
                width: 28px;
                height: 28px;
                background: #090d16;
                border: 2px solid ${dominantColor};
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 14px ${dominantColor};
                font-family: monospace;
                font-size: 11px;
                font-weight: 800;
                color: #ffffff;
              ">
                ${cluster.events.length}
              </div>
            </div>
          `;

          const clusterIcon = L.divIcon({
            className: 'custom-cluster-marker',
            html: clusterHtml,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          });

          const marker = L.marker([cluster.lat, cluster.lng], { icon: clusterIcon, zIndexOffset: 800 });
          marker.bindTooltip(
            `<div style="padding: 4px 8px; font-family: sans-serif;"><strong>${cluster.events.length} Thermal Anomalies</strong><br/><span style="color:#f97316;">Click to zoom into cluster</span></div>`,
            { className: 'leaflet-tooltip-dark', direction: 'top', offset: [0, -12] }
          );

          marker.on('click', () => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.flyTo([cluster.lat, cluster.lng], Math.min(mapZoom + 3, 7), { duration: 1.2 });
            }
          });

          markersLayerGroupRef.current?.addLayer(marker);
        }
      });
      return;
    }

    // Detailed Individual Markers (zoom >= 6)
    events.forEach((evt) => {
      const isSelected = evt.id === selectedEventId;
      const tierColor = getTierColor(evt.priority.tier);
      const isCritical = evt.priority.tier === 'Critical' || evt.priority.tier === 'High';

      // Visual pulse ring for critical / high priority
      const markerHtml = `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          ${
            isCritical
              ? `<div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: ${tierColor}; opacity: 0.4; animation: thermal-pulse 2s infinite;"></div>`
              : ''
          }
          <div style="
            width: ${isSelected ? '24px' : '18px'};
            height: ${isSelected ? '24px' : '18px'};
            background: ${tierColor};
            border: 2px solid #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 14px ${tierColor}, 0 2px 8px rgba(0,0,0,0.8);
            transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
            transition: all 0.2s ease-in-out;
          ">
            <div style="width: 6px; height: 6px; background: #ffffff; border-radius: 50%;"></div>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-thermal-marker',
        html: markerHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([evt.primaryObservation.latitude, evt.primaryObservation.longitude], {
        icon: customIcon,
        zIndexOffset: isSelected ? 1000 : evt.priority.score,
      });

      // Hover popup summary
      marker.bindTooltip(
        `
        <div style="padding: 6px 10px; font-family: 'Plus Jakarta Sans', sans-serif;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
            <span style="font-weight: 700; color: ${tierColor}; font-size: 12px;">${evt.priority.tier.toUpperCase()} (${evt.priority.score}/100)</span>
            <span style="font-size: 10px; background: #334155; padding: 1px 5px; border-radius: 4px; color: #cbd5e1;">${evt.primaryObservation.satellite}</span>
          </div>
          <div style="font-size: 12px; font-weight: 600; color: #f8fafc; margin-bottom: 2px;">
            ${evt.classification.categoryLabel}
          </div>
          <div style="font-size: 11px; color: #94a3b8;">
            FRP: <strong style="color: #fbbf24;">${evt.primaryObservation.frp} MW</strong> | Conf: <strong>${evt.primaryObservation.confidence}%</strong>
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 3px;">
            ${evt.distanceToFacilityMeters ? `📍 ${Math.round(evt.distanceToFacilityMeters)}m from ${evt.nearestFacility?.name}` : '📍 Non-industrial corridor'}
          </div>
        </div>
      `,
        { className: 'leaflet-tooltip-dark', direction: 'top', offset: [0, -12] }
      );

      marker.on('click', () => {
        onSelectEvent(evt);
      });

      markersLayerGroupRef.current?.addLayer(marker);

      // FRP Radiant Heat Glow Circle
      if (showHeatGlow) {
        const glowCircle = L.circle(
          [evt.primaryObservation.latitude, evt.primaryObservation.longitude],
          {
            radius: Math.max(250, evt.primaryObservation.frp * 15),
            color: tierColor,
            weight: 0.5,
            fillColor: tierColor,
            fillOpacity: isCritical ? 0.12 : 0.06,
          }
        );
        markersLayerGroupRef.current?.addLayer(glowCircle);
      }
    });
  }, [events, selectedEventId, showHeatGlow, mapZoom]);

  // Center on selected event when changed externally
  useEffect(() => {
    if (!selectedEventId || !mapInstanceRef.current) return;
    const evt = events.find((e) => e.id === selectedEventId);
    if (evt) {
      mapInstanceRef.current.flyTo(
        [evt.primaryObservation.latitude, evt.primaryObservation.longitude],
        Math.max(mapInstanceRef.current.getZoom(), 12),
        { duration: 1.2 }
      );
    }
  }, [selectedEventId]);

  // Quick Region Jumper handler
  const handleJumpRegion = (regionKey: string) => {
    setActiveRegionKey(regionKey);
    const regions = scope === 'global' ? GLOBAL_REGIONS : INDIA_REGIONS;
    const target = regions[regionKey];
    if (target && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([target.lat, target.lng], target.zoom, { duration: 1.5 });
    }
  };

  // Reset / Fit All Active Hotspots in View
  const handleFitAllHotspots = () => {
    if (!mapInstanceRef.current) return;
    if (events.length > 0) {
      const markers = events.map((e) =>
        L.marker([e.primaryObservation.latitude, e.primaryObservation.longitude])
      );
      const group = L.featureGroup(markers);
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.12), {
        maxZoom: 12,
        duration: 1.2,
      });
    } else {
      if (scope === 'global') {
        mapInstanceRef.current.flyTo([20, 10], 2.5, { duration: 1.2 });
      } else {
        mapInstanceRef.current.flyTo([21.7679, 78.8718], 5, { duration: 1.2 });
      }
    }
    setActiveRegionKey(scope === 'global' ? 'world_overview' : 'all_india');
  };

  // Manual Zoom In / Zoom Out controls
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#020617] overflow-hidden select-none">
      {/* 
        ========================================================================
        1. SEPARATE TOP MAP CONTROLS & TOGGLES TOOLBAR (NOT AN OVERLAY)
        Positions cleanly above the rectangular map coverage div
        ========================================================================
      */}
      <header className="w-full shrink-0 bg-[#0b1120] border-b border-slate-800 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 z-20 shadow-md">
        {/* Left Control Cluster: Filter Collapse + Basemap + Layers */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Desktop Filter Sidebar Slide/Toggle Button */}
          {onToggleFilterCollapse && (
            <button
              onClick={onToggleFilterCollapse}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition"
              title={isFilterCollapsed ? 'Slide open GIS Screening Filters' : 'Slide collapse GIS Screening Filters'}
            >
              {isFilterCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-orange-400" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-slate-400" />
              )}
              <span>{isFilterCollapsed ? 'Show Filters' : 'Hide Filters'}</span>
            </button>
          )}

          {/* Mobile Filter Opener Button */}
          {onOpenMobileFilters && (
            <button
              onClick={onOpenMobileFilters}
              className="lg:hidden px-2.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-600/30 transition shrink-0 min-h-[30px]"
              title="Open Filter Drawer"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeFiltersCount !== undefined && (
                <span className="bg-orange-950 text-orange-200 text-[10px] px-1.5 py-0.2 rounded font-mono">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          )}

          {/* Group 1: Basemap Selection Segmented Control */}
          <div className="flex items-center bg-[#020617] rounded-lg border border-slate-800 p-0.5 text-xs shrink-0">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-2 hidden sm:inline-flex items-center gap-1 border-r border-slate-800 mr-0.5">
              <Globe className="w-3 h-3 text-orange-400" />
              Basemap:
            </span>
            <button
              onClick={() => setActiveBaseMap('dark')}
              className={`px-2 sm:px-2.5 py-1 rounded-md text-[11px] font-medium transition min-h-[26px] flex items-center gap-1 ${
                activeBaseMap === 'dark'
                  ? 'bg-orange-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Dark Basemap (OpenStreetMap)"
            >
              <Moon className="w-3 h-3" />
              <span>Dark</span>
            </button>
            <button
              onClick={() => setActiveBaseMap('satellite')}
              className={`px-2 sm:px-2.5 py-1 rounded-md text-[11px] font-medium transition min-h-[26px] flex items-center gap-1 ${
                activeBaseMap === 'satellite'
                  ? 'bg-orange-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="High-Resolution Satellite Imagery"
            >
              <Sun className="w-3 h-3" />
              <span>Satellite</span>
            </button>
            <button
              onClick={() => setActiveBaseMap('street')}
              className={`px-2 sm:px-2.5 py-1 rounded-md text-[11px] font-medium transition min-h-[26px] flex items-center gap-1 ${
                activeBaseMap === 'street'
                  ? 'bg-orange-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Road & Infrastructure Map"
            >
              <MapIcon className="w-3 h-3" />
              <span>Street</span>
            </button>
          </div>

          {/* Group 2: Layer View Toggles */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowBuffers(!showBuffers)}
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition min-h-[28px] ${
                showBuffers
                  ? 'bg-sky-950/90 border-sky-500/60 text-sky-300 font-semibold shadow-sm'
                  : 'bg-[#020617] border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle 500m Industrial Plant Hazard Safety Envelopes"
            >
              <Shield className={`w-3.5 h-3.5 ${showBuffers ? 'text-sky-400' : 'text-slate-500'}`} />
              <span>500m Buffers</span>
            </button>

            <button
              onClick={() => setShowHeatGlow(!showHeatGlow)}
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition min-h-[28px] ${
                showHeatGlow
                  ? 'bg-orange-950/90 border-orange-500/60 text-orange-300 font-semibold shadow-sm'
                  : 'bg-[#020617] border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle FRP Radiant Heat Footprint Radii"
            >
              <Flame className={`w-3.5 h-3.5 ${showHeatGlow ? 'text-orange-400' : 'text-slate-500'}`} />
              <span>FRP Glow</span>
            </button>

            <button
              onClick={() => setShowFacilities(!showFacilities)}
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition min-h-[28px] ${
                showFacilities
                  ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300 font-semibold shadow-sm'
                  : 'bg-[#020617] border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Monitored Industrial Facilities Markers"
            >
              <Factory className={`w-3.5 h-3.5 ${showFacilities ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span>Plants</span>
            </button>
          </div>
        </div>

        {/* Right Control Cluster: Region Jumper + Zoom & Fit Controls + Fullscreen */}
        <div className="flex items-center flex-wrap gap-1.5">
          {/* Region Dropdown */}
          <div className="flex items-center gap-1 px-2 py-1 bg-[#020617] rounded-lg border border-slate-800 text-xs min-h-[28px]">
            <Compass className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <select
              value={activeRegionKey}
              onChange={(e) => handleJumpRegion(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer max-w-[125px] sm:max-w-[175px] truncate"
              title="Jump directly to industrial region"
            >
              {Object.entries(scope === 'global' ? GLOBAL_REGIONS : INDIA_REGIONS).map(([k, val]) => (
                <option key={k} value={k} className="bg-[#0f172a] text-slate-200">
                  {val.name}
                </option>
              ))}
            </select>
          </div>

          {/* Fit View Button */}
          <button
            onClick={handleFitAllHotspots}
            className="px-2.5 py-1 rounded-lg bg-[#020617] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium min-h-[28px] flex items-center gap-1 transition"
            title="Auto-fit / Reset view to all active hotspots"
          >
            <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline text-[11px]">Fit View</span>
          </button>

          {/* Quick Zoom Buttons */}
          <div className="flex items-center bg-[#020617] rounded-lg border border-slate-800 p-0.5">
            <button
              onClick={handleZoomIn}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
              title="Zoom In"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
              title="Zoom Out"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Symbology Legend Toggle */}
          <button
            onClick={() => setShowLegend(!showLegend)}
            className={`px-2 py-1 rounded-lg border text-xs font-medium min-h-[28px] flex items-center gap-1 transition ${
              showLegend
                ? 'bg-orange-950/80 border-orange-500/50 text-orange-300'
                : 'bg-[#020617] hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
            title="Toggle Symbology Legend"
          >
            <Layers className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden sm:inline text-[11px]">Legend</span>
          </button>

          {/* Full Width / Expand Map Viewport Toggle */}
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-1.5 rounded-lg bg-[#020617] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium min-h-[28px] flex items-center transition"
              title={isExpanded ? 'Restore Split View' : 'Maximize Map Fullscreen'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5 text-emerald-400" /> : <Maximize2 className="w-3.5 h-3.5 text-slate-400" />}
            </button>
          )}
        </div>
      </header>

      {/* 
        ========================================================================
        2. DEDICATED RECTANGULAR DIV FOR LEAFLET MAP COVERAGE
        Occupies the space below the toolbar, right of GIS screening filters.
        No floating headers overlapping the map features.
        ========================================================================
      */}
      <div className="relative flex-1 w-full h-full min-h-0 bg-[#020617] overflow-hidden">
        {/* Leaflet HTML Container */}
        <div id="gis-thermal-map-canvas" ref={mapContainerRef} className="w-full h-full" />

        {/* Symbology Legend (Clean, dockable popup inside bottom corner when enabled) */}
        {showLegend && (
          <div className="absolute bottom-6 left-3 z-[400] bg-[#0f172a]/95 backdrop-blur-md p-3 rounded-xl border border-slate-700 text-xs shadow-2xl max-w-xs space-y-2 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between font-bold text-white uppercase tracking-wider text-[11px] border-b border-slate-800 pb-1">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-orange-400" />
                Symbology & Priority
              </span>
              <button
                onClick={() => setShowLegend(false)}
                className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 text-xs leading-none"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-400/40 animate-pulse shrink-0" />
                <span className="text-slate-300 font-medium">Critical (76-100)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                <span className="text-slate-300 font-medium">High (51-75)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shrink-0" />
                <span className="text-slate-300 font-medium">Moderate (26-50)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                <span className="text-slate-300 font-medium">Low (0-25)</span>
              </div>
              <div className="flex items-center gap-1.5 col-span-2 pt-1 border-t border-slate-800 text-[10px] text-slate-400">
                <span className="w-2.5 h-2.5 rounded border border-sky-400 bg-slate-800 shrink-0" />
                <span>Facility + 500m Safety Envelope</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 
        ========================================================================
        3. DEDICATED BOTTOM TELEMETRY & COORDINATE STATUS BAR
        ========================================================================
      */}
      <footer className="w-full shrink-0 bg-[#0b1120] border-t border-slate-800/90 px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono z-20 gap-2">
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Scope:</span>
            <span className={`font-bold ${scope === 'global' ? 'text-sky-400' : 'text-orange-400'}`}>
              {scope === 'global' ? 'Global' : 'India'}
            </span>
          </div>
          <span className="text-slate-700 hidden sm:inline">&bull;</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Feed:</span>
            <span className={dataSourceMode === 'upload' ? 'text-orange-400 font-bold' : 'text-emerald-400 font-semibold'}>
              {dataSourceMode === 'upload' ? 'NASA FIRMS CSV (UPLOAD)' : dataSourceMode === 'live' ? 'NASA FIRMS Live' : 'Demo Dataset'}
            </span>
          </div>
          <span className="text-slate-700 hidden sm:inline">&bull;</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Window:</span>
            <span className="text-orange-300 font-bold uppercase">{timeWindow}</span>
          </div>
          <span className="text-slate-700 hidden md:inline">&bull;</span>
          <div className="hidden md:flex items-center gap-1">
            <span className="text-slate-500">Center:</span>
            <span className="text-slate-300">{mapCenter.lat}&deg;N, {mapCenter.lng}&deg;E</span>
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <span className="text-slate-500">Zoom:</span>
            <span className="text-orange-400 font-bold">{mapZoom}x</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">
            Count: <strong className="text-white font-bold">{events.length}</strong> anomalies
          </span>
          {scope === 'india' && (
            <>
              <span className="text-slate-600 hidden sm:inline">&bull;</span>
              <span className="text-slate-400 hidden sm:inline">
                Plants: <strong className="text-white">{facilities.length}</strong>
              </span>
            </>
          )}
        </div>
      </footer>
    </div>
  );
};
