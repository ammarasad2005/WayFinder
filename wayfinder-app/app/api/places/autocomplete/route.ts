// app/api/places/autocomplete/route.ts
// BFF proxy for Google Places Autocomplete.
// Keeps GOOGLE_MAPS_API_KEY server-side only.

import { NextRequest, NextResponse } from 'next/server';
import { fetchAutocomplete } from '@/lib/google-maps';

// Simple in-memory rate limiter (per IP, 30 req/min)
// TODO(security): Replace with Redis-backed rate limiter for multi-instance deployments
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const input = req.nextUrl.searchParams.get('input');
  const sessionToken = req.nextUrl.searchParams.get('sessionToken') ?? '';

  // Input validation
  if (!input || typeof input !== 'string' || input.trim().length < 2 || input.length > 200) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  try {
    const data = await fetchAutocomplete(input.trim(), sessionToken);
    
    interface AutocompleteSuggestion {
      placePrediction?: {
        placeId: string;
        text?: { text: string };
        structuredFormat?: {
          mainText?: { text: string };
          secondaryText?: { text: string };
        };
      };
    }

    // Map suggestions (New) to predictions (Classic) for frontend compatibility
    const suggestions = data.suggestions ?? [];
    const predictions = suggestions
      .map((s: AutocompleteSuggestion) => {
        const pred = s.placePrediction;
        if (!pred) return null;
        return {
          place_id: pred.placeId,
          description: pred.text?.text ?? '',
          structured_formatting: {
            main_text: pred.structuredFormat?.mainText?.text ?? '',
            secondary_text: pred.structuredFormat?.secondaryText?.text ?? '',
          },
        };
      })
      .filter(Boolean);

    return NextResponse.json({ predictions }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    // Log error server-side without exposing details to client
    console.error('[autocomplete] error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Search failed' }, { status: 502 });
  }
}
