// Catálogo editável. Preços e estoque são EXEMPLOS: confira antes de publicar.
// WhatsApp padrão (DDI+DDD+número). O painel pode trocar e publicar outro.
export const WHATSAPP = "5561985489219";
export const INSTAGRAM = "https://instagram.com/usemaviie_";
// Prefixo do site quando publicado em subpasta (GitHub Pages: /use-mavie).
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const img = (id: string) => `${BASE}/images/${id}.jpg`;

export type Category = "Vestidos curtos" | "Vestidos longos" | "Conjuntos" | "Tops e bodies";

export type Product = {
  id: string;
  name: string;
  category: Category;
  price: number;
  sizes: string[];
  stock: number;
  image: string;
};

const p = (id: string, name: string, category: Category, price: number, stock: number, sizes = ["P", "M", "G"]): Product => ({
  id, name, category, price, stock, sizes, image: img(id),
});

export const products: Product[] = [
  p("longo-fenda-preto", "Vestido Longo Fenda Noir", "Vestidos longos", 189.9, 4),
  p("babado-marrom", "Vestido Babado Cacau", "Vestidos curtos", 149.9, 3),
  p("recorte-azul", "Vestido Recorte Céu", "Vestidos longos", 179.9, 5),
  p("corset-marrom", "Corset Cacau", "Tops e bodies", 119.9, 2),
  p("costas-nuas-preto", "Vestido Costas Nuas", "Vestidos longos", 189.9, 3),
  p("alcinha-preto", "Vestido Alcinha Noir", "Vestidos curtos", 129.9, 6),
  p("midi-vinho", "Vestido Midi Bordô", "Vestidos longos", 169.9, 4),
  p("conjunto-recorte-preto", "Conjunto Recorte Noir", "Conjuntos", 159.9, 3),
  p("body-renda-branco", "Body Renda Pérola", "Tops e bodies", 99.9, 5),
  p("amarracao-preto", "Vestido Amarração", "Vestidos curtos", 139.9, 0),
  p("longo-azul", "Vestido Longo Decote Céu", "Vestidos longos", 179.9, 4),
  p("drapeado-preto", "Vestido Drapeado Manga Longa", "Vestidos curtos", 149.9, 2),
  p("conjunto-vinho", "Conjunto Saia Bordô", "Conjuntos", 159.9, 3),
  p("um-ombro-preto", "Vestido Um Ombro Fenda", "Vestidos longos", 189.9, 1),
  p("alcinha-marrom", "Vestido Alcinha Cacau", "Vestidos curtos", 129.9, 4),
  p("decote-v-preto", "Vestido Longo Decote V", "Vestidos longos", 169.9, 5),
  p("conjunto-longo-preto", "Conjunto Saia Longa Noir", "Conjuntos", 169.9, 3),
  p("renda-preto", "Vestido Barra de Renda", "Vestidos curtos", 149.9, 4),
  p("longo-vinho", "Vestido Longo Bordô", "Vestidos longos", 179.9, 2),
  p("godet-preto", "Vestido Godê Noir", "Vestidos curtos", 129.9, 5),
  p("recorte-branco-azul", "Vestido Recorte Bicolor", "Vestidos longos", 179.9, 3),
  p("longo-fenda-marinho", "Vestido Longo Fenda Marinho", "Vestidos longos", 189.9, 2),
];

export const categories: Category[] = ["Vestidos curtos", "Vestidos longos", "Conjuntos", "Tops e bodies"];

export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type BagItem = { id: string; size: string; qty: number };

// Mensagem do pedido enviada ao WhatsApp.
export function orderMessage(items: BagItem[], list: Product[] = products) {
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
