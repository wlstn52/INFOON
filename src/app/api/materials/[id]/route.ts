import {
  findOrCreateProject,
  getAuthedClient,
  inputToColumns,
  MATERIAL_SELECT,
  parseMaterialInput,
  rowToMaterial,
} from "@/lib/materialDb";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/materials/[id]">,
) {
  const auth = await getAuthedClient();
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;
  if (!UUID.test(id)) {
    return Response.json({ error: "잘못된 자료 ID입니다." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseMaterialInput(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const projectId = await findOrCreateProject(
      auth.supabase,
      parsed.data.projectName,
    );
    const { data, error } = await auth.supabase
      .from("materials")
      .update(inputToColumns(parsed.data, projectId))
      .eq("id", id)
      .select(MATERIAL_SELECT)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return Response.json({ error: "자료를 찾을 수 없습니다." }, { status: 404 });
    }
    return Response.json(rowToMaterial(data));
  } catch (error) {
    console.error("PUT /api/materials/[id]", error);
    return Response.json({ error: "자료를 수정하지 못했습니다." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/materials/[id]">,
) {
  const auth = await getAuthedClient();
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;
  if (!UUID.test(id)) {
    return Response.json({ error: "잘못된 자료 ID입니다." }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("materials")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) {
    console.error("DELETE /api/materials/[id]", error);
    return Response.json({ error: "자료를 삭제하지 못했습니다." }, { status: 500 });
  }
  if (data.length === 0) {
    return Response.json({ error: "자료를 찾을 수 없습니다." }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
