import { NextRequest, NextResponse } from "next/server";
import {
  analyzeSet,
  getAllSets,
  isCondition,
  type Analysis,
} from "@/lib/analyze";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const setNumber = searchParams.get("set");
  const conditionParam = searchParams.get("condition");
  const similarTo = searchParams.get("similarTo");
  const sampleParam = searchParams.get("sample");

  if (sampleParam && !setNumber) {
    const count = Math.min(
      10,
      Math.max(1, parseInt(sampleParam, 10) || 3),
    );
    const all = getAllSets();
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    const sample = shuffled
      .slice(0, count)
      .map((s) => {
        const a = analyzeSet(s.number, "sealed");
        return a
          ? {
              number: s.number,
              name: s.name,
              theme: s.theme,
              estimatedValue: a.estimatedValue,
              recommendation: a.recommendation,
            }
          : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return NextResponse.json({ sample });
  }

  if (similarTo) {
    const current = analyzeSet(similarTo.trim(), "sealed");
    if (!current) {
      return NextResponse.json({ error: "Set not found." }, { status: 404 });
    }

    const similar = getAllSets()
      .filter(
        (s) =>
          s.number !== current.set.number &&
          s.theme === current.set.theme,
      )
      .map((s) => {
        const a = analyzeSet(s.number, "sealed");
        return a
          ? {
              number: s.number,
              name: s.name,
              estimatedValue: a.estimatedValue,
              recommendation: a.recommendation,
            }
          : null;
      })
      .filter(
        (item): item is NonNullable<typeof item> =>
          item !== null &&
          item.recommendation === current.recommendation,
      )
      .slice(0, 3);

    return NextResponse.json({ similar });
  }

  if (!setNumber) {
    const sets = getAllSets().map((s) => ({
      number: s.number,
      name: s.name,
      retired: s.retired === true,
      retiringSoon: s.retiringSoon === true && s.retired !== true,
    }));
    return NextResponse.json({ sets });
  }

  if (!conditionParam || !isCondition(conditionParam)) {
    return NextResponse.json(
      { error: "Invalid condition. Use sealed, complete, or incomplete." },
      { status: 400 },
    );
  }

  const analysis: Analysis | null = analyzeSet(setNumber, conditionParam);

  if (!analysis) {
    return NextResponse.json(
      {
        error: `Set ${setNumber.trim()} not found. Try: ${getAllSets()
          .map((s) => s.number)
          .join(", ")}`,
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ analysis });
}
