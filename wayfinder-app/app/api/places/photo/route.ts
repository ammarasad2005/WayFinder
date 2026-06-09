// app/api/places/photo/route.ts
// Streams Google Place photos server-side with local filesystem caching to prevent API quota drain.

import { NextRequest, NextResponse } from 'next/server';
import { buildPhotoUrl } from '@/lib/google-maps';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const CACHE_DIR = path.join(process.cwd(), '.cache', 'photos');

/** Validate photo reference — alphanumeric + limited special chars, max 500 chars */
function isValidPhotoRef(ref: string): boolean {
  return /^[A-Za-z0-9_\-\/]+$/.test(ref) && ref.length > 0 && ref.length <= 500;
}

export async function GET(req: NextRequest) {
  const photoRef = req.nextUrl.searchParams.get('ref');
  const maxWidth = req.nextUrl.searchParams.get('w') ?? '800';
  const maxWidthNum = Math.min(Math.max(parseInt(maxWidth, 10) || 800, 100), 1600);

  if (!photoRef || !isValidPhotoRef(photoRef)) {
    return NextResponse.json({ error: 'Invalid photo reference' }, { status: 400 });
  }

  // Create unique cache file paths based on photo reference and width
  const cacheKey = crypto.createHash('sha256').update(`${photoRef}_${maxWidthNum}`).digest('hex');
  const cacheFilePath = path.join(CACHE_DIR, `${cacheKey}.bin`);
  const cacheMetaPath = path.join(CACHE_DIR, `${cacheKey}.json`);

  try {
    // Check if the photo is cached locally
    if (fs.existsSync(cacheFilePath) && fs.existsSync(cacheMetaPath)) {
      const metaContent = await fs.promises.readFile(cacheMetaPath, 'utf-8');
      const meta = JSON.parse(metaContent);
      const buffer = await fs.promises.readFile(cacheFilePath);

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': meta.contentType || 'image/jpeg',
          'Cache-Control': 'public, max-age=2592000, s-maxage=2592000', // Cache 30 days
          'X-Content-Type-Options': 'nosniff',
          'Content-Disposition': 'inline',
          'X-Cache': 'HIT',
        },
      });
    }
  } catch (err) {
    // Fallback to fetching if read fails
    console.warn('[photo-cache] read error:', err instanceof Error ? err.message : 'unknown');
  }

  try {
    const photoUrl = buildPhotoUrl(photoRef, maxWidthNum);
    const res = await fetch(photoUrl);

    if (!res.ok) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    const contentType = res.headers.get('content-type') ?? 'image/jpeg';

    // Only allow image content types
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 502 });
    }

    const buffer = await res.arrayBuffer();

    // Cache the photo asynchronously to avoid blocking the user request
    try {
      await fs.promises.mkdir(CACHE_DIR, { recursive: true });
      await fs.promises.writeFile(cacheFilePath, Buffer.from(buffer));
      await fs.promises.writeFile(cacheMetaPath, JSON.stringify({ contentType }));
    } catch (err) {
      console.error('[photo-cache] write error:', err instanceof Error ? err.message : 'unknown');
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=2592000, s-maxage=2592000', // Cache 30 days
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline',
        'X-Cache': 'MISS',
      },
    });
  } catch (err) {
    console.error('[photo] error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Photo fetch failed' }, { status: 502 });
  }
}
