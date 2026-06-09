'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { getSavedPlaces, unsavePlace, type SavedPlace } from '@/lib/storage';
import styles from './page.module.css';

export default function SavedPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [activeCollection, setActiveCollection] = useState<string>('All');

  useEffect(() => {
    // Merge localStorage and server saves
    const local = getSavedPlaces();
    if (session) {
      // Fetch from server for signed-in users
      fetch('/api/saved')
        .then(r => r.json())
        .then(d => {
          // Merge server + local, deduplicate by placeId
          const serverPlaces: SavedPlace[] = d.places ?? [];
          const merged = [...serverPlaces];
          local.forEach(lp => {
            if (!merged.find(p => p.placeId === lp.placeId)) merged.push(lp);
          });
          setPlaces(merged);
        })
        .catch(() => setPlaces(local));
    } else {
      const timer = setTimeout(() => {
        setPlaces(local);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [session]);

  const handleUnsave = (placeId: string) => {
    unsavePlace(placeId);
    setPlaces(prev => prev.filter(p => p.placeId !== placeId));

    if (session) {
      fetch('/api/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unsave', placeId }),
      }).catch(() => {/* Silent — localStorage already updated */});
    }
  };

  const collections = ['All', ...Array.from(new Set(places.map(p => p.collection).filter(Boolean))) as string[]];
  const filtered = activeCollection === 'All' ? places : places.filter(p => p.collection === activeCollection);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Saved Places</h1>
        {places.length > 0 && (
          <div className="h-scroll" style={{ marginTop: 8 }} aria-label="Collections">
            {collections.map(col => (
              <button
                key={col}
                className={`chip ${activeCollection === col ? 'active' : ''}`}
                onClick={() => setActiveCollection(col)}
                aria-pressed={activeCollection === col}
              >
                {col === 'All' ? `All (${places.length})` : col}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className={styles.content}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon} aria-hidden>🔖</span>
            <h2 className={styles.emptyTitle}>No saved places yet</h2>
            <p className={styles.emptyDesc}>
              Find a destination and tap the heart icon to save it here.
            </p>
            <button
              id="saved-explore-btn"
              className="btn btn-secondary"
              onClick={() => router.push('/home')}
            >
              Explore Places
            </button>
          </div>
        ) : (
          <div className={styles.list}>
            {filtered.map((place, i) => (
              <button
                key={place.placeId}
                className={`${styles.savedCard} animate-fade-in-up stagger-${Math.min(i + 1, 5)}`}
                onClick={() => router.push(`/place/${encodeURIComponent(place.placeId)}`)}
                aria-label={`View ${place.name}`}
              >
                {place.photoRef ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/places/photo?ref=${encodeURIComponent(place.photoRef)}&w=200`}
                    alt={`${place.name} photo`}
                    className={styles.savedPhoto}
                    loading="lazy"
                  />
                ) : (
                  <div className={styles.savedPhotoPlaceholder} aria-hidden>📍</div>
                )}
                <div className={styles.savedInfo}>
                  <span className={styles.savedName}>{place.name}</span>
                  <span className={styles.savedAddress}>{place.address}</span>
                  {place.rating !== undefined && (
                    <span className={styles.savedRating}>★ {place.rating.toFixed(1)}</span>
                  )}
                </div>
                <button
                  className={styles.removeBtn}
                  onClick={(e) => { e.stopPropagation(); handleUnsave(place.placeId); }}
                  aria-label={`Remove ${place.name} from saved`}
                >
                  <TrashIcon />
                </button>
              </button>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function TrashIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
}
