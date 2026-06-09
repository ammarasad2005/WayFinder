'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import SearchBar from '@/components/SearchBar';
import BottomNav from '@/components/BottomNav';
import PlaceCard from '@/components/PlaceCard';
import MapEmbed from '@/components/MapEmbed';
import { getRecentSearches, type RecentSearch } from '@/lib/storage';
import styles from './page.module.css';

interface NearbyPlace {
  place_id: string;
  name: string;
  vicinity: string;
  rating?: number;
  user_ratings_total?: number;
  photos?: { photo_reference: string }[];
  geometry: { location: { lat: number; lng: number } };
  types: string[];
}

const CATEGORIES = [
  { id: 'restaurant', label: 'Restaurants', emoji: '🍽️' },
  { id: 'lodging', label: 'Hotels', emoji: '🏨' },
  { id: 'airport', label: 'Airports', emoji: '✈️' },
  { id: 'tourist_attraction', label: 'Landmarks', emoji: '🏛️' },
  { id: 'store', label: 'Businesses', emoji: '🏢' },
] as const;

// Islamabad city center fallback
const DEFAULT_LAT = 33.6844;
const DEFAULT_LNG = 73.0479;

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  if (hour < 21) return 'Good Evening';
  return 'Good Night';
}

export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [location, setLocation] = useState({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
  const [locationAllowed, setLocationAllowed] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('restaurant');
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);

  const greeting = getTimeGreeting();
  const displayName = session?.user?.name?.split(' ')[0] ?? null;

  // Geolocation
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationAllowed(true);
      },
      () => {
        // Denied or unavailable — fall back to Islamabad center silently
        setLocationAllowed(false);
      },
      { timeout: 8000, maximumAge: 300_000 }
    );
  }, []);

  // Load recent searches from localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      setRecentSearches(getRecentSearches(6));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Fetch nearby places
  const fetchNearby = useCallback(async (type: string) => {
    setIsLoadingNearby(true);
    try {
      const params = new URLSearchParams({
        lat: String(location.lat),
        lng: String(location.lng),
        type,
        radius: '5000',
      });
      const res = await fetch(`/api/places/nearby?${params}`);
      if (!res.ok) throw new Error('Nearby fetch failed');
      const data = await res.json();
      setNearbyPlaces(data.results?.slice(0, 6) ?? []);
    } catch {
      setNearbyPlaces([]);
    } finally {
      setIsLoadingNearby(false);
    }
  }, [location]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNearby(activeCategory);
    }, 0);
    return () => clearTimeout(timer);
  }, [activeCategory, fetchNearby]);

  const handleCategoryClick = (id: string) => {
    setActiveCategory(id);
  };

  const handlePlaceClick = (placeId: string) => {
    router.push(`/place/${encodeURIComponent(placeId)}`);
  };

  return (
    <div className={styles.page}>
      {/* ── Top Bar ─────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.logoRow}>
          <div className={styles.logo}>
            <WayfinderLogo />
            <span className={styles.logoText}>Wayfinder</span>
          </div>
          <div className={styles.headerRight}>
            {session?.user?.image ? (
              // Next/image not used for user avatars — using img with safe src
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={`${session.user.name ?? 'User'} avatar`}
                className={styles.avatar}
                width={36}
                height={36}
              />
            ) : (
              <div className={styles.avatarPlaceholder} aria-hidden>
                {displayName?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>
        </div>

        {/* Greeting */}
        <div className={styles.greeting}>
          <p className={styles.greetingLine}>{greeting}{displayName ? `, ${displayName}` : ''}</p>
          <h1 className={styles.greetingQuestion}>Where are we going today?</h1>
        </div>

        {/* Search bar */}
        <SearchBar />

        {/* Google attribution */}
        <div className={styles.attribution}>
          <GoogleBadge />
          <span>Google-Powered Search &nbsp;·&nbsp; Built for Yango Users</span>
        </div>
      </header>

      {/* ── Content ─────────────────────────── */}
      <main className={styles.content}>

        {/* Location banner if denied */}
        {!locationAllowed && (
          <div className={styles.locationBanner} role="status">
            <span>📍</span>
            <span>Showing places near Islamabad. <button className={styles.locationBtn} onClick={() => navigator.geolocation?.getCurrentPosition((p) => { setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocationAllowed(true); })}>Use my location</button></span>
          </div>
        )}

        {/* Mini map showing current location */}
        <div className={styles.mapSection}>
          <MapEmbed
            lat={location.lat}
            lng={location.lng}
            zoom={14}
            height={160}
          />
        </div>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <section aria-labelledby="recent-searches-heading">
            <div className="section-header">
              <h2 className="section-title" id="recent-searches-heading">Recent Searches</h2>
              <button
                className="see-all-btn"
                onClick={() => setRecentSearches([])}
                aria-label="Clear recent searches"
              >
                Clear
              </button>
            </div>
            <div className={styles.recentGrid}>
              {recentSearches.map((s, i) => (
                <button
                  key={s.placeId}
                  className={`${styles.recentChip} animate-fade-in-up stagger-${Math.min(i + 1, 5)}`}
                  onClick={() => handlePlaceClick(s.placeId)}
                  aria-label={`Recent search: ${s.name}`}
                >
                  <ClockIcon />
                  <span className={styles.recentName}>{s.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Category Chips */}
        <section aria-labelledby="explore-heading">
          <div className="section-header">
            <h2 className="section-title" id="explore-heading">Explore Places</h2>
          </div>
          <div className="h-scroll" role="list" aria-label="Place categories">
            {CATEGORIES.map((cat) => (
              <div key={cat.id} role="listitem">
                <button
                  className={`chip ${activeCategory === cat.id ? 'active' : ''}`}
                  onClick={() => handleCategoryClick(cat.id)}
                  aria-pressed={activeCategory === cat.id}
                  id={`category-${cat.id}`}
                >
                  <span aria-hidden>{cat.emoji}</span>
                  {cat.label}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Popular Nearby */}
        <section aria-labelledby="nearby-heading">
          <div className="section-header">
            <h2 className="section-title" id="nearby-heading">Popular Nearby</h2>
            {locationAllowed && (
              <span className={styles.locationPill}>
                <span aria-hidden>📍</span> Near you
              </span>
            )}
          </div>

          {isLoadingNearby ? (
            <div className={styles.nearbyGrid}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`skeleton ${styles.skeletonCard}`} aria-hidden />
              ))}
            </div>
          ) : nearbyPlaces.length > 0 ? (
            <div className={styles.nearbyGrid}>
              {nearbyPlaces.map((place, i) => (
                <PlaceCard
                  key={place.place_id}
                  placeId={place.place_id}
                  name={place.name}
                  address={place.vicinity}
                  rating={place.rating}
                  reviewCount={place.user_ratings_total}
                  photoRef={place.photos?.[0]?.photo_reference}
                  animationDelay={`${i * 50}ms`}
                  onClick={() => handlePlaceClick(place.place_id)}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyNearby}>
              <span>No places found nearby</span>
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}

/* ── Icons ────────────────────────────────────────────────────── */
function WayfinderLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden>
      <path d="M14 2L4 8v12l10 6 10-6V8L14 2z" fill="var(--google-blue)" opacity="0.9"/>
      <path d="M14 7l-6 3.5v7L14 21l6-3.5v-7L14 7z" fill="var(--yango-red)" opacity="0.9"/>
      <circle cx="14" cy="14" r="3" fill="white"/>
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
function GoogleBadge() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
