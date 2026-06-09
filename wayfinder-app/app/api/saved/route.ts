// app/api/saved/route.ts
// Saved places for authenticated users — backed by Upstash Redis.
// Guests use localStorage (handled client-side in lib/storage.ts).

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Redis } from '@upstash/redis';
import { isValidPlaceId } from '@/lib/google-maps';
import type { SavedPlace } from '@/lib/storage';

// Initialize Redis client only if valid credentials are present
let redis: Redis | null = null;
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (redisUrl && redisUrl.startsWith('https://') && redisToken) {
  redis = new Redis({
    url: redisUrl,
    token: redisToken,
  });
} else {
  console.warn('[saved] Upstash Redis not configured or invalid URL — saved places will not persist for signed-in users');
}

function getUserKey(userId: string): string {
  // Scope all data to the user's ID — enforces data isolation
  return `wf:saved:${userId}`;
}

/** GET /api/saved — fetch saved places for current user */
export async function GET() {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as typeof session.user & { id?: string }).id;
  if (!userId || !redis) {
    return NextResponse.json({ places: [] });
  }

  try {
    const raw = await redis.get<SavedPlace[]>(getUserKey(userId));
    return NextResponse.json({ places: raw ?? [] });
  } catch (err) {
    console.error('[saved GET] error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Failed to load saved places' }, { status: 502 });
  }
}

/** POST /api/saved — save or remove a place */
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as typeof session.user & { id?: string }).id;
  if (!userId || !redis) {
    return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });
  }

  let body: { action: string; place?: SavedPlace; placeId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { action } = body;
  if (action !== 'save' && action !== 'unsave') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const key = getUserKey(userId);

  try {
    const existing = await redis.get<SavedPlace[]>(key) ?? [];

    if (action === 'save') {
      const { place } = body;
      if (!place || !isValidPlaceId(place.placeId)) {
        return NextResponse.json({ error: 'Invalid place data' }, { status: 400 });
      }
      const deduped = existing.filter(p => p.placeId !== place.placeId);
      deduped.unshift(place);
      const capped = deduped.slice(0, 100); // Max 100 saved places
      await redis.set(key, capped, { ex: 60 * 60 * 24 * 365 }); // 1 year TTL
      return NextResponse.json({ ok: true });
    }

    if (action === 'unsave') {
      const { placeId } = body;
      if (!placeId || !isValidPlaceId(placeId)) {
        return NextResponse.json({ error: 'Invalid placeId' }, { status: 400 });
      }
      const updated = existing.filter(p => p.placeId !== placeId);
      await redis.set(key, updated, { ex: 60 * 60 * 24 * 365 });
      return NextResponse.json({ ok: true });
    }
  } catch (err) {
    console.error('[saved POST] error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Operation failed' }, { status: 502 });
  }
}
