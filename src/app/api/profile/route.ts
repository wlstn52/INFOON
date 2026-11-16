import { getAuthedClient } from "@/lib/materialDb";

const MAX_FAVORITES = 50;
const MAX_TEXT = 200;

type FavoriteAuthor = { key: string; label: string };

function parseFavorites(v: unknown): FavoriteAuthor[] | null {
  if (!Array.isArray(v) || v.length > MAX_FAVORITES) return null;
  const result: FavoriteAuthor[] = [];
  const seen = new Set<string>();
  for (const item of v) {
    const key = typeof item?.key === "string" ? item.key.trim() : "";
    const label = typeof item?.label === "string" ? item.label.trim() : "";
    if (!key || !label || key.length > MAX_TEXT || label.length > MAX_TEXT) {
      return null;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ key, label });
  }
  return result;
}

export async function GET() {
  const auth = await getAuthedClient();
  if ("response" in auth) return auth.response;

  const { data, error } = await auth.supabase
    .from("profiles")
    .select("favorite_authors")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error) {
    console.error("GET /api/profile", error);
    return Response.json(
      { error: "사용자 정보를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
  return Response.json({ favoriteAuthors: data?.favorite_authors ?? [] });
}

export async function PUT(request: Request) {
  const auth = await getAuthedClient();
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const favoriteAuthors = parseFavorites(body?.favoriteAuthors);
  if (!favoriteAuthors) {
    return Response.json(
      { error: `관심 저자는 ${MAX_FAVORITES}명까지 등록할 수 있습니다.` },
      { status: 400 },
    );
  }

  const { data, error } = await auth.supabase
    .from("profiles")
    .update({ favorite_authors: favoriteAuthors })
    .eq("id", auth.user.id)
    .select("favorite_authors")
    .maybeSingle();
  if (error || !data) {
    console.error("PUT /api/profile", error);
    return Response.json(
      { error: "관심 저자를 저장하지 못했습니다." },
      { status: 500 },
    );
  }
  return Response.json({ favoriteAuthors: data.favorite_authors });
}
