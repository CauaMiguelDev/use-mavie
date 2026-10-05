"use client";

// Painel da loja: menu lateral com seções. Dados no Supabase (admin-store), ligados à loja ao vivo.
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle, Images, Boxes, Check, ClipboardList, DatabaseBackup, FileUp, LayoutDashboard, Loader2, LogOut, ScrollText, Shirt, Store, Tags, TrendingUp, Wallet, type LucideIcon,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { BASE } from "../products";
import { Logo } from "../logo";
import { AdminProvider, exportBackup, readBackup, useAdmin } from "./admin-store";
import { lockPanel } from "./lock";
import { ease } from "./ui";
import Overview from "./sections/overview";
import Products from "./sections/products";
import Categories from "./sections/categories";
import Stock from "./sections/stock";
import Orders from "./sections/orders";
import Payments from "./sections/payments";
import Sales from "./sections/sales";
import History from "./sections/history";
import Showcase from "./sections/showcase";

const NAV: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "inicio", label: "Visão geral", icon: LayoutDashboard },
  { id: "pedidos", label: "Pedidos", icon: ClipboardList },
  { id: "pagamentos", label: "Pagamentos", icon: Wallet },
  { id: "vendas", label: "Vendas", icon: TrendingUp },
  { id: "produtos", label: "Produtos", icon: Shirt },
  { id: "vitrine", label: "Vitrine", icon: Images },
  { id: "estoque", label: "Estoque", icon: Boxes },
  { id: "categorias", label: "Categorias", icon: Tags },
  { id: "historico", label: "Histórico", icon: ScrollText },
];

export default function Dashboard() {
  return (
    <AdminProvider>
      <Shell />
      <Toaster position="bottom-center" toastOptions={{ className: "glass", style: { borderRadius: 999, fontFamily: "var(--font-sans)" } }} />
    </AdminProvider>
  );
}

function Shell() {
  const reduce = useReducedMotion();
  const [section, setSection] = useState("inicio");

  // Seção na URL (#pedidos), para voltar/avançar e links diretos.
  useEffect(() => {
    const read = () => {
      const id = location.hash.slice(1);
      setSection(NAV.some((n) => n.id === id) ? id : "inicio");
    };
    read();
    addEventListener("hashchange", read);
    return () => removeEventListener("hashchange", read);
  }, []);
  const go = (id: string) => {
    location.hash = id;
    scrollTo({ top: 0 });
  };

  const views: Record<string, React.ReactNode> = {
    inicio: <Overview go={go} />,
    pedidos: <Orders />,
    pagamentos: <Payments />,
    vendas: <Sales />,
    produtos: <Products />,
    vitrine: <Showcase />,
    estoque: <Stock />,
    categorias: <Categories />,
    historico: <History />,
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <div aria-hidden className="bg-grad-soft pointer-events-none fixed inset-x-0 top-0 h-[360px] [mask-image:linear-gradient(#000,transparent)]" />

      {/* Menu lateral (desktop) */}
      <aside className="glass fixed inset-y-3 left-3 z-30 hidden w-64 flex-col rounded-[2rem] p-4 lg:flex">
        <div className="px-3 pt-2">
          <Logo className="h-[22px]" />
          <p className="text-xs text-muted-foreground">Painel da loja</p>
        </div>
        <nav className="mt-6 flex flex-col gap-1" aria-label="Seções do painel">
          {NAV.map((n) => <NavItem key={n.id} item={n} active={section === n.id} onClick={() => go(n.id)} layoutId="side-pill" />)}
        </nav>
        <div className="mt-auto space-y-2">
          <AccountBox />
          <a href={`${BASE}/`} className="btn btn-fill flex h-10 items-center justify-center gap-2 rounded-full text-sm">
            <Store className="size-4" strokeWidth={1.5} /> Ver loja
          </a>
        </div>
      </aside>

      {/* Topo + abas (celular e tablet) */}
      <header className="sticky top-0 z-30 px-3 pt-3 lg:hidden">
        <div className="glass rounded-[1.75rem] p-2">
          <div className="flex items-center justify-between px-3 py-1">
            <Logo className="h-[18px]" />
            <a href={`${BASE}/`} aria-label="Ver loja" className="btn btn-fill grid size-9 place-items-center rounded-full"><Store className="size-4" strokeWidth={1.5} /></a>
          </div>
          <nav className="mt-1 flex gap-1 overflow-x-auto scrollbar-none" aria-label="Seções do painel">
            {NAV.map((n) => <NavItem key={n.id} item={n} active={section === n.id} onClick={() => go(n.id)} layoutId="top-pill" compact />)}
          </nav>
        </div>
      </header>

      <main className="relative px-4 pb-24 pt-6 md:px-8 lg:ml-[17rem] lg:pt-10">
        <div className="mx-auto max-w-6xl">
          <div className="lg:hidden"><AccountBox inline /></div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={section}
              initial={reduce ? false : { opacity: 0, y: 12, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={reduce ? undefined : { opacity: 0, y: -6, transition: { duration: 0.15 } }}
              transition={{ duration: 0.45, ease }}
            >
              {views[section]}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavItem({ item, active, onClick, layoutId, compact }: { item: (typeof NAV)[number]; active: boolean; onClick: () => void; layoutId: string; compact?: boolean }) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`btn relative flex shrink-0 items-center gap-3 rounded-full text-sm transition-colors duration-300 ${compact ? "px-3.5 py-2" : "px-4 py-2.5"} ${
        active ? "text-white" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
      }`}
    >
      {active && <motion.span layoutId={layoutId} className="bg-grad absolute inset-0 -z-10 rounded-full shadow-[var(--shadow-rose)]" transition={{ type: "spring", duration: 0.5, bounce: 0.15 }} />}
      <Icon className="size-4" strokeWidth={1.5} />
      {item.label}
    </button>
  );
}

// Conta conectada (ou modo local), status de salvamento, backup e restauração.
function AccountBox({ inline }: { inline?: boolean }) {
  const { state, saving, email, local, signOut, restore } = useAdmin();
  const file = useRef<HTMLInputElement>(null);

  async function load(f?: File) {
    if (!f) return;
    try {
      const s = await readBackup(f);
      if (confirm("Substituir os dados do painel por este backup?")) restore(s);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className={`rounded-3xl ${inline ? "box mb-6 p-3" : "bg-background/60 p-3"}`}>
      {local ? (
        <p className="flex gap-2 text-xs text-[#8a5200]">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          Modo local: tudo fica salvo neste navegador. Faça backup com frequência.
        </p>
      ) : (
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{email}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium" aria-live="polite">
            {saving ? <><Loader2 className="size-3.5 animate-spin text-rose" /> Salvando…</> : <><Check className="size-3.5 text-[#1d6b3c]" /> Tudo salvo e na loja</>}
          </p>
        </div>
      )}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button onClick={() => exportBackup(state)} className="btn btn-fill flex h-9 items-center justify-center gap-1.5 rounded-full px-2 text-xs">
          <DatabaseBackup className="size-3.5" strokeWidth={1.5} /> Backup
        </button>
        <button onClick={() => file.current?.click()} className="btn btn-fill flex h-9 items-center justify-center gap-1.5 rounded-full px-2 text-xs">
          <FileUp className="size-3.5" strokeWidth={1.5} /> Restaurar
        </button>
        <button onClick={local ? lockPanel : signOut} className="btn btn-fill flex h-9 items-center justify-center gap-1.5 rounded-full px-2 text-xs">
          <LogOut className="size-3.5" strokeWidth={1.5} /> {local ? "Bloquear" : "Sair"}
        </button>
      </div>
      <input ref={file} type="file" accept="application/json" className="hidden" onChange={(e) => { load(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}
