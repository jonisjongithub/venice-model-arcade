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

    // Venice uses /image/generate (not OpenAI's /images/generations)
    const response = await fetch(`${VENICE_API_BASE}/image/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        width: 1024,
        height: 1024,
        format: 'webp',
        safe_mode: false,
        hide_watermark: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Venice Image API error for model ${model}:`, errorText);
      
      let errorMessage = `Image generation failed (${response.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorMessage;
      } catch {
        if (errorText) errorMessage = errorText.substring(0, 200);
      }
      
      return NextResponse.json(
        { error: errorMessage, model },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Venice returns base64 images in data.images array
    const base64Image = data.images?.[0];
    
    if (!base64Image) {
      return NextResponse.json(
        { error: 'No image in response', model },
        { status: 500 }
      );
    }

    // Return as data URL for direct use in img src
    const imageUrl = `data:image/webp;base64,${base64Image}`;

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
