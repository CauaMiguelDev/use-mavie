"use client";

// Senha do painel no modo local. Os dados ficam só neste aparelho; a senha impede que outra pessoa
// que use o mesmo navegador abra o painel. Limite de tentativas com bloqueio progressivo.
import { useEffect, useState, type ReactNode } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { attemptsLeft, formatWait, freshLock, hashPassword, lockedFor, registerFail, registerSuccess, type LockState } from "./lock-logic";
import { Field, inputCls } from "./ui";
import { Logo } from "../logo";

const PASS_KEY = "mavie-lock";
const STATE_KEY = "mavie-lock-state";
const SESSION_KEY = "mavie-unlocked";

const read = <T,>(storage: Storage, key: string, fallback: T): T => {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (storage: Storage, key: string, value: unknown) => {
  try { storage.setItem(key, JSON.stringify(value)); } catch {}
};

// Trava de novo (botão "Bloquear" do painel).
export function lockPanel() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  location.reload();
}

// Contador de tentativas compartilhado (também usado no login do Supabase).
export function useAttemptLimit(key = STATE_KEY) {
  const [state, setState] = useState<LockState>(freshLock);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => setState(read(localStorage, key, freshLock())), [key]);
  const wait = lockedFor(state, now);
  useEffect(() => {
    if (!wait) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [wait]);
  const save = (s: LockState) => { setState(s); write(localStorage, key, s); setNow(Date.now()); };
  return {
    wait,
    left: attemptsLeft(state),
    fail: () => save(registerFail(read(localStorage, key, state), Date.now())),
    success: () => save(registerSuccess(state)),
  };
}

export function PasswordGate({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"loading" | "create" | "unlock" | "open">("loading");
  useEffect(() => {
    if (read(sessionStorage, SESSION_KEY, false)) setMode("open");
    else setMode(read<{ hash?: string } | null>(localStorage, PASS_KEY, null)?.hash ? "unlock" : "create");
  }, []);

  if (mode === "open") return <>{children}</>;
  if (mode === "loading") return null;
  return (
    <div className="relative grid min-h-[100dvh] place-items-center px-4">
      <div aria-hidden className="bg-grad-soft pointer-events-none absolute inset-0" />
      <div className="relative w-full max-w-sm">
        {mode === "create" ? <Create onDone={() => setMode("open")} /> : <Unlock onDone={() => setMode("open")} />}
      </div>
    </div>
  );
}

function Header({ text }: { text: string }) {
  return (
    <div className="text-center">
      <span className="bg-grad mx-auto grid size-14 place-items-center rounded-2xl text-white"><LockKeyhole className="size-6" strokeWidth={1.5} /></span>
      <Logo className="mx-auto mt-5 h-7" />
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function PasswordInput({ id, value, onChange, invalid, autoComplete, disabled }: {
  id: string; value: string; onChange: (v: string) => void; invalid?: boolean; autoComplete: string; disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        className={`${inputCls} pr-12`}
      />
      <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Esconder senha" : "Mostrar senha"} className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function Create({ onDone }: { onDone: () => void }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (a.length < 6) return setError("Use pelo menos 6 caracteres.");
    if (a !== b) return setError("As senhas não são iguais.");
    setBusy(true);
    write(localStorage, PASS_KEY, await hashPassword(a));
    write(sessionStorage, SESSION_KEY, true);
    onDone();
  }
  return (
    <form onSubmit={submit} className="box space-y-5 p-6" noValidate>
      <Header text="Crie a senha do painel. Ela será pedida sempre que o navegador for aberto." />
      <Field label="Nova senha" htmlFor="pw-new" help="Pelo menos 6 caracteres. Anote em lugar seguro.">
        <PasswordInput id="pw-new" value={a} onChange={setA} autoComplete="new-password" />
      </Field>
      <Field label="Repita a senha" htmlFor="pw-repeat" error={error}>
        <PasswordInput id="pw-repeat" value={b} onChange={setB} invalid={!!error} autoComplete="new-password" />
      </Field>
      <button disabled={busy} className="btn btn-primary btn-shine flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium">
        {busy && <Loader2 className="size-4 animate-spin" />} Criar senha e entrar
      </button>
    </form>
  );
}

function Unlock({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const limit = useAttemptLimit();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (limit.wait || !password) return;
    setBusy(true);
    const saved = read<{ salt: string; hash: string } | null>(localStorage, PASS_KEY, null);
    const ok = saved && (await hashPassword(password, saved.salt)).hash === saved.hash;
    setBusy(false);
    if (ok) {
      limit.success();
      write(sessionStorage, SESSION_KEY, true);
      onDone();
    } else {
      limit.fail();
      setPassword("");
      setError(limit.left - 1 > 0 ? `Senha incorreta. Restam ${limit.left - 1} ${limit.left - 1 === 1 ? "tentativa" : "tentativas"}.` : "Senha incorreta.");
    }
  }

  function reset() {
    const ok = confirm(
      "Sem a senha não dá para abrir este painel.\n\nPara criar outra senha, TODOS os dados do painel neste navegador (produtos, pedidos, histórico) serão apagados. Se você tem um backup, poderá restaurar depois.\n\nApagar e começar de novo?",
    );
    if (!ok) return;
    try {
      localStorage.removeItem(PASS_KEY);
      localStorage.removeItem(STATE_KEY);
      indexedDB.deleteDatabase("mavie-admin");
    } catch {}
    location.reload();
  }

  return (
    <form onSubmit={submit} className="box space-y-5 p-6" noValidate>
      <Header text="Painel restrito. Digite a senha para entrar." />
      {limit.wait > 0 ? (
        <p role="alert" className="rounded-2xl bg-[#fde2e2] p-4 text-center text-sm text-[#a1262b]">
          Muitas tentativas erradas. Tente de novo em <strong className="tabular-nums">{formatWait(limit.wait)}</strong>.
        </p>
      ) : (
        <Field label="Senha" htmlFor="pw" error={error}>
          <PasswordInput id="pw" value={password} onChange={(v) => { setPassword(v); setError(""); }} invalid={!!error} autoComplete="current-password" />
        </Field>
      )}
      <button disabled={busy || limit.wait > 0 || !password} className="btn btn-primary btn-shine flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium">
        {busy && <Loader2 className="size-4 animate-spin" />} Entrar
      </button>
      <button type="button" onClick={reset} className="mx-auto block text-xs text-muted-foreground hover:text-rose">Esqueci a senha</button>
    </form>
  );
}
