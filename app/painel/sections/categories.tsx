"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Pencil, Plus, Tags, Trash2, X } from "lucide-react";
import { totalStock } from "../../products";
import { addCategory, deleteCategory, renameCategory } from "../admin-logic";
import { useAdmin } from "../admin-store";
import { Card, Empty, PageHeader, ease, inputCls } from "../ui";

export default function Categories() {
  const { state, run } = useAdmin();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const rows = state.catalog.categories.map((c) => {
    const items = state.catalog.products.filter((p) => p.category === c);
    return { name: c, count: items.length, units: items.reduce((n, p) => n + totalStock(p), 0) };
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Categorias" description="Organize as peças da loja. Os filtros do catálogo usam estas categorias." />

      <Card>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (run((s) => addCategory(s, name), `Categoria "${name.trim()}" criada`)) setName("");
          }}
        >
          <label htmlFor="new-cat" className="sr-only">Nova categoria</label>
          <input id="new-cat" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da nova categoria. Ex.: Bolsas" className={inputCls} />
          <button disabled={!name.trim()} className="btn btn-primary btn-shine flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-medium">
            <Plus className="size-4" strokeWidth={1.5} /> Adicionar
          </button>
        </form>
      </Card>

      {rows.length === 0 ? (
        <div className="box"><Empty icon={Tags} title="Nenhuma categoria" text="Crie a primeira categoria acima." /></div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {rows.map((r) => (
              <motion.li
                layout
                key={r.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
                transition={{ duration: 0.45, ease }}
                className="box box-hover p-4"
              >
                {editing === r.name ? (
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (run((s) => renameCategory(s, r.name, draft), "Categoria renomeada")) setEditing(null);
                    }}
                  >
                    <input autoFocus aria-label={`Novo nome para ${r.name}`} value={draft} onChange={(e) => setDraft(e.target.value)} className={inputCls} />
                    <button aria-label="Salvar nome" className="btn btn-primary grid size-11 shrink-0 place-items-center rounded-2xl"><Check className="size-4" /></button>
                    <button type="button" aria-label="Cancelar" onClick={() => setEditing(null)} className="btn btn-fill grid size-11 shrink-0 place-items-center rounded-2xl"><X className="size-4" /></button>
                  </form>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="bg-grad grid size-11 shrink-0 place-items-center rounded-2xl text-white"><Tags className="size-[18px]" strokeWidth={1.5} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.count} {r.count === 1 ? "produto" : "produtos"} · {r.units} unidades</p>
                    </div>
                    <button onClick={() => { setEditing(r.name); setDraft(r.name); }} aria-label={`Renomear ${r.name}`} className="btn btn-fill grid size-9 place-items-center rounded-full">
                      <Pencil className="size-4" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => confirm(`Excluir a categoria "${r.name}"?`) && run((s) => deleteCategory(s, r.name), "Categoria excluída")}
                      disabled={r.count > 0}
                      title={r.count > 0 ? "Mova ou exclua os produtos desta categoria antes" : undefined}
                      aria-label={`Excluir ${r.name}`}
                      className="btn btn-fill grid size-9 place-items-center rounded-full"
                    >
                      <Trash2 className="size-4" strokeWidth={1.5} />
                    </button>
                  </div>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
