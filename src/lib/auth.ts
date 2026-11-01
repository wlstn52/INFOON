import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { resetMaterials } from "@/lib/materials";

export type Session = {
  id: string;
  email: string;
  name: string;
};

export type AuthState = {
  loading: boolean;
  user: Session | null;
};

const INITIAL_STATE: AuthState = { loading: true, user: null };

let state = INITIAL_STATE;
let started = false;
let lastUserId: string | null | undefined;
const listeners = new Set<() => void>();

function client() {
  return createClient();
}

function setState(next: AuthState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function start() {
  client().auth.onAuthStateChange((_event, session) => {
    const u = session?.user;
    const user = u
      ? {
          id: u.id,
          email: u.email ?? "",
          name: (u.user_metadata?.name as string | undefined) || u.email || "",
        }
      : null;
    setState({ loading: false, user });

    // 다른 사용자로 바뀌었을 때만 자료 목록을 초기화한다 (토큰 갱신 등은 무시)
    const id = user?.id ?? null;
    if (lastUserId !== undefined && lastUserId !== id) resetMaterials();
    lastUserId = id;
  });
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    start();
  }
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): AuthState {
  return state;
}

export function getServerSnapshot(): AuthState {
  return INITIAL_STATE;
}

function messageFor(error: AuthError) {
  switch (error.code) {
    case "invalid_credentials":
      return "이메일 또는 비밀번호가 일치하지 않습니다.";
    case "email_not_confirmed":
      return "이메일 인증이 아직 완료되지 않았습니다. 메일함을 확인해 주세요.";
    case "user_already_exists":
      return "이미 가입된 이메일입니다.";
    case "weak_password":
      return "비밀번호가 너무 약합니다. 더 길고 복잡하게 입력해 주세요.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
    default: {
      console.error("Supabase auth error", error);
      // 서버에 연결하지 못한 경우 (프로젝트 일시정지, 네트워크 문제 등)
      if (error.name === "AuthRetryableFetchError" || !error.status) {
        return "인증 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.";
      }
      return `요청에 실패했습니다. (${error.code ?? error.status})`;
    }
  }
}

// 이메일 인증이 켜져 있으면 가입 직후 세션이 없으므로 needsConfirmation이 true가 된다
export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await client().auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${location.origin}/auth/callback`,
    },
  });
  if (error) throw new Error(messageFor(error));
  return { needsConfirmation: !data.session };
}

export async function signIn(email: string, password: string) {
  const { error } = await client().auth.signInWithPassword({ email, password });
  if (error) throw new Error(messageFor(error));
}

export async function signOut() {
  await client().auth.signOut();
}
