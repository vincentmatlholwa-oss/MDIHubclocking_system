import { GEOFENCE } from '../utils/constants';
import { isWithinGeofence } from '../utils/helpers';

function getPosition(options) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp
      }),
      (err) => reject(err),
      options
    );
  });
}

export async function getCurrentPosition(timeout = 15000) {
  try {
    return await getPosition({ enableHighAccuracy: true, timeout, maximumAge: 10000 });
  } catch {
    return getPosition({ enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
  }
}

export async function checkGeofence(lat, lng) {
  return isWithinGeofence(lat, lng, GEOFENCE.center, GEOFENCE.radiusMeters);
}

export function distanceFromCenter(lat, lng) {
  if (!lat || !lng) return null;
  const R = 6371000;
  const dLat = (lat - GEOFENCE.center.lat) * Math.PI / 180;
  const dLng = (lng - GEOFENCE.center.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(GEOFENCE.center.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function validateLocation() {
  try {
    const pos = await getCurrentPosition();
    const within = await checkGeofence(pos.lat, pos.lng);
    const dist = distanceFromCenter(pos.lat, pos.lng);
    return {
      ...pos,
      withinGeofence: within,
      distanceFromCenter: Math.round(dist),
      geofenceCenter: GEOFENCE.center,
      geofenceRadius: GEOFENCE.radiusMeters,
      geofenceLabel: GEOFENCE.label
    };
  } catch (error) {
    return {
      lat: null,
      lng: null,
      accuracy: null,
      withinGeofence: false,
      distanceFromCenter: null,
      error: error.message,
      geofenceCenter: GEOFENCE.center,
      geofenceRadius: GEOFENCE.radiusMeters
    };
  }
}

export async function getAddressFromCoords(lat, lng) {
  if (!lat || !lng) return 'Unknown location';
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (!res.ok) return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    const data = await res.json();
    return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

export function getGeofenceStatus(distance) {
  if (distance === null || distance === undefined) return { label: 'Unknown', class: 'status-default' };
  if (distance <= GEOFENCE.radiusMeters) return { label: 'Within Range', class: 'status-success' };
  return { label: 'Out of Range', class: 'status-danger' };
}
