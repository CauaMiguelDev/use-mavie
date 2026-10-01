"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Eye, EyeOff, Loader2, PackagePlus, Pencil, Search, Shirt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { SIZES, brl, imageSrc, sizesOf, totalStock, type Product } from "../../products";
import { addCategory, deleteProduct, saveProduct, toggleHidden } from "../admin-logic";
import { useAdmin } from "../admin-store";
import { Badge, Drawer, Empty, Field, ImageDrop, PageHeader, ease, inputCls } from "../ui";

const blank = (category: string): Product => ({ id: "", name: "", category, price: 0, image: "", stock: { P: 0, M: 0, G: 0 }, hidden: false });

export function stockBadge(p: Product) {
  const n = totalStock(p);
  if (n === 0) return <Badge tone="red">Esgotado</Badge>;
  if (n <= 2) return <Badge tone="amber">{n} {n === 1 ? "unidade" : "unidades"}</Badge>;
  return <Badge tone="green">{n} unidades</Badge>;
}

export default function Products() {
  const { state, run } = useAdmin();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Todas");
  const [editing, setEditing] = useState<Product | null>(null);
  const products = state.catalog.products.filter(
    (p) => (cat === "Todas" || p.category === cat) && p.name.toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produtos"
        description="Cadastre peças com foto, preço, tamanhos e estoque. Desligue a visibilidade para tirar da loja sem apagar."
        actions={
          <button onClick={() => setEditing(blank(state.catalog.categories[0] ?? ""))} className="btn btn-primary btn-shine flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium">
            <PackagePlus className="size-4" strokeWidth={1.5} /> Novo produto
          </button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
          <input aria-label="Buscar produto" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pelo nome" className={`${inputCls} pl-11`} />
        </div>
        <select aria-label="Filtrar por categoria" value={cat} onChange={(e) => setCat(e.target.value)} className={`${inputCls} sm:w-56`}>
          {["Todas", ...state.catalog.categories].map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {products.length === 0 ? (
        <div className="box">
          <Empty icon={Shirt} title="Nenhum produto aqui" text="Ajuste a busca ou cadastre uma peça nova." />
        </div>
      ) : (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {products.map((p) => (
              <motion.article
                layout
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
                transition={{ duration: 0.5, ease }}
                className={`box box-hover flex gap-4 p-3 ${p.hidden ? "opacity-60" : ""}`}
              >
                <img src={imageSrc(p.image)} alt="" className="h-32 w-24 shrink-0 rounded-2xl object-cover" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.category}</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">{brl(p.price)}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {stockBadge(p)}
                    <span className="text-xs text-muted-foreground">{sizesOf(p).join(" · ")}</span>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Switch
                        checked={!p.hidden}
                        onCheckedChange={() => run((s) => toggleHidden(s, p.id), p.hidden ? "Produto visível na loja" : "Produto oculto da loja")}
                        aria-label={`Mostrar ${p.name} na loja`}
                        className="data-[state=checked]:bg-rose"
                      />
                      {p.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </label>
                    <div className="flex gap-1">
                      <button onClick={() => setEditing(p)} aria-label={`Editar ${p.name}`} className="btn btn-fill grid size-9 place-items-center rounded-full">
                        <Pencil className="size-4" strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => confirm(`Excluir "${p.name}"? Esta ação não pode ser desfeita.`) && run((s) => deleteProduct(s, p.id), "Produto excluído")}
                        aria-label={`Excluir ${p.name}`}
                        className="btn btn-fill grid size-9 place-items-center rounded-full"
                      >
                        <Trash2 className="size-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {editing && <ProductForm key={editing.id || "novo"} product={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ProductForm({ product, onClose }: { product: Product; onClose: () => void }) {
  const { state, run, uploadImage } = useAdmin();
  const [busy, setBusy] = useState(false);
  // Cópia para editar; a foto publicada vira URL completa só para a prévia.
  const [form, setForm] = useState<Product>(() => structuredClone({ ...product, image: product.image ? imageSrc(product.image) : "" }));
  const [newCat, setNewCat] = useState("");
  const [tried, setTried] = useState(false);
  const isNew = !product.id;

  const set = (patch: Partial<Product>) => setForm({ ...form, ...patch });
  const toggleSize = (s: string) => {
    const stock = { ...form.stock };
    if (s in stock) delete stock[s];
    else stock[s] = 0;
    set({ stock });
  };
  const errors = {
    name: !form.name.trim() ? "Dê um nome ao produto." : "",
    price: !(form.price > 0) ? "Informe o preço." : "",
    sizes: !Object.keys(form.stock).length ? "Escolha pelo menos um tamanho." : "",
    image: !form.image ? "Adicione uma foto." : "",
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (Object.values(errors).some(Boolean) || busy) return;
    setBusy(true);
    try {
      // Foto nova sobe para o Supabase Storage; foto existente mantém o endereço original.
      const image = /^data:/.test(form.image) ? await uploadImage(form.image) : product.image;
      if (run((s) => saveProduct(s, { ...form, image }), isNew ? "Produto cadastrado" : "Produto atualizado")) onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function createCategory() {
    const name = newCat.trim();
    if (run((s) => addCategory(s, name), `Categoria "${name}" criada`)) {
      set({ category: name });
      setNewCat("");
    }
  }

  return (
    <Drawer
      open
      onOpenChange={(v) => !v && onClose()}
      title={isNew ? "Novo produto" : "Editar produto"}
      description={isNew ? "Preencha os dados e solte a foto da peça." : form.name}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-fill h-11 rounded-full px-5 text-sm">Cancelar</button>
          <button type="submit" form="product-form" disabled={busy} aria-busy={busy} className="btn btn-primary btn-shine flex h-11 items-center gap-2 rounded-full px-6 text-sm font-medium">
            {busy && <Loader2 className="size-4 animate-spin" />} {busy ? "Enviando foto" : isNew ? "Cadastrar" : "Salvar"}
          </button>
        </div>
      }
    >
      <form id="product-form" onSubmit={submit} className="space-y-5" noValidate>
        <ImageDrop value={form.image} onChange={(image) => set({ image })} error={tried ? errors.image : ""} />

        <Field label="Nome" htmlFor="p-name" error={tried ? errors.name : ""}>
          <input id="p-name" value={form.name} onChange={(e) => set({ name: e.target.value })} aria-invalid={tried && !!errors.name} placeholder="Ex.: Vestido Longo Cetim" className={inputCls} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Preço (R$)" htmlFor="p-price" error={tried ? errors.price : ""}>
            <input
              id="p-price"
              inputMode="decimal"
              defaultValue={form.price ? form.price.toFixed(2).replace(".", ",") : ""}
              onChange={(e) => set({ price: Number(e.target.value.replace(/\./g, "").replace(",", ".")) || 0 })}
              aria-invalid={tried && !!errors.price}
              placeholder="149,90"
              className={`${inputCls} tabular-nums`}
            />
          </Field>
          <Field label="Categoria" htmlFor="p-cat">
            <select id="p-cat" value={form.category} onChange={(e) => set({ category: e.target.value })} className={inputCls}>
              {state.catalog.categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex gap-2">
          <input aria-label="Nova categoria" value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Ou crie uma categoria nova" className={inputCls} />
          <button type="button" onClick={createCategory} disabled={!newCat.trim()} className="btn btn-fill h-11 shrink-0 rounded-2xl px-4 text-sm">Criar</button>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Tamanhos e estoque</legend>
          <div className="flex flex-wrap gap-1.5">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={s in form.stock}
                onClick={() => toggleSize(s)}
                className={`btn h-9 min-w-11 rounded-full px-3 text-xs ${s in form.stock ? "btn-primary" : "btn-fill"}`}
              >
                {s === "U" ? "Único" : s}
              </button>
            ))}
          </div>
          {tried && errors.sizes && <p className="text-xs text-[#a1262b] dark:text-[#f3a5a8]">{errors.sizes}</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SIZES.filter((s) => s in form.stock).map((s) => (
              <label key={s} className="flex items-center gap-2 rounded-2xl border border-border p-2 pl-4 text-sm">
                <span className="w-10 font-medium">{s === "U" ? "Único" : s}</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  aria-label={`Estoque do tamanho ${s}`}
                  value={form.stock[s]}
                  onChange={(e) => set({ stock: { ...form.stock, [s]: Math.max(0, Math.floor(Number(e.target.value) || 0)) } })}
                  className="h-9 w-full rounded-xl bg-muted px-2 text-center tabular-nums outline-none focus:ring-2 focus:ring-rose/40"
                />
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Total: {Object.values(form.stock).reduce((a, b) => a + b, 0)} unidades. Mudanças de estoque ficam registradas em Estoque.</p>
        </fieldset>

        <label className="flex items-center justify-between rounded-2xl border border-border p-4 text-sm">
          <span>
            <span className="font-medium">Mostrar na loja</span>
            <span className="block text-xs text-muted-foreground">Desligado, a peça fica só no painel.</span>
          </span>
          <Switch checked={!form.hidden} onCheckedChange={(v) => set({ hidden: !v })} className="data-[state=checked]:bg-rose" />
        </label>
      </form>
    </Drawer>
  );
}
