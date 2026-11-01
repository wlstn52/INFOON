import { getAuthedClient, isUuid } from "@/lib/materialDb";

const RELATIONS = new Set(["cites", "related"]);

type Row = {
  id: string;
  source_id: string;
  target_id: string;
  relation: string;
};

const toRelation = (r: Row) => ({
  id: r.id,
  sourceId: r.source_id,
  targetId: r.target_id,
  relation: r.relation,
});

export async function GET() {
  const auth = await getAuthedClient();
  if ("response" in auth) return auth.response;

  const { data, error } = await auth.supabase
    .from("material_relations")
    .select("id, source_id, target_id, relation");
  if (error) {
    console.error("GET /api/relations", error);
    return Response.json(
      { error: "관계를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
  return Response.json(data.map(toRelation));
}

export async function POST(request: Request) {
  const auth = await getAuthedClient();
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const sourceId = body?.sourceId;
  const targetId = body?.targetId;
  const relation = body?.relation;
  if (
    typeof sourceId !== "string" ||
    typeof targetId !== "string" ||
    !isUuid(sourceId) ||
    !isUuid(targetId) ||
    typeof relation !== "string" ||
    !RELATIONS.has(relation)
  ) {
    return Response.json({ error: "요청이 올바르지 않습니다." }, { status: 400 });
  }
  if (sourceId === targetId) {
    return Response.json(
      { error: "자기 자신과는 연결할 수 없습니다." },
      { status: 400 },
    );
  }

  const { data, error } = await auth.supabase
    .from("material_relations")
    .insert({ source_id: sourceId, target_id: targetId, relation })
    .select("id, source_id, target_id, relation")
    .single();
  if (error?.code === "23505") {
    return Response.json(
      { error: "이미 연결된 관계입니다." },
      { status: 409 },
    );
  }
  // RLS 거부(42501)와 없는 자료(23503)를 구분하지 않아 남의 자료 존재 여부를 알 수 없게 한다
  if (error?.code === "42501" || error?.code === "23503") {
    return Response.json({ error: "자료를 찾을 수 없습니다." }, { status: 404 });
  }
  if (error) {
    console.error("POST /api/relations", error);
    return Response.json(
      { error: "관계를 저장하지 못했습니다." },
      { status: 500 },
    );
  }
  return Response.json(toRelation(data), { status: 201 });
}
