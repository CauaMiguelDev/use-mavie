"use client";

// Estado do painel vindo do Supabase. Cada ação aplica uma regra pura (admin-logic) e salva
// catálogo + pedidos juntos via save_state (tudo ou nada, com controle de versão entre aparelhos).
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import type { Catalog } from "../products";
import { supabase, supabaseReady } from "../supabase";
import { uid, type AdminState } from "./admin-logic";
import { Field, inputCls } from "./ui";

type Ctx = {
  state: AdminState;
  // Aplica uma regra; erro de validação aparece na tela e nada muda. Retorna se a regra passou.
  run: (fn: (s: AdminState) => AdminState, ok?: string) => boolean;
  saving: boolean;
  email: string;
  signOut: () => void;
  uploadImage: (dataUrl: string) => Promise<string>;
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

  if (!supabaseReady)
    return (
      <Center>
        <div className="box p-6 text-center">
          <p className="font-display text-3xl">Painel em configuração</p>
          <p className="mt-2 text-sm text-muted-foreground">O banco de dados da loja ainda não foi conectado.</p>
        </div>
      </Center>
    );
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
    const next: AdminState = { catalog: store.data.catalog as Catalog, orders: d.orders ?? [], movements: d.movements ?? [], nextOrder: d.nextOrder ?? 1001 };
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
          p_admin: { orders: next.orders, movements: next.movements, nextOrder: next.nextOrder },
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

  return <AdminContext.Provider value={{ state, run, saving, email, signOut, uploadImage }}>{children}</AdminContext.Provider>;
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.message.includes("Invalid login") ? "E-mail ou senha incorretos." : "Não consegui entrar. Tente de novo.");
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
          <p className="font-display text-3xl font-semibold tracking-[0.08em]">USEMAVIÊ</p>
          <p className="mt-1 text-sm text-muted-foreground">Entre para acessar o painel da loja.</p>
        </div>
        <Field label="E-mail" htmlFor="login-email">
          <input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Senha" htmlFor="login-pass" error={error}>
          <input id="login-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!error} className={inputCls} />
        </Field>
        <button disabled={busy || !email || !password} className="btn btn-primary btn-shine flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium">
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

export function exportBackup(s: AdminState) {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ type: "mavie-backup", version: 1, state: s })], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `mavie-backup-${new Date().toISOString().slice(0, 10)}.json` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
