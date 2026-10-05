"use client";

// Forma: fotos e caixas com cantos suaves (rounded-2xl/3xl), controles em pílula.
// Cor: família rosa mesclada (plum → rose → blush/peach) via --grad; um acento só.
import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { ArrowRight, ArrowUp, ArrowUpRight, CalendarClock, Camera, Check, LockKeyhole, Menu, Minus, Plus, ShoppingBag, Truck, MessageCircle, Shirt, X, Ban, Tag, Package, Link2, MapPin, Sparkle } from "lucide-react";
import { Toaster, toast } from "sonner";
import { BASE, WHATSAPP, catalog, colorsOf, focusPos, heroOf, img, brl, formatPhone, imageSrc, orderMessage, sizesOf, totalStock, whatsappUrl, INSTAGRAM, type BagItem, type Product } from "./products";
import { useLiveCatalog } from "./supabase";
import { Logo } from "./logo";
import { ProductView } from "./product-view";
import { Parallax, RevealText, ScrollProgress, SilkBackground, Sparkles, VelocityMarquee } from "./fx";

const ease = [0.16, 1, 0.3, 1] as const;
// Enquadramento das fotos fixas (hero, looks): usa o ponto do rosto do catálogo.
const posOf = (id: string) => focusPos(catalog.products.find((p) => p.id === id) ?? {});
const sections = [
  { id: "catalogo", label: "Catálogo" },
  { id: "looks", label: "Looks" },
  { id: "loja", label: "Como comprar" },
  { id: "trocas", label: "Trocas" },
];

export default function Store() {
  // Estoque e preços ao vivo (Supabase); cai para o catálogo estático se o banco não responder.
  const cat = useLiveCatalog();
  const list = cat.products;
  const visible = list.filter((p) => !p.hidden);
  const [bag, setBag] = useState<BagItem[]>([]);
  const [open, setOpen] = useState(false);

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
      <Nav count={count} onBag={() => setOpen(true)} list={visible} onOpen={openProduct} />
      <main>
        <Hero list={visible} hero={heroOf(cat, visible)} onOpen={openProduct} />
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

function Wordmark({ className = "h-[22px]" }: { className?: string }) {
  return <Logo className={className} />;
}

// ---------- Nav: faixa de avisos + menu flutuante (some ao descer, volta ao subir) ----------
const announcements = ["Entregamos em Brasília", "Escolha pelo site e finalize pelo WhatsApp", "Trocas em até 7 dias corridos", "Novidades primeiro no Instagram @usemaviie_"];

function Announcement() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((n) => (n + 1) % announcements.length), 4000);
    return () => clearInterval(t);
  }, [reduce]);
  return (
    <div className="relative h-5 overflow-hidden text-center text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.p
          key={i}
          initial={{ y: "110%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-110%", opacity: 0 }}
          transition={{ duration: 0.55, ease }}
          className="absolute inset-0"
        >
          {announcements[i]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

// Logo original que entra da esquerda para a direita, ganhando foco.
function AnimatedWordmark({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className="inline-flex"
      initial={reduce ? false : { clipPath: "inset(0 100% 0 0)", opacity: 0, filter: "blur(4px)" }}
      animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 1.1, delay: 0.2, ease }}
    >
      <Logo className={className} />
    </motion.span>
  );
}

// Descrição curta de cada seção no menu do celular.
const menuHints: Record<string, string> = {
  catalogo: "Vestidos, conjuntos e bodies",
  looks: "Inspirações prontas para montar o seu",
  loja: "Do site ao WhatsApp em 3 passos",
  trocas: "Prazo de 7 dias corridos para trocar",
};
const featuredIds = ["longo-azul", "um-ombro-preto", "midi-vinho", "longo-fenda-preto"];

function Nav({ count, onBag, list, onOpen }: { count: number; onBag: () => void; list: Product[]; onOpen: (id: string) => void }) {
  const reduce = useReducedMotion();
  const pieces = list.length;
  // primeira peça da lista de destaques que ainda tem estoque
  const featured = featuredIds.map((id) => list.find((p) => p.id === id)).find((p) => p && totalStock(p) > 0);
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");
  const [hover, setHover] = useState<string | null>(null);
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

  // Menu do celular: trava a rolagem da página e fecha com Esc.
  useEffect(() => {
    if (!menu) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    addEventListener("keydown", onKey);
    return () => {
      html.style.overflow = prev;
      removeEventListener("keydown", onKey);
    };
  }, [menu]);

  return (
    <>
      <motion.header
        initial={reduce ? false : { y: "-140%" }}
        animate={{ y: hidden && !reduce ? "-140%" : "0%" }}
        transition={{ duration: 0.6, ease }}
        className="fixed inset-x-0 top-0 z-40 px-3"
      >
        <motion.div
          initial={false}
          animate={{ height: scrolled ? 0 : 30, opacity: scrolled ? 0 : 1 }}
          transition={{ duration: 0.4, ease }}
          className="overflow-hidden"
        >
          <div className="pt-2"><Announcement /></div>
        </motion.div>
        <div
          className={`mx-auto mt-2 flex max-w-5xl items-center justify-between rounded-full pl-5 pr-2 transition-[height,background-color,box-shadow,border-color] duration-500 md:mt-3 ${
            scrolled ? "glass h-12" : "h-14 border border-transparent"
          }`}
        >
          <a href="#topo" aria-label="USE MAVIÊ, início" className="transition-opacity duration-300 hover:opacity-70">
            <AnimatedWordmark className="h-[19px] md:h-[23px]" />
          </a>
          <nav className="hidden items-center gap-1 text-sm md:flex" onMouseLeave={() => setHover(null)} aria-label="Seções">
            {sections.map((s, i) => (
              <motion.a
                key={s.id}
                href={`#${s.id}`}
                onMouseEnter={() => setHover(s.id)}
                onFocus={() => setHover(s.id)}
                onBlur={() => setHover(null)}
                aria-current={active === s.id ? "true" : undefined}
                initial={reduce ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35 + i * 0.06, ease }}
                className={`relative isolate rounded-full px-4 py-2 transition-colors duration-300 ${active === s.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {/* fundo que desliza entre os links no hover */}
                {hover === s.id && (
                  <motion.span layoutId="nav-hover" className="absolute inset-0 -z-10 rounded-full bg-background/80 shadow-[0_4px_14px_-6px_color-mix(in_oklab,var(--plum)_35%,transparent)]" transition={{ type: "spring", duration: 0.4, bounce: 0.1 }} />
                )}
                {active === s.id && (
                  <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-rose-soft" transition={{ type: "spring", duration: 0.5, bounce: 0.15 }} />
                )}
                {s.label}
              </motion.a>
            ))}
          </nav>
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.6, ease }}
            className="flex items-center gap-1.5"
          >
            <button
              onClick={onBag}
              className={`btn btn-dark flex items-center gap-2 rounded-full pl-4 pr-3 text-sm transition-[height] duration-500 ${scrolled ? "h-9" : "h-10"}`}
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
            <button onClick={() => setMenu(true)} aria-label="Abrir menu" aria-expanded={menu} className="btn grid size-10 place-items-center rounded-full md:hidden">
              <Menu className="size-5" strokeWidth={1.5} />
            </button>
          </motion.div>
        </div>
      </motion.header>

      {/* Menu do celular: abre como um círculo que cresce a partir do botão */}
      <AnimatePresence>
        {menu && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-50 flex flex-col overflow-y-auto overflow-x-hidden bg-background px-6 pb-7 pt-5 md:hidden"
            initial={reduce ? { opacity: 0 } : { clipPath: "circle(0% at 90% 6%)" }}
            animate={reduce ? { opacity: 1 } : { clipPath: "circle(150% at 90% 6%)" }}
            exit={reduce ? { opacity: 0 } : { clipPath: "circle(0% at 90% 6%)", transition: { duration: 0.45, ease: [0.77, 0, 0.175, 1] } }}
            transition={{ duration: 0.7, ease: [0.77, 0, 0.175, 1] }}
          >
            {/* manchas de cor que flutuam devagar no fundo */}
            <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
              <div className="drift-blob bg-grad absolute -right-32 -top-32 size-96 rounded-full opacity-20 blur-3xl" />
              <div className="drift-blob drift-blob-2 absolute -bottom-40 -left-32 size-96 rounded-full bg-[color-mix(in_oklab,var(--peach)_80%,transparent)] opacity-60 blur-3xl" />
            </div>

            <div className="relative flex items-center justify-between">
              <Wordmark />
              <motion.button
                onClick={() => setMenu(false)}
                aria-label="Fechar menu"
                initial={reduce ? false : { rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.25, ease }}
                className="btn grid size-11 place-items-center rounded-full border border-border bg-background/70"
              >
                <X className="size-5" strokeWidth={1.5} />
              </motion.button>
            </div>

            <nav className="relative mt-8 flex flex-col" aria-label="Seções">
              {sections.map((s, i) => {
                const on = active === s.id;
                return (
                  <motion.a
                    key={s.id}
                    href={`#${s.id}`}
                    onClick={() => setMenu(false)}
                    initial="hidden"
                    animate="show"
                    exit="out"
                    custom={i}
                    className="group flex items-center justify-between gap-4 border-b border-border py-3"
                  >
                    <span className="min-w-0">
                      {/* o título sobe de trás de uma máscara, um depois do outro */}
                      <span className="block overflow-hidden pb-1">
                        <motion.span
                          className={`block origin-bottom-left font-display text-[2.35rem] leading-[1.05] ${on ? "text-grad italic" : ""}`}
                          variants={{
                            hidden: reduce ? { opacity: 0 } : { y: "110%", rotate: 4 },
                            show: { y: 0, rotate: 0, opacity: 1, transition: { duration: 0.75, delay: 0.28 + i * 0.07, ease } },
                            out: { opacity: 0, transition: { duration: 0.15 } },
                          }}
                        >
                          {s.label}
                          {s.id === "catalogo" && <sup className="ml-1.5 align-super font-sans text-xs font-medium not-italic text-rose">{pieces}</sup>}
                        </motion.span>
                      </span>
                      <motion.span
                        className="block text-[13px] text-muted-foreground"
                        variants={{
                          hidden: { opacity: 0, y: 6 },
                          show: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.42 + i * 0.07, ease } },
                          out: { opacity: 0, transition: { duration: 0.15 } },
                        }}
                      >
                        {menuHints[s.id]}
                      </motion.span>
                    </span>
                    <motion.span
                      variants={{
                        hidden: reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotate: -45 },
                        show: { opacity: 1, scale: 1, rotate: 0, transition: { duration: 0.6, delay: 0.45 + i * 0.07, ease } },
                        out: { opacity: 0, transition: { duration: 0.15 } },
                      }}
                      className={`grid size-11 shrink-0 place-items-center rounded-full border transition-[background-color,color,border-color,rotate] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-active:rotate-45 group-active:border-transparent group-active:bg-[var(--rose)] group-active:text-white ${
                        on ? "bg-grad border-transparent text-white" : "border-border bg-background/80 text-muted-foreground"
                      }`}
                    >
                      <ArrowUpRight className="size-5" strokeWidth={1.5} />
                    </motion.span>
                  </motion.a>
                );
              })}
            </nav>

            {/* Peça em destaque: preenche o espaço com algo útil e abre a página do produto */}
            {featured && (
              <motion.button
                type="button"
                onClick={() => { setMenu(false); onOpen(featured.id); }}
                initial={reduce ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={{ duration: 0.7, delay: 0.62, ease }}
                className="box relative mt-6 flex items-center gap-3 p-2.5 text-left active:scale-[0.98]"
              >
                <img src={imageSrc(featured.image)} alt="" style={{ objectPosition: focusPos(featured) }} className="h-20 w-16 shrink-0 rounded-xl object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-rose">Peça em destaque</span>
                  <span className="mt-0.5 block truncate font-medium">{featured.name}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">{brl(featured.price)}</span>
                </span>
                <span className="bg-grad grid size-10 shrink-0 place-items-center rounded-xl text-white">
                  <ArrowUpRight className="size-4" strokeWidth={1.75} />
                </span>
              </motion.button>
            )}

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.6, delay: 0.72, ease }}
              className="relative mt-auto grid gap-2 pt-6"
            >
              <p className="mb-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Truck className="size-3.5 text-rose" strokeWidth={1.5} /> Entregamos em Brasília. Pedidos pelo WhatsApp.
              </p>
              <a href={whatsappUrl("Oi, Maviê! Vim pelo site.", WHATSAPP)} target="_blank" rel="noreferrer" className="btn btn-primary btn-shine flex h-12 items-center justify-center gap-2 rounded-full text-sm font-medium">
                <MessageCircle className="size-4" strokeWidth={1.5} /> Falar no WhatsApp
              </a>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setMenu(false); onBag(); }} className="btn btn-fill flex h-12 items-center justify-center gap-2 rounded-full text-sm">
                  <ShoppingBag className="size-4" strokeWidth={1.5} /> Sacola{count > 0 && <span className="bg-grad grid size-5 place-items-center rounded-full text-[10px] font-medium text-white">{count}</span>}
                </button>
                <a href={INSTAGRAM} target="_blank" rel="noreferrer" className="btn btn-fill flex h-12 items-center justify-center gap-2 rounded-full text-sm">
                  <Camera className="size-4" strokeWidth={1.5} /> Instagram
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ---------- Hero ----------
const heroSub = "Vestidos, conjuntos e bodies que fazem você ser *notada.* Escolha seu look e finalize pelo WhatsApp, com entrega em Brasília.";

function Hero({ list, hero, onOpen }: { list: Product[]; hero: ReturnType<typeof heroOf>; onOpen: (id: string) => void }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  // Na rolagem as CAIXAS se movem e a colagem encolhe de leve; as fotos ficam paradas.
  // A foto menor desce (valor positivo) para nunca subir até a barra do topo / sacola.
  const yBig = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 120]);
  const ySmall = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 70]);
  const collageScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 0.92]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -80]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.7], [1, reduce ? 1 : 0]);
  const glow = useMotionValue({ x: 0.72, y: 0.38 }); // brilho fixo do fundo (não segue o cursor)
  const [look, setLook] = useState(0);
  // Fotos vêm da Vitrine do painel (heroOf já garante peças visíveis e um padrão se estiver vazia).
  const slides = hero.slides;
  const slide = slides[look % slides.length];
  const current = list.find((p) => p.id === slide.productId);
  const smallSlide = hero.small;
  const small = smallSlide ? list.find((p) => p.id === smallSlide.productId) : undefined;
  const posFor = (p: Product | undefined, image: string) => (p && image === p.image ? focusPos(p) : "50% 25%");

  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setLook((l) => (l + 1) % slides.length), 5000);
    return () => clearTimeout(t);
  }, [reduce, look]);

  return (
    <section id="topo" ref={ref} className="relative overflow-hidden">
      <SilkBackground mouse={glow} />
      <div className="relative mx-auto grid min-h-[100dvh] max-w-7xl items-center gap-10 px-4 pb-12 pt-32 md:px-8 lg:grid-cols-[1.05fr_1fr] lg:pb-8 lg:pt-28">
        <motion.div style={{ y: textY, opacity: textOpacity }} className="relative z-10">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease }}
            className="glass mb-7 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground"
          >
            <Sparkle className="size-3.5 text-rose" strokeWidth={1.5} /> Moda feminina em Brasília
          </motion.p>

          <h1 className="font-display text-[3.6rem] font-medium leading-[1.02] tracking-tight sm:text-7xl lg:text-[6.5rem]">
            <span className="block overflow-hidden pb-2">
              {["Divas", "usam"].map((w, i) => (
                <motion.span
                  key={w}
                  className="inline-block origin-bottom-left pr-[0.22em]"
                  initial={reduce ? false : { y: "110%", rotate: 5 }}
                  animate={{ y: 0, rotate: 0 }}
                  transition={{ duration: 1.1, delay: 0.25 + i * 0.12, ease }}
                >
                  {w}
                </motion.span>
              ))}
            </span>
            {/* "Maviê." com degradê que flui devagar e um traço desenhado à mão por baixo */}
            <span className="relative inline-block pb-5 italic" aria-label="Maviê.">
              {"Maviê.".split("").map((ch, i) => (
                <motion.span
                  key={i}
                  aria-hidden
                  className="text-grad grad-flow inline-block"
                  style={{ backgroundSize: "600% 100%", backgroundPosition: `${i * 20}% 50%`, "--i": i } as React.CSSProperties}
                  initial={reduce ? false : { opacity: 0, y: 36, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 1, delay: 0.55 + i * 0.06, ease }}
                >
                  {ch}
                </motion.span>
              ))}
              <svg aria-hidden viewBox="0 0 300 24" preserveAspectRatio="none" className="absolute -bottom-0.5 left-[2%] h-[0.22em] w-[96%] overflow-visible">
                <defs>
                  <linearGradient id="swash" x1="0" x2="1">
                    <stop offset="0%" style={{ stopColor: "var(--plum)" }} />
                    <stop offset="55%" style={{ stopColor: "var(--rose)" }} />
                    <stop offset="100%" style={{ stopColor: "#e58aa9" }} />
                  </linearGradient>
                </defs>
                <motion.path
                  d="M4 16 C 60 5, 130 3, 190 10 S 270 21, 296 7"
                  fill="none"
                  stroke="url(#swash)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  initial={reduce ? false : { pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ pathLength: { duration: 1.3, delay: 1.15, ease: [0.65, 0, 0.35, 1] }, opacity: { duration: 0.2, delay: 1.15 } }}
                />
              </svg>
            </span>
          </h1>

          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
            {heroSub.split(" ").map((raw, i) => {
              const strong = raw.startsWith("*");
              return (
                <motion.span
                  key={i}
                  className={`mr-[0.27em] inline-block ${strong ? "font-medium text-foreground" : ""}`}
                  initial={reduce ? false : { opacity: 0, y: 10, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.6, delay: 0.95 + i * 0.022, ease }}
                >
                  {raw.replace(/\*/g, "")}
                </motion.span>
              );
            })}
          </p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.3, ease }}
            className="mt-9 flex flex-wrap gap-3"
          >
            <a href="#catalogo" className="btn btn-primary btn-shine group inline-flex items-center gap-2 rounded-full px-7 py-4 text-sm font-medium">
              Ver catálogo
              <span className="icon-swap" aria-hidden>
                <ArrowRight className="size-4" strokeWidth={1.5} />
                <ArrowRight className="size-4" strokeWidth={1.5} />
              </span>
            </a>
            <a href={INSTAGRAM} target="_blank" rel="noreferrer" className="btn btn-fill glass inline-flex items-center gap-2 rounded-full px-7 py-4 text-sm">
              <Camera className="size-4" strokeWidth={1.5} /> @usemaviie_
            </a>
          </motion.div>
        </motion.div>

        {/* Colagem: looks em sequência; caixas com parallax; fotos paradas e enquadradas */}
        <motion.div style={{ scale: collageScale }} className="relative mx-auto h-[60vh] w-full max-w-[520px] lg:h-[76vh]">
          <motion.div
            style={{ y: yBig }}
            initial={reduce ? false : { clipPath: "inset(100% 0 0 0 round 2rem)" }}
            animate={{ clipPath: "inset(0% 0 0 0 round 2rem)" }}
            transition={{ duration: 1.4, delay: 0.3, ease }}
            className="absolute inset-y-0 right-0 w-[78%] overflow-hidden rounded-[2rem] bg-muted shadow-[0_50px_90px_-40px_color-mix(in_oklab,var(--plum)_70%,transparent)]"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.img
                key={`${slide.productId}-${slide.image}`}
                src={imageSrc(slide.image)}
                alt={current ? current.name : "Look da coleção USE MAVIÊ"}
                style={{ objectPosition: posFor(current, slide.image) }}
                className="absolute inset-0 h-full w-full object-cover"
                initial={reduce ? false : { clipPath: "circle(0% at 50% 60%)" }}
                animate={{ clipPath: "circle(110% at 50% 60%)" }}
                exit={{ opacity: 0, transition: { duration: 0.8, delay: 0.6 } }}
                transition={{ duration: 1.4, ease: [0.77, 0, 0.175, 1] }}
              />
            </AnimatePresence>
            <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/45 via-black/10 to-transparent p-3 pt-20 sm:p-4 sm:pt-20">
              {/* Cartão do look atual: nome, preço e atalho para a página do produto */}
              <AnimatePresence mode="wait" initial={false}>
                {current && (
                  <motion.button
                    key={current.id}
                    onClick={() => onOpen(current.id)}
                    initial={reduce ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.5, delay: 0.35, ease }}
                    className="glass group mb-3 flex w-full items-center gap-3 rounded-2xl p-2 pl-4 text-left transition-transform duration-300 active:scale-[0.98]"
                    aria-label={`Ver ${current.name}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{current.name}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{brl(current.price)}</span>
                    </span>
                    <span className="bg-grad grid size-10 shrink-0 place-items-center rounded-xl text-white transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:rotate-45">
                      <ArrowUpRight className="size-4" strokeWidth={1.75} />
                    </span>
                  </motion.button>
                )}
              </AnimatePresence>
              <div className="flex gap-1.5">
                {slides.map((l, i) => (
                  <button key={`${l.productId}-${i}`} aria-label={`Mostrar look ${i + 1}`} onClick={() => setLook(i)} className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/35">
                    {i === look % slides.length && (
                      <motion.span
                        key={look}
                        className="absolute inset-0 origin-left rounded-full bg-white"
                        initial={{ scaleX: reduce ? 1 : 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 5, ease: "linear" }}
                      />
                    )}
                    {i < look % slides.length && <span className="absolute inset-0 rounded-full bg-white" />}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
          {smallSlide && small && (
          <motion.div style={{ y: ySmall }} className="absolute bottom-[27%] left-0 z-10 w-[38%]">
            <motion.button
              type="button"
              onClick={() => onOpen(small.id)}
              aria-label={`Ver ${small.name}`}
              initial={reduce ? false : { clipPath: "inset(0 100% 0 0 round 1.5rem)" }}
              animate={{ clipPath: "inset(0 0% 0 0 round 1.5rem)" }}
              transition={{ duration: 1.2, delay: 0.8, ease }}
              className="block w-full overflow-hidden rounded-3xl border-[6px] border-background shadow-[0_30px_60px_-24px_color-mix(in_oklab,var(--rose)_60%,transparent)] transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1"
            >
              <img src={imageSrc(smallSlide.image)} alt="" style={{ objectPosition: posFor(small, smallSlide.image) }} className="aspect-[3/4] w-full object-cover" />
            </motion.button>
          </motion.div>
          )}
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
                  <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted transition-[translate,box-shadow] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-y-1.5 group-hover:shadow-[var(--shadow-rose)]">
                    <img
                      src={imageSrc(p.image)}
                      alt={p.name}
                      loading="lazy"
                      style={{ objectPosition: focusPos(p) }}
                      className={`h-full w-full object-cover ${soldOut ? "opacity-50 grayscale" : ""}`}
                    />
                    <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/5" />
                  </div>
                  </button>
                  </motion.div>
                  <div className="mt-4 flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                    <h3 className="text-sm font-medium leading-snug">
                      <button type="button" onClick={() => onOpen(p.id)} className="text-left transition-colors duration-300 hover:text-rose">{p.name}</button>
                    </h3>
                    <span className="shrink-0 text-sm font-medium">{brl(p.price)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className={`text-xs ${soldOut || stock <= 2 ? "font-medium text-rose" : "text-muted-foreground"}`}>
                      {soldOut ? "Esgotado" : stock <= 2 ? `Últimas ${stock === 1 ? "unidade" : "unidades"}` : p.category}
                    </p>
                    {colorsOf(p, items).length > 1 && (
                      <span className="flex items-center gap-1" aria-label={`${colorsOf(p, items).length} cores`}>
                        {colorsOf(p, items).map((c) => (
                          <span key={c.id} title={c.color} className={`size-3 rounded-full ring-1 ring-black/10 ${c.id === p.id ? "ring-2 ring-rose ring-offset-1 ring-offset-background" : ""}`} style={{ background: c.colorHex ?? "#ccc" }} />
                        ))}
                      </span>
                    )}
                  </div>
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

// ---------- Looks: três colunas em velocidades diferentes (parallax nas caixas, fotos paradas) ----------
const lookColumns = [
  { speed: 24, ids: ["longo-azul", "body-renda-branco"] },
  { speed: 90, ids: ["um-ombro-preto", "conjunto-longo-preto"] },
  { speed: 50, ids: ["longo-vinho", "conjunto-recorte-preto"] },
];

function LookCard({ id }: { id: string }) {
  return (
    <a
      href="#catalogo"
      className="group block overflow-hidden rounded-3xl bg-muted transition-[translate,box-shadow] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1.5 hover:shadow-[var(--shadow-rose)]"
    >
      <img src={img(id)} alt="Look da USE MAVIÊ" loading="lazy" style={{ objectPosition: posOf(id) }} className="aspect-[3/4] w-full object-cover" />
    </a>
  );
}

function Lookbook() {
  return (
    <section id="looks" className="relative overflow-hidden py-24 md:py-36">
      <div aria-hidden className="bg-grad-soft absolute inset-x-4 inset-y-0 rounded-[3rem] md:inset-x-8" />
      <div className="relative mx-auto max-w-7xl px-6 md:px-14">
        <RevealText text="Seu look favorito" accent="está aqui." className="max-w-2xl font-display text-5xl font-medium leading-[1.1] tracking-tight md:text-7xl" />
        {/* No celular: 2 colunas (a terceira vira uma linha de 2). Caixas 3:4 como as fotos. */}
        <div className="mt-12 grid grid-cols-2 items-start gap-3 md:mt-16 md:grid-cols-3 md:gap-5">
          {lookColumns.map((col, i) => (
            <Parallax
              key={i}
              speed={col.speed}
              className={`grid gap-3 md:gap-5 ${i === 1 ? "mt-10 md:mt-24" : ""} ${i === 2 ? "col-span-2 grid-cols-2 md:col-span-1 md:mt-10 md:grid-cols-1" : ""}`}
            >
              {col.ids.map((id) => <LookCard key={id} id={id} />)}
            </Parallax>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- A loja ----------
function About() {
  const steps = [
    { icon: Shirt, t: "Escolha peças e tamanhos", d: "Monte sua sacola direto no catálogo." },
    { icon: MessageCircle, t: "Envie pelo WhatsApp", d: "A sacola vira uma mensagem pronta com o seu pedido." },
    { icon: Truck, t: "Receba onde estiver", d: "Entregamos em Brasília. Pagamento e entrega combinados na conversa." },
  ];
  return (
    <section id="loja" className="mx-auto grid max-w-7xl items-center gap-12 overflow-x-clip px-4 py-24 md:px-8 md:py-32 lg:grid-cols-2">
      <Parallax speed={60}>
        <img
          src={img("decote-v-preto")}
          alt="Modelo com vestido longo preto de decote V da USE MAVIÊ"
          loading="lazy"
          style={{ objectPosition: posOf("decote-v-preto") }}
          className="aspect-[4/5] w-full rounded-[2rem] object-cover shadow-[0_40px_80px_-40px_color-mix(in_oklab,var(--plum)_55%,transparent)]"
        />
      </Parallax>
      <div>
        <RevealText text="Loja on-line," accent="atendimento de perto." className="font-display text-5xl font-medium leading-[1.1] tracking-tight md:text-6xl" />
        <p className="mt-5 max-w-[55ch] text-muted-foreground">Você escolhe pelo site e fala com gente de verdade: cada pedido é confirmado pela nossa equipe, do tamanho à entrega.</p>
        <ScrollSteps steps={steps} />
      </div>
    </section>
  );
}

// Passos que acendem em sequência conforme a rolagem: a caixa sai do apagado, desliza para o lugar
// e o ícone ganha o degradê; a linha lateral enche junto com o avanço.
type Step = { icon: typeof Shirt; t: string; d: string };
function ScrollSteps({ steps }: { steps: Step[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.55"] });
  const line = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return (
    <ol ref={ref} className="relative mt-10 space-y-3 pl-6">
      <span aria-hidden className="absolute bottom-6 left-0 top-6 w-0.5 rounded-full bg-border" />
      <motion.span aria-hidden style={{ scaleY: line }} className="bg-grad absolute bottom-6 left-0 top-6 w-0.5 origin-top rounded-full" />
      {steps.map((step, i) => (
        <StepBox key={step.t} step={step} progress={scrollYProgress} range={[i / steps.length, (i + 1) / steps.length]} />
      ))}
    </ol>
  );
}

function StepBox({ step: { icon: Icon, t, d }, progress, range }: { step: Step; progress: MotionValue<number>; range: [number, number] }) {
  const reduce = useReducedMotion();
  const [from, to] = range;
  const mid = from + (to - from) * 0.6;
  const opacity = useTransform(progress, [from, mid], reduce ? [1, 1] : [0.25, 1]);
  const x = useTransform(progress, [from, mid], reduce ? [0, 0] : [36, 0]);
  const scale = useTransform(progress, [from, mid], reduce ? [1, 1] : [0.96, 1]);
  const lit = useTransform(progress, [from, mid], reduce ? [1, 1] : [0, 1]);
  const unlit = useTransform(lit, [0, 1], [1, 0]);
  return (
    <motion.li style={{ opacity, x, scale }} className="box flex items-center gap-4 p-4">
      <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-muted text-muted-foreground">
        <motion.span style={{ opacity: lit }} className="bg-grad absolute inset-0" />
        <motion.span style={{ opacity: lit }} className="relative text-white"><Icon className="size-5" strokeWidth={1.5} /></motion.span>
        <motion.span style={{ opacity: unlit }} className="absolute"><Icon className="size-5" strokeWidth={1.5} /></motion.span>
      </span>
      <div>
        <h3 className="font-medium">{t}</h3>
        <p className="text-sm text-muted-foreground">{d}</p>
      </div>
    </motion.li>
  );
}

// ---------- Política de troca (bento) ----------
function Exchanges() {
  const reduce = useReducedMotion();
  // Texto da política oficial da loja. O prazo vem em destaque; a regra da promoção fecha a seção.
  const rules = [
    { icon: Ban, t: "Não trocamos peças brancas." },
    { icon: Shirt, t: "Não trocamos peças de tricô, renda, cetim, tule, paetê e strass." },
    { icon: Tag, t: "O produto deve estar em perfeito estado, com etiquetas e embalagens originais." },
    { icon: Package, t: "As trocas são feitas nos pontos de retirada da loja ou por motoboy, com custo de envio pago pela cliente." },
  ];
  const reveal = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.35 },
    transition: { duration: 0.8, delay: i * 0.06, ease },
  });
  return (
    <section id="trocas" className="mx-auto max-w-7xl px-4 py-24 md:px-8 md:py-32">
      <RevealText text="Política de" accent="troca" className="font-display text-5xl font-medium tracking-tight md:text-7xl" />
      <p className="mt-3 max-w-[60ch] text-muted-foreground">Antes de comprar, vale conferir. Assim a sua troca acontece sem surpresa.</p>
      <div className="mt-12 grid gap-4 md:grid-cols-6">
        <motion.div {...reveal(0)} className="bg-grad relative flex min-h-56 flex-col justify-between overflow-hidden rounded-3xl p-7 text-white shadow-[var(--shadow-rose)] md:col-span-4 md:row-span-2 md:p-9">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/15 blur-2xl" />
          <span className="relative grid size-12 place-items-center rounded-2xl bg-white/20">
            <CalendarClock className="size-6" strokeWidth={1.5} />
          </span>
          <div className="relative mt-8">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/80">Prazo para trocas</p>
            <p className="mt-2 font-display text-6xl leading-none md:text-8xl">7 dias</p>
            <p className="mt-2 font-display text-2xl italic text-white/90 md:text-3xl">corridos</p>
          </div>
        </motion.div>
        {rules.map(({ icon: Icon, t }, i) => (
          <motion.div key={t} {...reveal(i + 1)} className={`box box-hover flex min-h-40 flex-col justify-between p-6 ${i < 2 ? "md:col-span-2" : "md:col-span-3"}`}>
            <span className="grid size-11 place-items-center rounded-2xl bg-rose-soft text-rose">
              <Icon className="size-5" strokeWidth={1.5} />
            </span>
            <p className="mt-5 text-[15px] leading-relaxed">{t}</p>
          </motion.div>
        ))}
        <motion.div {...reveal(5)} className="box flex items-center gap-4 p-5 md:col-span-6">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#fde2e2] text-[#a1262b]">
            <X className="size-5" strokeWidth={1.75} />
          </span>
          <p className="text-[15px] leading-relaxed"><strong className="font-medium">Não fazemos troca de itens comprados em promoção.</strong></p>
        </motion.div>
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
              <a href={INSTAGRAM} target="_blank" rel="noreferrer" className="btn btn-primary btn-shine inline-flex items-center gap-2 rounded-full px-7 py-4 text-sm font-medium">
                <Camera className="size-4" strokeWidth={1.5} /> @usemaviie_
              </a>
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
                <li><a href="#trocas" className="inline-flex items-center gap-2 transition-colors duration-300 hover:text-rose"><CalendarClock className="size-4" strokeWidth={1.5} /> Trocas em até 7 dias corridos</a></li>
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

        <div className="relative mt-14 flex flex-col items-center justify-between gap-3 border-t border-foreground/10 px-6 py-5 text-xs text-muted-foreground md:flex-row md:px-12">
          <p>© 2026 USE MAVIÊ. Versão demonstrativa: preços e estoque sujeitos a confirmação.</p>
          <div className="flex items-center gap-4">
            {/* Acesso discreto à área restrita (o painel pede senha). */}
            <a href={`${BASE}/painel`} aria-label="Área restrita" title="Área restrita" className="grid size-8 place-items-center rounded-full opacity-25 transition-opacity duration-300 hover:opacity-80 focus-visible:opacity-80">
              <LockKeyhole className="size-3.5" strokeWidth={1.5} />
            </a>
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
                          <img src={imageSrc(p.image)} alt="" style={{ objectPosition: focusPos(p) }} className="h-24 w-[4.5rem] shrink-0 rounded-xl object-cover" />
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

// Botão flutuante de atendimento; some com a sacola aberta, na hero (que já tem botões) e quando o rodapé aparece
// (o rodapé já tem o WhatsApp, e o botão cobria o acesso ao painel e o "voltar ao topo").
function WhatsAppFab({ number, hidden }: { number: string; hidden: boolean }) {
  const reduce = useReducedMotion();
  const [atFooter, setAtFooter] = useState(false);
  const [atHero, setAtHero] = useState(true);
  const shown = useRef(false);
  useEffect(() => {
    const footer = document.querySelector("footer");
    const hero = document.getElementById("topo");
    const ioFooter = new IntersectionObserver(([e]) => setAtFooter(e.isIntersecting), { rootMargin: "0px 0px -60px 0px" });
    const ioHero = new IntersectionObserver(([e]) => setAtHero(e.intersectionRatio > 0.45), { threshold: [0, 0.45, 1] });
    if (footer) ioFooter.observe(footer);
    if (hero) ioHero.observe(hero);
    return () => {
      ioFooter.disconnect();
      ioHero.disconnect();
    };
  }, []);
  if (!number) return null;
  return (
    <AnimatePresence>
      {!hidden && !atFooter && !atHero && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95, transition: { duration: 0.2 } }}
          // atraso só na primeira aparição (depois da hero); ao voltar do rodapé, aparece na hora
          transition={{ duration: 0.4, delay: shown.current ? 0 : 1.4, ease }}
          onAnimationComplete={() => { shown.current = true; }}
          className="fixed bottom-5 right-5 z-40 md:bottom-7 md:right-7"
        >
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
