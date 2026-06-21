import { importBrickLinkSets } from "@/lib/bricklink-import";
import { resolve } from "path";

export async function GET() {
  return Response.json({
    message: "Send a POST request to trigger the import",
    usage: "POST /api/import-sets",
  });
}

export async function POST() {
  try {
    const result = await importBrickLinkSets({
      setsFilePath: resolve(process.cwd(), "data/sets.json"),
    });

    return Response.json({
      success: true,
      message: `Added ${result.added} new sets, skipped ${result.skipped} existing sets`,
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
