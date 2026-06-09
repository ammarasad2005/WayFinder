'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { addRecentSearch } from '@/lib/storage';
import styles from './SearchBar.module.css';

interface Prediction {
  place_id: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  description: string;
}

// Simple debounce
function debounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Session token for billing optimization
function generateSessionToken() {
  return crypto.randomUUID();
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionToken] = useState(generateSessionToken);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch autocomplete from our BFF proxy
  const fetchPredictions = useMemo(
    () =>
      debounce(async (input: string) => {
        if (input.length < 2) {
          setPredictions([]);
          setIsOpen(false);
          return;
        }
        setIsLoading(true);
        try {
          const params = new URLSearchParams({ input, sessionToken });
          const res = await fetch(`/api/places/autocomplete?${params}`);
          if (!res.ok) throw new Error('Search failed');
          const data = await res.json();
          setPredictions(data.predictions ?? []);
          setIsOpen(true);
        } catch {
          setPredictions([]);
        } finally {
          setIsLoading(false);
        }
      }, 300),
    [sessionToken]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim()) {
      fetchPredictions(val.trim());
    } else {
      setPredictions([]);
      setIsOpen(false);
    }
  };

  const handleSelect = (prediction: Prediction) => {
    const { place_id, structured_formatting, description } = prediction;

    // Record in recent searches (non-sensitive: place name + ID only)
    addRecentSearch({
      placeId: place_id,
      name: structured_formatting.main_text,
      address: structured_formatting.secondary_text || description,
    });

    setIsOpen(false);
    setQuery('');
    inputRef.current?.blur();
    router.push(`/place/${encodeURIComponent(place_id)}`);
  };

  const handleClear = () => {
    setQuery('');
    setPredictions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={styles.container}>
      <div className={`${styles.searchBar} ${isOpen ? styles.open : ''}`}>
        <span className={styles.searchIcon} aria-hidden>
          <SearchIcon />
        </span>
        <input
          ref={inputRef}
          id="main-search-input"
          type="search"
          className={styles.input}
          placeholder="Search places, hotels, restaurants…"
          value={query}
          onChange={handleChange}
          onFocus={() => { if (predictions.length > 0) setIsOpen(true); }}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Search for places"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="search-suggestions"
          role="combobox"
        />
        {isLoading && <span className={styles.spinner} aria-label="Searching…" />}
        {query && !isLoading && (
          <button className={styles.clearBtn} onClick={handleClear} aria-label="Clear search" tabIndex={0}>
            <ClearIcon />
          </button>
        )}
      </div>

      {/* Autocomplete dropdown */}
      {isOpen && predictions.length > 0 && (
        <div
          ref={dropdownRef}
          id="search-suggestions"
          className={styles.dropdown}
          role="listbox"
          aria-label="Search suggestions"
        >
          {predictions.map((pred) => (
            <button
              key={pred.place_id}
              className={styles.suggestion}
              onClick={() => handleSelect(pred)}
              role="option"
              aria-selected={false}
              tabIndex={0}
            >
              <span className={styles.suggestionIcon} aria-hidden>
                <PinIcon />
              </span>
              <span className={styles.suggestionText}>
                <span className={styles.suggestionMain}>
                  {/* Text content only — no dangerouslySetInnerHTML */}
                  {pred.structured_formatting.main_text}
                </span>
                <span className={styles.suggestionSub}>
                  {pred.structured_formatting.secondary_text}
                </span>
              </span>
            </button>
          ))}

          {/* Google attribution (required by ToS) */}
          <div className={styles.attribution} aria-label="Powered by Google">
            <GoogleBadge />
            <span>Powered by Google</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Icons ──────────────────────────────────────────────────── */
function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
    </svg>
  );
}
function ClearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
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
