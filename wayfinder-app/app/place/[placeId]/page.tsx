'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { buildYangoUrl, buildDirectWebOrderUrl } from '@/lib/yango-handoff';
import { savePlace, unsavePlace, isPlaceSaved } from '@/lib/storage';
import BottomNav from '@/components/BottomNav';
import MapEmbed from '@/components/MapEmbed';
import styles from './page.module.css';

interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  vicinity?: string;
  geometry: { location: { lat: number; lng: number } };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: { open_now?: boolean; weekday_text?: string[] };
  photos?: { photo_reference: string; width: number; height: number }[];
  reviews?: {
    author_name: string;
    rating: number;
    relative_time_description: string;
    text: string;
    profile_photo_url?: string;
  }[];
  editorial_summary?: { overview: string };
  types?: string[];
  business_status?: string;
}

interface Directions {
  duration: string;
  distance: string;
  trafficLevel: 'Low' | 'Moderate' | 'Heavy';
  polyline?: string;
}

const PRICE_MAP: Record<number, string> = { 0: 'Free', 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

export default function PlaceDetailPage({ params }: { params: Promise<{ placeId: string }> }) {
  const { placeId } = use(params);
  const decodedId = decodeURIComponent(placeId);
  const router = useRouter();

  const [place, setPlace] = useState<PlaceDetails | null>(null);
  const [directions, setDirections] = useState<Directions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [userLat, setUserLat] = useState<number | undefined>();
  const [userLng, setUserLng] = useState<number | undefined>();
  const [sessionToken] = useState(() => crypto.randomUUID());

  // Get user location for Yango handoff
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
      },
      () => { /* fallback to Islamabad — handled in yango-handoff lib */ },
      { timeout: 5000, maximumAge: 300_000 }
    );
  }, []);

  // Fetch place details
  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ placeId: decodedId, sessionToken });
        const res = await fetch(`/api/places/details?${params}`);
        if (!res.ok) throw new Error('Failed to load place');
        const data = await res.json();
        if (data.status !== 'OK') throw new Error('Place not found');
        setPlace(data.result);
        setIsSaved(isPlaceSaved(decodedId));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load destination');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [decodedId, sessionToken]);

  // Fetch directions once we have place coords
  useEffect(() => {
    if (!place) return;
    const fetchDirections = async () => {
      const destLat = place.geometry.location.lat;
      const destLng = place.geometry.location.lng;
      const oLat = userLat ?? 33.6844;
      const oLng = userLng ?? 73.0479;
      try {
        const params = new URLSearchParams({
          oLat: String(oLat), oLng: String(oLng),
          dLat: String(destLat), dLng: String(destLng),
        });
        const res = await fetch(`/api/directions?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        const leg = data.routes?.[0]?.legs?.[0];
        if (!leg) return;
        // Determine traffic level from duration_in_traffic vs duration
        const normalSec = leg.duration?.value ?? 0;
        const trafficSec = leg.duration_in_traffic?.value ?? normalSec;
        const ratio = trafficSec / (normalSec || 1);
        const trafficLevel: Directions['trafficLevel'] =
          ratio < 1.2 ? 'Low' : ratio < 1.5 ? 'Moderate' : 'Heavy';

        const polyline = data.routes?.[0]?.overview_polyline?.points;

        setDirections({
          duration: leg.duration_in_traffic?.text ?? leg.duration?.text ?? '—',
          distance: leg.distance?.text ?? '—',
          trafficLevel,
          polyline,
        });
      } catch {
        // Directions unavailable — non-critical
      }
    };
    fetchDirections();
  }, [place, userLat, userLng]);

  const handleSaveToggle = useCallback(() => {
    if (!place) return;
    if (isSaved) {
      unsavePlace(decodedId);
      setIsSaved(false);
    } else {
      savePlace({
        placeId: decodedId,
        name: place.name,
        address: place.formatted_address,
        rating: place.rating,
        photoRef: place.photos?.[0]?.photo_reference,
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        savedAt: Date.now(),
      });
      setIsSaved(true);
    }
  }, [place, decodedId, isSaved]);

  const handleYangoHandoff = useCallback(() => {
    if (!place) return;
    const destLat = place.geometry.location.lat;
    const destLng = place.geometry.location.lng;

    // Pickup uses user GPS if available, otherwise falls back to Islamabad (33.6844, 73.0479)
    const startLat = userLat ?? 33.6844;
    const startLng = userLng ?? 73.0479;

    const handoffParams = {
      startLat,
      startLng,
      endLat: destLat,
      endLng: destLng,
    };

    const url = buildYangoUrl(handoffParams);
    const directUrl = buildDirectWebOrderUrl(handoffParams);

    // Set 4-second timeout to fall back to the direct web ordering URL if go.link hangs or is blocked
    const fallbackTimer = setTimeout(() => {
      window.location.href = directUrl;
    }, 4000);

    // Clean up timer if the page navigates away successfully
    const clearTimer = () => clearTimeout(fallbackTimer);
    window.addEventListener('beforeunload', clearTimer);
    window.addEventListener('pagehide', clearTimer);

    // Open in same tab — Yango's go.link handles app/web routing
    window.location.href = url;
  }, [place, userLat, userLng]);

  /* ── Loading ── */
  if (isLoading) return <LoadingSkeleton onBack={() => router.back()} />;

  /* ── Error ── */
  if (error || !place) {
    return (
      <div className={styles.errorPage}>
        <button className={styles.backBtn} onClick={() => router.back()} aria-label="Go back">
          <BackIcon />
        </button>
        <div className={styles.errorContent}>
          <span className={styles.errorEmoji}>⚠️</span>
          <h2>Destination not found</h2>
          <p>We couldn&apos;t load this place. It may no longer be available.</p>
          <button className="btn btn-secondary" onClick={() => router.push('/home')}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const photos = place.photos ?? [];
  const priceLabel = place.price_level !== undefined ? PRICE_MAP[place.price_level] : null;
  const typeLabel = place.types?.[0]?.replace(/_/g, ' ') ?? 'Place';
  const isOpen = place.opening_hours?.open_now;

  const trafficColor: Record<string, string> = {
    Low: 'var(--verified-green)',
    Moderate: 'var(--warning-amber)',
    Heavy: 'var(--yango-red)',
  };

  return (
    <div className={styles.page}>
      {/* ── Hero Gallery ────────────────────── */}
      <div className={styles.heroWrap}>
        {photos.length > 0 ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/places/photo?ref=${encodeURIComponent(photos[activePhoto]?.photo_reference ?? '')}&w=800`}
              alt={`${place.name} photo ${activePhoto + 1}`}
              className={styles.heroImg}
              loading="eager"
            />
            {photos.length > 1 && (
              <div className={styles.photoCounter} aria-label={`Photo ${activePhoto + 1} of ${photos.length}`}>
                {activePhoto + 1}/{photos.length}
              </div>
            )}
            {photos.length > 1 && (
              <div className={styles.heroDots} role="tablist" aria-label="Photo selection">
                {photos.slice(0, 8).map((_, i) => (
                  <button
                    key={i}
                    role="tab"
                    aria-selected={i === activePhoto}
                    aria-label={`Photo ${i + 1}`}
                    className={`${styles.dot} ${i === activePhoto ? styles.dotActive : ''}`}
                    onClick={() => setActivePhoto(i)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className={styles.heroPlaceholder} aria-label="No photo available">
            <MapIcon />
          </div>
        )}
        {/* Gradient overlay */}
        <div className={styles.heroOverlay} aria-hidden />

        {/* Back + actions */}
        <div className={styles.heroActions}>
          <button className={styles.heroBtn} onClick={() => router.back()} aria-label="Go back">
            <BackIcon />
          </button>
          <div className={styles.heroActionsRight}>
            <button
              id="save-place-btn"
              className={`${styles.heroBtn} ${isSaved ? styles.heroBtnSaved : ''}`}
              onClick={handleSaveToggle}
              aria-label={isSaved ? 'Remove from saved' : 'Save this place'}
            >
              <HeartIcon filled={isSaved} />
            </button>
            <button
              className={styles.heroBtn}
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: place.name, text: place.formatted_address, url: window.location.href });
                }
              }}
              aria-label="Share this place"
            >
              <ShareIcon />
            </button>
          </div>
        </div>
      </div>

      {/* ── Scrollable Detail Content ────────── */}
      <div className={styles.content}>

        {/* Place title */}
        <div className={styles.titleSection}>
          <h1 className={styles.placeName}>{place.name}</h1>
          <div className={styles.metaRow}>
            {place.rating && (
              <span className={styles.ratingBadge}>
                <StarIcon />
                {place.rating.toFixed(1)}
                <span className={styles.reviewCount}>({(place.user_ratings_total ?? 0).toLocaleString()})</span>
              </span>
            )}
            {priceLabel && <span className={styles.metaDot}>·</span>}
            {priceLabel && <span className={styles.meta}>{priceLabel}</span>}
            <span className={styles.metaDot}>·</span>
            <span className={styles.meta}>{typeLabel}</span>
          </div>
          <div className={styles.addressRow}>
            <PinIcon />
            <span className={styles.address}>{place.formatted_address}</span>
          </div>
          {place.opening_hours && (
            <span
              className={styles.openStatus}
              style={{ color: isOpen ? 'var(--verified-green)' : 'var(--yango-red)' }}
            >
              {isOpen ? 'Open now' : 'Closed'}
              {place.opening_hours.weekday_text?.[new Date().getDay()] &&
                ` · ${place.opening_hours.weekday_text[new Date().getDay()]}`}
            </span>
          )}
        </div>

        {/* Verified badge */}
        <div className={`card ${styles.verifiedCard}`}>
          <div className={styles.verifiedRow}>
            <span className="badge badge-verified">✓ Verified via Google Maps</span>
          </div>
        </div>

        {/* Getting There */}
        <div className={`card ${styles.gettingThereCard}`}>
          <div className={styles.gettingThereHeader}>
            <h2 className={styles.sectionTitle}>Getting There</h2>
            <span className={styles.verifiedTag}>
              <span aria-hidden>🗺️</span> Verified via Google Maps
            </span>
          </div>

          {directions ? (
            <>
              <div className={styles.tripStats}>
                <TripStat icon="🕐" label="Est. Travel Time" value={directions.duration} />
                <TripStat icon="📍" label="Distance" value={directions.distance} />
                <TripStat
                  icon="🚦"
                  label="Traffic"
                  value={directions.trafficLevel}
                  valueStyle={{ color: trafficColor[directions.trafficLevel] }}
                />
              </div>
              <div className={styles.mapContainer}>
                <MapEmbed
                  lat={userLat ?? 33.6844}
                  lng={userLng ?? 73.0479}
                  destLat={place.geometry.location.lat}
                  destLng={place.geometry.location.lng}
                  polyline={directions.polyline}
                  height={180}
                />
              </div>
            </>
          ) : (
            <div className={styles.tripStatsLoading}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`skeleton ${styles.statSkeleton}`} />
              ))}
            </div>
          )}

          <div className={styles.confidenceBanner}>
            <span>✓</span>
            <span>Arrive with confidence. We&apos;ve verified the best way to reach your destination.</span>
          </div>
        </div>

        {/* About */}
        {place.editorial_summary?.overview && (
          <div>
            <h2 className={styles.sectionTitle}>About</h2>
            <p className={styles.aboutText}>{place.editorial_summary.overview}</p>
          </div>
        )}

        {/* Photo strip */}
        {photos.length > 1 && (
          <div>
            <div className="section-header">
              <h2 className={styles.sectionTitle}>Photos</h2>
              <button className="see-all-btn" onClick={() => setActivePhoto(0)}>More</button>
            </div>
            <div className="h-scroll" aria-label="Place photos">
              {photos.slice(0, 5).map((photo, i) => (
                <button
                  key={i}
                  className={styles.photoThumb}
                  onClick={() => { setActivePhoto(i); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  aria-label={`View photo ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/places/photo?ref=${encodeURIComponent(photo.photo_reference)}&w=200`}
                    alt={`${place.name} photo ${i + 1}`}
                    loading="lazy"
                    decoding="async"
                    className={styles.photoThumbImg}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {place.reviews && place.reviews.length > 0 && (
          <div>
            <h2 className={styles.sectionTitle}>Reviews</h2>
            <div className={styles.reviewsList}>
              {place.reviews.slice(0, 3).map((review, i) => (
                <div key={i} className={`card ${styles.reviewCard}`}>
                  <div className={styles.reviewHeader}>
                    <div className={styles.reviewAuthor}>
                      {review.profile_photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={review.profile_photo_url}
                          alt={`${review.author_name} avatar`}
                          className={styles.reviewAvatar}
                          loading="lazy"
                        />
                      ) : (
                        <div className={styles.reviewAvatarPlaceholder}>
                          {review.author_name[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className={styles.reviewName}>{review.author_name}</span>
                        <span className={styles.reviewTime}>{review.relative_time_description}</span>
                      </div>
                    </div>
                    <div className="star-rating">
                      {'★'.repeat(review.rating)}
                    </div>
                  </div>
                  <p className={styles.reviewText}>{review.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom spacer for sticky CTA */}
        <div style={{ height: 100 }} />
      </div>

      {/* ── Sticky CTA ─────────────────────── */}
      <div className={styles.stickyCTA}>
        <div className={styles.ctaInfo}>
          <span className="badge badge-verified">✓ Destination Ready</span>
          <span className={styles.ctaSubtext}>Secure handoff. Seamless experience.</span>
        </div>
        <button
          id="continue-with-yango-btn"
          className={`btn btn-primary ${styles.yangoBtn}`}
          onClick={handleYangoHandoff}
          aria-label="Continue with Yango — opens Yango app with destination pre-filled"
        >
          Continue with Yango
          <ArrowIcon />
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function TripStat({ icon, label, value, valueStyle }: {
  icon: string; label: string; value: string; valueStyle?: React.CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
      <span style={{ fontSize: 20 }} aria-hidden>{icon}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', ...valueStyle }}>{value}</span>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>{label}</span>
    </div>
  );
}

function LoadingSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-0)' }}>
      <div className="skeleton" style={{ height: 280, borderRadius: 0 }} />
      <button style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(9,11,18,0.7)', border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onBack} aria-label="Go back">
        <BackIcon />
      </button>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="skeleton" style={{ height: 28, width: '70%', borderRadius: 8 }} />
        <div className="skeleton" style={{ height: 16, width: '50%', borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />
        <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />
      </div>
    </div>
  );
}

/* ── Icons ──────────────────────────────────────────────────── */
function BackIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M19 12H5M12 19l-7-7 7-7"/></svg>;
}
function HeartIcon({ filled }: { filled: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? 'var(--yango-red)' : 'none'} stroke={filled ? 'var(--yango-red)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>;
}
function ShareIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>;
}
function StarIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--warning-amber)" aria-hidden><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
}
function PinIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>;
}
function MapIcon() {
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>;
}
function ArrowIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M12 5l7 7-7 7"/></svg>;
}
