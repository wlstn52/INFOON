import { getAuthedClient, isUuid } from "@/lib/materialDb";

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/relations/[id]">,
) {
  const auth = await getAuthedClient();
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;
  if (!isUuid(id)) {
    return Response.json({ error: "잘못된 관계 ID입니다." }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("material_relations")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) {
    console.error("DELETE /api/relations/[id]", error);
    return Response.json(
      { error: "관계를 삭제하지 못했습니다." },
      { status: 500 },
    );
  }
  if (data.length === 0) {
    return Response.json({ error: "관계를 찾을 수 없습니다." }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
