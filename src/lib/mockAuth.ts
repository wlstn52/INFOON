// Temporary client-side auth until Supabase is wired in (6~8차시).
// Accounts and the current session both live in localStorage.

export type StoredUser = {
  id: string;
  password: string;
  name: string;
};

export type Session = {
  id: string;
  name: string;
};

const USERS_KEY = "infoon_users";
const SESSION_KEY = "infoon_session";

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function getServerSnapshot(): string | null {
  return null;
}

function readUsers(): StoredUser[] {
  const raw = localStorage.getItem(USERS_KEY);
  return raw ? (JSON.parse(raw) as StoredUser[]) : [];
}

function writeUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function setSession(user: StoredUser) {
  const session: Session = { id: user.id, name: user.name };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  emitChange();
}

export function signup(id: string, password: string, name: string) {
  const users = readUsers();
  if (users.some((u) => u.id === id)) {
    throw new Error("이미 사용 중인 아이디입니다.");
  }
  const user = { id, password, name };
  users.push(user);
  writeUsers(users);
  setSession(user);
}

export function login(id: string, password: string) {
  const user = readUsers().find((u) => u.id === id);
  if (!user || user.password !== password) {
    throw new Error("아이디 또는 비밀번호가 일치하지 않습니다.");
  }
  setSession(user);
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  emitChange();
}
