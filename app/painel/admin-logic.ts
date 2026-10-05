// Regras do painel (puras, sem React): estoque por tamanho, pedidos, pagamentos e categorias.
// Toda mudança de estoque gera uma movimentação; operações inválidas lançam Error com mensagem para a tela.
import type { Catalog, HeroConfig, Product } from "../products";

export const CHANNELS = ["WhatsApp", "Instagram", "Presencial"] as const;
export const PAY_METHODS = ["Pix", "Cartão de crédito", "Cartão de débito", "Dinheiro"] as const;
export const PAY_STATUS = ["Pendente", "Pago", "Estornado"] as const;
export const ORDER_STATUS = ["Novo", "Separando", "Enviado", "Entregue", "Cancelado"] as const;
export const MOVE_REASONS = ["Entrada", "Venda", "Cancelamento", "Ajuste"] as const;

export type OrderItem = { productId: string; name: string; size: string; qty: number; price: number };
export type Order = {
  id: string;
  number: number;
  createdAt: string;
  customer: string;
  phone: string;
  channel: (typeof CHANNELS)[number];
  items: OrderItem[];
  discount: number;
  shipping: number;
  payment: { method: (typeof PAY_METHODS)[number]; status: (typeof PAY_STATUS)[number]; paidAt?: string };
  status: (typeof ORDER_STATUS)[number];
  note: string;
};
export type OrderDraft = Omit<Order, "id" | "number" | "createdAt">;
export type Movement = {
  id: string;
  at: string;
  productId: string;
  name: string;
  size: string;
  delta: number;
  reason: (typeof MOVE_REASONS)[number];
  ref?: string;
};
export type LogEntry = { at: string; text: string; by: string };
export type AdminState = { catalog: Catalog; orders: Order[]; movements: Movement[]; nextOrder: number; log?: LogEntry[] };

// Histórico permanente de tudo que foi salvo (mais recentes primeiro).
export const appendLog = (s: AdminState, text: string, by: string): AdminState => ({
  ...s,
  log: [{ at: new Date().toISOString(), text, by }, ...(s.log ?? [])].slice(0, 2000),
});

export const uid = () => crypto.randomUUID().slice(0, 8);
const now = () => new Date().toISOString();
const money = (n: number) => Math.round(n * 100) / 100;

export const initialState = (catalog: Catalog): AdminState => ({ catalog: structuredClone(catalog), orders: [], movements: [], nextOrder: 1001 });

export const orderSubtotal = (o: Pick<Order, "items">) => money(o.items.reduce((n, i) => n + i.qty * i.price, 0));
export const orderTotal = (o: Pick<Order, "items" | "discount" | "shipping">) => money(Math.max(0, orderSubtotal(o) - o.discount + o.shipping));

export const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "produto";

// Aplica variações de estoque (todas ou nenhuma) e registra as movimentações.
function moveStock(s: AdminState, changes: { productId: string; size: string; delta: number }[], reason: Movement["reason"], ref?: string): AdminState {
  const products = s.catalog.products.map((p) => ({ ...p, stock: { ...p.stock } }));
  const movements: Movement[] = [];
  for (const c of changes) {
    if (c.delta === 0) continue;
    const p = products.find((x) => x.id === c.productId);
    if (!p) throw new Error("Produto não encontrado.");
    if (!(c.size in p.stock)) throw new Error(`${p.name} não tem o tamanho ${c.size}.`);
    const next = p.stock[c.size] + c.delta;
    if (next < 0) throw new Error(`Estoque insuficiente: ${p.name} (${c.size}) tem ${p.stock[c.size]}.`);
    p.stock[c.size] = next;
    movements.push({ id: uid(), at: now(), productId: p.id, name: p.name, size: c.size, delta: c.delta, reason, ref });
  }
  return { ...s, catalog: { ...s.catalog, products }, movements: [...movements, ...s.movements].slice(0, 500) };
}

export function adjustStock(s: AdminState, productId: string, size: string, delta: number, reason: "Entrada" | "Ajuste") {
  if (!Number.isInteger(delta)) throw new Error("Use números inteiros.");
  return moveStock(s, [{ productId, size, delta }], reason);
}

// ---------- Produtos ----------
export function validateProduct(p: Product, s: AdminState) {
  if (!p.name.trim()) throw new Error("Dê um nome ao produto.");
  if (!(p.price > 0)) throw new Error("Informe um preço maior que zero.");
  if (!s.catalog.categories.includes(p.category)) throw new Error("Escolha uma categoria.");
  if (!Object.keys(p.stock).length) throw new Error("Escolha pelo menos um tamanho.");
  if (Object.values(p.stock).some((q) => !Number.isInteger(q) || q < 0)) throw new Error("O estoque de cada tamanho deve ser um número inteiro, zero ou mais.");
  if (!p.image) throw new Error("Adicione uma foto do produto.");
}

export function saveProduct(s: AdminState, input: Product): AdminState {
  const p: Product = { ...input, name: input.name.trim(), price: money(input.price) };
  validateProduct(p, s);
  const existing = s.catalog.products.find((x) => x.id === p.id);
  if (!existing) {
    let id = slugify(p.name);
    while (s.catalog.products.some((x) => x.id === id)) id = `${slugify(p.name)}-${uid().slice(0, 4)}`;
    const created: Product = { ...p, id, stock: Object.fromEntries(Object.keys(p.stock).map((k) => [k, 0])) };
    const withNew = { ...s, catalog: { ...s.catalog, products: [created, ...s.catalog.products] } };
    return moveStock(withNew, Object.entries(p.stock).map(([size, q]) => ({ productId: id, size, delta: q })), "Entrada");
  }
  // Edição: tamanhos removidos precisam estar zerados; diferenças de estoque viram "Ajuste".
  for (const size of Object.keys(existing.stock)) {
    if (!(size in p.stock) && existing.stock[size] > 0) throw new Error(`Zere o estoque do tamanho ${size} antes de removê-lo.`);
  }
  const deltas = Object.keys(p.stock).map((size) => ({ productId: p.id, size, delta: p.stock[size] - (existing.stock[size] ?? 0) }));
  const base: Product = { ...p, stock: Object.fromEntries(Object.keys(p.stock).map((k) => [k, existing.stock[k] ?? 0])) };
  const updated = { ...s, catalog: { ...s.catalog, products: s.catalog.products.map((x) => (x.id === p.id ? base : x)) } };
  return moveStock(updated, deltas, "Ajuste");
}

export function deleteProduct(s: AdminState, id: string): AdminState {
  const open = s.orders.some((o) => o.status !== "Cancelado" && o.status !== "Entregue" && o.items.some((i) => i.productId === id));
  if (open) throw new Error("Este produto está em pedidos em andamento. Conclua ou cancele os pedidos antes.");
  return { ...s, catalog: { ...s.catalog, products: s.catalog.products.filter((p) => p.id !== id) } };
}

export const toggleHidden = (s: AdminState, id: string): AdminState => ({
  ...s,
  catalog: { ...s.catalog, products: s.catalog.products.map((p) => (p.id === id ? { ...p, hidden: !p.hidden } : p)) },
});

// ---------- Vitrine (fotos do destaque da página inicial) ----------
const HERO_MAX = 8; // igual a MAX_HERO_SLIDES em products.ts (aqui só tipos podem ser importados)
const GALLERY_MAX = 6;
const photosOfProduct = (p: Product) => [p.image, ...(p.gallery ?? [])];

export function setHero(s: AdminState, hero: HeroConfig): AdminState {
  if (!hero.slides.length) throw new Error("Deixe pelo menos uma foto no destaque.");
  if (hero.slides.length > HERO_MAX) throw new Error(`O destaque aceita até ${HERO_MAX} fotos.`);
  for (const slide of [...hero.slides, ...(hero.small ? [hero.small] : [])]) {
    const p = s.catalog.products.find((x) => x.id === slide.productId);
    if (!p) throw new Error("Uma das fotos aponta para uma peça que não existe mais.");
    if (!photosOfProduct(p).includes(slide.image)) throw new Error(`Essa foto não pertence a ${p.name}.`);
  }
  return { ...s, catalog: { ...s.catalog, hero: structuredClone(hero) } };
}

// Foto nova enviada pela vitrine entra nas fotos extras da peça (aparece também na página do produto).
export function addProductPhoto(s: AdminState, productId: string, image: string): AdminState {
  const p = s.catalog.products.find((x) => x.id === productId);
  if (!p) throw new Error("Produto não encontrado.");
  if (!image) throw new Error("Escolha uma foto.");
  if ((p.gallery ?? []).length >= GALLERY_MAX) throw new Error(`${p.name} já tem ${GALLERY_MAX} fotos extras. Remova uma em Produtos para adicionar outra.`);
  return {
    ...s,
    catalog: { ...s.catalog, products: s.catalog.products.map((x) => (x.id === productId ? { ...x, gallery: [...(x.gallery ?? []), image] } : x)) },
  };
}

// ---------- Categorias ----------
export function addCategory(s: AdminState, name: string): AdminState {
  const n = name.trim();
  if (!n) throw new Error("Digite o nome da categoria.");
  if (s.catalog.categories.some((c) => c.toLowerCase() === n.toLowerCase())) throw new Error("Essa categoria já existe.");
  return { ...s, catalog: { ...s.catalog, categories: [...s.catalog.categories, n] } };
}

export function renameCategory(s: AdminState, from: string, to: string): AdminState {
  const n = to.trim();
  if (!n) throw new Error("O nome não pode ficar vazio.");
  if (n !== from && s.catalog.categories.some((c) => c.toLowerCase() === n.toLowerCase())) throw new Error("Já existe uma categoria com esse nome.");
  return {
    ...s,
    catalog: {
      ...s.catalog,
      categories: s.catalog.categories.map((c) => (c === from ? n : c)),
      products: s.catalog.products.map((p) => (p.category === from ? { ...p, category: n } : p)),
    },
  };
}

export function deleteCategory(s: AdminState, name: string): AdminState {
  const used = s.catalog.products.filter((p) => p.category === name).length;
  if (used) throw new Error(`Mova os ${used} produtos desta categoria antes de excluí-la.`);
  return { ...s, catalog: { ...s.catalog, categories: s.catalog.categories.filter((c) => c !== name) } };
}

// ---------- Pedidos e pagamentos ----------
export function createOrder(s: AdminState, d: OrderDraft): AdminState {
  if (!d.customer.trim()) throw new Error("Informe o nome da cliente.");
  const items = d.items.filter((i) => i.qty > 0);
  if (!items.length) throw new Error("Adicione pelo menos uma peça.");
  if (d.discount < 0 || d.shipping < 0) throw new Error("Desconto e frete não podem ser negativos.");
  const order: Order = {
    ...d,
    customer: d.customer.trim(),
    items,
    id: uid(),
    number: s.nextOrder,
    createdAt: now(),
    payment: { ...d.payment, paidAt: d.payment.status === "Pago" ? now() : undefined },
  };
  if (d.discount > orderSubtotal(order)) throw new Error("O desconto é maior que o valor das peças.");
  const withStock = moveStock(s, items.map((i) => ({ productId: i.productId, size: i.size, delta: -i.qty })), "Venda", `#${order.number}`);
  return { ...withStock, orders: [order, ...s.orders], nextOrder: s.nextOrder + 1 };
}

// Cancelar devolve as peças ao estoque; reabrir um cancelado retira de novo.
export function setOrderStatus(s: AdminState, id: string, status: Order["status"]): AdminState {
  const o = s.orders.find((x) => x.id === id);
  if (!o || o.status === status) return s;
  let next = s;
  if (status === "Cancelado") next = moveStock(s, o.items.map((i) => ({ productId: i.productId, size: i.size, delta: i.qty })), "Cancelamento", `#${o.number}`);
  else if (o.status === "Cancelado") next = moveStock(s, o.items.map((i) => ({ productId: i.productId, size: i.size, delta: -i.qty })), "Venda", `#${o.number}`);
  return { ...next, orders: next.orders.map((x) => (x.id === id ? { ...x, status } : x)) };
}

export function setPaymentStatus(s: AdminState, id: string, status: Order["payment"]["status"]): AdminState {
  return {
    ...s,
    orders: s.orders.map((o) =>
      o.id === id ? { ...o, payment: { ...o.payment, status, paidAt: status === "Pago" ? o.payment.paidAt ?? now() : undefined } } : o,
    ),
  };
}

// Receita reconhecida: pedidos pagos e não cancelados, na data do pagamento.
export const isRevenue = (o: Order) => o.payment.status === "Pago" && o.status !== "Cancelado";
export const revenueDate = (o: Order) => o.payment.paidAt ?? o.createdAt;
