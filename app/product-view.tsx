"use client";

// Página ampliada do produto (abre por cima da loja): galeria, cores, tamanho, quantidade e sacola.
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, MessageCircle, Minus, Plus, RefreshCw, ShoppingBag, Truck, X } from "lucide-react";
import { Dialog as D } from "radix-ui";
import { WHATSAPP, brl, colorsOf, focusPos, imageSrc, photosOf, sizesOf, totalStock, whatsappUrl, type Product } from "./products";

const ease = [0.16, 1, 0.3, 1] as const;

type View = { src: string; label: string; pos: string; scale: number };

// Fotos reais primeiro. Com menos de 3, completa com aproximações da própria foto principal
// (decote, cintura, barra), sem inventar imagem que a peça não tem.
export function galleryViews(p: Product, photos: string[]): View[] {
  const [fx, fy] = p.focus ?? [50, 18];
  const clamp = (n: number) => Math.min(96, Math.max(4, n));
  const real = photos.map((src, i) => ({ src, label: i === 0 ? "Foto principal" : `Foto ${i + 1}`, pos: i === 0 ? focusPos(p) : "50% 25%", scale: 1 }));
  if (real.length >= 3) return real;
  const details = [
    { label: "Detalhe do decote", pos: `${fx}% ${clamp(fy + 16)}%`, scale: 2 },
    { label: "Detalhe da cintura", pos: `${fx}% ${clamp(fy + 40)}%`, scale: 1.9 },
    { label: "Detalhe da barra", pos: `${fx}% ${clamp(fy + 66)}%`, scale: 1.8 },
  ].map((d) => ({ ...d, src: photos[0] }));
  return [...real, ...details].slice(0, real.length + 3);
}

function ViewImage({ view, alt, eager }: { view: View; alt: string; eager?: boolean }) {
  return (
    <img
      src={imageSrc(view.src)}
      alt={alt}
      draggable={false}
      loading={eager ? "eager" : "lazy"}
      className="pointer-events-none absolute inset-0 size-full select-none object-cover"
      style={{ objectPosition: view.pos, transform: view.scale > 1 ? `scale(${view.scale})` : undefined, transformOrigin: view.pos }}
    />
  );
}

export function ProductView({ product, list, inBag, onAdd, onOpen, onClose }: {
  product: Product | null;
  list: Product[];
  inBag: (id: string, size: string) => number;
  onAdd: (id: string, size: string, qty: number) => boolean;
  onOpen: (id: string) => void;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  // Radix cuida de foco, Esc e leitor de tela; a animação de entrada/saída é do Motion
  // (as animações CSS de saída do componente padrão podiam travar a janela aberta).
  return (
    <D.Root open={!!product} onOpenChange={(v) => !v && onClose()}>
      <AnimatePresence>
        {product && (
          <D.Portal forceMount>
            <D.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-[color-mix(in_oklab,var(--plum)_28%,transparent)] backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
              />
            </D.Overlay>
            <D.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                data-lenis-prevent
                className="fixed inset-0 z-50 overflow-y-auto bg-background outline-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[92dvh] sm:w-[min(64rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[2rem] sm:shadow-2xl"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.2 } }}
                transition={{ duration: 0.45, ease }}
              >
                <Body key={product.id} p={product} list={list} inBag={inBag} onAdd={onAdd} onOpen={onOpen} onClose={onClose} />
              </motion.div>
            </D.Content>
          </D.Portal>
        )}
      </AnimatePresence>
    </D.Root>
  );
}

function Body({ p, list, inBag, onAdd, onOpen, onClose }: {
  p: Product; list: Product[]; inBag: (id: string, size: string) => number; onAdd: (id: string, size: string, qty: number) => boolean; onOpen: (id: string) => void; onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const photos = photosOf(p);
  const views = galleryViews(p, photos);
  const [[photo, dir], setPhotoDir] = useState<[number, number]>([0, 0]);
  const go = (d: number) => setPhotoDir(([i]) => [(i + d + views.length) % views.length, d]);
  const sizes = sizesOf(p);
  const [size, setSize] = useState(() => sizes.find((s) => p.stock[s] > 0) ?? "");
  const [qty, setQty] = useState(1);
  const colors = colorsOf(p, list);
  const left = size ? (p.stock[size] ?? 0) - inBag(p.id, size) : 0;
  const soldOut = totalStock(p) === 0;
  // Mesma categoria primeiro, depois o resto; sem repetir o modelo aberto.
  const others = list.filter((x) => x.id !== p.id && x.model !== p.model && !x.hidden);
  const related = [...others.filter((x) => x.category === p.category), ...others.filter((x) => x.category !== p.category)].slice(0, 10);

  // setas do teclado trocam a foto
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [views.length]);

  function add() {
    if (!size) return;
    if (onAdd(p.id, size, qty)) setQty(1);
  }

  return (
    <div>
      <button onClick={onClose} aria-label="Fechar" className="btn glass absolute right-4 top-4 z-20 grid size-11 place-items-center rounded-full">
        <X className="size-5" strokeWidth={1.5} />
      </button>

      <div className="grid md:grid-cols-[1.1fr_1fr]">
        {/* Galeria */}
        <div className="bg-muted/60 p-3 md:p-4">
          {/* Arraste para os lados no celular; setas e teclado no computador. */}
          <motion.div
            className="relative aspect-[3/4] touch-pan-y overflow-hidden rounded-[1.5rem] bg-muted"
            drag={views.length > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              if (info.offset.x < -50 || info.velocity.x < -400) go(1);
              else if (info.offset.x > 50 || info.velocity.x > 400) go(-1);
            }}
          >
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.div
                key={photo}
                custom={dir}
                className="absolute inset-0"
                variants={{
                  enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d >= 0 ? "12%" : "-12%" }),
                  center: { opacity: 1, x: 0 },
                  exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d >= 0 ? "-12%" : "12%" }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.5, ease }}
              >
                <ViewImage view={views[photo]} alt={`${p.name}: ${views[photo].label}`} eager />
              </motion.div>
            </AnimatePresence>
            {views.length > 1 && (
              <>
                <button onClick={() => go(-1)} aria-label="Foto anterior" className="btn glass absolute left-3 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full">
                  <ChevronLeft className="size-5" />
                </button>
                <button onClick={() => go(1)} aria-label="Próxima foto" className="btn glass absolute right-3 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full">
                  <ChevronRight className="size-5" />
                </button>
                <span className="glass absolute bottom-3 left-3 z-10 rounded-full px-3 py-1 text-xs font-medium tabular-nums">
                  {photo + 1} / {views.length} · {views[photo].label}
                </span>
              </>
            )}
          </motion.div>
          {views.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-none" role="tablist" aria-label="Fotos do produto">
              {views.map((v, i) => (
                <button
                  key={i}
                  role="tab"
                  aria-selected={i === photo}
                  aria-label={`Ver ${v.label}`}
                  onClick={() => setPhotoDir([i, i > photo ? 1 : -1])}
                  className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-xl ring-2 transition-[box-shadow,opacity] duration-300 ${i === photo ? "ring-rose" : "opacity-60 ring-transparent hover:opacity-100"}`}
                >
                  <ViewImage view={v} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Informações e compra */}
        <div className="flex flex-col p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{p.category}</p>
          <D.Title className="mt-2 font-display text-4xl font-medium leading-tight md:text-5xl">{p.model ?? p.name}</D.Title>
          <p className="mt-3 text-2xl font-semibold tabular-nums">{brl(p.price)}</p>

          {colors.length > 0 && p.color && (
            <div className="mt-7">
              <p className="text-sm">
                Cor: <span className="font-medium">{p.color}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2.5" role="radiogroup" aria-label="Cor">
                {colors.map((c) => (
                  <button
                    key={c.id}
                    role="radio"
                    aria-checked={c.id === p.id}
                    aria-label={`${c.color ?? c.name}${totalStock(c) === 0 ? ", esgotado" : ""}`}
                    title={c.color}
                    onClick={() => c.id !== p.id && onOpen(c.id)}
                    className={`relative size-10 rounded-full ring-2 ring-offset-2 ring-offset-background transition-[box-shadow,transform] duration-300 hover:scale-105 ${c.id === p.id ? "ring-rose" : "ring-border"}`}
                    style={{ background: c.colorHex ?? "#ccc" }}
                  >
                    {totalStock(c) === 0 && <span className="absolute inset-0 m-auto h-0.5 w-8 -rotate-45 rounded bg-background/90" aria-hidden />}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-7">
            <p className="text-sm">Tamanho</p>
            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Tamanho">
              {sizes.map((s) => {
                const out = (p.stock[s] ?? 0) === 0;
                return (
                  <button
                    key={s}
                    role="radio"
                    aria-checked={size === s}
                    disabled={out}
                    onClick={() => { setSize(s); setQty(1); }}
                    className={`btn h-11 min-w-12 rounded-full px-4 text-sm ${size === s ? "btn-primary" : "btn-fill"} ${out ? "line-through" : ""}`}
                  >
                    {s === "U" ? "Único" : s}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 h-5 text-xs text-rose" aria-live="polite">
              {soldOut ? "Esgotado no momento." : size && p.stock[size] <= 2 ? (p.stock[size] === 1 ? `Última peça no tamanho ${size}.` : `Últimas ${p.stock[size]} no tamanho ${size}.`) : ""}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex h-12 items-center rounded-full border border-border">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Diminuir quantidade" className="btn grid size-12 place-items-center rounded-full"><Minus className="size-4" /></button>
              <span className="w-8 text-center tabular-nums" aria-live="polite">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(Math.max(1, left), q + 1))} disabled={qty >= left} aria-label="Aumentar quantidade" className="btn grid size-12 place-items-center rounded-full"><Plus className="size-4" /></button>
            </div>
            <button onClick={add} disabled={soldOut || !size || left <= 0} className="btn btn-primary btn-shine flex h-12 flex-1 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium">
              <ShoppingBag className="size-4" strokeWidth={1.5} /> {left <= 0 && size ? "Já está tudo na sacola" : "Adicionar à sacola"}
            </button>
          </div>
          <a
            href={whatsappUrl(`Oi, Maviê! Quero o ${p.name}${size ? ` no tamanho ${size}` : ""} (${brl(p.price)}).`, WHATSAPP)}
            target="_blank"
            rel="noreferrer"
            className="btn btn-fill mt-3 flex h-12 items-center justify-center gap-2 rounded-full text-sm"
          >
            <MessageCircle className="size-4" strokeWidth={1.5} /> Comprar pelo WhatsApp
          </a>

          <ul className="mt-7 space-y-3 border-t border-border pt-6 text-sm text-muted-foreground">
            <li className="flex gap-3"><Truck className="mt-0.5 size-4 shrink-0 text-rose" strokeWidth={1.5} /> Entregamos em Brasília. Pagamento e entrega combinados no WhatsApp.</li>
            <li className="flex gap-3">
              <RefreshCw className="mt-0.5 size-4 shrink-0 text-rose" strokeWidth={1.5} />
              <span>Trocas em até 7 dias corridos, conforme a <button
                  type="button"
                  onClick={() => { onClose(); setTimeout(() => document.getElementById("trocas")?.scrollIntoView({ behavior: "smooth" }), 250); }}
                  className="text-foreground underline underline-offset-4 hover:text-rose"
                >
                  política de troca
                </button>.</span>
            </li>
          </ul>
        </div>
      </div>

      {related.length > 0 && <Related items={related} list={list} onOpen={onOpen} />}
    </div>
  );
}

// Carrossel "Combina com você": rolagem com encaixe, setas no computador, arrastar no celular.
function Related({ items, list, onOpen }: { items: Product[]; list: Product[]; onOpen: (id: string) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const update = () => {
    const t = track.current;
    if (t) setEdge({ start: t.scrollLeft < 8, end: t.scrollLeft + t.clientWidth > t.scrollWidth - 8 });
  };
  useEffect(update, [items.length]);
  const scroll = (d: number) => track.current?.scrollBy({ left: d * track.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <div className="border-t border-border py-6 md:py-8">
      <div className="flex items-end justify-between gap-4 px-6 md:px-8">
        <div>
          <p className="font-display text-3xl">Combina com você</p>
          <p className="text-sm text-muted-foreground">Mais peças para completar o look.</p>
        </div>
        <div className="hidden gap-2 sm:flex">
          <button onClick={() => scroll(-1)} disabled={edge.start} aria-label="Ver peças anteriores" className="btn btn-fill grid size-11 place-items-center rounded-full"><ChevronLeft className="size-5" /></button>
          <button onClick={() => scroll(1)} disabled={edge.end} aria-label="Ver mais peças" className="btn btn-fill grid size-11 place-items-center rounded-full"><ChevronRight className="size-5" /></button>
        </div>
      </div>
      <div ref={track} onScroll={update} className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-6 px-6 pb-2 scrollbar-none md:scroll-px-8 md:px-8">
        {items.map((r) => {
          const out = totalStock(r) === 0;
          const swatches = colorsOf(r, list);
          return (
            <button key={r.id} onClick={() => onOpen(r.id)} className="group w-[44%] shrink-0 snap-start text-left sm:w-[30%] lg:w-[22%]">
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted transition-[translate,box-shadow] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-rose)]">
                <img
                  src={imageSrc(r.image)}
                  alt=""
                  loading="lazy"
                  style={{ objectPosition: focusPos(r) }}
                  className={`size-full object-cover ${out ? "opacity-60 grayscale" : ""}`}
                />
              </div>
              <p className="mt-3 line-clamp-1 text-sm font-medium">{r.name}</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-sm tabular-nums">{out ? <span className="text-rose">Esgotado</span> : brl(r.price)}</p>
                {swatches.length > 1 && (
                  <span className="flex -space-x-1" aria-label={`${swatches.length} cores`}>
                    {swatches.map((c) => <span key={c.id} className="size-3.5 rounded-full ring-2 ring-background" style={{ background: c.colorHex ?? "#ccc" }} />)}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
