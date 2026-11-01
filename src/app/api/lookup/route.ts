import type { NextRequest } from "next/server";
import { getAuthedClient } from "@/lib/materialDb";
import { lookupIdentifier, parseIdentifier } from "@/lib/lookup";

export async function GET(request: NextRequest) {
  const auth = await getAuthedClient();
  if ("response" in auth) return auth.response;

  const id = parseIdentifier(request.nextUrl.searchParams.get("id") ?? "");
  if (!id) {
    return Response.json(
      { error: "DOI 또는 ISBN 형식이 아닙니다. 값을 확인해 주세요." },
      { status: 400 },
    );
  }

  try {
    const result = await lookupIdentifier(id);
    if (!result) {
      return Response.json(
        { error: "정보를 찾지 못했습니다. 직접 입력해 주세요." },
        { status: 404 },
      );
    }
    return Response.json(result);
  } catch (error) {
    console.error("GET /api/lookup", error);
    return Response.json(
      {
        error:
          "외부 서비스에서 정보를 가져오지 못했습니다. 잠시 후 다시 시도하거나 직접 입력해 주세요.",
      },
      { status: 502 },
    );
  }
}
