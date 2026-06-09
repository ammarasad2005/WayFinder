'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { hasVisited, markVisited } from '@/lib/storage';
import WelcomeScreen from '@/components/WelcomeScreen';

export default function RootPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState<boolean | null>(null);

  useEffect(() => {
    if (status === 'loading') return;

    // Signed-in users go straight to home
    if (session) {
      router.replace('/home');
      return;
    }

    // Returning guests go straight to home
    if (hasVisited()) {
      router.replace('/home');
      return;
    }

    // First-time visitor: show welcome
    const timer = setTimeout(() => {
      setShowWelcome(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [session, status, router]);

  const handleStart = () => {
    markVisited();
    router.push('/home');
  };

  // Loading state — minimal dark screen
  if (showWelcome === null) {
    return (
      <div style={{
        minHeight: '100dvh',
        background: 'var(--surface-0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
      </div>
    );
  }

  return <WelcomeScreen onStart={handleStart} />;
}
