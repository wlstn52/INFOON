import { getAuthedClient, isUuid } from "@/lib/materialDb";

async function setToken(id: string, token: string | null) {
  const auth = await getAuthedClient();
  if ("response" in auth) return auth.response;

  if (!isUuid(id)) {
    return Response.json({ error: "잘못된 프로젝트 ID입니다." }, { status: 400 });
  }

  // 본인 프로젝트만 수정되도록 RLS가 보장한다. 남의 프로젝트면 0행이 되어 404가 된다.
  const { data, error } = await auth.supabase
    .from("projects")
    .update({ share_token: token })
    .eq("id", id)
    .select("share_token")
    .maybeSingle();
  if (error) {
    console.error("share token update", error);
    return Response.json(
      { error: "공유 설정을 바꾸지 못했습니다." },
      { status: 500 },
    );
  }
  if (!data) {
    return Response.json(
      { error: "프로젝트를 찾을 수 없습니다." },
      { status: 404 },
    );
  }
  return Response.json({ shareToken: data.share_token });
}

// 링크 생성. 이미 있으면 새 토큰으로 바꿔서 이전 링크를 무효화한다.
export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/projects/[id]/share">,
) {
  const { id } = await ctx.params;
  return setToken(id, crypto.randomUUID());
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/projects/[id]/share">,
) {
  const { id } = await ctx.params;
  return setToken(id, null);
}
