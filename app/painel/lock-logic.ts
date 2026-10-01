// Limite de tentativas de senha (puro, testável). A cada 5 erros o painel trava;
// cada novo bloqueio dobra o tempo: 5, 10, 20, 40 min... (teto de 24 h).
export type LockState = { fails: number; level: number; lockedUntil: number };

export const MAX_FAILS = 5;
const BASE_MS = 5 * 60 * 1000;
const CAP_MS = 24 * 60 * 60 * 1000;

export const freshLock = (): LockState => ({ fails: 0, level: 0, lockedUntil: 0 });
export const lockedFor = (s: LockState, now: number) => Math.max(0, s.lockedUntil - now);
export const attemptsLeft = (s: LockState) => MAX_FAILS - s.fails;

export function registerFail(s: LockState, now: number): LockState {
  if (lockedFor(s, now) > 0) return s; // tentativa durante o bloqueio não conta nem reduz a espera
  const fails = s.fails + 1;
  if (fails < MAX_FAILS) return { ...s, fails };
  return { fails: 0, level: s.level + 1, lockedUntil: now + Math.min(BASE_MS * 2 ** s.level, CAP_MS) };
}

// Acerto zera os erros, mas mantém o nível: quem já foi bloqueado volta a ter espera maior se errar de novo em série.
export const registerSuccess = (s: LockState): LockState => ({ fails: 0, level: Math.max(0, s.level - 1), lockedUntil: 0 });

export function formatWait(ms: number) {
  const m = Math.floor(ms / 60000);
  const sec = Math.ceil((ms % 60000) / 1000);
  return m > 0 ? `${m} min ${String(sec).padStart(2, "0")} s` : `${sec} s`;
}

// Hash da senha (PBKDF2-SHA256). A senha em si nunca é guardada.
export async function hashPassword(password: string, saltB64?: string) {
  const salt = saltB64 ? Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0)) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 210_000 }, key, 256);
  const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
  return { salt: b64(salt), hash: b64(new Uint8Array(bits)) };
}
