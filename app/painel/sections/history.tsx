"use client";

import { useState } from "react";
import { ScrollText, Search } from "lucide-react";
import { useAdmin } from "../admin-store";
import { Card, Empty, PageHeader, dateTime, inputCls } from "../ui";

// Registro permanente de tudo que foi salvo no painel, do mais recente ao mais antigo.
export default function History() {
  const { state } = useAdmin();
  const [q, setQ] = useState("");
  const log = (state.log ?? []).filter((l) => l.text.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="space-y-6">
      <PageHeader title="Histórico" description="Tudo o que foi salvo no painel fica registrado aqui, com data, hora e quem fez." />
      <Card>
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
          <input aria-label="Buscar no histórico" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar. Ex.: pedido, estoque, Vestido Noir" className={`${inputCls} pl-11`} />
        </div>
        {log.length === 0 ? (
          <Empty icon={ScrollText} title="Nada registrado ainda" text="Cadastros, pedidos, pagamentos e mudanças de estoque aparecem aqui." />
        ) : (
          <ol className="relative space-y-1 border-l border-border pl-5 font-mono text-[13px]">
            {log.slice(0, 300).map((l, i) => (
              <li key={`${l.at}-${i}`} className="relative rounded-xl px-3 py-2 hover:bg-muted/60">
                <span className="absolute -left-[1.6rem] top-3.5 size-2 rounded-full bg-rose" aria-hidden />
                <span className="text-muted-foreground">{dateTime(l.at)}</span> <span>{l.text}</span>
                <span className="ml-2 text-xs text-muted-foreground">· {l.by}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
