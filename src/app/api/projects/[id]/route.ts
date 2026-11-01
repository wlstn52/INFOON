import { getAuthedClient, isUuid } from "@/lib/materialDb";

const MAX_NAME = 200;
const MAX_GOAL = 1000;

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/projects/[id]">,
) {
  const auth = await getAuthedClient();
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;
  if (!isUuid(id)) {
    return Response.json({ error: "잘못된 프로젝트 ID입니다." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const goal = typeof body?.goal === "string" ? body.goal.trim() : "";
  if (!name || name.length > MAX_NAME) {
    return Response.json(
      { error: `프로젝트 이름은 1~${MAX_NAME}자로 입력해 주세요.` },
      { status: 400 },
    );
  }
  if (goal.length > MAX_GOAL) {
    return Response.json(
      { error: `목표는 ${MAX_GOAL}자 이하로 입력해 주세요.` },
      { status: 400 },
    );
  }

  const { data, error } = await auth.supabase
    .from("projects")
    .update({ name, goal })
    .eq("id", id)
    .select("id, name, goal, share_token")
    .maybeSingle();
  if (error?.code === "23505") {
    return Response.json({ error: "이미 있는 이름입니다." }, { status: 409 });
  }
  if (error) {
    console.error("PATCH /api/projects/[id]", error);
    return Response.json(
      { error: "프로젝트를 수정하지 못했습니다." },
      { status: 500 },
    );
  }
  if (!data) {
    return Response.json(
      { error: "프로젝트를 찾을 수 없습니다." },
      { status: 404 },
    );
  }
  return Response.json({
    id: data.id,
    name: data.name,
    goal: data.goal,
    shareToken: data.share_token,
  });
}

// 소속 자료와 공유 링크도 함께 삭제된다 (외래키 on delete cascade)
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/projects/[id]">,
) {
  const auth = await getAuthedClient();
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;
  if (!isUuid(id)) {
    return Response.json({ error: "잘못된 프로젝트 ID입니다." }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) {
    console.error("DELETE /api/projects/[id]", error);
    return Response.json(
      { error: "프로젝트를 삭제하지 못했습니다." },
      { status: 500 },
    );
  }
  if (data.length === 0) {
    return Response.json(
      { error: "프로젝트를 찾을 수 없습니다." },
      { status: 404 },
    );
  }
  return new Response(null, { status: 204 });
}
