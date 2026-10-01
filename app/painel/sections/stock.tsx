"use client";

import { useState } from "react";
import { ArrowDownToLine, Boxes, Clock, Minus, PackageCheck, Plus, Search, AlertTriangle, CircleSlash } from "lucide-react";
import { focusPos, imageSrc, sizesOf, totalStock } from "../../products";
import { adjustStock, type Movement } from "../admin-logic";
import { useAdmin } from "../admin-store";
import { Badge, Card, Empty, Field, PageHeader, Stat, dateTime, inputCls } from "../ui";

const reasonTone: Record<Movement["reason"], "green" | "rose" | "amber" | "neutral"> = { Entrada: "green", Venda: "rose", Cancelamento: "amber", Ajuste: "neutral" };

export default function Stock() {
  const { state, run } = useAdmin();
  const [q, setQ] = useState("");
  const [show, setShow] = useState<"Todos" | "Baixo" | "Esgotado">("Todos");
  const products = state.catalog.products;

  const units = products.reduce((n, p) => n + totalStock(p), 0);
  const low = products.filter((p) => totalStock(p) > 0 && totalStock(p) <= 2).length;
  const out = products.filter((p) => totalStock(p) === 0).length;
  const rows = products.filter((p) => {
    const n = totalStock(p);
    const hit = show === "Todos" || (show === "Baixo" ? n > 0 && n <= 2 : n === 0);
    return hit && p.name.toLowerCase().includes(q.trim().toLowerCase());
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Estoque" description="Quantidades por tamanho. Vendas e cancelamentos de pedidos atualizam sozinhos." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={Boxes} label="Unidades em estoque" value={units} sub={`${products.length} produtos`} />
        <Stat icon={AlertTriangle} label="Estoque baixo" value={low} sub="2 unidades ou menos" tone={low ? "amber" : "green"} i={1} />
        <Stat icon={CircleSlash} label="Esgotados" value={out} sub="sem nenhuma unidade" tone={out ? "amber" : "green"} i={2} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
              <input aria-label="Buscar no estoque" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto" className={`${inputCls} pl-11`} />
            </div>
            <div className="glass inline-flex rounded-full p-1" role="group" aria-label="Filtrar estoque">
              {(["Todos", "Baixo", "Esgotado"] as const).map((f) => (
                <button key={f} onClick={() => setShow(f)} aria-pressed={show === f} className={`btn rounded-full px-4 py-2 text-sm ${show === f ? "bg-grad text-white" : "text-muted-foreground"}`}>{f}</button>
              ))}
            </div>
          </div>

          {rows.length === 0 ? (
            <Empty icon={PackageCheck} title="Nada por aqui" text="Nenhum produto neste filtro." />
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((p) => (
                <li key={p.id} className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <img src={imageSrc(p.image)} alt="" style={{ objectPosition: focusPos(p) }} className="size-12 shrink-0 rounded-xl object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{totalStock(p)} no total</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sizesOf(p).map((s) => {
                      const n = p.stock[s];
                      return (
                        <div key={s} className={`flex items-center rounded-full border ${n === 0 ? "border-[#f3a5a8]/60" : n <= 1 ? "border-[#f5c26b]/70" : "border-border"}`}>
                          <button onClick={() => run((st) => adjustStock(st, p.id, s, -1, "Ajuste"), `Estoque: -1 ${p.name} (${s})`)} disabled={n === 0} aria-label={`Tirar 1 de ${p.name} ${s}`} className="btn grid size-8 place-items-center rounded-full"><Minus className="size-3.5" /></button>
                          <span className="min-w-12 text-center text-xs tabular-nums"><span className="text-muted-foreground">{s}</span> <strong className="font-semibold">{n}</strong></span>
                          <button onClick={() => run((st) => adjustStock(st, p.id, s, 1, "Entrada"), `Estoque: +1 ${p.name} (${s})`)} aria-label={`Adicionar 1 de ${p.name} ${s}`} className="btn grid size-8 place-items-center rounded-full"><Plus className="size-3.5" /></button>
                        </div>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <EntryForm />
          <Card title="Movimentações recentes">
            {state.movements.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">As entradas, vendas e ajustes aparecem aqui.</p>
            ) : (
              <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {state.movements.slice(0, 40).map((m) => (
                  <li key={m.id} className="flex items-center gap-3 rounded-2xl p-2 text-sm hover:bg-muted/60">
                    <Clock className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{m.name} <span className="text-muted-foreground">({m.size})</span></p>
                      <p className="text-xs text-muted-foreground">{dateTime(m.at)}{m.ref ? ` · pedido ${m.ref}` : ""}</p>
                    </div>
                    <Badge tone={reasonTone[m.reason]}>{m.reason}</Badge>
                    <span className={`w-10 text-right font-semibold tabular-nums ${m.delta > 0 ? "text-[#1d6b3c] dark:text-[#8fd8aa]" : "text-rose"}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// Entrada de mercadoria: chegou reposição de um tamanho.
function EntryForm() {
  const { state, run } = useAdmin();
  const products = state.catalog.products;
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const product = products.find((p) => p.id === productId);
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const sizes = product ? sizesOf(product) : [];
  const chosen = sizes.includes(size as never) ? size : sizes[0] ?? "";

  return (
    <Card title="Entrada de mercadoria">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (product && run((s) => adjustStock(s, product.id, chosen, qty, "Entrada"), `+${qty} ${product.name} (${chosen})`)) setQty(1);
        }}
      >
        <Field label="Produto" htmlFor="in-product">
          <select id="in-product" value={productId} onChange={(e) => setProductId(e.target.value)} className={inputCls}>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tamanho" htmlFor="in-size">
            <select id="in-size" value={chosen} onChange={(e) => setSize(e.target.value)} className={inputCls}>
              {sizes.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Quantidade" htmlFor="in-qty">
            <input id="in-qty" type="number" min={1} step={1} value={qty} onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))} className={`${inputCls} tabular-nums`} />
          </Field>
        </div>
        <button disabled={!product || !chosen} className="btn btn-primary btn-shine flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-medium">
          <ArrowDownToLine className="size-4" strokeWidth={1.5} /> Registrar entrada
        </button>
      </form>
    </Card>
  );
}
