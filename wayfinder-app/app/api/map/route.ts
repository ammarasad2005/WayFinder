// app/api/map/route.ts
// Secure proxy for Google Static Maps.
// Generates a custom styled dark map image based on coordinates or route.

import { NextRequest, NextResponse } from 'next/server';
import { isValidLatLng } from '@/lib/google-maps';

// Premium dark-mode map style parameters matching Wayfinder tokens
const MAP_STYLE = [
  'style=feature:all|element:geometry|color:0x161922',
  'style=feature:all|element:labels.text.stroke|color:0x090b12',
  'style=feature:all|element:labels.text.fill|color:0x8e92a4',
  'style=feature:road|element:geometry|color:0x252836',
  'style=feature:road|element:geometry.stroke|color:0x1e2130',
  'style=feature:road.highway|element:geometry|color:0x34374a',
  'style=feature:water|element:geometry|color:0x090b12',
  'style=feature:transit|element:geometry|color:0x1e2130',
  'style=feature:poi|element:geometry|color:0x1e2130',
  'style=feature:poi|element:labels.text|visibility:off',
  'style=feature:administrative|element:geometry|color:0x252836',
].join('&');

export async function GET(req: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Maps API configuration missing' }, { status: 500 });
  }

  const lat = req.nextUrl.searchParams.get('lat');
  const lng = req.nextUrl.searchParams.get('lng');
  const zoom = req.nextUrl.searchParams.get('zoom') ?? '14';
  const width = req.nextUrl.searchParams.get('w') ?? '600';
  const height = req.nextUrl.searchParams.get('h') ?? '300';
  
  // Optional route parameters
  const destLat = req.nextUrl.searchParams.get('dLat');
  const destLng = req.nextUrl.searchParams.get('dLng');
  const polyline = req.nextUrl.searchParams.get('polyline');

  if (!isValidLatLng(lat, lng)) {
    return NextResponse.json({ error: 'Invalid center coordinates' }, { status: 400 });
  }

  const wNum = Math.min(Math.max(parseInt(width, 10) || 600, 100), 1200);
  const hNum = Math.min(Math.max(parseInt(height, 10) || 300, 100), 1200);
  const zNum = Math.min(Math.max(parseInt(zoom, 10) || 14, 1), 21);

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/staticmap');
    url.searchParams.set('size', `${wNum}x${hNum}`);
    url.searchParams.set('scale', '2'); // Retina/high-res support
    url.searchParams.set('key', apiKey);
    
    // Base style parameters (added as raw queries since URLSearchParams escapes '|' and ':')
    let urlString = url.toString() + '&' + MAP_STYLE;

    if (destLat && destLng && isValidLatLng(destLat, destLng)) {
      // Route map: add markers and path
      // Origin: Blue dot, Destination: Yango Red dot
      urlString += `&markers=size:mid|color:0x4285F4|${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`;
      urlString += `&markers=size:mid|color:0xFF3D4F|${Number(destLat).toFixed(6)},${Number(destLng).toFixed(6)}`;
      
      if (polyline) {
        // Keep style modifiers and separators (| and :) unencoded so Google Maps Static API parses
        // them correctly, but URL-encode the polyline string itself to safely transmit all encoded coordinates.
        const pathVal = `weight:4|color:0x4285F4|enc:${encodeURIComponent(polyline)}`;
        urlString += `&path=${pathVal}`;
      }
    } else {
      // Standard center map: single user location marker
      urlString += `&center=${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`;
      urlString += `&zoom=${zNum}`;
      urlString += `&markers=size:mid|color:0x4285F4|${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`;
    }

    const res = await fetch(urlString);
    if (!res.ok) {
      return NextResponse.json({ error: 'Static map fetch failed' }, { status: 502 });
    }

    const contentType = res.headers.get('content-type') ?? 'image/png';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid response from maps provider' }, { status: 502 });
    }

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache 24hr
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline',
      },
    });
  } catch (err) {
    console.error('[map-api] error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Failed to generate map image' }, { status: 502 });
  }
}
