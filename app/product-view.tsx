"use client";

// Página ampliada do produto (abre por cima da loja): galeria, cores, tamanho, quantidade e sacola.
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, MessageCircle, Minus, Plus, RefreshCw, ShoppingBag, Truck, X } from "lucide-react";
import { Dialog as D } from "radix-ui";
import { WHATSAPP, brl, colorsOf, imageSrc, photosOf, sizesOf, totalStock, whatsappUrl, type Product } from "./products";

const ease = [0.16, 1, 0.3, 1] as const;

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
  const [photo, setPhoto] = useState(0);
  const sizes = sizesOf(p);
  const [size, setSize] = useState(() => sizes.find((s) => p.stock[s] > 0) ?? "");
  const [qty, setQty] = useState(1);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const colors = colorsOf(p, list);
  const left = size ? (p.stock[size] ?? 0) - inBag(p.id, size) : 0;
  const soldOut = totalStock(p) === 0;
  const related = list.filter((x) => x.category === p.category && x.id !== p.id && x.model !== p.model && !x.hidden).slice(0, 4);

  // setas do teclado trocam a foto
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setPhoto((i) => (i + 1) % photos.length);
      if (e.key === "ArrowLeft") setPhoto((i) => (i - 1 + photos.length) % photos.length);
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [photos.length]);

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
          <div
            className="relative aspect-[3/4] cursor-zoom-in overflow-hidden rounded-[1.5rem] bg-muted"
            onPointerMove={(e) => {
              if (e.pointerType !== "mouse" || reduce) return;
              const r = e.currentTarget.getBoundingClientRect();
              setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
            }}
            onPointerLeave={() => setZoom(null)}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.img
                key={photos[photo]}
                src={imageSrc(photos[photo])}
                alt={`${p.name}, foto ${photo + 1} de ${photos.length}`}
                initial={reduce ? false : { opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: zoom ? 1.8 : 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease }}
                style={{ transformOrigin: zoom ? `${zoom.x}% ${zoom.y}%` : "50% 50%" }}
                className="absolute inset-0 size-full object-cover"
              />
            </AnimatePresence>
            {photos.length > 1 && (
              <>
                <button onClick={() => setPhoto((i) => (i - 1 + photos.length) % photos.length)} aria-label="Foto anterior" className="btn glass absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full">
                  <ChevronLeft className="size-5" />
                </button>
                <button onClick={() => setPhoto((i) => (i + 1) % photos.length)} aria-label="Próxima foto" className="btn glass absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full">
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}
          </div>
          {photos.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-none" role="tablist" aria-label="Fotos do produto">
              {photos.map((src, i) => (
                <button
                  key={src}
                  role="tab"
                  aria-selected={i === photo}
                  aria-label={`Ver foto ${i + 1}`}
                  onClick={() => setPhoto(i)}
                  className={`size-16 shrink-0 overflow-hidden rounded-xl ring-2 transition-[box-shadow,opacity] duration-300 ${i === photo ? "ring-rose" : "opacity-60 ring-transparent hover:opacity-100"}`}
                >
                  <img src={imageSrc(src)} alt="" className="size-full object-cover" />
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
              {soldOut ? "Esgotado no momento." : size && p.stock[size] <= 2 ? `Últimas ${p.stock[size]} no tamanho ${size}.` : ""}
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
              <span>Trocas conforme a <button
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

      {related.length > 0 && (
        <div className="border-t border-border p-6 md:p-8">
          <p className="font-display text-2xl">Combina com você</p>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {related.map((r) => (
              <button key={r.id} onClick={() => onOpen(r.id)} className="group text-left">
                <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-muted">
                  <img src={imageSrc(r.image)} alt="" loading="lazy" className="size-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-105" />
                </div>
                <p className="mt-2 truncate text-sm">{r.name}</p>
                <p className="text-sm font-medium tabular-nums">{brl(r.price)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
