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
};
export type Catalog = { categories: string[]; products: Product[]; updatedAt: string };

export const catalog = data as Catalog;

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
