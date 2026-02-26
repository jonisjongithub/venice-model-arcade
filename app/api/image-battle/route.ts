import { NextRequest, NextResponse } from 'next/server';

const VENICE_API_BASE = 'https://api.venice.ai/api/v1';

export async function POST(request: NextRequest) {
  try {
    const { model, prompt } = await request.json();

    if (!model || !prompt) {
      return NextResponse.json(
        { error: 'Missing model or prompt' },
        { status: 400 }
      );
    }

    const apiKey = process.env.VENICE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Venice API key not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(`${VENICE_API_BASE}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        response_format: 'url',
        width: 1024,
        height: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Venice Image API error for model ${model}:`, errorText);
      
      let errorMessage = `Image generation failed (${response.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
      } catch {
        if (errorText) errorMessage = errorText.substring(0, 200);
      }
      
      return NextResponse.json(
        { error: errorMessage, model },
        { status: response.status }
      );
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'No image URL in response', model },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imageUrl,
      model,
    });
  } catch (error) {
    console.error('Image battle API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}
