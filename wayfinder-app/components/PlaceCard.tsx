'use client';

import styles from './PlaceCard.module.css';

interface Props {
  placeId: string;
  name: string;
  address: string;
  rating?: number;
  reviewCount?: number;
  photoRef?: string;
  distance?: string;
  animationDelay?: string;
  onClick: () => void;
}

export default function PlaceCard({
  name, address, rating, reviewCount, photoRef, distance, animationDelay, onClick,
}: Props) {
  const photoUrl = photoRef
    ? `/api/places/photo?ref=${encodeURIComponent(photoRef)}&w=400`
    : null;

  return (
    <button
      className={`${styles.card} animate-fade-in-up`}
      style={{ animationDelay }}
      onClick={onClick}
      aria-label={`View ${name}`}
    >
      {/* Photo */}
      <div className={styles.photoWrap}>
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={`${name} photo`}
            className={styles.photo}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className={styles.photoPlaceholder} aria-hidden>
            <PlaceholderIcon />
          </div>
        )}
        {distance && (
          <span className={styles.distanceBadge}>{distance}</span>
        )}
      </div>

      {/* Info */}
      <div className={styles.info}>
        <span className={styles.name}>{name}</span>
        {rating !== undefined && (
          <div className={styles.ratingRow}>
            <StarIcon />
            <span className={styles.rating}>{rating.toFixed(1)}</span>
            {reviewCount !== undefined && (
              <span className={styles.reviewCount}>({reviewCount.toLocaleString()})</span>
            )}
          </div>
        )}
        <span className={styles.address}>{address}</span>
      </div>
    </button>
  );
}

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--warning-amber)" aria-hidden>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  );
}

function PlaceholderIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  );
}
