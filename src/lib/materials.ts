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

export type MaterialsState = {
  status: "loading" | "ready" | "unauthenticated" | "error";
  materials: Material[];
};

const INITIAL_STATE: MaterialsState = { status: "loading", materials: [] };

let state = INITIAL_STATE;
let started = false;
const listeners = new Set<() => void>();

function setState(next: MaterialsState) {
  state = next;
  listeners.forEach((listener) => listener());
}

async function load() {
  try {
    const res = await fetch("/api/materials");
    if (res.status === 401) {
      setState({ status: "unauthenticated", materials: [] });
      return;
    }
    if (!res.ok) throw new Error();
    setState({ status: "ready", materials: await res.json() });
  } catch {
    setState({ status: "error", materials: [] });
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

async function send(url: string, method: string, body?: MaterialInput) {
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
  });
}
