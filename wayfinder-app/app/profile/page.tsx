'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { clearRecentSearches } from '@/lib/storage';
import styles from './page.module.css';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    // Clear client-side state on logout per secure coding guidelines
    clearRecentSearches();
    await signOut({ redirect: false });
    // Full page redirect to clear any cached state
    window.location.href = '/';
  };

  const handleClearHistory = () => {
    clearRecentSearches();
    router.push('/home');
  };

  const isLoading = status === 'loading';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Profile</h1>
      </header>

      <main className={styles.content}>
        {/* User card */}
        {session?.user ? (
          <div className={`card ${styles.userCard}`}>
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={`${session.user.name ?? 'User'} avatar`}
                className={styles.userAvatar}
                width={64}
                height={64}
              />
            ) : (
              <div className={styles.userAvatarPlaceholder}>
                {session.user.name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className={styles.userInfo}>
              <span className={styles.userName}>{session.user.name}</span>
              {/* Mask full email — show domain only */}
              <span className={styles.userEmail}>
                {session.user.email
                  ? `${session.user.email.split('@')[0].slice(0, 2)}***@${session.user.email.split('@')[1]}`
                  : ''}
              </span>
              <span className="badge badge-google">Google Account</span>
            </div>
          </div>
        ) : isLoading ? (
          <div className={`skeleton ${styles.userCardSkeleton}`} />
        ) : (
          /* Guest state */
          <div className={`card ${styles.guestCard}`}>
            <div className={styles.guestIcon} aria-hidden>👤</div>
            <div className={styles.guestInfo}>
              <span className={styles.guestTitle}>Sign in to sync your places</span>
              <span className={styles.guestDesc}>
                Save destinations across all your devices with Google Sign-In.
              </span>
            </div>
            <button
              id="profile-signin-btn"
              className={`btn btn-secondary ${styles.signInBtn}`}
              onClick={() => signIn('google')}
            >
              <GoogleLogo />
              Sign in with Google
            </button>
          </div>
        )}

        {/* Settings section */}
        <section aria-labelledby="settings-heading">
          <h2 className={styles.sectionTitle} id="settings-heading">Settings</h2>
          <div className={styles.settingsList}>
            <SettingRow
              id="setting-clear-history"
              icon="🕐"
              label="Clear Search History"
              desc="Remove all recent searches"
              onClick={handleClearHistory}
            />
            <SettingRow
              id="setting-about"
              icon="ℹ️"
              label="About Wayfinder"
              desc="Search with Google. Travel with Yango."
              onClick={() => {}}
            />
          </div>
        </section>

        {/* App info */}
        <div className={styles.appInfo}>
          <div className={styles.dualBrand}>
            <GoogleLogoFull />
            <span className={styles.plus}>+</span>
            <YangoLogo />
          </div>
          <p className={styles.appTagline}>
            Google-Powered Search · Built for Yango Users in Pakistan
          </p>
          <p className={styles.appVersion}>Wayfinder v1.0</p>
        </div>

        {/* Sign out */}
        {session && (
          <button
            id="profile-signout-btn"
            className={`btn btn-secondary ${styles.signOutBtn}`}
            onClick={handleSignOut}
          >
            Sign Out
          </button>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function SettingRow({ id, icon, label, desc, onClick }: {
  id: string; icon: string; label: string; desc: string; onClick: () => void;
}) {
  return (
    <button id={id} className={styles.settingRow} onClick={onClick} aria-label={label}>
      <span className={styles.settingIcon} aria-hidden>{icon}</span>
      <div className={styles.settingText}>
        <span className={styles.settingLabel}>{label}</span>
        <span className={styles.settingDesc}>{desc}</span>
      </div>
      <ChevronIcon />
    </button>
  );
}

function ChevronIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 18l6-6-6-6"/></svg>;
}
function GoogleLogo() {
  return <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>;
}
function GoogleLogoFull() {
  return <svg width="56" height="20" viewBox="0 0 56 20" aria-label="Google" role="img"><text x="0" y="16" fontFamily="Inter, sans-serif" fontSize="14" fontWeight="600" fill="var(--text-secondary)">Google</text></svg>;
}
function YangoLogo() {
  return <svg width="48" height="20" viewBox="0 0 48 20" aria-label="Yango" role="img"><text x="0" y="16" fontFamily="Inter, sans-serif" fontSize="14" fontWeight="700" fill="var(--yango-red)">Yango</text></svg>;
}
