// app/api/places/nearby/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchNearbySearch, isValidLatLng, isValidRadius, isValidType } from '@/lib/google-maps';

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat');
  const lng = req.nextUrl.searchParams.get('lng');
  const type = req.nextUrl.searchParams.get('type') ?? 'establishment';
  const radius = req.nextUrl.searchParams.get('radius') ?? '5000';

  if (!isValidLatLng(lat, lng)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }
  if (!isValidType(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }
  if (!isValidRadius(radius)) {
    return NextResponse.json({ error: 'Invalid radius' }, { status: 400 });
  }

  try {
    const data = await fetchNearbySearch(Number(lat), Number(lng), type, Number(radius));

    interface NearbyPhoto {
      name: string;
    }

    interface NearbyPlace {
      id: string;
      displayName?: { text: string };
      shortFormattedAddress?: string;
      rating?: number;
      userRatingCount?: number;
      photos?: NearbyPhoto[];
      location?: {
        latitude: number;
        longitude: number;
      };
      types?: string[];
    }

    // Map New places array (v1) to Legacy results format for frontend compatibility
    const rawPlaces = data.places ?? [];
    const results = rawPlaces.map((p: NearbyPlace) => ({
      place_id: p.id,
      name: p.displayName?.text ?? '',
      vicinity: p.shortFormattedAddress ?? '',
      rating: p.rating,
      user_ratings_total: p.userRatingCount,
      photos: p.photos?.map((photo: NearbyPhoto) => ({
        photo_reference: photo.name, // e.g. "places/PLACE_ID/photos/PHOTO_ID"
      })) ?? [],
      geometry: p.location ? {
        location: {
          lat: p.location.latitude,
          lng: p.location.longitude,
        }
      } : undefined,
      types: p.types ?? [],
    }));

    return NextResponse.json({ results }, {
      headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
    });
  } catch (err) {
    console.error('[nearby] error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Nearby search failed' }, { status: 502 });
  }
}
