import AnimePaheFixed from "@/lib/providers/animepahe-fixed";
import { NextRequest, NextResponse } from "next/server";

// Create a fresh instance for each request to avoid caching issues
function getProvider() {
  return new AnimePaheFixed();
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const episodeId = searchParams.get("episodeId");

    if (!episodeId) {
      return NextResponse.json(
        { error: "Episode ID parameter is required" },
        { status: 400 }
      );
    }

    const animepahe = getProvider();
    const sources = await animepahe.fetchEpisodeSources(episodeId);
    return NextResponse.json(sources);
  } catch (error) {
    console.error("Watch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch episode sources" },
      { status: 500 }
    );
  }
}
