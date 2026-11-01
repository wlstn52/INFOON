import { getAuthedClient } from "@/lib/materialDb";

export async function GET() {
  const auth = await getAuthedClient();
  if ("response" in auth) return auth.response;

  const { data, error } = await auth.supabase
    .from("projects")
    .select("id, name, share_token")
    .order("name");
  if (error) {
    console.error("GET /api/projects", error);
    return Response.json(
      { error: "프로젝트를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
  return Response.json(
    data.map((p) => ({ id: p.id, name: p.name, shareToken: p.share_token })),
  );
}
