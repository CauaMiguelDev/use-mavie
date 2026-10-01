"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Boxes, ClipboardList, TrendingUp, Check } from "lucide-react";
import { brl, focusPos, imageSrc, totalStock } from "../../products";
import { orderTotal } from "../admin-logic";
import { useAdmin } from "../admin-store";
import { Badge, Card, ChartTip, PageHeader, Stat, compactBrl, dateTime } from "../ui";
import { statusTone } from "./orders";
import { salesSeries } from "./sales";

export default function Overview({ go }: { go: (section: string) => void }) {
  const { state } = useAdmin();
  const { orders, series } = useMemo(() => salesSeries(state, 14), [state]);
  const revenue = orders.reduce((n, o) => n + orderTotal(o), 0);
  const open = state.orders.filter((o) => o.status === "Novo" || o.status === "Separando");
  const units = state.catalog.products.reduce((n, p) => n + totalStock(p), 0);
  const low = state.catalog.products.filter((p) => totalStock(p) <= 2).sort((a, b) => totalStock(a) - totalStock(b));
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Bom dia," : hour < 18 ? "Boa tarde," : "Boa noite,";

  return (
    <div className="space-y-6">
      <PageHeader title={hello} accent="Maviê" description="Um resumo da loja: vendas, pedidos em aberto e o que precisa de reposição." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={TrendingUp} label="Vendas em 14 dias" value={revenue} format={brl} sub={`${orders.length} pedidos pagos`} />
        <Stat icon={ClipboardList} label="Pedidos em aberto" value={open.length} sub="novos ou em separação" tone={open.length ? "amber" : "green"} i={1} />
        <Stat icon={Boxes} label="Unidades em estoque" value={units} sub={`${state.catalog.products.length} produtos`} i={2} />
        <Stat icon={AlertTriangle} label="Para repor" value={low.length} sub="2 unidades ou menos" tone={low.length ? "amber" : "green"} i={3} />
      </div>

      <Card title="Vendas dos últimos 14 dias" className="chart">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="dia" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => compactBrl.format(v)} width={64} allowDecimals={false} />
            <Tooltip cursor={{ radius: 8 }} content={<ChartTip format={brl} />} />
            <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={32} animationDuration={800} />
          </BarChart>
        </ResponsiveContainer>
        {revenue === 0 && <p className="mt-2 text-center text-xs text-muted-foreground">Sem vendas pagas no período. Registre pedidos em Pedidos.</p>}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Pedidos em aberto" action={<button onClick={() => go("pedidos")} className="text-sm text-rose hover:underline">Ver todos</button>}>
          {open.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum pedido aguardando.</p>
          ) : (
            <ul className="space-y-2">
              {open.slice(0, 5).map((o) => (
                <li key={o.id} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-muted/60">
                  <span className="w-14 text-sm font-semibold tabular-nums">#{o.number}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{o.customer}</p>
                    <p className="text-xs text-muted-foreground">{dateTime(o.createdAt)}</p>
                  </div>
                  <Badge tone={statusTone[o.status]}>{o.status}</Badge>
                  <span className="w-24 text-right text-sm font-semibold tabular-nums">{brl(orderTotal(o))}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Para repor" action={<button onClick={() => go("estoque")} className="text-sm text-rose hover:underline">Abrir estoque</button>}>
          {low.length === 0 ? (
            <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground"><Check className="size-4" /> Estoque em dia.</p>
          ) : (
            <ul className="space-y-2">
              {low.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-muted/60">
                  <img src={imageSrc(p.image)} alt="" style={{ objectPosition: focusPos(p) }} className="size-10 rounded-xl object-cover" />
                  <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                  {totalStock(p) === 0 ? <Badge tone="red">Esgotado</Badge> : <Badge tone="amber">{totalStock(p)} restantes</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
