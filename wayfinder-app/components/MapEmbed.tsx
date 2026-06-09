'use client';

import { useState, useEffect } from 'react';
import styles from './MapEmbed.module.css';

interface MapEmbedProps {
  lat: number;
  lng: number;
  zoom?: number;
  destLat?: number;
  destLng?: number;
  polyline?: string;
  height?: number;
  className?: string;
}

export default function MapEmbed({
  lat,
  lng,
  zoom = 14,
  destLat,
  destLng,
  polyline,
  height = 200,
  className = '',
}: MapEmbedProps) {
  // Synchronously compute the map URL from props
  const buildUrl = () => {
    try {
      const params = new URLSearchParams({
        lat: lat.toFixed(6),
        lng: lng.toFixed(6),
        zoom: String(zoom),
        w: '600', // standard high-res width
        h: String(height),
      });

      if (destLat !== undefined && destLng !== undefined) {
        params.set('dLat', destLat.toFixed(6));
        params.set('dLng', destLng.toFixed(6));
        if (polyline) {
          params.set('polyline', polyline);
        }
      }
      return `/api/map?${params.toString()}`;
    } catch {
      return '';
    }
  };

  const mapUrl = buildUrl();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(!mapUrl);

  // Defer state resets when mapUrl changes to avoid synchronous setState warnings in effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!mapUrl) {
        setHasError(true);
        setIsLoading(false);
      } else {
        setIsLoading(true);
        setHasError(false);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [mapUrl]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const googleMapsUrl = destLat !== undefined && destLng !== undefined
    ? `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${destLat},${destLng}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  return (
    <div 
      className={`${styles.container} ${className}`} 
      style={{ height }}
      role="region" 
      aria-label="Interactive route map"
    >
      {isLoading && (
        <div className={`skeleton ${styles.skeleton}`} aria-hidden />
      )}
      
      {hasError ? (
        <div className={styles.errorState}>
          <span className={styles.errorIcon} aria-hidden>🗺️</span>
          <span className={styles.errorText}>Map preview unavailable</span>
        </div>
      ) : (
        mapUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mapUrl}
            alt={destLat !== undefined ? "Route map to destination" : "Map of current location"}
            className={`${styles.mapImage} ${isLoading ? styles.hidden : ''}`}
            onLoad={handleLoad}
            onError={handleError}
          />
        )
      )}

      {/* External Map Action Button */}
      {!isLoading && !hasError && (
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.mapLink}
          aria-label="Open in Google Maps"
        >
          <span>Open in Google Maps</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
          </svg>
        </a>
      )}
    </div>
  );
}
