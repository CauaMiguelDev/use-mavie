"use client";

// Forma: fotos e caixas com cantos suaves (rounded-2xl/3xl), controles em pílula.
// Cor: família rosa mesclada (plum → rose → blush/peach) via --grad; um acento só.
import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowRight, ArrowUp, Camera, Check, Menu, Minus, Plus, ShoppingBag, Truck, MessageCircle, Shirt, X, Ban, Tag, Package, Link2, MapPin, Sparkle } from "lucide-react";
import { Toaster, toast } from "sonner";
import { BASE, WHATSAPP, img, brl, formatPhone, imageSrc, orderMessage, sizesOf, totalStock, whatsappUrl, INSTAGRAM, type BagItem, type Product } from "./products";

import { useLiveCatalog } from "./supabase";
import { ProductView } from "./product-view";
import { Magnetic, RevealText, ScrollProgress, SilkBackground, Sparkles, Tilt, VelocityMarquee, useButtonSpotlight } from "./fx";

const ease = [0.16, 1, 0.3, 1] as const;
const heroLooks = ["longo-fenda-preto", "recorte-azul", "midi-vinho", "costas-nuas-preto"];
const sections = [
  { id: "catalogo", label: "Catálogo" },
  { id: "looks", label: "Looks" },
  { id: "loja", label: "A loja" },
  { id: "trocas", label: "Trocas" },
];

export default function Store() {
  // Estoque e preços ao vivo (Supabase); cai para o catálogo estático se o banco não responder.
  const cat = useLiveCatalog();
  const list = cat.products;
  const visible = list.filter((p) => !p.hidden);
  const [bag, setBag] = useState<BagItem[]>([]);
  const [open, setOpen] = useState(false);

  useButtonSpotlight();

  // Rolagem suave (desligada com movimento reduzido).
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ autoRaf: true, lerp: 0.09, anchors: { offset: -96 } });
    return () => lenis.destroy();
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mavie-bag");
      if (saved) setBag(JSON.parse(saved));
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("mavie-bag", JSON.stringify(bag)); } catch {}
  }, [bag]);

  // A sacola acompanha o estoque ao vivo: peça que esgotou sai, quantidade acima do estoque é reduzida.
  const bagItems = bag.flatMap((i) => {
    const p = visible.find((x) => x.id === i.id);
    const qty = Math.min(i.qty, p?.stock[i.size] ?? 0);
    return qty > 0 ? [{ ...i, qty }] : [];
  });
  const count = bagItems.reduce((n, i) => n + i.qty, 0);
  const qtyOf = (id: string, size: string) => bagItems.filter((i) => i.id === id && i.size === size).reduce((n, i) => n + i.qty, 0);

  function add(id: string, size: string, qty = 1) {
    const prod = list.find((p) => p.id === id)!;
    const left = prod.stock[size] ?? 0;
    if (qtyOf(id, size) + qty > left) {
      toast(`Só temos ${left} ${left === 1 ? "unidade" : "unidades"} de ${prod.name} no tamanho ${size}.`);
      return false;
    }
    setBag((b) => {
      const hit = b.find((i) => i.id === id && i.size === size);
      return hit ? b.map((i) => (i === hit ? { ...i, qty: i.qty + qty } : i)) : [...b, { id, size, qty }];
    });
    toast(`${qty > 1 ? `${qty}x ` : ""}${prod.name} (${size}) na sacola`, { action: { label: "Ver sacola", onClick: () => setOpen(true) } });
    return true;
  }

  // Página do produto. Um link com #p/id abre o produto ao carregar a loja.
  // ponytail: abrir/fechar não mexe no endereço; o roteador do vinext pausa a renderização a cada
  // mudança de URL e trava as animações. Se o "voltar" do celular precisar fechar, revisar com o vinext estável.
  const [viewId, setViewId] = useState<string | null>(null);
  useEffect(() => {
    const m = /^#p\/(.+)$/.exec(location.hash);
    if (m) setViewId(decodeURIComponent(m[1]));
  }, []);
  const openProduct = (id: string) => setViewId(id);
  const closeProduct = () => setViewId(null);
  const viewing = visible.find((p) => p.id === viewId) ?? null;

  function change(item: BagItem, delta: number) {
    const prod = list.find((p) => p.id === item.id)!;
    if (delta > 0 && qtyOf(item.id, item.size) >= (prod.stock[item.size] ?? 0)) return;
    setBag((b) => b.map((i) => (i.id === item.id && i.size === item.size ? { ...i, qty: i.qty + delta } : i)).filter((i) => i.qty > 0));
  }

  return (
    <div className="grain">
      <ScrollProgress />
      <Nav count={count} onBag={() => setOpen(true)} />
      <main>
        <Hero />
        <Marquee />
        <Catalog items={visible} categories={cat.categories} onAdd={add} onOpen={openProduct} />
        <Lookbook />
        <About />
        <Exchanges />
      </main>
      <Footer whatsapp={WHATSAPP} />
      <WhatsAppFab number={WHATSAPP} hidden={open} />
      <Bag open={open} items={bagItems} list={list} whatsapp={WHATSAPP} onClose={() => setOpen(false)} onChange={change} />
      <ProductView product={viewing} list={visible} inBag={qtyOf} onAdd={add} onOpen={openProduct} onClose={closeProduct} />
      <Toaster position="bottom-center" toastOptions={{ className: "glass", style: { borderRadius: 999, fontFamily: "var(--font-sans)" } }} />
    </div>
  );
}

function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`font-display text-2xl font-semibold tracking-[0.08em] ${className}`}>USEMAVIÊ</span>;
}

// ---------- Nav flutuante: some ao descer, volta ao subir, marca a seção ativa ----------
function Nav({ count, onBag }: { count: number; onBag: () => void }) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");
  const [menu, setMenu] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(y > prev && y > 240 && !menu);
    setScrolled(y > 24);
  });

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    ["topo", ...sections.map((s) => s.id)].forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  return (
    <>
      <motion.header
        animate={{ y: hidden && !reduce ? "-140%" : "0%" }}
        transition={{ duration: 0.5, ease }}
        className="fixed inset-x-0 top-3 z-40 px-3 md:top-4"
      >
        <div
          className={`mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full pl-5 pr-2 transition-[background-color,box-shadow,border-color] duration-500 ${
            scrolled ? "glass" : "border border-transparent"
          }`}
        >
          <a href="#topo" aria-label="USE MAVIÊ, início" className="transition-opacity duration-300 hover:opacity-70">
            <Wordmark className="text-xl md:text-2xl" />
          </a>
          <nav className="hidden items-center gap-1 text-sm md:flex">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`relative rounded-full px-4 py-2 transition-colors duration-300 ${active === s.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {active === s.id && (
                  <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-rose-soft" transition={{ type: "spring", duration: 0.5, bounce: 0.15 }} />
                )}
                {s.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onBag}
              className="btn btn-dark flex h-10 items-center gap-2 rounded-full pl-4 pr-3 text-sm"
              aria-label={`Abrir sacola, ${count} ${count === 1 ? "peça" : "peças"}`}
            >
              <motion.span key={count} initial={{ scale: 0.75 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.45, bounce: 0.5 }} className="grid">
                <ShoppingBag className="size-4" strokeWidth={1.5} />
              </motion.span>
              <span className="hidden sm:inline">Sacola</span>
              <span className="grid size-6 place-items-center overflow-hidden rounded-full bg-grad text-[11px] font-medium text-white">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={count}
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "-100%", opacity: 0 }}
                    transition={{ duration: 0.35, ease }}
                  >
                    {count}
                  </motion.span>
                </AnimatePresence>
              </span>
            </button>
            <button onClick={() => setMenu(true)} aria-label="Abrir menu" className="btn grid size-10 place-items-center rounded-full md:hidden">
              <Menu className="size-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {menu && (
          <motion.div
            className="glass fixed inset-0 z-50 flex flex-col px-6 pb-10 pt-6 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <div className="flex items-center justify-between">
              <Wordmark />
              <button onClick={() => setMenu(false)} aria-label="Fechar menu" className="btn grid size-11 place-items-center rounded-full border border-border">
                <X className="size-5" strokeWidth={1.5} />
              </button>
            </div>
            <nav className="mt-16 flex flex-col gap-2">
              {sections.map((s, i) => (
                <motion.a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={() => setMenu(false)}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.05 + i * 0.06, ease }}
                  className="font-display text-5xl"
                >
                  {s.label}
                </motion.a>
              ))}
            </nav>
            <a href={INSTAGRAM} target="_blank" rel="noreferrer" className="mt-auto inline-flex items-center gap-2 text-muted-foreground">
              <Camera className="size-4" strokeWidth={1.5} /> @usemaviie_
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ---------- Hero ----------
function Hero() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const yBig = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 120]);
  const ySmall = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -160]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -80]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.7], [1, reduce ? 1 : 0]);
  const mouse = useMotionValue({ x: 0.7, y: 0.4 });
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const springy = { stiffness: 60, damping: 20 };
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-6, 6]), springy);
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [5, -5]), springy);
  const shiftX = useSpring(useTransform(mx, [-0.5, 0.5], [-20, 20]), springy);
  const shiftY = useSpring(useTransform(my, [-0.5, 0.5], [-14, 14]), springy);
  const [look, setLook] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setLook((l) => (l + 1) % heroLooks.length), 5000);
    return () => clearTimeout(t);
  }, [reduce, look]);

  return (
    <section
      id="topo"
      ref={ref}
      className="relative overflow-hidden"
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = ref.current!.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        mouse.set({ x, y });
        mx.set(x - 0.5);
        my.set(y - 0.5);
      }}
      onPointerLeave={() => { mx.set(0); my.set(0); }}
    >
      <SilkBackground mouse={mouse} />
      <div className="relative mx-auto grid min-h-[100dvh] max-w-7xl items-center gap-10 px-4 pb-12 pt-28 md:px-8 lg:grid-cols-[1.05fr_1fr] lg:pb-8 lg:pt-24">
        <motion.div style={{ y: textY, opacity: textOpacity }} className="relative z-10">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease }}
            className="glass mb-7 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground"
          >
            <Sparkle className="size-3.5 text-rose" strokeWidth={1.5} /> Moda feminina em Brasília
          </motion.p>
          <h1 className="font-display text-6xl font-medium leading-[1.05] tracking-tight sm:text-7xl lg:text-[6.5rem]">
            {["Divas", "usam"].map((w, i) => (
              <span key={w} className="inline-block overflow-hidden pb-2 align-bottom">
                <motion.span
                  className="inline-block pr-[0.2em]"
                  initial={reduce ? false : { y: "110%", rotate: 4 }}
                  animate={{ y: 0, rotate: 0 }}
                  transition={{ duration: 1.1, delay: 0.15 + i * 0.12, ease }}
                >
                  {w}
                </motion.span>
              </span>
            ))}
            <span className="inline-block pb-3 align-bottom italic" aria-label="Maviê.">
              {"Maviê.".split("").map((ch, i) => (
                <motion.span
                  key={i}
                  aria-hidden
                  className="text-grad letter-shine inline-block"
                  style={{ backgroundSize: "600% 100%", backgroundPosition: `${i * 20}% 50%`, "--i": i } as React.CSSProperties}
                  initial={reduce ? false : { opacity: 0, y: 36, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 1, delay: 0.45 + i * 0.06, ease }}
                >
                  {ch}
                </motion.span>
              ))}
            </span>
          </h1>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8, ease }}
            className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground"
          >
            Peças escolhidas para você ser notada. Monte a sacola e finalize pelo WhatsApp, com entrega em Brasília.
          </motion.p>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.95, ease }}
            className="mt-9 flex flex-wrap gap-3"
          >
            <Magnetic>
              <a href="#catalogo" className="btn btn-primary btn-shine group inline-flex items-center gap-2 rounded-full px-7 py-4 text-sm font-medium">
                Ver catálogo
                <span className="icon-swap" aria-hidden>
                  <ArrowRight className="size-4" strokeWidth={1.5} />
                  <ArrowRight className="size-4" strokeWidth={1.5} />
                </span>
              </a>
            </Magnetic>
            <Magnetic>
              <a href={INSTAGRAM} target="_blank" rel="noreferrer" className="btn btn-fill glass inline-flex items-center gap-2 rounded-full px-7 py-4 text-sm">
                <Camera className="size-4" strokeWidth={1.5} /> @usemaviie_
              </a>
            </Magnetic>
          </motion.div>
        </motion.div>

        {/* Colagem: inclina com o cursor; parallax na rolagem; looks em sequência */}
        <motion.div
          style={reduce ? undefined : { rotateX: rotX, rotateY: rotY, transformPerspective: 1400 }}
          className="relative mx-auto h-[60vh] w-full max-w-[520px] lg:h-[76vh]"
        >
          <motion.div
            style={{ y: yBig }}
            initial={reduce ? false : { clipPath: "inset(100% 0 0 0 round 2rem)" }}
            animate={{ clipPath: "inset(0% 0 0 0 round 2rem)" }}
            transition={{ duration: 1.4, delay: 0.2, ease }}
            className="absolute inset-y-0 right-0 w-[78%] overflow-hidden rounded-[2rem] bg-muted shadow-[0_50px_90px_-40px_color-mix(in_oklab,var(--plum)_70%,transparent)]"
          >
            <AnimatePresence mode="popLayout">
              <motion.img
                key={heroLooks[look]}
                src={img(heroLooks[look])}
                alt="Look da coleção USE MAVIÊ"
                className="absolute inset-0 h-full w-full object-cover"
                initial={reduce ? false : { scale: 1.12, clipPath: "circle(0% at 50% 60%)" }}
                animate={{ scale: 1, clipPath: "circle(110% at 50% 60%)" }}
                exit={{ opacity: 0, transition: { duration: 0.8, delay: 0.6 } }}
                transition={{ clipPath: { duration: 1.4, ease: [0.77, 0, 0.175, 1] }, scale: { duration: 6, ease: "linear" } }}
              />
            </AnimatePresence>
            <div className="absolute inset-x-0 bottom-0 z-10 flex gap-1.5 bg-gradient-to-t from-black/35 to-transparent p-4 pt-10">
              {heroLooks.map((l, i) => (
                <button key={l} aria-label={`Mostrar look ${i + 1}`} onClick={() => setLook(i)} className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/35">
                  {i === look && (
                    <motion.span
                      key={look}
                      className="absolute inset-0 origin-left rounded-full bg-white"
                      initial={{ scaleX: reduce ? 1 : 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 5, ease: "linear" }}
                    />
                  )}
                  {i < look && <span className="absolute inset-0 rounded-full bg-white" />}
                </button>
              ))}
            </div>
          </motion.div>
          <motion.div style={{ y: ySmall }} className="absolute bottom-[8%] left-0 z-10 w-[40%]">
            <motion.div style={reduce ? undefined : { x: shiftX, y: shiftY }}>
              <motion.div
                initial={reduce ? false : { clipPath: "inset(0 100% 0 0 round 1.5rem)" }}
                animate={{ clipPath: "inset(0 0% 0 0 round 1.5rem)" }}
                transition={{ duration: 1.2, delay: 0.7, ease }}
                className="overflow-hidden rounded-3xl border-[6px] border-background shadow-[0_30px_60px_-24px_color-mix(in_oklab,var(--rose)_60%,transparent)]"
              >
                <motion.img
                  src={img("babado-marrom")}
                  alt="Vestido babado cacau"
                  className="aspect-[3/4] w-full object-cover"
                  animate={reduce ? undefined : { scale: [1, 1.07, 1] }}
                  transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.div>
            </motion.div>
          </motion.div>
          <SpinBadge />
          <Sparkles />
        </motion.div>
      </div>
    </section>
  );
}

function SpinBadge() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, delay: 1.1, ease }}
      className="glass absolute left-[4%] top-[2%] z-20 size-28 rounded-full lg:size-32"
    >
      <motion.svg
        viewBox="0 0 100 100"
        className="size-full text-rose"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
      >
        <defs>
          <path id="circle" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" />
        </defs>
        <text fontSize="10" letterSpacing="3" fill="currentColor" style={{ fontFamily: "var(--font-sans)" }}>
          <textPath href="#circle">ENTREGAMOS EM BRASÍLIA ✦ </textPath>
        </text>
      </motion.svg>
      <Truck className="absolute inset-0 m-auto size-7 text-rose" strokeWidth={1.5} />
    </motion.div>
  );
}

function Marquee() {
  const items = ["Vestidos longos", "Vestidos curtos", "Conjuntos", "Corsets", "Bodies", "Entrega em Brasília"];
  const row = [...items, ...items];
  return (
    <div className="relative -rotate-1 overflow-hidden border-y border-border bg-grad-soft py-5" aria-hidden>
      <VelocityMarquee>
        <div className="flex gap-10 whitespace-nowrap pr-10 font-display text-3xl italic">
          {row.map((t, i) => (
            <span key={i} className="flex items-center gap-10">
              <span className={i % 2 ? "text-grad" : ""}>{t}</span> <span className="text-rose not-italic">✦</span>
            </span>
          ))}
        </div>
      </VelocityMarquee>
    </div>
  );
}

// ---------- Catálogo ----------
function Catalog({ items, categories: allCategories, onAdd, onOpen }: { items: Product[]; categories: string[]; onAdd: (id: string, size: string) => boolean; onOpen: (id: string) => void }) {
  const [filter, setFilter] = useState<string>("Todas");
  const categories = allCategories.filter((c) => items.some((p) => p.category === c));
  // Confirmação no próprio botão de tamanho: vira ✓ por um instante.
  const [added, setAdded] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  function pick(id: string, size: string) {
    if (!onAdd(id, size)) return;
    setAdded(`${id}-${size}`);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(null), 1400);
  }
  const reduce = useReducedMotion();
  const list = filter === "Todas" ? items : items.filter((p) => p.category === filter);

  return (
    <section id="catalogo" className="mx-auto max-w-7xl px-4 py-24 md:px-8 md:py-32">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <RevealText text="O" accent="catálogo" className="font-display text-6xl font-medium tracking-tight md:text-7xl" />
        <p className="text-sm text-muted-foreground">{list.length} {list.length === 1 ? "peça" : "peças"}</p>
      </div>
      <p className="mt-3 max-w-[60ch] text-muted-foreground">Toque no tamanho para levar a peça para a sacola. A gente confirma tudo com você no WhatsApp.</p>

      <div className="glass -mx-1 mt-8 inline-flex max-w-full gap-1 overflow-x-auto rounded-full p-1.5 scrollbar-none">
        {["Todas", ...categories].map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`btn relative shrink-0 rounded-full px-5 py-2.5 text-sm ${filter === c ? "text-white" : "text-muted-foreground hover:text-foreground"}`}
          >
            {filter === c && <motion.span layoutId="filter-pill" className="bg-grad absolute inset-0 -z-10 rounded-full" transition={{ type: "spring", duration: 0.55, bounce: 0.15 }} />}
            {c}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="box mt-10 grid place-items-center px-6 py-20 text-center">
          <Shirt className="size-8 text-rose" strokeWidth={1.2} />
          <p className="mt-4 font-display text-3xl">Nenhuma peça nesta categoria agora</p>
          <button onClick={() => setFilter("Todas")} className="btn btn-dark mt-6 rounded-full px-6 py-3 text-sm">Ver todas</button>
        </div>
      ) : (
        <motion.div layout={!reduce} className="mt-10 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {list.map((p, i) => {
              const stock = totalStock(p);
              const soldOut = stock === 0;
              return (
                <motion.article
                  key={p.id}
                  layout={!reduce}
                  // Card e foto animam juntos por variantes (o filho segue o pai).
                  initial={reduce ? false : "hidden"}
                  whileInView="show"
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
                  viewport={{ once: true, amount: 0.15 }}
                  variants={{
                    hidden: { opacity: 0, y: 28 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.8, delay: (i % 4) * 0.06, ease } },
                  }}
                  className="group"
                >
                  <motion.div
                    // Só zoom suave: a foto nunca fica escondida se a animação não rodar.
                    variants={{
                      hidden: { scale: 0.96 },
                      show: { scale: 1, transition: { duration: 1.1, delay: (i % 4) * 0.06, ease } },
                    }}
                  >
                  <button type="button" onClick={() => onOpen(p.id)} aria-label={`Ver ${p.name}`} className="block w-full cursor-pointer rounded-2xl text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose/40">
                  <Tilt className="aspect-[3/4] overflow-hidden rounded-2xl bg-muted">
                    <img
                      src={imageSrc(p.image)}
                      alt={p.name}
                      loading="lazy"
                      className={`h-full w-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.06] ${soldOut ? "opacity-50 grayscale" : ""}`}
                    />
                    <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/5" />
                    <span className="glass pointer-events-none absolute inset-x-3 bottom-3 translate-y-2 rounded-full py-2 text-center text-xs font-medium opacity-0 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-y-0 group-hover:opacity-100">
                      Ver detalhes{(p.gallery?.length ?? 0) > 0 ? ` e ${p.gallery!.length + 1} fotos` : ""}
                    </span>
                  </Tilt>
                  </button>
                  </motion.div>
                  <div className="mt-4 flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium leading-snug">
                      <button type="button" onClick={() => onOpen(p.id)} className="text-left transition-colors duration-300 hover:text-rose">{p.name}</button>
                    </h3>
                    <span className="shrink-0 text-sm font-medium">{brl(p.price)}</span>
                  </div>
                  <p className={`mt-0.5 text-xs ${soldOut || stock <= 2 ? "text-rose" : "text-muted-foreground"}`}>
                    {soldOut ? "Esgotado" : stock <= 2 ? `Últimas ${stock === 1 ? "unidade" : "unidades"}` : p.category}
                  </p>
                  {!soldOut && (
                    <div className="mt-3 flex gap-1.5" role="group" aria-label={`Tamanhos de ${p.name}`}>
                      {sizesOf(p).map((s) => {
                        const done = added === `${p.id}-${s}`;
                        const out = (p.stock[s] ?? 0) === 0;
                        return (
                          <button
                            key={s}
                            onClick={() => pick(p.id, s)}
                            disabled={out}
                            aria-label={out ? `${p.name} tamanho ${s} esgotado` : `Adicionar ${p.name} tamanho ${s}`}
                            className={`btn ${done ? "btn-primary" : "btn-fill"} grid h-9 min-w-9 place-items-center overflow-hidden rounded-full px-3 text-xs ${out ? "line-through" : ""}`}
                          >
                            <AnimatePresence mode="popLayout" initial={false}>
                              <motion.span
                                key={done ? "ok" : s}
                                initial={{ y: 12, opacity: 0, filter: "blur(2px)" }}
                                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                                exit={{ y: -12, opacity: 0, filter: "blur(2px)" }}
                                transition={{ duration: 0.25, ease }}
                                className="block"
                              >
                                {done ? <Check className="size-3.5" strokeWidth={2.5} /> : s}
                              </motion.span>
                            </AnimatePresence>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </motion.article>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  );
}

// ---------- Looks (bento) ----------
function Lookbook() {
  const reduce = useReducedMotion();
  const tiles = ["longo-azul", "um-ombro-preto", "body-renda-branco", "conjunto-longo-preto", "longo-vinho"];
  return (
    <section id="looks" className="relative overflow-hidden py-24 md:py-32">
      <div aria-hidden className="bg-grad-soft absolute inset-x-4 inset-y-0 rounded-[3rem] md:inset-x-8" />
      <div className="relative mx-auto max-w-7xl px-8 md:px-14">
        <RevealText text="Seu look favorito" accent="está aqui." className="max-w-2xl font-display text-5xl font-medium leading-[1.1] tracking-tight md:text-7xl" />
        <div className="mt-12 grid auto-rows-[200px] grid-cols-2 gap-3 md:auto-rows-[250px] md:grid-cols-4 md:gap-4">
          {tiles.map((id, i) => (
            <motion.a
              key={id}
              href="#catalogo"
              initial={reduce ? false : { opacity: 0, clipPath: "inset(14% 14% 14% 14% round 1.5rem)" }}
              whileInView={{ opacity: 1, clipPath: "inset(0% 0% 0% 0% round 1.5rem)" }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 1.1, delay: i * 0.08, ease }}
              className={`group relative overflow-hidden rounded-3xl ${i === 0 ? "col-span-2 row-span-2" : ""}`}
            >
              <img src={img(id)} alt="Look da USE MAVIÊ" loading="lazy" className="h-full w-full object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-105" />
              <div className="bg-grad absolute inset-0 opacity-0 mix-blend-soft-light transition-opacity duration-700 group-hover:opacity-60" />
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- A loja ----------
function About() {
  const reduce = useReducedMotion();
  const imgRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: imgRef, offset: ["start end", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-6%", "6%"]);
  const steps = [
    { icon: Shirt, t: "Escolha peças e tamanhos", d: "Monte sua sacola direto no catálogo." },
    { icon: MessageCircle, t: "Envie pelo WhatsApp", d: "A sacola vira uma mensagem pronta com o seu pedido." },
    { icon: Truck, t: "Receba onde estiver", d: "Entregamos em Brasília. Pagamento e entrega combinados na conversa." },
  ];
  return (
    <section id="loja" className="mx-auto grid max-w-7xl items-center gap-12 overflow-x-clip px-4 py-24 md:px-8 md:py-32 lg:grid-cols-2">
      <motion.div
        initial={reduce ? false : { opacity: 0, clipPath: "inset(10% 10% 10% 10% round 2rem)" }}
        whileInView={{ opacity: 1, clipPath: "inset(0% 0% 0% 0% round 2rem)" }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 1.2, ease }}
        className="relative"
      >
        <div ref={imgRef} className="aspect-[4/5] overflow-hidden rounded-[2rem]">
          <motion.img style={{ y: imgY, scale: 1.14 }} src={img("decote-v-preto")} alt="Modelo com vestido longo preto de decote V da USE MAVIÊ" loading="lazy" className="size-full object-cover" />
        </div>
      </motion.div>
      <div>
        <RevealText text="Loja on-line," accent="atendimento de perto." className="font-display text-5xl font-medium leading-[1.1] tracking-tight md:text-6xl" />
        <p className="mt-5 max-w-[55ch] text-muted-foreground">Você escolhe pelo site e fala com gente de verdade: cada pedido é confirmado pela nossa equipe, do tamanho à entrega.</p>
        <ol className="mt-10 space-y-3">
          {steps.map(({ icon: Icon, t, d }, i) => (
            <motion.li
              key={t}
              initial={reduce ? false : { opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.8, delay: i * 0.08, ease }}
              className="box box-hover flex items-center gap-4 p-4"
            >
              <span className="bg-grad grid size-12 shrink-0 place-items-center rounded-2xl text-white">
                <Icon className="size-5" strokeWidth={1.5} />
              </span>
              <div>
                <h3 className="font-medium">{t}</h3>
                <p className="text-sm text-muted-foreground">{d}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ---------- Política de troca (bento) ----------
function Exchanges() {
  const reduce = useReducedMotion();
  const rules = [
    { icon: Ban, t: "Não trocamos peças brancas.", cls: "md:col-span-3 bg-grad text-white", hero: true },
    { icon: Shirt, t: "Não trocamos peças de tricô, renda, cetim, tule, paetê e strass.", cls: "md:col-span-3" },
    { icon: Tag, t: "O produto deve estar em perfeito estado, com etiquetas e embalagens originais.", cls: "md:col-span-2" },
    { icon: Package, t: "Trocas nos pontos de retirada da loja ou por motoboy, com envio pago pela cliente.", cls: "md:col-span-2" },
    { icon: X, t: "Não fazemos troca de itens comprados em promoção.", cls: "md:col-span-2" },
  ];
  return (
    <section id="trocas" className="mx-auto max-w-7xl px-4 py-24 md:px-8 md:py-32">
      <RevealText text="Política de" accent="troca" className="font-display text-5xl font-medium tracking-tight md:text-7xl" />
      <p className="mt-3 max-w-[60ch] text-muted-foreground">Antes de comprar, vale conferir. Assim a sua troca acontece sem surpresa.</p>
      <div className="mt-12 grid gap-4 md:grid-cols-6">
        {rules.map(({ icon: Icon, t, cls, hero }, i) => (
          <motion.div
            key={t}
            initial={reduce ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.8, delay: i * 0.06, ease }}
            className={`${hero ? "rounded-3xl shadow-[var(--shadow-rose)]" : "box box-hover"} flex min-h-44 flex-col justify-between p-7 ${cls}`}
          >
            <span className={`grid size-11 place-items-center rounded-2xl ${hero ? "bg-white/20" : "bg-rose-soft text-rose"}`}>
              <Icon className="size-5" strokeWidth={1.5} />
            </span>
            <p className={`mt-6 leading-relaxed ${hero ? "font-display text-3xl" : "text-[15px]"}`}>{t}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ---------- Rodapé ----------
function Footer({ whatsapp }: { whatsapp: string }) {
  const reduce = useReducedMotion();
  return (
    <footer className="px-3 pb-3 md:px-4 md:pb-4">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-grad-soft">
        <div aria-hidden className="bg-grad absolute -right-24 -top-24 size-96 rounded-full opacity-30 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6 pt-16 md:px-12 md:pt-20">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <RevealText text="Siga a" accent="Maviê" className="font-display text-5xl font-medium leading-[1.05] tracking-tight md:text-7xl" />
              <p className="mt-3 max-w-md text-muted-foreground">Looks novos, provas e peças disponíveis aparecem primeiro no Instagram.</p>
            </div>
            <Magnetic>
              <a href={INSTAGRAM} target="_blank" rel="noreferrer" className="btn btn-primary btn-shine inline-flex items-center gap-2 rounded-full px-7 py-4 text-sm font-medium">
                <Camera className="size-4" strokeWidth={1.5} /> @usemaviie_
              </a>
            </Magnetic>
          </div>

          <div className="mt-16 grid gap-10 border-t border-foreground/10 pt-10 sm:grid-cols-3">
            <div>
              <p className="text-sm font-medium">Navegar</p>
              <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                {sections.map((s) => (
                  <li key={s.id}><a href={`#${s.id}`} className="transition-colors duration-300 hover:text-rose">{s.label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium">Atendimento</p>
              <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><MapPin className="size-4" strokeWidth={1.5} /> Loja on-line em Brasília</li>
                <li className="flex items-center gap-2"><Truck className="size-4" strokeWidth={1.5} /> Entregas na cidade</li>
                <li>
                  <a href={whatsappUrl("Oi, Maviê! Vim pelo site.", whatsapp)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 transition-colors duration-300 hover:text-rose">
                    <MessageCircle className="size-4" strokeWidth={1.5} /> {whatsapp ? formatPhone(whatsapp) : "Pedidos pelo WhatsApp"}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium">Redes</p>
              <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                <li><a href={INSTAGRAM} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 transition-colors duration-300 hover:text-rose"><Camera className="size-4" strokeWidth={1.5} /> Instagram</a></li>
                <li><a href="https://beacons.ai/usemavie" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 transition-colors duration-300 hover:text-rose"><Link2 className="size-4" strokeWidth={1.5} /> beacons.ai/usemavie</a></li>
              </ul>
            </div>
          </div>
        </div>

        <motion.p
          aria-hidden
          initial={reduce ? false : { y: "40%", opacity: 0 }}
          whileInView={{ y: "0%", opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease }}
          className="text-grad relative mt-10 select-none whitespace-nowrap text-center font-display text-[17vw] font-semibold leading-[1] tracking-tight pt-[0.1em] -mb-[0.12em]"
        >
          USEMAVIÊ
        </motion.p>

        <div className="relative flex flex-col items-center justify-between gap-3 border-t border-foreground/10 px-6 py-5 text-xs text-muted-foreground md:flex-row md:px-12">
          <p>© 2026 USE MAVIÊ. Versão demonstrativa: preços e estoque sujeitos a confirmação.</p>
          <div className="flex items-center gap-4">
            <a href={`${BASE}/painel`} className="transition-colors duration-300 hover:text-rose">Painel da loja</a>
            <a href="#topo" className="btn btn-fill grid size-10 place-items-center rounded-full" aria-label="Voltar ao topo">
              <ArrowUp className="size-4" strokeWidth={1.5} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ---------- Sacola ----------
function Bag({ open, items, list, whatsapp, onClose, onChange }: {
  open: boolean; items: BagItem[]; list: Product[]; whatsapp: string; onClose: () => void; onChange: (i: BagItem, d: number) => void;
}) {
  const total = items.reduce((n, i) => n + list.find((p) => p.id === i.id)!.price * i.qty, 0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-[color-mix(in_oklab,var(--plum)_25%,transparent)] backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Sacola"
            data-lenis-prevent
            className="fixed inset-y-2 right-2 z-50 flex w-[calc(100%-1rem)] max-w-md flex-col overflow-hidden rounded-[2rem] bg-background shadow-2xl"
            initial={{ x: "105%" }}
            animate={{ x: 0 }}
            exit={{ x: "105%", transition: { duration: 0.25, ease: [0.32, 0.72, 0, 1] } }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="bg-grad-soft flex items-center justify-between px-6 py-5">
              <h2 className="font-display text-3xl font-medium">Sua sacola</h2>
              <button onClick={onClose} aria-label="Fechar sacola" className="btn grid size-10 place-items-center rounded-full hover:bg-background/60">
                <X className="size-5" strokeWidth={1.5} />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <span className="bg-grad grid size-16 place-items-center rounded-3xl text-white"><ShoppingBag className="size-7" strokeWidth={1.3} /></span>
                <p className="font-display text-2xl">Sua sacola está vazia</p>
                <p className="max-w-xs text-sm text-muted-foreground">Escolha um tamanho no catálogo para adicionar peças.</p>
                <a href="#catalogo" onClick={onClose} className="btn btn-dark mt-2 rounded-full px-6 py-3 text-sm">Ver catálogo</a>
              </div>
            ) : (
              <>
                <ul className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                  <AnimatePresence initial={false}>
                    {items.map((it) => {
                      const p = list.find((x) => x.id === it.id)!;
                      return (
                        <motion.li
                          layout
                          key={it.id + it.size}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                          className="box flex gap-4 p-3"
                        >
                          <img src={imageSrc(p.image)} alt="" className="h-24 w-[4.5rem] shrink-0 rounded-xl object-cover" />
                          <div className="flex flex-1 flex-col">
                            <p className="text-sm font-medium">{p.name}</p>
                            <p className="text-xs text-muted-foreground">Tamanho {it.size}</p>
                            <div className="mt-auto flex items-center justify-between">
                              <div className="flex items-center rounded-full border border-border">
                                <button onClick={() => onChange(it, -1)} aria-label="Diminuir" className="btn grid size-8 place-items-center rounded-full"><Minus className="size-3.5" /></button>
                                <span className="w-6 text-center text-sm tabular-nums">{it.qty}</span>
                                <button onClick={() => onChange(it, 1)} aria-label="Aumentar" className="btn grid size-8 place-items-center rounded-full"><Plus className="size-3.5" /></button>
                              </div>
                              <span className="text-sm font-medium tabular-nums">{brl(p.price * it.qty)}</span>
                            </div>
                          </div>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
                <div className="border-t border-border px-6 py-5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm">Total</span>
                    <span className="font-display text-3xl tabular-nums">{brl(total)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Pagamento e entrega são combinados na conversa.</p>
                  <a
                    href={whatsappUrl(orderMessage(items, list), whatsapp)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary btn-shine pulse mt-4 flex w-full items-center justify-center gap-2 rounded-full py-4 text-sm font-medium"
                  >
                    <MessageCircle className="size-4" strokeWidth={1.5} /> Enviar pedido no WhatsApp
                  </a>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// Botão flutuante de atendimento; some enquanto a sacola está aberta.
function WhatsAppFab({ number, hidden }: { number: string; hidden: boolean }) {
  const reduce = useReducedMotion();
  if (!number) return null;
  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95, transition: { duration: 0.2 } }}
          transition={{ duration: 0.6, delay: 1.4, ease }}
          className="fixed bottom-5 right-5 z-40 md:bottom-7 md:right-7"
        >
          <Magnetic>
            <a
              href={whatsappUrl("Oi, Maviê! Vim pelo site e quero tirar uma dúvida.", number)}
              target="_blank"
              rel="noreferrer"
              aria-label={`Conversar no WhatsApp ${formatPhone(number)}`}
              className="btn btn-primary btn-shine group flex h-14 items-center gap-2 rounded-full pl-4 pr-5 text-sm font-medium"
            >
              <MessageCircle className="size-5" strokeWidth={1.5} />
              <span className="hidden sm:inline">Fale com a gente</span>
            </a>
          </Magnetic>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
