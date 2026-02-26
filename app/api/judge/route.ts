import { NextRequest, NextResponse } from 'next/server';

const VENICE_API_BASE = 'https://api.venice.ai/api/v1';

const JUDGE_SYSTEM_PROMPT = `You are an impartial AI judge evaluating two responses to a prompt. Your job is to determine which response is better based on:

1. **Accuracy** - Is the information correct and well-reasoned?
2. **Helpfulness** - Does it actually address what was asked?
3. **Clarity** - Is it well-written and easy to understand?
4. **Completeness** - Does it fully answer the question?

You MUST respond in this exact JSON format:
{
  "winner": "A" or "B",
  "reasoning": "Brief explanation (2-3 sentences) of why this response won",
  "scores": {
    "A": { "accuracy": 1-10, "helpfulness": 1-10, "clarity": 1-10, "completeness": 1-10 },
    "B": { "accuracy": 1-10, "helpfulness": 1-10, "clarity": 1-10, "completeness": 1-10 }
  }
}

Be decisive. One response must win. No ties.`;

export async function POST(request: NextRequest) {
  try {
    const { judgeModel, prompt, responseA, responseB, modelA, modelB } = await request.json();

    if (!judgeModel || !prompt || !responseA || !responseB) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    const userPrompt = `## Original Prompt
${prompt}

## Response A (from ${modelA || 'Model A'})
${responseA}

## Response B (from ${modelB || 'Model B'})
${responseB}

## Your Verdict
Evaluate both responses and declare a winner. Respond with JSON only.`;

    // Build request body
    const requestBody: Record<string, unknown> = {
      model: judgeModel,
      messages: [
        { role: 'system', content: JUDGE_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 1024,
      temperature: 0.3, // Lower temp for more consistent judging
    };

    // Claude models with thinking capability need explicit thinking config
    if (judgeModel.includes('claude') && (judgeModel.includes('sonnet-4') || judgeModel.includes('opus-4'))) {
      requestBody.venice_parameters = {
        enable_thinking: false
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
      console.error(`Venice API error for judge model ${judgeModel}:`, errorText);
      return NextResponse.json(
        { error: `Judge API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Try to parse the JSON response
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const verdict = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          winner: verdict.winner,
          reasoning: verdict.reasoning,
          scores: verdict.scores,
          judgeModel,
        });
      } else {
        // Fallback: try to determine winner from text
        const mentionsA = (content.match(/response\s*a/gi) || []).length;
        const mentionsB = (content.match(/response\s*b/gi) || []).length;
        return NextResponse.json({
          winner: mentionsA > mentionsB ? 'A' : 'B',
          reasoning: content.slice(0, 500),
          scores: null,
          judgeModel,
        });
      }
    } catch {
      return NextResponse.json({
        winner: 'A', // Default fallback
        reasoning: content.slice(0, 500),
        scores: null,
        judgeModel,
      });
    }
  } catch (error) {
    console.error('Judge API error:', error);
    return NextResponse.json(
      { error: 'Failed to get judgment' },
      { status: 500 }
    );
  }
}
