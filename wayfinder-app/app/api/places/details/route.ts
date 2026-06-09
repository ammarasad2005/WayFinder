// app/api/places/details/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchPlaceDetails, isValidPlaceId } from '@/lib/google-maps';

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get('placeId');

  if (!placeId || !isValidPlaceId(placeId)) {
    return NextResponse.json({ error: 'Invalid placeId' }, { status: 400 });
  }

  const sessionToken = req.nextUrl.searchParams.get('sessionToken') ?? undefined;

  try {
    const data = await fetchPlaceDetails(placeId, sessionToken);

    // Map New Place (v1) to Legacy Place Details format for frontend compatibility
    const priceLevelMap: Record<string, number> = {
      PRICE_LEVEL_FREE: 0,
      PRICE_LEVEL_INEXPENSIVE: 1,
      PRICE_LEVEL_MODERATE: 2,
      PRICE_LEVEL_EXPENSIVE: 3,
      PRICE_LEVEL_VERY_EXPENSIVE: 4,
    };

    const price_level = data.priceLevel ? (priceLevelMap[data.priceLevel] ?? undefined) : undefined;

    interface DetailPhoto {
      name: string;
      widthPx?: number;
      heightPx?: number;
    }

    interface DetailReview {
      authorAttribution?: {
        displayName?: string;
        photoUri?: string;
      };
      rating?: number;
      relativePublishTimeDescription?: string;
      text?: { text?: string };
    }

    const mappedResult = {
      place_id: data.id,
      name: data.displayName?.text ?? '',
      formatted_address: data.formattedAddress ?? '',
      geometry: data.location ? {
        location: {
          lat: data.location.latitude,
          lng: data.location.longitude,
        }
      } : undefined,
      types: data.types ?? [],
      rating: data.rating,
      user_ratings_total: data.userRatingCount,
      price_level,
      opening_hours: data.regularOpeningHours ? {
        open_now: data.regularOpeningHours.openNow,
        weekday_text: data.regularOpeningHours.weekdayDescriptions ?? [],
      } : undefined,
      photos: data.photos?.map((p: DetailPhoto) => ({
        photo_reference: p.name, // resource path e.g. "places/PLACE_ID/photos/PHOTO_ID"
        width: p.widthPx,
        height: p.heightPx,
      })) ?? [],
      reviews: data.reviews?.map((r: DetailReview) => ({
        author_name: r.authorAttribution?.displayName ?? '',
        rating: r.rating ?? 0,
        relative_time_description: r.relativePublishTimeDescription ?? '',
        text: r.text?.text ?? '',
        profile_photo_url: r.authorAttribution?.photoUri ?? undefined,
      })) ?? [],
      editorial_summary: data.editorialSummary ? {
        overview: data.editorialSummary.text ?? '',
      } : undefined,
      website: data.websiteUri,
      formatted_phone_number: data.nationalPhoneNumber,
      business_status: data.businessStatus,
    };

    return NextResponse.json({
      status: 'OK',
      result: mappedResult,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (err) {
    console.error('[place-details] error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Failed to load place details' }, { status: 502 });
  }
}
