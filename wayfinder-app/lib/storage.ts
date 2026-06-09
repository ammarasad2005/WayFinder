// lib/storage.ts
// Client-side localStorage utilities for guest user state.
// Auth tokens are NEVER stored here — sessions use HttpOnly cookies via next-auth.

export interface SavedPlace {
  placeId: string;
  name: string;
  address: string;
  rating?: number;
  photoRef?: string;
  lat: number;
  lng: number;
  savedAt: number; // Unix timestamp
  collection?: string;
}

export interface RecentSearch {
  placeId: string;
  name: string;
  address: string;
  searchedAt: number;
}

const KEYS = {
  SAVED_PLACES: 'wf_saved_places',
  RECENT_SEARCHES: 'wf_recent_searches',
  VISITED: 'wf_visited',
  GUEST_NAME: 'wf_guest_name',
} as const;

// ── Saved Places ───────────────────────────────────────────────

export function getSavedPlaces(): SavedPlace[] {
  try {
    const raw = localStorage.getItem(KEYS.SAVED_PLACES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function savePlace(place: SavedPlace): void {
  const places = getSavedPlaces();
  const idx = places.findIndex(p => p.placeId === place.placeId);
  if (idx >= 0) {
    places[idx] = place; // Update
  } else {
    places.unshift(place); // Add to front
  }
  // Cap at 100 saved places
  const capped = places.slice(0, 100);
  localStorage.setItem(KEYS.SAVED_PLACES, JSON.stringify(capped));
}

export function unsavePlace(placeId: string): void {
  const places = getSavedPlaces().filter(p => p.placeId !== placeId);
  localStorage.setItem(KEYS.SAVED_PLACES, JSON.stringify(places));
}

export function isPlaceSaved(placeId: string): boolean {
  return getSavedPlaces().some(p => p.placeId === placeId);
}

// ── Recent Searches ────────────────────────────────────────────

export function getRecentSearches(limit = 6): RecentSearch[] {
  try {
    const raw = localStorage.getItem(KEYS.RECENT_SEARCHES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, limit);
  } catch {
    return [];
  }
}

export function addRecentSearch(search: Omit<RecentSearch, 'searchedAt'>): void {
  const searches = getRecentSearches(20);
  // Remove duplicate if exists
  const deduped = searches.filter(s => s.placeId !== search.placeId);
  deduped.unshift({ ...search, searchedAt: Date.now() });
  localStorage.setItem(KEYS.RECENT_SEARCHES, JSON.stringify(deduped.slice(0, 20)));
}

export function clearRecentSearches(): void {
  localStorage.removeItem(KEYS.RECENT_SEARCHES);
}

// ── First-visit flag ───────────────────────────────────────────

export function hasVisited(): boolean {
  try {
    return localStorage.getItem(KEYS.VISITED) === 'true';
  } catch {
    return false;
  }
}

export function markVisited(): void {
  try {
    localStorage.setItem(KEYS.VISITED, 'true');
  } catch {
    // Silently fail — non-critical
  }
}
