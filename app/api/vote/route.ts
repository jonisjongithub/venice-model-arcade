import { NextRequest, NextResponse } from 'next/server';
import { recordVote, isKVConfigured } from '@/lib/kv';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { winner, loser, mode } = body;

    // Validate request
    if (!winner || typeof winner !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid winner model id' },
        { status: 400 }
      );
    }

    if (!loser || typeof loser !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid loser model id' },
        { status: 400 }
      );
    }

    if (!mode || (mode !== 'text' && mode !== 'image')) {
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
          message: 'KV storage not available. Using local storage.'
        },
        { status: 503 }
      );
    }

    // Record the vote
    const result = await recordVote(winner, loser, mode);

    if (!result) {
      return NextResponse.json(
        { 
          error: 'Failed to record vote',
          fallback: true
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        winner: {
          id: result.winnerId,
          newElo: result.winnerNewElo,
          change: result.winnerChange,
        },
        loser: {
          id: result.loserId,
          newElo: result.loserNewElo,
          change: result.loserChange,
        },
      },
    });
  } catch (error) {
    console.error('Vote API error:', error);
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
