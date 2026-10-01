"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ShoppingBag, Ticket, TrendingUp, Shirt } from "lucide-react";
import { brl, focusPos, imageSrc } from "../../products";
import { CHANNELS, isRevenue, orderTotal, revenueDate, type AdminState } from "../admin-logic";
import { useAdmin } from "../admin-store";
import { Card, ChartTip, Empty, PageHeader, Stat, compactBrl } from "../ui";

const dayKey = (d: Date) => d.toLocaleDateString("sv-SE"); // AAAA-MM-DD no fuso local

export function salesSeries(state: AdminState, days: number) {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - (days - 1));
  const orders = state.orders.filter((o) => isRevenue(o) && new Date(revenueDate(o)) >= from);
  const byDay = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    byDay.set(dayKey(d), 0);
  }
  for (const o of orders) {
    const k = dayKey(new Date(revenueDate(o)));
    byDay.set(k, (byDay.get(k) ?? 0) + orderTotal(o));
  }
  const series = [...byDay].map(([k, valor]) => ({ dia: `${k.slice(8, 10)}/${k.slice(5, 7)}`, valor }));
  return { orders, series };
}

export default function Sales() {
  const { state } = useAdmin();
  const [days, setDays] = useState(30);
  const { orders, series } = useMemo(() => salesSeries(state, days), [state, days]);

  const revenue = orders.reduce((n, o) => n + orderTotal(o), 0);
  const pieces = orders.reduce((n, o) => n + o.items.reduce((m, i) => m + i.qty, 0), 0);
  const top = useMemo(() => {
    const m = new Map<string, { name: string; qty: number; total: number }>();
    for (const o of orders)
      for (const i of o.items) {
        const cur = m.get(i.productId) ?? { name: i.name, qty: 0, total: 0 };
        m.set(i.productId, { ...cur, qty: cur.qty + i.qty, total: cur.total + i.qty * i.price });
      }
    return [...m].sort((a, b) => b[1].qty - a[1].qty).slice(0, 5);
  }, [orders]);
  const channels = CHANNELS.map((c) => ({ name: c, valor: orders.filter((o) => o.channel === c).reduce((n, o) => n + orderTotal(o), 0) }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendas"
        description="Faturamento dos pedidos pagos no período escolhido."
        actions={
          <div className="glass inline-flex rounded-full p-1" role="group" aria-label="Período">
            {[7, 30, 90].map((d) => (
              <button key={d} onClick={() => setDays(d)} aria-pressed={days === d} className={`btn relative rounded-full px-4 py-2 text-sm ${days === d ? "text-white" : "text-muted-foreground"}`}>
                {days === d && <motion.span layoutId="days" className="bg-grad absolute inset-0 -z-10 rounded-full" transition={{ type: "spring", duration: 0.5, bounce: 0.15 }} />}
                {d} dias
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={TrendingUp} label="Faturamento" value={revenue} format={brl} />
        <Stat icon={ShoppingBag} label="Pedidos pagos" value={orders.length} i={1} />
        <Stat icon={Ticket} label="Ticket médio" value={orders.length ? revenue / orders.length : 0} format={brl} i={2} />
        <Stat icon={Shirt} label="Peças vendidas" value={pieces} i={3} />
      </div>

      <Card title={`Faturamento por dia, últimos ${days} dias`} className="chart">
        {revenue === 0 ? (
          <Empty icon={TrendingUp} title="Sem vendas no período" text="Registre pedidos e marque o pagamento para ver o gráfico." />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="dia" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={16} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => compactBrl.format(v)} width={64} />
              <Tooltip cursor={{ radius: 8 }} content={<ChartTip format={brl} />} />
              <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={28} animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Mais vendidos">
          {top.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aparecem aqui quando houver vendas pagas.</p>
          ) : (
            <ol className="space-y-2">
              {top.map(([id, t], i) => {
                const p = state.catalog.products.find((x) => x.id === id);
                return (
                  <li key={id} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-muted/60">
                    <span className="w-5 text-sm font-semibold text-muted-foreground tabular-nums">{i + 1}</span>
                    {p && <img src={imageSrc(p.image)} alt="" style={{ objectPosition: focusPos(p) }} className="size-10 rounded-xl object-cover" />}
                    <span className="min-w-0 flex-1 truncate text-sm">{t.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{t.qty} pç</span>
                    <span className="w-24 text-right text-sm font-semibold tabular-nums">{brl(t.total)}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
        <Card title="Faturamento por canal" className="chart">
          {revenue === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sem vendas no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={channels} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} tickFormatter={(v) => compactBrl.format(v)} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={84} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ radius: 12 }} content={<ChartTip format={brl} />} />
                <Bar dataKey="valor" radius={[0, 6, 6, 0]} maxBarSize={26} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
