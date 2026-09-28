// Temporary client-side material store until Supabase is wired in (6~8차시).

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
  year?: string;  // 발표 년도
  language?: string; // 언어
  url?: string; // url
  access_date?: string; // 원문 접근일
  organization?: string; // 기관
  identifier?: string; // 식별자 ex) DOI, ISBN
};

const MATERIALS_KEY = "infoon_materials";

const SAMPLE_MATERIALS: Material[] = [
  {
    id: "m1",
    projectName: "졸업 논문",
    title: "딥러닝 기반 자연어 처리 최신 동향",
    type: "논문",
    location: "Google Drive/논문/2026",
    importance: 5,
    description: "최신 트랜스포머 구조를 정리한 리뷰 논문",
    createdAt: "2026-03-02",
  },
  {
    id: "m2",
    projectName: "졸업 논문",
    title: "국내 교육 데이터 활용 사례 보고서",
    type: "보고서",
    location: "로컬/문서/보고서",
    importance: 3,
    description: "공공 교육 데이터셋을 활용한 국내 사례 정리",
    createdAt: "2026-02-14",
  },
  {
    id: "m3",
    projectName: "동아리 발표 자료",
    title: "생성형 AI 교육 활용 기사 모음",
    type: "기사",
    location: "노션/자료실",
    importance: 2,
    description: "생성형 AI를 수업에 활용한 해외 사례 기사",
    createdAt: "2026-01-20",
  },
  {
    id: "m4",
    projectName: "동아리 발표 자료",
    title: "인용 스타일 가이드",
    type: "단행본",
    location: "책장/참고서적",
    importance: 4,
    description: "APA/MLA 인용 형식을 정리한 참고서",
    createdAt: "2026-03-10",
  },
];

function seedIfEmpty() {
  if (localStorage.getItem(MATERIALS_KEY) === null) {
    localStorage.setItem(MATERIALS_KEY, JSON.stringify(SAMPLE_MATERIALS));
  }
}

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): string {
  seedIfEmpty();
  return localStorage.getItem(MATERIALS_KEY) ?? "[]";
}

export function getServerSnapshot(): string {
  return "[]";
}

export function addMaterial(material: Omit<Material, "id" | "createdAt">) {
  const materials = JSON.parse(getSnapshot()) as Material[];
  materials.push({
    ...material,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString().slice(0, 10),
  });
  localStorage.setItem(MATERIALS_KEY, JSON.stringify(materials));
  emitChange();
}
