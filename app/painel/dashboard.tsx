"use client";

// Painel da loja: indicadores, gráficos, alertas de estoque e editor de preço/estoque/visibilidade.
// ponytail: dados salvos no navegador (use-catalog). Sem login: não publique como área restrita
// antes de ligar autenticação + D1.
import { useEffect, useMemo, useRef, useState } from "react";
import { animate, AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle, ArrowLeft, Boxes, CircleSlash, Download, Eye, EyeOff, Minus, Plus, RotateCcw, Search, Shirt, Wallet, MessageCircle, Check, Store,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { BASE, brl, categories, type Category } from "../products";
import { useCatalog, useSettings, type CatalogItem } from "../use-catalog";

const ease = [0.16, 1, 0.3, 1] as const;
const compact = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" });

export default function Dashboard() {
  const { list, update, reset } = useCatalog();
  const reduce = useReducedMotion();

  const stats = useMemo(() => {
    const units = list.reduce((n, p) => n + p.stock, 0);
    const value = list.reduce((n, p) => n + p.stock * p.price, 0);
    const out = list.filter((p) => p.stock === 0).length;
    const low = list.filter((p) => p.stock > 0 && p.stock <= 2).length;
    const shown = list.filter((p) => !p.hidden).length;
    return { units, value, out, low, shown };
  }, [list]);

  const byCategory = useMemo(
    () =>
      categories.map((c) => {
        const items = list.filter((p) => p.category === c);
        return { name: c, unidades: items.reduce((n, p) => n + p.stock, 0), valor: items.reduce((n, p) => n + p.stock * p.price, 0) };
      }),
    [list],
  );

  function exportCatalog() {
    const data = list.map(({ id, name, category, price, stock, hidden }) => ({ id, name, category, price, stock, hidden }));
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "catalogo-mavie.json" });
    a.click();
    URL.revokeObjectURL(url);
    toast("Catálogo exportado");
  }

  const tiles = [
    { icon: Shirt, label: "Peças no site", value: stats.shown, fmt: (v: number) => Math.round(v).toString(), sub: `${list.length - stats.shown} ocultas` },
    { icon: Boxes, label: "Unidades em estoque", value: stats.units, fmt: (v: number) => Math.round(v).toString(), sub: `${list.length} modelos cadastrados` },
    { icon: Wallet, label: "Valor em estoque", value: stats.value, fmt: (v: number) => brl(v), sub: "preço × unidades" },
    { icon: AlertTriangle, label: "Precisam de reposição", value: stats.out + stats.low, fmt: (v: number) => Math.round(v).toString(), sub: `${stats.out} esgotadas, ${stats.low} com poucas unidades`, alert: stats.out + stats.low > 0 },
  ];

  return (
    <div className="min-h-[100dvh] bg-background">
      <div aria-hidden className="bg-grad-soft pointer-events-none fixed inset-x-0 top-0 h-[420px] [mask-image:linear-gradient(#000,transparent)]" />

      <header className="sticky top-3 z-40 px-3">
        <div className="glass mx-auto flex h-14 max-w-7xl items-center justify-between rounded-full pl-5 pr-2">
          <div className="flex items-center gap-3">
            <span className="font-display text-xl font-semibold tracking-[0.08em]">USEMAVIÊ</span>
            <span className="bg-grad rounded-full px-2.5 py-0.5 text-[11px] font-medium text-white">Painel</span>
          </div>
          <div className="flex items-center gap-1.5">
            <a href={`${BASE}/`} className="btn btn-fill flex h-10 items-center gap-2 rounded-full px-4 text-sm">
              <Store className="size-4" strokeWidth={1.5} /> <span className="hidden sm:inline">Ver loja</span>
            </a>
            <button onClick={exportCatalog} className="btn btn-primary btn-shine flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium">
              <Download className="size-4" strokeWidth={1.5} /> <span className="hidden sm:inline">Exportar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 pb-20 pt-10 md:px-8">
        <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease }}>
          <a href={`${BASE}/`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-300 hover:text-rose">
            <ArrowLeft className="size-4" strokeWidth={1.5} /> Voltar para a loja
          </a>
          <h1 className="mt-4 font-display text-5xl font-medium tracking-tight md:text-6xl">
            Olá, <span className="text-grad italic">Maviê</span>
          </h1>
          <p className="mt-2 max-w-[60ch] text-muted-foreground">
            Ajuste preços, estoque e o que aparece na loja. As mudanças valem na hora neste navegador.
          </p>
        </motion.div>

        {/* Indicadores */}
        <section className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Indicadores">
          {tiles.map((t, i) => (
            <motion.div
              key={t.label}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 + i * 0.06, ease }}
              className="box box-hover p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t.label}</span>
                <span className={`grid size-10 place-items-center rounded-2xl ${t.alert ? "bg-[#fdecd2] text-[#9a5b00] dark:bg-[#3b2a12] dark:text-[#f5c26b]" : "bg-grad text-white"}`}>
                  <t.icon className="size-[18px]" strokeWidth={1.5} />
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">
                <CountUp value={t.value} format={t.fmt} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t.sub}</p>
            </motion.div>
          ))}
        </section>

        {/* Gráficos */}
        <section className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <ChartCard title="Unidades em estoque por categoria" delay={0.3}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byCategory} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ radius: 12 }} content={<ChartTip format={(v) => `${v} unidades`} />} />
                <Bar dataKey="unidades" radius={[6, 6, 0, 0]} maxBarSize={52} animationDuration={900} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Valor em estoque por categoria" delay={0.36}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byCategory} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} tickFormatter={(v) => compact.format(v)} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={104} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ radius: 12 }} content={<ChartTip format={(v) => brl(v)} />} />
                <Bar dataKey="valor" radius={[0, 6, 6, 0]} maxBarSize={28} animationDuration={900} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.3fr]">
          <Alerts list={list} onRestock={(p) => { update(p.id, { stock: p.stock + 5 }); toast(`${p.name}: +5 unidades`); }} />
          <Settings />
        </section>

        <Editor list={list} update={update} reset={reset} />
      </main>
      <Toaster position="bottom-center" toastOptions={{ className: "glass", style: { borderRadius: 999, fontFamily: "var(--font-sans)" } }} />
    </div>
  );
}

function CountUp({ value, format }: { value: number; format: (v: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = format(value);
      prev.current = value;
      return;
    }
    const c = animate(prev.current, value, { duration: 1, ease, onUpdate: (v) => (el.textContent = format(v)) });
    prev.current = value;
    return () => c.stop();
  }, [value, format, reduce]);
  return <span ref={ref}>{format(0)}</span>;
}

function ChartCard({ title, delay, children }: { title: string; delay: number; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease }}
      className="box chart p-5"
    >
      <h2 className="text-sm font-medium">{title}</h2>
      <div className="mt-4">{children}</div>
    </motion.div>
  );
}

function ChartTip({ active, payload, label, format }: { active?: boolean; payload?: { value: number }[]; label?: string; format: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-2xl px-3.5 py-2.5 text-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium tabular-nums">{format(payload[0].value)}</p>
    </div>
  );
}

function Status({ stock }: { stock: number }) {
  if (stock === 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#fde2e2] px-2.5 py-1 text-xs font-medium text-[#a1262b] dark:bg-[#3d1618] dark:text-[#f3a5a8]">
        <CircleSlash className="size-3.5" strokeWidth={2} /> Esgotado
      </span>
    );
  if (stock <= 2)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#fdecd2] px-2.5 py-1 text-xs font-medium text-[#8a5200] dark:bg-[#3b2a12] dark:text-[#f5c26b]">
        <AlertTriangle className="size-3.5" strokeWidth={2} /> Baixo
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#dff3e6] px-2.5 py-1 text-xs font-medium text-[#1d6b3c] dark:bg-[#12301e] dark:text-[#8fd8aa]">
      <Check className="size-3.5" strokeWidth={2} /> Em estoque
    </span>
  );
}

function Alerts({ list, onRestock }: { list: CatalogItem[]; onRestock: (p: CatalogItem) => void }) {
  const items = list.filter((p) => p.stock <= 2).sort((a, b) => a.stock - b.stock);
  return (
    <div className="box p-5">
      <h2 className="text-sm font-medium">Precisa de atenção</h2>
      {items.length === 0 ? (
        <div className="mt-6 flex flex-col items-center py-8 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#dff3e6] text-[#1d6b3c] dark:bg-[#12301e] dark:text-[#8fd8aa]"><Check className="size-5" /></span>
          <p className="mt-3 text-sm text-muted-foreground">Todo o estoque está em dia.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2" data-lenis-prevent>
          <AnimatePresence initial={false}>
            {items.map((p) => (
              <motion.li
                layout
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 24, transition: { duration: 0.2 } }}
                className="flex items-center gap-3 rounded-2xl p-2 transition-colors duration-300 hover:bg-muted"
              >
                <img src={p.image} alt="" className="size-11 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <div className="mt-0.5"><Status stock={p.stock} /></div>
                </div>
                <button onClick={() => onRestock(p)} className="btn btn-fill shrink-0 rounded-full px-3.5 py-2 text-xs">Repor +5</button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

function Settings() {
  const { settings, save } = useSettings();
  const [number, setNumber] = useState("");
  useEffect(() => setNumber(settings.whatsapp), [settings.whatsapp]);
  const digits = number.replace(/\D/g, "");
  const valid = digits.length === 0 || (digits.length >= 12 && digits.length <= 13);

  return (
    <form
      className="box p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        save({ whatsapp: digits });
        toast(digits ? "WhatsApp salvo" : "WhatsApp removido");
      }}
    >
      <h2 className="text-sm font-medium">WhatsApp dos pedidos</h2>
      <p className="mt-1 text-sm text-muted-foreground">A sacola da loja envia o pedido para este número.</p>
      <div className="mt-5 flex flex-col gap-2">
        <label htmlFor="wa" className="text-sm font-medium">Número com DDI e DDD</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="wa"
            inputMode="tel"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="55 61 9XXXX-XXXX"
            aria-invalid={!valid}
            aria-describedby="wa-help"
            className="h-11 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none transition-[border-color,box-shadow] duration-300 placeholder:text-muted-foreground focus:border-rose focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--rose)_18%,transparent)]"
          />
          <button type="submit" disabled={!valid} className="btn btn-dark h-11 rounded-full px-6 text-sm disabled:opacity-50">Salvar</button>
        </div>
        {valid ? (
          <p id="wa-help" className="text-xs text-muted-foreground">Exemplo: 5561912345678. Vazio: o WhatsApp pede para escolher o contato.</p>
        ) : (
          <p id="wa-help" className="text-xs text-[#a1262b] dark:text-[#f3a5a8]">Use 12 ou 13 dígitos: 55, DDD e o número.</p>
        )}
      </div>
      {settings.whatsapp && (
        <a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm text-rose hover:underline">
          <MessageCircle className="size-4" strokeWidth={1.5} /> Testar conversa
        </a>
      )}
    </form>
  );
}

function Editor({ list, update, reset }: { list: CatalogItem[]; update: (id: string, patch: Partial<Pick<CatalogItem, "price" | "stock" | "hidden">>) => void; reset: () => void }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "Todas">("Todas");
  const rows = list.filter((p) => (cat === "Todas" || p.category === cat) && p.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <section className="box mt-4 p-5" aria-label="Produtos">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-display text-3xl font-medium">Produtos</h2>
          <p className="text-sm text-muted-foreground">{rows.length} de {list.length} peças</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-2">
            <label htmlFor="q" className="text-xs font-medium">Buscar</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
              <input
                id="q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Nome da peça"
                className="h-10 w-full rounded-full border border-border bg-background pl-10 pr-4 text-sm outline-none transition-[border-color,box-shadow] duration-300 placeholder:text-muted-foreground focus:border-rose focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--rose)_18%,transparent)] sm:w-56"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="cat" className="text-xs font-medium">Categoria</label>
            <select
              id="cat"
              value={cat}
              onChange={(e) => setCat(e.target.value as Category | "Todas")}
              className="h-10 rounded-full border border-border bg-background px-4 text-sm outline-none transition-[border-color] duration-300 focus:border-rose"
            >
              {(["Todas", ...categories] as const).map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <button
            onClick={() => {
              if (confirm("Restaurar preços, estoque e visibilidade originais?")) {
                reset();
                toast("Catálogo restaurado");
              }
            }}
            className="btn btn-fill flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm"
          >
            <RotateCcw className="size-4" strokeWidth={1.5} /> Restaurar
          </button>
        </div>
      </div>

      <div className="mt-6 hidden grid-cols-[minmax(0,2.4fr)_1fr_1.2fr_0.8fr_1fr] gap-4 px-3 text-xs font-medium text-muted-foreground lg:grid">
        <span>Peça</span><span>Preço</span><span>Estoque</span><span>Na loja</span><span>Status</span>
      </div>

      {rows.length === 0 ? (
        <p className="py-14 text-center text-sm text-muted-foreground">Nenhuma peça encontrada. Ajuste a busca ou a categoria.</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {rows.map((p) => (
            <li key={p.id} className={`grid grid-cols-2 items-center gap-3 rounded-2xl px-3 py-3 transition-colors duration-300 hover:bg-muted/60 lg:grid-cols-[minmax(0,2.4fr)_1fr_1.2fr_0.8fr_1fr] lg:gap-4 ${p.hidden ? "opacity-60" : ""}`}>
              <div className="col-span-2 flex min-w-0 items-center gap-3 lg:col-span-1">
                <img src={p.image} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.category}</p>
                </div>
              </div>
              <PriceInput value={p.price} label={`Preço de ${p.name}`} onCommit={(v) => { update(p.id, { price: v }); toast(`${p.name}: ${brl(v)}`); }} />
              <div className="flex items-center justify-self-start rounded-full border border-border">
                <button onClick={() => update(p.id, { stock: Math.max(0, p.stock - 1) })} aria-label={`Diminuir estoque de ${p.name}`} className="btn grid size-9 place-items-center rounded-full"><Minus className="size-3.5" /></button>
                <span className="w-8 text-center text-sm tabular-nums">{p.stock}</span>
                <button onClick={() => update(p.id, { stock: p.stock + 1 })} aria-label={`Aumentar estoque de ${p.name}`} className="btn grid size-9 place-items-center rounded-full"><Plus className="size-3.5" /></button>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={!p.hidden} onCheckedChange={(on) => update(p.id, { hidden: !on })} aria-label={`Mostrar ${p.name} na loja`} className="data-[state=checked]:bg-rose" />
                {p.hidden ? <EyeOff className="size-4 lg:hidden" /> : <Eye className="size-4 lg:hidden" />}
              </label>
              <div><Status stock={p.stock} /></div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PriceInput({ value, label, onCommit }: { value: number; label: string; onCommit: (v: number) => void }) {
  const [text, setText] = useState(value.toFixed(2).replace(".", ","));
  useEffect(() => setText(value.toFixed(2).replace(".", ",")), [value]);
  const commit = () => {
    const n = Number(text.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) {
      setText(value.toFixed(2).replace(".", ","));
      toast("Preço inválido. Mantive o anterior.");
      return;
    }
    if (n !== value) onCommit(Math.round(n * 100) / 100);
  };
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
      <input
        aria-label={label}
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="h-9 w-full max-w-32 rounded-full border border-border bg-background pl-10 pr-3 text-sm tabular-nums outline-none transition-[border-color,box-shadow] duration-300 focus:border-rose focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--rose)_18%,transparent)]"
      />
    </div>
  );
}
