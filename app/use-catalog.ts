"use client";

// Catálogo = padrão (products.ts) + publicado (catalog.json no site) + rascunho local do painel.
// O rascunho só existe no navegador de quem edita; "Publicar" grava catalog.json no GitHub.
import { useCallback, useEffect, useState } from "react";
import { BASE, products, WHATSAPP, type Product } from "./products";

export type Override = { price?: number; stock?: number; hidden?: boolean };
export type CatalogItem = Product & { hidden: boolean };
export type Published = { overrides: Record<string, Override>; whatsapp: string; updatedAt: string };
type Draft = { overrides: Record<string, Override>; whatsapp?: string };

const DRAFT_KEY = "mavie-draft-v2";
const PUBLISHED_KEY = "mavie-published-v2";
const EVENT = "mavie-catalog-change";
const EMPTY: Published = { overrides: {}, whatsapp: WHATSAPP, updatedAt: "" };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

// catalog.json vem de fora do código: aceita só ids conhecidos e valores válidos.
export function sanitize(data: unknown): Published {
  const d = (data ?? {}) as Partial<Published>;
  const overrides: Record<string, Override> = {};
  for (const p of products) {
    const o = d.overrides?.[p.id];
    if (!o || typeof o !== "object") continue;
    const clean: Override = {};
    if (typeof o.price === "number" && o.price > 0 && o.price < 100000) clean.price = Math.round(o.price * 100) / 100;
    if (Number.isInteger(o.stock) && o.stock! >= 0 && o.stock! < 100000) clean.stock = o.stock;
    if (typeof o.hidden === "boolean") clean.hidden = o.hidden;
    overrides[p.id] = clean;
  }
  const whatsapp = typeof d.whatsapp === "string" ? d.whatsapp.replace(/\D/g, "").slice(0, 13) : WHATSAPP;
  return { overrides, whatsapp, updatedAt: typeof d.updatedAt === "string" ? d.updatedAt : "" };
}

// Pages leva ~1 min para servir um catalog.json novo; até lá vale a cópia local mais recente.
async function fetchPublished(): Promise<Published> {
  let remote = EMPTY;
  try {
    const res = await fetch(`${BASE}/catalog.json?t=${Date.now()}`, { cache: "no-store" });
    if (res.ok) remote = sanitize(await res.json());
  } catch {}
  const local = read<Published | null>(PUBLISHED_KEY, null);
  return local && local.updatedAt > remote.updatedAt ? local : remote;
}

function useStore() {
  const [published, setPublished] = useState<Published>(EMPTY);
  const [draft, setDraft] = useState<Draft>({ overrides: {} });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const sync = async () => {
      setDraft(read<Draft>(DRAFT_KEY, { overrides: {} }));
      const p = await fetchPublished();
      if (alive) {
        setPublished(p);
        setLoaded(true);
      }
    };
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      alive = false;
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { published, draft, loaded };
}

export function useCatalog() {
  const { published, draft, loaded } = useStore();
  const merged = (id: string): Override => ({ ...published.overrides[id], ...draft.overrides[id] });
  const list: CatalogItem[] = products.map((p) => ({ ...p, hidden: false, ...merged(p.id) }));
  const changes = Object.keys(draft.overrides).length + (draft.whatsapp !== undefined ? 1 : 0);

  const update = useCallback((id: string, patch: Override) => {
    const cur = read<Draft>(DRAFT_KEY, { overrides: {} });
    write(DRAFT_KEY, { ...cur, overrides: { ...cur.overrides, [id]: { ...cur.overrides[id], ...patch } } });
  }, []);
  const discard = useCallback(() => write(DRAFT_KEY, undefined), []);

  // Dados completos a publicar (publicado + rascunho).
  const snapshot = (): Published => {
    const overrides: Record<string, Override> = {};
    for (const p of products) {
      const o = merged(p.id);
      if (Object.keys(o).length) overrides[p.id] = o;
    }
    return { overrides, whatsapp: draft.whatsapp ?? published.whatsapp, updatedAt: new Date().toISOString() };
  };
  const markPublished = (data: Published) => {
    try { localStorage.setItem(PUBLISHED_KEY, JSON.stringify(data)); } catch {}
    write(DRAFT_KEY, undefined);
  };

  return { list, loaded, changes, update, discard, snapshot, markPublished, publishedAt: published.updatedAt };
}

export function useSettings() {
  const { published, draft } = useStore();
  const whatsapp = draft.whatsapp ?? published.whatsapp;
  const save = useCallback((s: { whatsapp: string }) => {
    const cur = read<Draft>(DRAFT_KEY, { overrides: {} });
    write(DRAFT_KEY, { ...cur, whatsapp: s.whatsapp });
  }, []);
  return { settings: { whatsapp }, save };
}
