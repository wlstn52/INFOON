import type { SupabaseClient } from "@supabase/supabase-js";
import type { Author, Material, MaterialInput } from "@/lib/materials";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return UUID.test(value);
}

class ValidationError extends Error {}

function text(
  obj: Record<string, unknown>,
  key: string,
  max: number,
  required = false,
): string | undefined {
  const v = obj[key];
  if (v === undefined || v === null || v === "") {
    if (required) throw new ValidationError(`${key} 값이 필요합니다.`);
    return undefined;
  }
  if (typeof v !== "string") {
    throw new ValidationError(`${key}는 문자열이어야 합니다.`);
  }
  const t = v.trim();
  if (!t) {
    if (required) throw new ValidationError(`${key} 값이 필요합니다.`);
    return undefined;
  }
  if (t.length > max) {
    throw new ValidationError(`${key}는 ${max}자 이하여야 합니다.`);
  }
  return t;
}

function parseAuthors(v: unknown): Author[] | undefined {
  if (v === undefined || v === null) return undefined;
  if (!Array.isArray(v)) throw new ValidationError("authors는 배열이어야 합니다.");
  if (v.length > 100) throw new ValidationError("저자는 100명 이하여야 합니다.");
  if (v.length === 0) return undefined;
  return v.map((item) => {
    if (typeof item !== "object" || item === null) {
      throw new ValidationError("저자 형식이 올바르지 않습니다.");
    }
    const a = item as Record<string, unknown>;
    return {
      familyName: text(a, "familyName", 100, true)!,
      middleName: text(a, "middleName", 100),
      givenName: text(a, "givenName", 100, true)!,
    };
  });
}

export function parseMaterialInput(
  body: unknown,
): { ok: true; data: MaterialInput } | { ok: false; error: string } {
  try {
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new ValidationError("요청 본문이 올바르지 않습니다.");
    }
    const b = body as Record<string, unknown>;

    const importance = b.importance === undefined ? 3 : b.importance;
    if (
      typeof importance !== "number" ||
      !Number.isInteger(importance) ||
      importance < 1 ||
      importance > 5
    ) {
      throw new ValidationError("importance는 1~5 사이의 정수여야 합니다.");
    }

    return {
      ok: true,
      data: {
        projectName: text(b, "projectName", 200, true)!,
        title: text(b, "title", 500, true)!,
        type: text(b, "type", 100, true)!,
        location: text(b, "location", 1000) ?? "",
        importance,
        description: text(b, "description", 5000) ?? "",
        authors: parseAuthors(b.authors),
        publisher: text(b, "publisher", 500),
        publish_date: text(b, "publish_date", 100),
        year: text(b, "year", 20),
        language: text(b, "language", 100),
        url: text(b, "url", 2000),
        access_date: text(b, "access_date", 100),
        organization: text(b, "organization", 500),
        identifier: text(b, "identifier", 500),
        journal: text(b, "journal", 500),
        volume: text(b, "volume", 50),
        issue: text(b, "issue", 50),
        pages: text(b, "pages", 50),
      },
    };
  } catch (e) {
    if (e instanceof ValidationError) return { ok: false, error: e.message };
    throw e;
  }
}

export const MATERIAL_SELECT = "*, projects(name)";

type Row = {
  id: string;
  title: string;
  type: string;
  location: string;
  importance: number;
  description: string;
  created_at: string;
  authors: Author[] | null;
  publisher: string | null;
  publish_date: string | null;
  year: string | null;
  language: string | null;
  url: string | null;
  access_date: string | null;
  organization: string | null;
  identifier: string | null;
  journal: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  projects: { name: string } | null;
};

export function rowToMaterial(row: Row): Material {
  return {
    id: row.id,
    projectName: row.projects?.name ?? "",
    title: row.title,
    type: row.type,
    location: row.location,
    importance: row.importance,
    description: row.description,
    createdAt: row.created_at,
    authors: row.authors ?? undefined,
    publisher: row.publisher ?? undefined,
    publish_date: row.publish_date ?? undefined,
    year: row.year ?? undefined,
    language: row.language ?? undefined,
    url: row.url ?? undefined,
    access_date: row.access_date ?? undefined,
    organization: row.organization ?? undefined,
    identifier: row.identifier ?? undefined,
    journal: row.journal ?? undefined,
    volume: row.volume ?? undefined,
    issue: row.issue ?? undefined,
    pages: row.pages ?? undefined,
  };
}

// DB 컬럼으로 변환. 비운 선택 항목은 null로 보내 기존 값을 지운다.
export function inputToColumns(input: MaterialInput, projectId: string) {
  return {
    project_id: projectId,
    title: input.title,
    type: input.type,
    location: input.location,
    importance: input.importance,
    description: input.description,
    authors: input.authors ?? null,
    publisher: input.publisher ?? null,
    publish_date: input.publish_date ?? null,
    year: input.year ?? null,
    language: input.language ?? null,
    url: input.url ?? null,
    access_date: input.access_date ?? null,
    organization: input.organization ?? null,
    identifier: input.identifier ?? null,
    journal: input.journal ?? null,
    volume: input.volume ?? null,
    issue: input.issue ?? null,
    pages: input.pages ?? null,
  };
}

export async function findOrCreateProject(
  supabase: SupabaseClient,
  name: string,
): Promise<string> {
  const find = () =>
    supabase.from("projects").select("id").eq("name", name).maybeSingle();

  const { data: found } = await find();
  if (found) return found.id;

  const { data, error } = await supabase
    .from("projects")
    .insert({ name })
    .select("id")
    .single();
  if (!error) return data.id;

  // 동시 요청으로 이미 만들어진 경우(unique 위반)에는 다시 조회한다
  if (error.code === "23505") {
    const { data: again } = await find();
    if (again) return again.id;
  }
  throw error;
}

// 로그인한 사용자 확인. 실패하면 401 Response를 돌려준다.
export async function getAuthedClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      response: Response.json({ error: "로그인이 필요합니다." }, { status: 401 }),
    } as const;
  }
  return { supabase, user } as const;
}
