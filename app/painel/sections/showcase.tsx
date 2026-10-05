"use client";

// Vitrine: escolhe as fotos que passam no destaque da página inicial e a foto menor da colagem.
// Cada foto aponta para uma peça (o cartão do destaque abre a peça); dá para enviar foto nova na hora.
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, ExternalLink, ImagePlus, Loader2, RefreshCw, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { BASE, MAX_HERO_SLIDES, brl, focusPos, heroOf, imageSrc, photosOf, type HeroConfig, type HeroSlide, type Product } from "../../products";
import { addProductPhoto, setHero } from "../admin-logic";
import { useAdmin } from "../admin-store";
import { Card, Drawer, ImageDrop, PageHeader, ease, inputCls } from "../ui";

type Target = { kind: "add" } | { kind: "replace"; index: number } | { kind: "small" };

// Foto principal usa o enquadramento pelo rosto; fotos extras ficam centralizadas no alto.
const posFor = (p: Product | undefined, image: string) => (p && image === p.image ? focusPos(p) : "50% 25%");

export default function Showcase() {
  const { state, run, local } = useAdmin();
  const products = state.catalog.products;
  const visible = products.filter((p) => !p.hidden);
  // Começa do que a loja mostra hoje (inclusive o padrão, se a vitrine nunca foi configurada).
  const hero: HeroConfig = heroOf(state.catalog, visible);
  const [target, setTarget] = useState<Target | null>(null);
  const byId = (id: string) => products.find((p) => p.id === id);

  const save = (next: HeroConfig, msg: string) => run((s) => setHero(s, next), msg);
  const move = (i: number, d: number) => {
    const slides = [...hero.slides];
    [slides[i], slides[i + d]] = [slides[i + d], slides[i]];
    save({ ...hero, slides }, "Vitrine: ordem das fotos alterada");
  };
  const remove = (i: number) => save({ ...hero, slides: hero.slides.filter((_, k) => k !== i) }, "Vitrine: foto removida do destaque");

  // Aplica a foto escolhida no lugar certo (nova, troca ou foto menor).
  const apply = (slide: HeroSlide, t: Target): HeroConfig =>
    t.kind === "add"
      ? { ...hero, slides: [...hero.slides, slide] }
      : t.kind === "replace"
        ? { ...hero, slides: hero.slides.map((s, k) => (k === t.index ? slide : s)) }
        : { ...hero, small: slide };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vitrine"
        description={`As fotos do destaque da página inicial. Troque, mude a ordem ou adicione fotos. ${local ? "No modo local, a loja online só mostra a nova vitrine depois que o banco for conectado." : "A loja usa a nova vitrine na hora."}`}
        actions={
          <a href={`${BASE}/`} target="_blank" rel="noreferrer" className="btn btn-fill flex h-11 items-center gap-2 rounded-full px-5 text-sm">
            <ExternalLink className="size-4" strokeWidth={1.5} /> Ver na loja
          </a>
        }
      />

      <Card title="Fotos que passam no destaque" action={<span className="text-xs tabular-nums text-muted-foreground">{hero.slides.length} de {MAX_HERO_SLIDES}</span>}>
        <p className="-mt-2 mb-4 text-sm text-muted-foreground">Elas se alternam a cada 5 segundos, nesta ordem. O cartão em cima da foto mostra o nome e o preço da peça.</p>
        <motion.ul layout className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <AnimatePresence initial={false}>
            {hero.slides.map((s, i) => {
              const p = byId(s.productId);
              return (
                <motion.li
                  layout
                  key={`${s.productId}-${s.image}-${i}`}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.45, ease }}
                  className="box p-2"
                >
                  <div className="relative">
                    <img src={imageSrc(s.image)} alt={p?.name ?? ""} style={{ objectPosition: posFor(p, s.image) }} className="aspect-[3/4] w-full rounded-xl object-cover" />
                    <span className="glass absolute left-2 top-2 grid size-7 place-items-center rounded-full text-xs font-semibold tabular-nums">{i + 1}</span>
                  </div>
                  <p className="mt-2 truncate px-1 text-sm font-medium">{p?.name ?? "Peça removida"}</p>
                  <p className="px-1 text-xs tabular-nums text-muted-foreground">{p ? brl(p.price) : ""}</p>
                  <div className="mt-2 grid grid-cols-4 gap-1">
                    <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Mover para antes" className="btn btn-fill grid h-9 place-items-center rounded-full"><ArrowLeft className="size-4" strokeWidth={1.5} /></button>
                    <button onClick={() => move(i, 1)} disabled={i === hero.slides.length - 1} aria-label="Mover para depois" className="btn btn-fill grid h-9 place-items-center rounded-full"><ArrowRight className="size-4" strokeWidth={1.5} /></button>
                    <button onClick={() => setTarget({ kind: "replace", index: i })} aria-label="Trocar foto" title="Trocar foto" className="btn btn-fill grid h-9 place-items-center rounded-full"><RefreshCw className="size-4" strokeWidth={1.5} /></button>
                    <button onClick={() => remove(i)} disabled={hero.slides.length === 1} aria-label="Remover do destaque" title="Remover" className="btn btn-fill grid h-9 place-items-center rounded-full"><Trash2 className="size-4" strokeWidth={1.5} /></button>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
          {hero.slides.length < MAX_HERO_SLIDES && (
            <motion.li layout>
              <button
                onClick={() => setTarget({ kind: "add" })}
                className="grid aspect-[3/4] w-full place-items-center rounded-3xl border-2 border-dashed border-border text-center text-sm text-muted-foreground transition-colors duration-300 hover:border-rose/60 hover:bg-muted/50"
              >
                <span>
                  <span className="bg-grad mx-auto mb-3 grid size-12 place-items-center rounded-2xl text-white"><ImagePlus className="size-5" strokeWidth={1.5} /></span>
                  Adicionar foto
                </span>
              </button>
            </motion.li>
          )}
        </motion.ul>
      </Card>

      <Card title="Foto menor" action={<span className="text-xs text-muted-foreground">fica sobre a foto principal</span>}>
        {hero.small ? (
          <div className="flex items-center gap-4">
            <img src={imageSrc(hero.small.image)} alt="" style={{ objectPosition: posFor(byId(hero.small.productId), hero.small.image) }} className="h-32 w-24 shrink-0 rounded-2xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{byId(hero.small.productId)?.name}</p>
              <p className="text-sm text-muted-foreground">Ao clicar nela, a cliente abre a peça.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => setTarget({ kind: "small" })} className="btn btn-fill flex h-10 items-center gap-2 rounded-full px-4 text-sm"><RefreshCw className="size-4" strokeWidth={1.5} /> Trocar</button>
                <button onClick={() => save({ ...hero, small: null }, "Vitrine: foto menor removida")} className="btn btn-fill flex h-10 items-center gap-2 rounded-full px-4 text-sm"><Trash2 className="size-4" strokeWidth={1.5} /> Tirar</button>
              </div>
            </div>
          </div>
        ) : (
          <button onClick={() => setTarget({ kind: "small" })} className="btn btn-fill flex h-11 items-center gap-2 rounded-full px-5 text-sm"><ImagePlus className="size-4" strokeWidth={1.5} /> Adicionar foto menor</button>
        )}
      </Card>

      {target && (
        <PhotoPicker
          title={target.kind === "add" ? "Adicionar foto" : target.kind === "small" ? "Foto menor" : "Trocar foto"}
          visible={visible}
          onClose={() => setTarget(null)}
          onPick={(slide, newPhoto) => {
            const next = apply(slide, target);
            const name = byId(slide.productId)?.name ?? "peça";
            const msg = target.kind === "add" ? `Vitrine: ${name} adicionada ao destaque` : target.kind === "small" ? `Vitrine: foto menor agora é ${name}` : `Vitrine: foto trocada por ${name}`;
            // foto recém-enviada entra nas fotos da peça e na vitrine na mesma gravação
            const ok = run((s) => setHero(newPhoto ? addProductPhoto(s, slide.productId, slide.image) : s, next), msg);
            if (ok) setTarget(null);
          }}
        />
      )}
    </div>
  );
}

function PhotoPicker({ title, visible, onClose, onPick }: {
  title: string;
  visible: Product[];
  onClose: () => void;
  onPick: (slide: HeroSlide, newPhoto: boolean) => void;
}) {
  const { uploadImage } = useAdmin();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const list = visible.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));

  async function sendNew(p: Product) {
    if (!draft || busy) return;
    if ((p.gallery ?? []).length >= 6) return toast.error(`${p.name} já tem 6 fotos extras. Remova uma em Produtos para adicionar outra.`);
    setBusy(true);
    try {
      const url = await uploadImage(draft);
      onPick({ productId: p.id, image: url }, true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer open onOpenChange={(v) => !v && onClose()} title={title} description="Escolha a peça e depois a foto. Também dá para enviar uma foto nova da peça.">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
        <input aria-label="Buscar peça" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar peça" className={`${inputCls} pl-11`} />
      </div>
      <ul className="mt-4 space-y-2">
        {list.map((p) => {
          const expanded = open === p.id;
          return (
            <li key={p.id} className="box overflow-hidden">
              <button
                type="button"
                onClick={() => { setOpen(expanded ? null : p.id); setDraft(""); }}
                aria-expanded={expanded}
                className="flex w-full items-center gap-3 p-2 text-left"
              >
                <img src={imageSrc(p.image)} alt="" style={{ objectPosition: focusPos(p) }} className="h-16 w-12 shrink-0 rounded-xl object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{photosOf(p).length} {photosOf(p).length === 1 ? "foto" : "fotos"} · {brl(p.price)}</span>
                </span>
              </button>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-3 gap-2 border-t border-border p-2">
                      {photosOf(p).map((src, i) => (
                        <button
                          key={src}
                          type="button"
                          onClick={() => onPick({ productId: p.id, image: src }, false)}
                          aria-label={`Usar ${i === 0 ? "a foto principal" : `a foto ${i + 1}`} de ${p.name}`}
                          className="group relative overflow-hidden rounded-xl ring-2 ring-transparent transition-[box-shadow] duration-300 hover:ring-rose"
                        >
                          <img src={imageSrc(src)} alt="" style={{ objectPosition: posFor(p, src) }} className="aspect-[3/4] w-full object-cover" />
                          <span className="glass absolute inset-x-1 bottom-1 rounded-full py-1 text-center text-[11px] font-medium">Usar esta</span>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-border p-3">
                      <p className="mb-2 flex items-center gap-2 text-sm font-medium"><Upload className="size-4 text-rose" strokeWidth={1.5} /> Enviar foto nova desta peça</p>
                      <div className="mx-auto max-w-[200px]">
                        <ImageDrop value={draft} onChange={setDraft} />
                      </div>
                      <button
                        type="button"
                        onClick={() => sendNew(p)}
                        disabled={!draft || busy}
                        className="btn btn-primary btn-shine mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium"
                      >
                        {busy && <Loader2 className="size-4 animate-spin" />} {busy ? "Enviando foto" : "Usar foto nova"}
                      </button>
                      <p className="mt-2 text-center text-xs text-muted-foreground">A foto também entra nas fotos da peça, na página do produto.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
        {!list.length && <li className="py-8 text-center text-sm text-muted-foreground">Nenhuma peça encontrada.</li>}
      </ul>
    </Drawer>
  );
}
