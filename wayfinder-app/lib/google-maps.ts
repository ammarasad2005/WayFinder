// lib/google-maps.ts
// Server-side wrappers for Google APIs — called ONLY from API routes.
// API key is never sent to the client.

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

if (!API_KEY) {
  console.warn('[google-maps] GOOGLE_MAPS_API_KEY is not set.');
}

function getApiKey(): string {
  if (!API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY is not configured.');
  }
  return API_KEY;
}

const BASE = 'https://maps.googleapis.com/maps/api';
const PLACES_BASE = 'https://places.googleapis.com/v1';

/** Validate that a string is a safe Google place_id (alphanumeric, underscore, dash) */
export function isValidPlaceId(placeId: string): boolean {
  return /^[A-Za-z0-9_\-]+$/.test(placeId) && placeId.length < 300;
}

/** Validate lat/lng are valid numbers within range */
export function isValidLatLng(lat: unknown, lng: unknown): boolean {
  const latN = Number(lat);
  const lngN = Number(lng);
  return (
    !isNaN(latN) && !isNaN(lngN) &&
    latN >= -90 && latN <= 90 &&
    lngN >= -180 && lngN <= 180
  );
}

/** Validate radius is a positive number up to 50,000m */
export function isValidRadius(radius: unknown): boolean {
  const r = Number(radius);
  return !isNaN(r) && r > 0 && r <= 50000;
}

/** Allowlist of place types for nearby search */
const ALLOWED_TYPES = new Set([
  'restaurant', 'hotel', 'lodging', 'airport', 'tourist_attraction',
  'establishment', 'point_of_interest', 'store', 'bank', 'hospital',
  'gas_station', 'shopping_mall', 'mosque', 'church', 'school', 'university',
]);

export function isValidType(type: string): boolean {
  return ALLOWED_TYPES.has(type);
}

export async function fetchAutocomplete(input: string, sessionToken: string) {
  const url = `${PLACES_BASE}/places:autocomplete`;
  const body: Record<string, unknown> = {
    input,
    includedRegionCodes: ['pk'], // Pakistan only
    languageCode: 'en',
  };
  
  if (sessionToken) {
    body.sessionToken = sessionToken;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': getApiKey(),
    },
    body: JSON.stringify(body),
    next: { revalidate: 0 },
  });

  if (!res.ok) throw new Error('Google Autocomplete request failed');
  return res.json();
}

export async function fetchPlaceDetails(placeId: string, sessionToken?: string) {
  const url = new URL(`${PLACES_BASE}/places/${placeId}`);
  if (sessionToken) {
    url.searchParams.set('sessionToken', sessionToken);
  }

  // Field mask selects exactly what fields we need to save billing costs
  const fields = [
    'id', 'displayName', 'formattedAddress', 'location', 'types',
    'rating', 'userRatingCount', 'priceLevel', 'regularOpeningHours',
    'photos', 'reviews', 'editorialSummary', 'websiteUri',
    'nationalPhoneNumber', 'businessStatus'
  ].join(',');

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': getApiKey(),
      'X-Goog-FieldMask': fields,
    },
    next: { revalidate: 3600 }, // Cache 1hr
  });

  if (!res.ok) throw new Error('Google Place Details request failed');
  return res.json();
}

export async function fetchNearbySearch(lat: number, lng: number, type: string, radius = 5000) {
  const url = `${PLACES_BASE}/places:searchNearby`;
  
  const body = {
    includedTypes: [type],
    maxResultCount: 10,
    locationRestriction: {
      circle: {
        center: {
          latitude: lat,
          longitude: lng,
        },
        radius: Number(radius),
      },
    },
  };

  const fields = [
    'places.id', 'places.displayName', 'places.shortFormattedAddress',
    'places.rating', 'places.userRatingCount', 'places.photos',
    'places.location', 'places.types'
  ].join(',');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': getApiKey(),
      'X-Goog-FieldMask': fields,
    },
    body: JSON.stringify(body),
    next: { revalidate: 1800 }, // Cache 30min
  });

  if (!res.ok) throw new Error('Google Nearby Search request failed');
  return res.json();
}

export async function fetchDirections(
  originLat: number, originLng: number,
  destLat: number, destLng: number
) {
  const url = new URL(`${BASE}/directions/json`);
  url.searchParams.set('origin', `${originLat},${originLng}`);
  url.searchParams.set('destination', `${destLat},${destLng}`);
  url.searchParams.set('key', getApiKey());
  url.searchParams.set('mode', 'driving');
  url.searchParams.set('language', 'en');
  url.searchParams.set('region', 'pk');
  url.searchParams.set('departure_time', 'now'); // Live traffic

  const res = await fetch(url.toString(), { next: { revalidate: 0 } }); // No cache — live traffic
  if (!res.ok) throw new Error('Google Directions request failed');
  return res.json();
}

export async function fetchGeocode(address: string) {
  const url = new URL(`${BASE}/geocode/json`);
  url.searchParams.set('address', address);
  url.searchParams.set('key', getApiKey());
  url.searchParams.set('region', 'pk');
  url.searchParams.set('language', 'en');

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } }); // Cache 24hr
  if (!res.ok) throw new Error('Google Geocode request failed');
  return res.json();
}

/** Build a Google Place Photo URL — used server-side in /api/places/photo */
export function buildPhotoUrl(photoReference: string, maxWidth = 800) {
  // In v1, photoReference is a full name resource path like: "places/PLACE_ID/photos/PHOTO_ID"
  // The media URL is just /{photoReference}/media?key={apiKey}&maxWidthPx={maxWidth}
  return `https://places.googleapis.com/v1/${photoReference}/media?key=${getApiKey()}&maxWidthPx=${maxWidth}`;
}
