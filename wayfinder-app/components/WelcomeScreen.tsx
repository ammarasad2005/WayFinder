'use client';

import { signIn } from 'next-auth/react';
import styles from './WelcomeScreen.module.css';

interface Props {
  onStart: () => void;
}

export default function WelcomeScreen({ onStart }: Props) {
  return (
    <div className={styles.wrapper}>
      {/* Ambient background glow */}
      <div className={styles.glowBlue} aria-hidden />
      <div className={styles.glowRed} aria-hidden />

      {/* Logo */}
      <div className={styles.logo}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
          <path d="M14 2L4 8v12l10 6 10-6V8L14 2z" fill="var(--google-blue)" opacity="0.9"/>
          <path d="M14 7l-6 3.5v7L14 21l6-3.5v-7L14 7z" fill="var(--yango-red)" opacity="0.9"/>
          <circle cx="14" cy="14" r="3" fill="white"/>
        </svg>
        <span className={styles.logoText}>Wayfinder</span>
      </div>

      {/* Headline */}
      <div className={styles.headline}>
        <h1 className={styles.title}>
          Search with{' '}
          <span className={styles.blue}>Google.</span>
          <br />
          Travel with{' '}
          <span className={styles.red}>Yango.</span>
        </h1>
        <p className={styles.subtitle}>
          The smartest way to find your destination and book your ride in Pakistan.
        </p>
      </div>

      {/* 3-step flow illustration */}
      <div className={styles.steps}>
        <Step
          number="1"
          color="var(--google-blue)"
          icon={<SearchIcon />}
          title="Search with Google"
          desc="Find any place instantly — restaurants, hotels, airports, landmarks."
          delay="0ms"
        />
        <div className={styles.stepConnector} aria-hidden />
        <Step
          number="2"
          color="var(--verified-green)"
          icon={<VerifyIcon />}
          title="Destination Verified"
          desc="See photos, reviews, travel time, and real-time route details."
          delay="100ms"
        />
        <div className={styles.stepConnector} aria-hidden />
        <Step
          number="3"
          color="var(--yango-red)"
          icon={<CarIcon />}
          title="Continue with Yango"
          desc="Your destination is ready. Open Yango with one tap."
          delay="200ms"
        />
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          id="welcome-start-btn"
          className={`btn btn-primary ${styles.startBtn}`}
          onClick={onStart}
          aria-label="Start searching for destinations"
        >
          Start Searching
          <ArrowRight />
        </button>

        <button
          id="welcome-signin-btn"
          className={styles.signInBtn}
          onClick={() => signIn('google', { callbackUrl: '/home' })}
          aria-label="Sign in with Google to sync saved places"
        >
          <GoogleLogo />
          Sign in to sync saved places
        </button>
      </div>

      {/* Footer badge */}
      <div className={styles.footer}>
        <GoogleLogo size={14} />
        <span>Google-Powered Search &nbsp;·&nbsp; Built for Yango Users</span>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function Step({
  number, color, icon, title, desc, delay,
}: {
  number: string;
  color: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  delay: string;
}) {
  return (
    <div className={styles.step} style={{ animationDelay: delay }}>
      <div className={styles.stepIcon} style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className={styles.stepText}>
        <div className={styles.stepTitle}>{title}</div>
        <div className={styles.stepDesc}>{desc}</div>
      </div>
      <div className={styles.stepNum} style={{ color }}>{number}</div>
    </div>
  );
}

/* ── Icons (inline SVG — no external deps) ──────────────────── */
function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
    </svg>
  );
}
function VerifyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
    </svg>
  );
}
function CarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v9a2 2 0 01-2 2h-1"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
    </svg>
  );
}
function ArrowRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  );
}
function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
