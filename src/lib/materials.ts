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
  tags?: string[]; // 태그
};

export type FavoriteAuthor = { key: string; label: string };

const HANGUL = /[ㄱ-ㆎ가-힣]/;

// 같은 저자인지 비교하는 키 (대소문자, 한글 조합 방식 차이를 무시)
export function authorKey(a: Author) {
  return [a.familyName, a.middleName, a.givenName]
    .filter(Boolean)
    .join(" ")
    .normalize("NFC")
    .toLowerCase();
}

// 화면 표시용 이름: 한글은 "김진수", 영문은 "Yann LeCun"
export function authorLabel(a: Author) {
  if (HANGUL.test(a.familyName + a.givenName)) {
    return [a.familyName, a.middleName, a.givenName].filter(Boolean).join("");
  }
  return [a.givenName, a.middleName, a.familyName].filter(Boolean).join(" ");
}

export type MaterialInput = Omit<Material, "id" | "createdAt">;

export type RelationType = "cites" | "related";

export type MaterialRelation = {
  id: string;
  sourceId: string;
  targetId: string;
  relation: RelationType;
};

export const IMPORTANCE_LABELS: Record<number, string> = {
  1: "참고만",
  2: "낮음",
  3: "보통",
  4: "중요",
  5: "핵심",
};

export function importanceText(level: number) {
  return `${level} · ${IMPORTANCE_LABELS[level] ?? ""}`;
}

// 등록 폼에서 "기존 자료 보기"를 누르면 목록이 해당 자료로 이동한다
const SHOW_EVENT = "infoon:show-material";

export function showMaterial(id: string) {
  window.dispatchEvent(new CustomEvent(SHOW_EVENT, { detail: id }));
}

export function onShowMaterial(handler: (id: string) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<string>).detail);
  window.addEventListener(SHOW_EVENT, listener);
  return () => window.removeEventListener(SHOW_EVENT, listener);
}

export type MaterialsState = {
  status: "loading" | "ready" | "unauthenticated" | "error";
  materials: Material[];
  relations: MaterialRelation[];
  favoriteAuthors: FavoriteAuthor[];
};

const INITIAL_STATE: MaterialsState = {
  status: "loading",
  materials: [],
  relations: [],
  favoriteAuthors: [],
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
    const responses = await Promise.all([
      fetch("/api/materials"),
      fetch("/api/relations"),
      fetch("/api/profile"),
    ]);
    if (responses.some((r) => r.status === 401)) {
      setState({ ...INITIAL_STATE, status: "unauthenticated" });
      return;
    }
    if (responses.some((r) => !r.ok)) throw new Error();
    const [materials, relations, profile] = await Promise.all(
      responses.map((r) => r.json()),
    );
    setState({
      status: "ready",
      materials,
      relations,
      favoriteAuthors: profile.favoriteAuthors,
    });
  } catch {
    setState({ ...INITIAL_STATE, status: "error" });
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

export async function setFavoriteAuthors(favoriteAuthors: FavoriteAuthor[]) {
  const res = await send("/api/profile", "PUT", { favoriteAuthors });
  const data: { favoriteAuthors: FavoriteAuthor[] } = await res.json();
  setState({ ...state, favoriteAuthors: data.favoriteAuthors });
}
