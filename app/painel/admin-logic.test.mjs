// node --test app/painel/admin-logic.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, saveProduct, createOrder, setOrderStatus, setPaymentStatus, adjustStock, deleteCategory, renameCategory, orderTotal, isRevenue, setHero, addProductPhoto } from "./admin-logic.ts";

const base = () =>
  initialState({
    categories: ["Vestidos"],
    products: [{ id: "noir", name: "Vestido Noir", category: "Vestidos", price: 100, image: "images/noir.jpg", stock: { P: 2, M: 1 } }],
    updatedAt: "",
  });
const draft = (qty, size = "P") => ({
  customer: "Ana", phone: "", channel: "WhatsApp", note: "", discount: 10, shipping: 15,
  items: [{ productId: "noir", name: "Vestido Noir", size, qty, price: 100 }],
  payment: { method: "Pix", status: "Pendente" }, status: "Novo",
});
const stock = (s, size) => s.catalog.products.find((p) => p.id === "noir").stock[size];

test("pedido baixa estoque, cancelamento devolve, reabrir baixa de novo", () => {
  let s = createOrder(base(), draft(2));
  assert.equal(stock(s, "P"), 0);
  assert.equal(s.orders[0].number, 1001);
  assert.equal(orderTotal(s.orders[0]), 205);
  s = setOrderStatus(s, s.orders[0].id, "Cancelado");
  assert.equal(stock(s, "P"), 2);
  s = setOrderStatus(s, s.orders[0].id, "Novo");
  assert.equal(stock(s, "P"), 0);
  assert.deepEqual(s.movements.map((m) => m.reason), ["Venda", "Cancelamento", "Venda"]);
});

test("não vende mais que o estoque e não altera nada quando falha", () => {
  const s = base();
  assert.throws(() => createOrder(s, draft(3)), /Estoque insuficiente/);
  assert.equal(stock(s, "P"), 2);
  assert.throws(() => adjustStock(s, "noir", "M", -2, "Ajuste"), /Estoque insuficiente/);
});

test("receita só conta pedido pago e não cancelado", () => {
  let s = createOrder(base(), draft(1));
  const id = s.orders[0].id;
  assert.equal(isRevenue(s.orders[0]), false);
  s = setPaymentStatus(s, id, "Pago");
  assert.equal(isRevenue(s.orders[0]), true);
  assert.ok(s.orders[0].payment.paidAt);
  s = setOrderStatus(s, id, "Cancelado");
  assert.equal(isRevenue(s.orders[0]), false);
});

test("produto novo gera id único e entrada de estoque; edição vira ajuste", () => {
  let s = saveProduct(base(), { id: "", name: "Vestido Noir", category: "Vestidos", price: 120, image: "data:image/jpeg;base64,x", stock: { G: 3 } });
  const novo = s.catalog.products[0];
  assert.equal(novo.id, "vestido-noir");
  const dup = saveProduct(s, { ...novo, id: "", stock: { G: 0 } }).catalog.products[0];
  assert.match(dup.id, /^vestido-noir-[a-z0-9]{4}$/);
  assert.equal(novo.stock.G, 3);
  assert.equal(s.movements[0].reason, "Entrada");
  s = saveProduct(s, { ...novo, stock: { G: 1 } });
  assert.equal(s.catalog.products[0].stock.G, 1);
  assert.equal(s.movements[0].delta, -2);
  assert.throws(() => saveProduct(s, { ...novo, stock: { P: 0 } }), /Zere o estoque do tamanho G/);
});

test("categoria em uso não pode ser excluída; renomear move os produtos", () => {
  const s = base();
  assert.throws(() => deleteCategory(s, "Vestidos"), /Mova os 1 produtos/);
  const r = renameCategory(s, "Vestidos", "Vestidos de festa");
  assert.equal(r.catalog.products[0].category, "Vestidos de festa");
});

test("vitrine: valida fotos e aceita foto nova enviada para a peça", () => {
  let s = base();
  assert.throws(() => setHero(s, { slides: [], small: null }), /pelo menos uma foto/);
  assert.throws(() => setHero(s, { slides: [{ productId: "noir", image: "images/outra.jpg" }], small: null }), /não pertence/);
  assert.throws(() => setHero(s, { slides: [{ productId: "sumiu", image: "x" }], small: null }), /não existe/);
  s = addProductPhoto(s, "noir", "data:image/jpeg;base64,nova");
  s = setHero(s, { slides: [{ productId: "noir", image: "data:image/jpeg;base64,nova" }], small: { productId: "noir", image: "images/noir.jpg" } });
  assert.equal(s.catalog.hero.slides[0].image, "data:image/jpeg;base64,nova");
  assert.deepEqual(s.catalog.products[0].gallery, ["data:image/jpeg;base64,nova"]);
  const many = Array.from({ length: 9 }, () => ({ productId: "noir", image: "images/noir.jpg" }));
  assert.throws(() => setHero(s, { slides: many, small: null }), /até 8/);
  for (let i = 0; i < 5; i++) s = addProductPhoto(s, "noir", `data:image/jpeg;base64,${i}`);
  assert.throws(() => addProductPhoto(s, "noir", "data:image/jpeg;base64,x"), /já tem 6 fotos/);
});
