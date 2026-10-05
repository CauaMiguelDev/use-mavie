"use client";

// Estado do painel vindo do Supabase. Cada ação aplica uma regra pura (admin-logic) e salva
// catálogo + pedidos juntos via save_state (tudo ou nada, com controle de versão entre aparelhos).
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import { catalog as published, type Catalog } from "../products";
import { supabase, supabaseReady } from "../supabase";
import { Logo } from "../logo";
import { appendLog, initialState, uid, type AdminState } from "./admin-logic";
import { Field, inputCls } from "./ui";
import { PasswordGate, useAttemptLimit } from "./lock";
import { formatWait } from "./lock-logic";

type Ctx = {
  state: AdminState;
  // Aplica uma regra; erro de validação aparece na tela e nada muda. Retorna se a regra passou.
  run: (fn: (s: AdminState) => AdminState, ok?: string) => boolean;
  saving: boolean;
  email: string;
  local: boolean; // true = sem banco: dados só neste navegador
  signOut: () => void;
  uploadImage: (dataUrl: string) => Promise<string>;
  restore: (s: AdminState) => void;
};
const AdminContext = createContext<Ctx | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin fora do AdminProvider");
  return ctx;
}

const Center = ({ children }: { children: ReactNode }) => (
  <div className="relative grid min-h-[100dvh] place-items-center px-4">
    <div aria-hidden className="bg-grad-soft pointer-events-none absolute inset-0" />
    <div className="relative w-full max-w-sm">{children}</div>
  </div>
);
const Spinner = () => <div className="mx-auto size-10 animate-spin rounded-full border-2 border-rose-soft border-t-rose" aria-label="Carregando" />;

export function AdminProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    if (!supabaseReady) return;
    const auth = supabase().auth;
    auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!supabaseReady) return <PasswordGate><LocalLoaded>{children}</LocalLoaded></PasswordGate>;
  if (session === undefined) return <Center><Spinner /></Center>;
  if (recovery && session) return <NewPassword onDone={() => setRecovery(false)} />;
  if (!session) return <Login />;
  return <Loaded session={session}>{children}</Loaded>;
}

function Loaded({ session, children }: { session: Session; children: ReactNode }) {
  const [state, setState] = useState<AdminState | null>(null);
  const [denied, setDenied] = useState(false);
  const [saving, setSaving] = useState(false);
  const stateRef = useRef<AdminState | null>(null);
  const version = useRef(0);
  const queue = useRef(Promise.resolve());
  const pending = useRef(0);
  const db = supabase();

  const load = useCallback(async () => {
    const [store, admin] = await Promise.all([
      db.from("store_state").select("catalog, version").eq("id", 1).maybeSingle(),
      db.from("admin_state").select("data").eq("id", 1).maybeSingle(),
    ]);
    if (store.error || admin.error) throw store.error ?? admin.error;
    if (!admin.data || !store.data) return setDenied(true); // RLS esconde a linha de quem não é admin
    version.current = store.data.version;
    const d = admin.data.data as Omit<AdminState, "catalog">;
    const next: AdminState = { catalog: store.data.catalog as Catalog, orders: d.orders ?? [], movements: d.movements ?? [], nextOrder: d.nextOrder ?? 1001, log: d.log ?? [] };
    stateRef.current = next;
    setState(next);
  }, [db]);

  useEffect(() => {
    load().catch(() => toast.error("Não consegui carregar os dados. Verifique a internet e recarregue a página."));
    // Outro aparelho salvou: recarrega (se não houver salvamento nosso em andamento).
    const channel = db
      .channel("admin-catalog")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "store_state" }, (p) => {
        const v = (p.new as { version?: number }).version ?? 0;
        if (v > version.current && pending.current === 0) load().catch(() => {});
      })
      .subscribe();
    return () => { db.removeChannel(channel); };
  }, [db, load]);

  const run = useCallback(
    (fn: (s: AdminState) => AdminState, ok?: string) => {
      const prev = stateRef.current;
      if (!prev) return false;
      let next: AdminState;
      try {
        next = fn(prev);
        if (ok) next = appendLog(next, ok, session.user.email ?? "");
      } catch (e) {
        toast.error((e as Error).message);
        return false;
      }
      stateRef.current = next;
      setState(next); // aparece na hora; o banco confirma em seguida
      pending.current++;
      setSaving(true);
      // Salvamentos em fila: cada um usa a versão confirmada pelo anterior.
      queue.current = queue.current.then(async () => {
        const { data, error } = await db.rpc("save_state", {
          p_catalog: { ...next.catalog, updatedAt: new Date().toISOString() },
          p_admin: { orders: next.orders, movements: next.movements, nextOrder: next.nextOrder, log: next.log ?? [] },
          p_version: version.current,
        });
        if (error) {
          toast.error(error.code === "40001" ? "Outro aparelho salvou antes. Recarreguei os dados; confira e refaça a ação." : "Não consegui salvar. Verifique a internet e tente de novo.");
          await load().catch(() => { stateRef.current = prev; setState(prev); });
        } else {
          version.current = data as number;
          if (ok) toast.success(ok);
        }
        pending.current--;
        if (!pending.current) setSaving(false);
      });
      return true;
    },
    [db, load],
  );

  const uploadImage = useCallback(
    async (dataUrl: string) => {
      const blob = await (await fetch(dataUrl)).blob();
      const path = `${new Date().toISOString().slice(0, 10)}-${uid()}.jpg`;
      const { error } = await db.storage.from("produtos").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (error) throw new Error("Não consegui enviar a foto. Tente de novo.");
      return db.storage.from("produtos").getPublicUrl(path).data.publicUrl;
    },
    [db],
  );

  const signOut = useCallback(() => { db.auth.signOut(); }, [db]);
  const email = session.user.email ?? "";

  if (denied)
    return (
      <Center>
        <div className="box p-6 text-center">
          <p className="font-display text-3xl">Sem acesso</p>
          <p className="mt-2 text-sm text-muted-foreground">O e-mail {email} não está na lista de administradores da loja.</p>
          <button onClick={signOut} className="btn btn-fill mx-auto mt-5 flex h-10 items-center gap-2 rounded-full px-5 text-sm"><LogOut className="size-4" /> Sair</button>
        </div>
      </Center>
    );
  if (!state) return <Center><Spinner /></Center>;

  const restore = (s: AdminState) => run(() => s, "Backup restaurado");
  return <AdminContext.Provider value={{ state, run, saving, email, local: false, signOut, uploadImage, restore }}>{children}</AdminContext.Provider>;
}

// ---------- Modo local (enquanto o banco não está conectado) ----------
// IndexedDB guarda tudo, inclusive fotos; pedimos ao navegador armazenamento persistente
// para ele não apagar sozinho. Backup + Restaurar levam os dados para o banco depois.
const IDB_NAME = "mavie-admin";
const IDB_STORE = "kv";
function idb<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest) {
  return new Promise<T>((resolve, reject) => {
    const open = indexedDB.open(IDB_NAME, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(IDB_STORE);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const req = run(open.result.transaction(IDB_STORE, mode).objectStore(IDB_STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    };
  });
}

function LocalLoaded({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AdminState | null>(null);
  const [failed, setFailed] = useState(false);
  const stateRef = useRef<AdminState | null>(null);

  useEffect(() => {
    navigator.storage?.persist?.().catch(() => {});
    idb<AdminState | undefined>("readonly", (s) => s.get("state"))
      .then((saved) => {
        const next = saved ?? initialState(published);
        stateRef.current = next;
        setState(next);
      })
      .catch(() => {
        setFailed(true);
        stateRef.current = initialState(published);
        setState(stateRef.current);
      });
  }, []);

  const run = useCallback((fn: (s: AdminState) => AdminState, ok?: string) => {
    const prev = stateRef.current;
    if (!prev) return false;
    let next: AdminState;
    try {
      next = fn(prev);
      if (ok) next = appendLog(next, ok, "este navegador");
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
    stateRef.current = next;
    setState(next);
    // Grava na hora (sem atraso), para não perder nada se a aba fechar.
    idb("readwrite", (s) => s.put(next, "state")).then(
      () => ok && toast.success(ok),
      () => toast.error("Não consegui salvar neste navegador. Faça um backup agora."),
    );
    return true;
  }, []);

  if (!state) return <Center><Spinner /></Center>;
  const value: Ctx = {
    state, run, saving: false, email: "Modo local", local: true, signOut: () => {},
    uploadImage: async (dataUrl) => dataUrl, // a foto fica junto dos dados
    restore: (s) => run(() => s, "Backup restaurado"),
  };
  return (
    <AdminContext.Provider value={value}>
      {failed && (
        <p className="bg-[#fde2e2] px-4 py-2 text-center text-sm text-[#a1262b]">
          Este navegador bloqueou o armazenamento (janela anônima?). Nada será salvo: abra o painel numa janela normal.
        </p>
      )}
      {children}
    </AdminContext.Provider>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const limit = useAttemptLimit("mavie-login-lock"); // o Supabase também limita no servidor

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (limit.wait) return;
    setBusy(true);
    setError("");
    const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (!error) return limit.success();
    if (error.message.includes("Invalid login")) {
      limit.fail();
      setError(limit.left - 1 > 0 ? `E-mail ou senha incorretos. Restam ${limit.left - 1} tentativas.` : "E-mail ou senha incorretos.");
    } else setError("Não consegui entrar. Tente de novo.");
  }

  async function forgot() {
    if (!email.trim()) return setError("Digite seu e-mail para receber o link de nova senha.");
    const { error } = await supabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: location.href.split("#")[0] });
    if (error) setError("Não consegui enviar o e-mail. Tente de novo em alguns minutos.");
    else toast.success("Enviamos um link para criar uma nova senha.");
  }

  return (
    <Center>
      <form onSubmit={submit} className="box space-y-5 p-6" noValidate>
        <div className="text-center">
          <Logo className="mx-auto h-7" />
          <p className="mt-1 text-sm text-muted-foreground">Entre para acessar o painel da loja.</p>
        </div>
        <Field label="E-mail" htmlFor="login-email">
          <input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Senha" htmlFor="login-pass" error={error}>
          <input id="login-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!error} className={inputCls} />
        </Field>
        {limit.wait > 0 && (
          <p role="alert" className="rounded-2xl bg-[#fde2e2] p-3 text-center text-sm text-[#a1262b]">
            Muitas tentativas erradas. Tente de novo em <strong className="tabular-nums">{formatWait(limit.wait)}</strong>.
          </p>
        )}
        <button disabled={busy || !email || !password || limit.wait > 0} className="btn btn-primary btn-shine flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium">
          {busy && <Loader2 className="size-4 animate-spin" />} Entrar
        </button>
        <button type="button" onClick={forgot} className="mx-auto block text-sm text-muted-foreground hover:text-rose">Esqueci a senha</button>
      </form>
    </Center>
  );
}

function NewPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("Use pelo menos 8 caracteres.");
    const { error } = await supabase().auth.updateUser({ password });
    if (error) return setError("Não consegui trocar a senha. Peça um novo link.");
    toast.success("Senha atualizada");
    onDone();
  }
  return (
    <Center>
      <form onSubmit={submit} className="box space-y-5 p-6" noValidate>
        <p className="text-center font-display text-3xl">Nova senha</p>
        <Field label="Nova senha" htmlFor="new-pass" error={error} help="Pelo menos 8 caracteres.">
          <input id="new-pass" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
        </Field>
        <button className="btn btn-primary btn-shine h-11 w-full rounded-full text-sm font-medium">Salvar senha</button>
      </form>
    </Center>
  );
}

export async function readBackup(file: File): Promise<AdminState> {
  const data = JSON.parse(await file.text());
  const s = data?.state as AdminState | undefined;
  if (data?.type !== "mavie-backup" || !s?.catalog?.products || !Array.isArray(s.orders) || !Array.isArray(s.movements))
    throw new Error("Este arquivo não é um backup do painel.");
  return s;
}

export function exportBackup(s: AdminState) {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ type: "mavie-backup", version: 1, state: s })], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `mavie-backup-${new Date().toISOString().slice(0, 10)}.json` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
