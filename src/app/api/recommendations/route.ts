import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { PortfolioItem } from "@/lib/portfolio";
import { parseRecommendationsResponse } from "@/lib/recommendations";

function clearProxyEnv() {
  delete process.env.HTTP_PROXY;
  delete process.env.HTTPS_PROXY;
  delete process.env.ALL_PROXY;
  delete process.env.http_proxy;
  delete process.env.https_proxy;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured." },
      { status: 500 },
    );
  }

  let portfolio: PortfolioItem[];
  try {
    const body = await request.json();
    portfolio = body.portfolio;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(portfolio) || portfolio.length === 0) {
    return NextResponse.json(
      { error: "Portfolio must be a non-empty array." },
      { status: 400 },
    );
  }

  const portfolioDetails = portfolio.map((item) => {
    const profitLoss = item.totalEstimatedValue - item.totalPaid;
    const profitPercent =
      item.totalPaid > 0
        ? Math.round((profitLoss / item.totalPaid) * 100)
        : 0;
    return {
      setNumber: item.setNumber,
      name: item.name,
      theme: item.theme,
      condition: item.condition,
      quantity: item.quantity,
      purchasePriceAudPerUnit: item.purchasePrice,
      totalPaidAud: item.totalPaid,
      estimatedValueAudPerUnit: item.estimatedValue,
      totalEstimatedValueAud: item.totalEstimatedValue,
      suggestedListPriceAud: item.suggestedListPrice,
      existingRecommendation: item.recommendation,
      profitLossAud: profitLoss,
      profitLossPercent: profitPercent,
      copies: item.copies.map((copy, index) => ({
        copyNumber: index + 1,
        condition: copy.condition,
        purchasePriceAud: copy.purchasePrice,
        intent: copy.intent,
        intentTag: copy.intentTag,
        notes: copy.notes || "",
      })),
    };
  });

  const prompt = `You are an expert LEGO investment advisor specialising in retired sets, UCS, Modulars and Creator Expert.

Here is a collector's portfolio (all monetary values in AUD):

${JSON.stringify(portfolioDetails, null, 2)}

Analyse each set based on: condition, purchase price vs estimated value, retirement status, theme demand, and timing.

Writing requirements (strict):
- Reference the exact set name AND set number in every sellNow and hold reason (e.g. "75192 Millennium Falcon").
- Use specific dollar figures (AUD), percentages, and timeframes — avoid vague phrases like "good time to sell" or "may increase".
- Distinguish early retirement appreciation (0–2 years post-retirement) from mature retirement appreciation (3+ years). State which phase applies when relevant.
- Flag any set where condition (sealed vs complete vs incomplete) materially changes the recommendation — incomplete sets need explicit buyer-pool and pricing caveats.
- For retiring-soon sets: cite the pre-retirement window (3–6 months before) and post-retirement window (12–24 months after).
- For active sets: explain retail competition and why holding through retirement usually beats selling now unless liquidity is urgent.
- Compare purchase price vs estimated value with concrete profit/loss AUD and % where data is available.

Per-copy intent (critical):
- Each set may have multiple copies in the "copies" array with intentTag values: flip-soon, hold-retirement, hold-long, personal, resale-soon, undecided.
- Give per-intent advice: for flip-soon / resale-soon copies, assess whether now is the right time to sell; for hold-retirement, confirm retirement timeline; for hold-long, validate the long-term thesis; for personal, note they are not primarily investments.
- Flag any copy where intentTag conflicts with existingRecommendation (e.g. HOLD set but flip-soon intent, or SELL set but hold-long intent). Mention copy number when advising on a specific copy.
- If undecided copies exist, recommend assigning a clear intent in your watchList insights.

Include every portfolio set in either sellNow or hold (not both). When copies have mixed intents, explain which copies to action vs hold in the reason text.

Return ONLY valid JSON. No markdown, no code fences, no preamble. Use this exact structure:

{
  "portfolioScore": 7,
  "scoreSummary": "Strong portfolio with good diversification...",
  "sellNow": [
    {
      "setNumber": "10262",
      "name": "James Bond Aston Martin DB5",
      "urgency": "High",
      "reason": "Detailed reason why to sell now",
      "suggestedPrice": 259,
      "potentialProfit": 80
    }
  ],
  "hold": [
    {
      "setNumber": "75192",
      "name": "Millennium Falcon",
      "holdUntil": "12-18 months",
      "reason": "Detailed reason why to hold",
      "projectedValue": 1100
    }
  ],
  "watchList": [
    {
      "insight": "UCS sets are trending upward heading into Q4",
      "action": "Consider acquiring more UCS before retirement"
    }
  ],
  "portfolioHealth": {
    "score": 7,
    "label": "Good",
    "strengths": ["Well diversified", "Strong UCS holdings"],
    "weaknesses": ["Heavy in one theme", "Some sets bought above market"]
  }
}

Rules:
- portfolioScore and portfolioHealth.score: integers 1-10
- portfolioHealth.label: one of Excellent, Good, Fair, Needs Attention
- urgency: exactly "High", "Medium", or "Low"
- suggestedPrice, potentialProfit, projectedValue: numbers in AUD (no currency symbols in JSON)
- watchList: 2-4 market insights with actionable advice
- strengths and weaknesses: 2-4 items each`;

  try {
    clearProxyEnv();

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    const raw = textBlock?.type === "text" ? textBlock.text : "";

    if (!raw) {
      return NextResponse.json(
        { error: "No recommendations returned from Claude." },
        { status: 502 },
      );
    }

    const recommendations = parseRecommendationsResponse(raw);

    if (!recommendations) {
      return NextResponse.json({ raw, parseError: true });
    }

    return NextResponse.json({ recommendations });
  } catch (err) {
    console.error("Recommendations error:", err);
    console.log("Recommendations API error details:", {
      message: err instanceof Error ? err.message : String(err),
      cause:
        err instanceof Error && err.cause !== undefined ? err.cause : null,
    });
    return NextResponse.json(
      {
        error:
          "Failed to generate recommendations. Check your API key and try again.",
      },
      { status: 500 },
    );
  }
}
