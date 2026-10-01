"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Banknote, CircleDollarSign, Hourglass, Receipt, Check } from "lucide-react";
import { brl } from "../../products";
import { PAY_METHODS, isRevenue, orderTotal, revenueDate, setPaymentStatus } from "../admin-logic";
import { useAdmin } from "../admin-store";
import { Badge, Card, ChartTip, Empty, PageHeader, Stat, compactBrl, dateTime } from "../ui";
import { payTone } from "./orders";

const monthKey = (iso: string) => iso.slice(0, 7);

export default function Payments() {
  const { state, run } = useAdmin();
  const active = state.orders.filter((o) => o.status !== "Cancelado");
  const thisMonth = monthKey(new Date().toISOString());
  const received = active.filter((o) => isRevenue(o) && monthKey(revenueDate(o)) === thisMonth).reduce((n, o) => n + orderTotal(o), 0);
  const pending = active.filter((o) => o.payment.status === "Pendente");
  const pendingTotal = pending.reduce((n, o) => n + orderTotal(o), 0);
  const refunded = state.orders.filter((o) => o.payment.status === "Estornado").reduce((n, o) => n + orderTotal(o), 0);
  const byMethod = PAY_METHODS.map((m) => ({ name: m, valor: active.filter((o) => isRevenue(o) && o.payment.method === m).reduce((n, o) => n + orderTotal(o), 0) }));
  const paid = active.filter(isRevenue).sort((a, b) => revenueDate(b).localeCompare(revenueDate(a))).slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHeader title="Pagamentos" description="O que já entrou, o que falta receber e por qual forma de pagamento." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={CircleDollarSign} label="Recebido no mês" value={received} format={brl} tone="green" sub="pedidos pagos, sem cancelados" />
        <Stat icon={Hourglass} label="A receber" value={pendingTotal} format={brl} tone={pending.length ? "amber" : "green"} sub={`${pending.length} ${pending.length === 1 ? "pedido pendente" : "pedidos pendentes"}`} i={1} />
        <Stat icon={Receipt} label="Estornado" value={refunded} format={brl} sub="devoluções de pagamento" i={2} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="A receber">
          {pending.length === 0 ? (
            <Empty icon={Check} title="Tudo recebido" text="Nenhum pagamento pendente agora." />
          ) : (
            <ul className="space-y-2">
              {pending.map((o) => (
                <li key={o.id} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-muted/60">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">#{o.number} · {o.customer}</p>
                    <p className="text-xs text-muted-foreground">{o.payment.method} · {dateTime(o.createdAt)}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{brl(orderTotal(o))}</span>
                  <button onClick={() => run((s) => setPaymentStatus(s, o.id, "Pago"), `Pedido #${o.number} pago`)} className="btn btn-primary h-9 rounded-full px-4 text-xs font-medium">Marcar pago</button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recebido por forma de pagamento" className="chart">
          {byMethod.every((m) => m.valor === 0) ? (
            <Empty icon={Banknote} title="Sem recebimentos" text="Os pagamentos confirmados aparecem aqui." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byMethod} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} tickFormatter={(v) => compactBrl.format(v)} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={118} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ radius: 12 }} content={<ChartTip format={brl} />} />
                <Bar dataKey="valor" radius={[0, 6, 6, 0]} maxBarSize={26} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card title="Últimos recebimentos">
        {paid.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum pagamento confirmado ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {paid.map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="w-16 font-medium tabular-nums">#{o.number}</span>
                <span className="min-w-0 flex-1 truncate">{o.customer}</span>
                <Badge tone={payTone[o.payment.status]}>{o.payment.method}</Badge>
                <span className="hidden text-xs text-muted-foreground sm:inline">{dateTime(revenueDate(o))}</span>
                <span className="w-24 text-right font-semibold tabular-nums">{brl(orderTotal(o))}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
