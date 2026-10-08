import {
  findOrCreateProject,
  getAuthedClient,
  inputToColumns,
  MATERIAL_SELECT,
  parseMaterialInput,
  rowToMaterial,
} from "@/lib/materialDb";

export async function GET() {
  const auth = await getAuthedClient();
  if ("response" in auth) return auth.response;

  const { data, error } = await auth.supabase
    .from("materials")
    .select(MATERIAL_SELECT)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("GET /api/materials", error);
    return Response.json({ error: "자료를 불러오지 못했습니다." }, { status: 500 });
  }
  return Response.json(data.map(rowToMaterial));
}

export async function POST(request: Request) {
  const auth = await getAuthedClient();
  if ("response" in auth) return auth.response;

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
      .insert(inputToColumns(parsed.data, projectId))
      .select(MATERIAL_SELECT)
      .single();
    if (error) throw error;
    return Response.json(rowToMaterial(data), { status: 201 });
  } catch (error) {
    console.error("POST /api/materials", error);
    return Response.json({ error: "자료를 저장하지 못했습니다." }, { status: 500 });
  }
}
