import { GEOFENCE } from '../utils/constants';
import { isWithinGeofence } from '../utils/helpers';

export async function getCurrentPosition(timeout = 10000) {
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
      { enableHighAccuracy: true, timeout, maximumAge: 30000 }
    );
  });
}

export async function checkGeofence(lat, lng) {
  return isWithinGeofence(lat, lng, GEOFENCE.center, GEOFENCE.radiusMeters);
}

export async function validateLocation() {
  try {
    const pos = await getCurrentPosition();
    const within = await checkGeofence(pos.lat, pos.lng);
    return {
      ...pos,
      withinGeofence: within,
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
