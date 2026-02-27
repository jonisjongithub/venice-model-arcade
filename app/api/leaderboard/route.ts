import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard, isKVConfigured, ModelScore } from '@/lib/kv';
import modelsData from '@/data/models.json';

// Cache duration in seconds
const CACHE_DURATION = 30;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('mode') || 'text';

    // Validate mode
    if (mode !== 'text' && mode !== 'image') {
      return NextResponse.json(
        { error: 'Invalid mode. Must be "text" or "image"' },
        { status: 400 }
      );
    }

    // Check if KV is configured
    if (!isKVConfigured()) {
      return NextResponse.json(
        { 
          error: 'Global leaderboard not configured',
          fallback: true,
          message: 'KV storage not available. Using local data.'
        },
        { status: 503 }
      );
    }

    // Get model IDs based on mode
    const models = mode === 'text' 
      ? modelsData.models 
      : modelsData.imageModels;
    
    const modelIds = models.map(m => m.id);

    // Get leaderboard from KV
    const leaderboard = await getLeaderboard(mode, modelIds);

    if (!leaderboard) {
      return NextResponse.json(
        { 
          error: 'Failed to fetch leaderboard',
          fallback: true
        },
        { status: 500 }
      );
    }

    // Enrich with model metadata
    const enrichedLeaderboard = leaderboard.map((score: ModelScore) => {
      const modelData = models.find(m => m.id === score.id);
      return {
        ...score,
        name: modelData?.name || score.id,
        shortName: modelData?.shortName || score.id,
        icon: modelData?.icon || '🤖',
        color: modelData?.color || '#888',
        type: modelData?.type || mode,
        description: modelData?.description || '',
        strengths: modelData?.strengths || [],
      };
    });

    // Return with cache headers
    return NextResponse.json(
      {
        success: true,
        mode,
        global: true,
        data: enrichedLeaderboard,
        cachedAt: Date.now(),
      },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=${CACHE_DURATION * 2}`,
        },
      }
    );
  } catch (error) {
    console.error('Leaderboard API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        fallback: true,
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
