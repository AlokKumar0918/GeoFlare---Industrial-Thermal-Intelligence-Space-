/**
 * Spatial calculation and GIS utilities for GeoFlare
 */
import { IndustrialFacility } from '../types';

/**
 * Calculates Great-Circle distance between two coordinates in meters (Haversine formula)
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Finds the nearest industrial facility for a given coordinate
 */
export function findNearestFacility(
  lat: number,
  lng: number,
  facilities: IndustrialFacility[]
): { facility: IndustrialFacility | undefined; distanceMeters: number } {
  if (!facilities || facilities.length === 0) {
    return { facility: undefined, distanceMeters: Infinity };
  }

  let minDistance = Infinity;
  let nearest: IndustrialFacility | undefined = undefined;

  for (const fac of facilities) {
    const dist = calculateHaversineDistance(lat, lng, fac.latitude, fac.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = fac;
    }
  }

  return { facility: nearest, distanceMeters: minDistance };
}

/**
 * Formats distance into human readable string (meters or km)
 */
export function formatDistance(meters: number): string {
  if (meters === Infinity || meters === undefined) return 'N/A';
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Checks if a thermal event is geographically within India or linked to an Indian industrial asset
 */
export function isIndiaEvent(event: {
  country?: string;
  region?: string;
  distanceToFacilityMeters?: number;
  nearestFacility?: any;
  primaryObservation: { latitude: number; longitude: number };
}): boolean {
  if (event.country === 'India') return true;
  if (event.region && event.region.toLowerCase().includes('india')) return true;
  if (event.nearestFacility && event.distanceToFacilityMeters !== undefined && event.distanceToFacilityMeters < 50000) {
    return true;
  }
  const lat = event.primaryObservation.latitude;
  const lng = event.primaryObservation.longitude;
  return lat >= 6.5 && lat <= 37.5 && lng >= 68.0 && lng <= 97.5;
}

