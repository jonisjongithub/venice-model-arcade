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

    // Build request body - handle model-specific parameters
    const requestBody: Record<string, unknown> = {
      model,
      messages: [
        { role: 'user', content: prompt }
      ],
      stream: true,
      max_tokens: 1024,
      temperature: 0.7,
    };

    // Claude models with thinking capability need explicit thinking config
    const modelLower = model.toLowerCase();
    if (modelLower.includes('claude') && (modelLower.includes('sonnet') || modelLower.includes('opus'))) {
      requestBody.venice_parameters = {
        enable_thinking: false  // Disable thinking for faster responses in battles
      };
    }

    const response = await fetch(`${VENICE_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Venice API error for model ${model}:`, errorText);
      
      // Try to parse the error for a cleaner message
      let errorMessage = `Venice API error (${response.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        } else if (errorJson.message) {
          errorMessage = errorJson.message;
        } else if (errorJson.error) {
          errorMessage = typeof errorJson.error === 'string' ? errorJson.error : JSON.stringify(errorJson.error);
        }
      } catch {
        // If not JSON, use the raw text (truncated)
        if (errorText && errorText.length > 0) {
          errorMessage = errorText.substring(0, 200);
        }
      }
      
      // Return error as SSE so client can display it
      const errorStream = new ReadableStream({
        start(controller) {
          const errorData = JSON.stringify({
            choices: [{
              delta: { content: `\n\n❌ **Error from ${model}:**\n${errorMessage}\n\nStatus: ${response.status}` },
              index: 0
            }]
          });
          controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`));
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        }
      });
      
      return new NextResponse(errorStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Return the streaming response directly
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Battle API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Return error as SSE
    const errorStream = new ReadableStream({
      start(controller) {
        const errorData = JSON.stringify({
          choices: [{
            delta: { content: `\n\n❌ **Server Error:**\n${errorMessage}` },
            index: 0
          }]
        });
        controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`));
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      }
    });
    
    return new NextResponse(errorStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
}
