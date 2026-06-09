// app/api/directions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchDirections, isValidLatLng } from '@/lib/google-maps';

export async function GET(req: NextRequest) {
  const oLat = req.nextUrl.searchParams.get('oLat');
  const oLng = req.nextUrl.searchParams.get('oLng');
  const dLat = req.nextUrl.searchParams.get('dLat');
  const dLng = req.nextUrl.searchParams.get('dLng');

  if (!isValidLatLng(oLat, oLng) || !isValidLatLng(dLat, dLng)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  try {
    const data = await fetchDirections(
      Number(oLat), Number(oLng),
      Number(dLat), Number(dLng)
    );
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' }, // Live traffic — never cache
    });
  } catch (err) {
    console.error('[directions] error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Directions fetch failed' }, { status: 502 });
  }
}
