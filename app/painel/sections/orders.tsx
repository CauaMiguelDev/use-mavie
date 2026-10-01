"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ClipboardList, MessageCircle, Plus, Trash2 } from "lucide-react";
import { brl, formatPhone, sizesOf, whatsappUrl } from "../../products";
import {
  CHANNELS, ORDER_STATUS, PAY_METHODS, PAY_STATUS, createOrder, orderSubtotal, orderTotal, setOrderStatus, setPaymentStatus,
  type Order, type OrderDraft, type OrderItem,
} from "../admin-logic";
import { useAdmin } from "../admin-store";
import { Badge, Drawer, Empty, Field, PageHeader, dateTime, ease, inputCls } from "../ui";

export const statusTone: Record<Order["status"], "blue" | "amber" | "rose" | "green" | "neutral"> = {
  Novo: "blue", Separando: "amber", Enviado: "rose", Entregue: "green", Cancelado: "neutral",
};
export const payTone: Record<Order["payment"]["status"], "green" | "amber" | "red"> = { Pago: "green", Pendente: "amber", Estornado: "red" };

export default function Orders() {
  const { state, run } = useAdmin();
  const [filter, setFilter] = useState<Order["status"] | "Todos">("Todos");
  const [creating, setCreating] = useState(false);
  const orders = state.orders.filter((o) => filter === "Todos" || o.status === filter);
  const count = (s: Order["status"]) => state.orders.filter((o) => o.status === s).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos"
        description="Registre os pedidos que chegam pelo WhatsApp, Instagram ou presencialmente. O estoque baixa sozinho."
        actions={
          <button onClick={() => setCreating(true)} className="btn btn-primary btn-shine flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium">
            <Plus className="size-4" strokeWidth={1.5} /> Novo pedido
          </button>
        }
      />

      <div className="glass inline-flex max-w-full gap-1 overflow-x-auto rounded-full p-1.5 scrollbar-none" role="group" aria-label="Filtrar pedidos">
        {(["Todos", ...ORDER_STATUS] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} aria-pressed={filter === s} className={`btn relative shrink-0 rounded-full px-4 py-2 text-sm ${filter === s ? "text-white" : "text-muted-foreground hover:text-foreground"}`}>
            {filter === s && <motion.span layoutId="order-filter" className="bg-grad absolute inset-0 -z-10 rounded-full" transition={{ type: "spring", duration: 0.5, bounce: 0.15 }} />}
            {s}
            {s !== "Todos" && count(s) > 0 && <span className="ml-1.5 tabular-nums opacity-70">{count(s)}</span>}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="box">
          <Empty
            icon={ClipboardList}
            title={state.orders.length ? "Nenhum pedido neste status" : "Nenhum pedido ainda"}
            text="Quando uma cliente fechar a compra, registre aqui para controlar estoque, pagamento e entrega."
            action={!state.orders.length && <button onClick={() => setCreating(true)} className="btn btn-dark rounded-full px-5 py-2.5 text-sm">Registrar primeiro pedido</button>}
          />
        </div>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {orders.map((o) => (
              <motion.li layout key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease }} className="box p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold tabular-nums">#{o.number}</p>
                      <Badge tone={statusTone[o.status]}>{o.status}</Badge>
                      <Badge tone={payTone[o.payment.status]}>{o.payment.status} · {o.payment.method}</Badge>
                    </div>
                    <p className="mt-1 text-sm">
                      {o.customer} <span className="text-muted-foreground">· {o.channel} · {dateTime(o.createdAt)}</span>
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{o.items.map((i) => `${i.qty}x ${i.name} (${i.size})`).join(", ")}</p>
                    {o.note && <p className="mt-1 text-xs italic text-muted-foreground">{o.note}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="mr-2 text-lg font-semibold tabular-nums">{brl(orderTotal(o))}</p>
                    <select aria-label={`Status do pedido ${o.number}`} value={o.status} onChange={(e) => run((s) => setOrderStatus(s, o.id, e.target.value as Order["status"]), `Pedido #${o.number}: ${e.target.value}`)} className={`${inputCls} h-10 w-36`}>
                      {ORDER_STATUS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                    <select aria-label={`Pagamento do pedido ${o.number}`} value={o.payment.status} onChange={(e) => run((s) => setPaymentStatus(s, o.id, e.target.value as Order["payment"]["status"]), `Pagamento #${o.number}: ${e.target.value}`)} className={`${inputCls} h-10 w-32`}>
                      {PAY_STATUS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                    {o.phone && (
                      <a href={whatsappUrl(`Oi, ${o.customer.split(" ")[0]}! Sobre o seu pedido #${o.number} na USE MAVIÊ:`, o.phone)} target="_blank" rel="noreferrer" aria-label={`Conversar com ${o.customer} no WhatsApp`} className="btn btn-fill grid size-10 place-items-center rounded-full">
                        <MessageCircle className="size-4" strokeWidth={1.5} />
                      </a>
                    )}
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {creating && <OrderForm onClose={() => setCreating(false)} />}
    </div>
  );
}

const emptyDraft = (): OrderDraft => ({
  customer: "", phone: "", channel: "WhatsApp", items: [], discount: 0, shipping: 0, note: "",
  payment: { method: "Pix", status: "Pendente" }, status: "Novo",
});
const money = (v: string) => Math.max(0, Number(v.replace(/\./g, "").replace(",", ".")) || 0);

function OrderForm({ onClose }: { onClose: () => void }) {
  const { state, run } = useAdmin();
  const [d, setD] = useState<OrderDraft>(emptyDraft);
  const [tried, setTried] = useState(false);
  const available = state.catalog.products.filter((p) => sizesOf(p).some((s) => p.stock[s] > 0));
  const set = (patch: Partial<OrderDraft>) => setD({ ...d, ...patch });

  // Já reservado neste rascunho, para não oferecer mais que o estoque.
  const reserved = (productId: string, size: string, except: number) =>
    d.items.reduce((n, it, i) => (i !== except && it.productId === productId && it.size === size ? n + it.qty : n), 0);

  function addItem() {
    for (const p of available) {
      const size = sizesOf(p).find((s) => p.stock[s] - reserved(p.id, s, -1) > 0);
      if (size) return set({ items: [...d.items, { productId: p.id, name: p.name, size, qty: 1, price: p.price }] });
    }
  }
  const setItem = (i: number, patch: Partial<OrderItem>) => set({ items: d.items.map((it, k) => (k === i ? { ...it, ...patch } : it)) });

  const errors = { customer: !d.customer.trim() ? "Informe o nome da cliente." : "", items: !d.items.length ? "Adicione pelo menos uma peça." : "" };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (Object.values(errors).some(Boolean)) return;
    if (run((s) => createOrder(s, { ...d, phone: d.phone.replace(/\D/g, "") }), `Pedido #${state.nextOrder} de ${d.customer.trim()} registrado (${brl(orderTotal(d))}); estoque atualizado`)) onClose();
  }

  return (
    <Drawer
      open
      onOpenChange={(v) => !v && onClose()}
      title="Novo pedido"
      description="As peças saem do estoque assim que o pedido é salvo."
      footer={
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-display text-3xl tabular-nums">{brl(orderTotal(d))}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-fill h-11 rounded-full px-5 text-sm">Cancelar</button>
            <button type="submit" form="order-form" className="btn btn-primary btn-shine h-11 rounded-full px-6 text-sm font-medium">Salvar pedido</button>
          </div>
        </div>
      }
    >
      <form id="order-form" onSubmit={submit} className="space-y-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cliente" htmlFor="o-name" error={tried ? errors.customer : ""}>
            <input id="o-name" value={d.customer} onChange={(e) => set({ customer: e.target.value })} aria-invalid={tried && !!errors.customer} placeholder="Nome" className={inputCls} />
          </Field>
          <Field label="WhatsApp (opcional)" htmlFor="o-phone" help={d.phone ? formatPhone(`55${d.phone.replace(/\D/g, "")}`) : "Com DDD"}>
            <input id="o-phone" inputMode="tel" value={d.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="61 9XXXX-XXXX" className={inputCls} />
          </Field>
        </div>
        <Field label="Canal" htmlFor="o-channel">
          <select id="o-channel" value={d.channel} onChange={(e) => set({ channel: e.target.value as OrderDraft["channel"] })} className={inputCls}>
            {CHANNELS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Peças</legend>
          {d.items.map((it, i) => {
            const p = state.catalog.products.find((x) => x.id === it.productId)!;
            const max = p.stock[it.size] - reserved(it.productId, it.size, i);
            return (
              <div key={i} className="rounded-2xl border border-border p-3">
                <div className="flex gap-2">
                  <select
                    aria-label="Produto"
                    value={it.productId}
                    onChange={(e) => {
                      const np = state.catalog.products.find((x) => x.id === e.target.value)!;
                      const size = sizesOf(np).find((s) => np.stock[s] > 0) ?? sizesOf(np)[0];
                      setItem(i, { productId: np.id, name: np.name, price: np.price, size, qty: 1 });
                    }}
                    className={inputCls}
                  >
                    {available.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                  <button type="button" onClick={() => set({ items: d.items.filter((_, k) => k !== i) })} aria-label="Remover peça" className="btn btn-fill grid size-11 shrink-0 place-items-center rounded-2xl">
                    <Trash2 className="size-4" strokeWidth={1.5} />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <select aria-label="Tamanho" value={it.size} onChange={(e) => setItem(i, { size: e.target.value, qty: 1 })} className={inputCls}>
                    {sizesOf(p).map((s) => <option key={s} disabled={p.stock[s] - reserved(p.id, s, i) <= 0}>{s}</option>)}
                  </select>
                  <input aria-label="Quantidade" type="number" min={1} max={Math.max(1, max)} value={it.qty} onChange={(e) => setItem(i, { qty: Math.min(Math.max(1, Math.floor(Number(e.target.value) || 1)), Math.max(1, max)) })} className={`${inputCls} tabular-nums`} />
                  <input aria-label="Preço unitário" inputMode="decimal" defaultValue={it.price.toFixed(2).replace(".", ",")} key={it.productId} onChange={(e) => setItem(i, { price: money(e.target.value) })} className={`${inputCls} tabular-nums`} />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{max} disponível no tamanho {it.size}</p>
              </div>
            );
          })}
          {tried && errors.items && <p className="text-xs text-[#a1262b] dark:text-[#f3a5a8]">{errors.items}</p>}
          <button type="button" onClick={addItem} disabled={!available.length} className="btn btn-fill flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm">
            <Plus className="size-4" strokeWidth={1.5} /> {available.length ? "Adicionar peça" : "Sem estoque disponível"}
          </button>
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Desconto (R$)" htmlFor="o-disc">
            <input id="o-disc" inputMode="decimal" placeholder="0,00" onChange={(e) => set({ discount: money(e.target.value) })} className={`${inputCls} tabular-nums`} />
          </Field>
          <Field label="Frete (R$)" htmlFor="o-ship">
            <input id="o-ship" inputMode="decimal" placeholder="0,00" onChange={(e) => set({ shipping: money(e.target.value) })} className={`${inputCls} tabular-nums`} />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">Peças {brl(orderSubtotal(d))} − desconto {brl(d.discount)} + frete {brl(d.shipping)}</p>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Forma de pagamento" htmlFor="o-method">
            <select id="o-method" value={d.payment.method} onChange={(e) => set({ payment: { ...d.payment, method: e.target.value as OrderDraft["payment"]["method"] } })} className={inputCls}>
              {PAY_METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Pagamento" htmlFor="o-paid">
            <select id="o-paid" value={d.payment.status} onChange={(e) => set({ payment: { ...d.payment, status: e.target.value as OrderDraft["payment"]["status"] } })} className={inputCls}>
              {PAY_STATUS.filter((s) => s !== "Estornado").map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Observação (opcional)" htmlFor="o-note">
          <textarea id="o-note" value={d.note} onChange={(e) => set({ note: e.target.value })} rows={2} placeholder="Ex.: entregar após 18h" className={`${inputCls} h-auto py-3`} />
        </Field>
      </form>
    </Drawer>
  );
}
