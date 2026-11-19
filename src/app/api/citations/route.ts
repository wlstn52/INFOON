import type { NextRequest } from "next/server";
import { lookupCitationStats } from "@/lib/citationStats";
import { parseIdentifier } from "@/lib/identifiers";
import { getAuthedClient } from "@/lib/materialDb";

export async function GET(request: NextRequest) {
  const auth = await getAuthedClient();
  if ("response" in auth) return auth.response;

  const id = parseIdentifier(request.nextUrl.searchParams.get("doi") ?? "");
  if (id?.kind !== "doi") {
    return Response.json(
      { error: "DOI가 있는 자료만 피인용 수를 볼 수 있습니다." },
      { status: 400 },
    );
  }

  try {
    const stats = await lookupCitationStats(id.value);
    if (!stats) {
      return Response.json(
        { error: "OpenAlex에서 이 논문을 찾지 못했습니다." },
        { status: 404 },
      );
    }
    return Response.json(stats);
  } catch (error) {
    console.error("GET /api/citations", error);
    return Response.json(
      { error: "피인용 정보를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 502 },
    );
  }
}
