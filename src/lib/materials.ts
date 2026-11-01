export type Author = {
  familyName: string; // 성
  middleName?: string; // 미들 네임
  givenName: string; // 이름
};

export type Material = {
  id: string;
  projectName: string;
  title: string;
  type: string;
  location: string;
  importance: number; // 1 (낮음) ~ 5 (높음)
  description: string;
  createdAt: string; // YYYY-MM-DD
  // 인용 생성을 위한 세부 사항 - 필요한 자료에만 선택적으로 입력
  authors?: Author[]; // 저자 목록
  publisher?: string; // 출판사
  publish_date?: string; // 발표 날짜
  year?: string; // 발표 년도
  language?: string; // 언어
  url?: string; // url
  access_date?: string; // 원문 접근일
  organization?: string; // 기관
  identifier?: string; // 식별자 ex) DOI, ISBN
  journal?: string; // 학술지명
  volume?: string; // 권
  issue?: string; // 호
  pages?: string; // 쪽 ex) 436-444
};

export type MaterialInput = Omit<Material, "id" | "createdAt">;

export type RelationType = "cites" | "related";

export type MaterialRelation = {
  id: string;
  sourceId: string;
  targetId: string;
  relation: RelationType;
};

export function relationLabel(relation: RelationType, outgoing: boolean) {
  if (relation === "related") return "관련";
  return outgoing ? "인용함" : "인용됨";
}

export type MaterialsState = {
  status: "loading" | "ready" | "unauthenticated" | "error";
  materials: Material[];
  relations: MaterialRelation[];
};

const INITIAL_STATE: MaterialsState = {
  status: "loading",
  materials: [],
  relations: [],
};

let state = INITIAL_STATE;
let started = false;
const listeners = new Set<() => void>();

function setState(next: MaterialsState) {
  state = next;
  listeners.forEach((listener) => listener());
}

async function load() {
  try {
    const [materials, relations] = await Promise.all([
      fetch("/api/materials"),
      fetch("/api/relations"),
    ]);
    if (materials.status === 401 || relations.status === 401) {
      setState({ status: "unauthenticated", materials: [], relations: [] });
      return;
    }
    if (!materials.ok || !relations.ok) throw new Error();
    setState({
      status: "ready",
      materials: await materials.json(),
      relations: await relations.json(),
    });
  } catch {
    setState({ status: "error", materials: [], relations: [] });
  }
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    load();
  }
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): MaterialsState {
  return state;
}

export function getServerSnapshot(): MaterialsState {
  return INITIAL_STATE;
}

// 로그인/로그아웃으로 사용자가 바뀌었을 때 목록을 다시 불러온다
export function resetMaterials() {
  setState(INITIAL_STATE);
  load();
}

// 화면을 비우지 않고 다시 불러온다 (프로젝트 이름 변경/삭제 후)
export function refreshMaterials() {
  return load();
}

async function send(url: string, method: string, body?: object) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "요청에 실패했습니다.");
  }
  return res;
}

export async function addMaterial(input: MaterialInput) {
  const res = await send("/api/materials", "POST", input);
  const created: Material = await res.json();
  setState({ ...state, materials: [created, ...state.materials] });
}

export async function updateMaterial(id: string, input: MaterialInput) {
  const res = await send(`/api/materials/${id}`, "PUT", input);
  const updated: Material = await res.json();
  setState({
    ...state,
    materials: state.materials.map((m) => (m.id === id ? updated : m)),
  });
}

export async function deleteMaterial(id: string) {
  await send(`/api/materials/${id}`, "DELETE");
  setState({
    ...state,
    materials: state.materials.filter((m) => m.id !== id),
    relations: state.relations.filter(
      (r) => r.sourceId !== id && r.targetId !== id,
    ),
  });
}

export async function addRelation(
  sourceId: string,
  targetId: string,
  relation: RelationType,
) {
  const res = await send("/api/relations", "POST", {
    sourceId,
    targetId,
    relation,
  });
  const created: MaterialRelation = await res.json();
  setState({ ...state, relations: [...state.relations, created] });
}

export async function deleteRelation(id: string) {
  await send(`/api/relations/${id}`, "DELETE");
  setState({
    ...state,
    relations: state.relations.filter((r) => r.id !== id),
  });
}
