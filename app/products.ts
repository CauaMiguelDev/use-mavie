// Catálogo ao vivo vem do Supabase (app/supabase.ts); app/catalog-data.json é o reserva estático.
// Preços e estoque iniciais são EXEMPLOS: confira antes de usar.
import data from "./catalog-data.json";

export const WHATSAPP = "5561985489219";
export const INSTAGRAM = "https://instagram.com/usemaviie_";
// Prefixo do site quando publicado em subpasta (GitHub Pages: /use-mavie).
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const img = (id: string) => `${BASE}/images/${id}.jpg`;

// Ordem fixa dos tamanhos em toda a loja.
export const SIZES = ["PP", "P", "M", "G", "GG", "U"] as const;

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string; // "images/x.jpg" (pasta do site) ou URL do Supabase Storage
  stock: Record<string, number>; // por tamanho
  hidden?: boolean;
  color?: string; // nome da cor, ex.: "Noir"
  colorHex?: string;
  model?: string; // produtos com o mesmo modelo aparecem como opções de cor
  gallery?: string[]; // fotos extras
  focus?: [number, number]; // onde está o rosto na foto (% x, % y), para enquadrar sem cortar
};

// object-position que mantém o rosto à vista em qualquer proporção de caixa.
export const focusPos = (p: Pick<Product, "focus">) => (p.focus ? `${p.focus[0]}% ${p.focus[1]}%` : "50% 20%");
// Vitrine da página inicial: fotos que passam no destaque + foto menor. Cada foto aponta para uma peça
// (o cartão do destaque mostra nome, preço e abre a peça) e para uma das fotos dela.
export type HeroSlide = { productId: string; image: string };
export type HeroConfig = { slides: HeroSlide[]; small: HeroSlide | null };
export type Catalog = { categories: string[]; products: Product[]; updatedAt: string; hero?: HeroConfig };

export const catalog = data as unknown as Catalog; // JSON não guarda o tipo da tupla focus

export const MAX_HERO_SLIDES = 8;
const DEFAULT_HERO = { slides: ["longo-fenda-preto", "recorte-azul", "midi-vinho", "costas-nuas-preto"], small: "babado-marrom" };

// Vitrine pronta para exibir: só peças visíveis; foto que não existe mais na peça volta para a principal.
// Se nada sobrar (vitrine nunca configurada ou peças removidas), usa o padrão.
export function heroOf(c: Pick<Catalog, "hero">, visible: Product[]): { slides: HeroSlide[]; small: HeroSlide | null } {
  const fix = (s: HeroSlide | null | undefined): HeroSlide | null => {
    const p = s && visible.find((x) => x.id === s.productId);
    if (!p) return null;
    return { productId: p.id, image: photosOf(p).includes(s!.image) ? s!.image : p.image };
  };
  const fromIds = (id: string) => fix({ productId: id, image: "" });
  let slides = (c.hero?.slides ?? []).map(fix).filter((s): s is HeroSlide => !!s).slice(0, MAX_HERO_SLIDES);
  if (!slides.length) slides = DEFAULT_HERO.slides.map(fromIds).filter((s): s is HeroSlide => !!s);
  if (!slides.length && visible[0]) slides = [{ productId: visible[0].id, image: visible[0].image }];
  const small = c.hero ? fix(c.hero.small) : fromIds(DEFAULT_HERO.small);
  return { slides, small };
}

export const sizesOf = (p: Product) => SIZES.filter((s) => s in p.stock);
export const totalStock = (p: Product) => Object.values(p.stock).reduce((n, q) => n + q, 0);
// Outras cores do mesmo modelo (inclui o próprio produto), na ordem do catálogo.
export const colorsOf = (p: Product, list: Product[]) => (p.model ? list.filter((x) => x.model === p.model && !x.hidden) : [p]);
export const photosOf = (p: Product) => [p.image, ...(p.gallery ?? [])];
export const imageSrc = (image: string) => (/^(data|blob|https?):/.test(image) ? image : `${BASE}/${image.replace(/^\//, "")}`);

export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type BagItem = { id: string; size: string; qty: number };

// Mensagem do pedido enviada ao WhatsApp.
export function orderMessage(items: BagItem[], list: Product[]) {
  let total = 0;
  const lines = items.map((it) => {
    const prod = list.find((x) => x.id === it.id)!;
    total += prod.price * it.qty;
    return `• ${it.qty}x ${prod.name} (${it.size}) ${brl(prod.price * it.qty)}`;
  });
  return `Oi, Maviê! Quero fazer este pedido:\n${lines.join("\n")}\nTotal: ${brl(total)}`;
}

// "5561985489219" -> "(61) 98548-9219"
export const formatPhone = (n: string) => {
  const d = n.replace(/\D/g, "").replace(/^55/, "");
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : n;
};

export const whatsappUrl = (text: string, number = WHATSAPP) =>
  `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
