"use client";

// Ajustes do painel (preço, estoque, visibilidade, WhatsApp) salvos no navegador.
// ponytail: localStorage é por dispositivo; para vários admins, mover para D1 (já configurado no projeto).
import { useCallback, useEffect, useState } from "react";
import { products, WHATSAPP, type Product } from "./products";

export type Override = { price?: number; stock?: number; hidden?: boolean };
export type CatalogItem = Product & { hidden: boolean };

const CATALOG_KEY = "mavie-catalog-v1";
const SETTINGS_KEY = "mavie-settings-v1";
const EVENT = "mavie-catalog-change";

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
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

// Re-lê quando outra aba/componente salvar.
function useStored<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    const sync = () => setValue(read(key, fallback));
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return value;
}

export function useCatalog() {
  const overrides = useStored<Record<string, Override>>(CATALOG_KEY, {});
  const list: CatalogItem[] = products.map((p) => ({ ...p, hidden: false, ...overrides[p.id] }));

  const update = useCallback((id: string, patch: Override) => {
    const cur = read<Record<string, Override>>(CATALOG_KEY, {});
    write(CATALOG_KEY, { ...cur, [id]: { ...cur[id], ...patch } });
  }, []);
  const reset = useCallback(() => write(CATALOG_KEY, {}), []);

  return { list, overrides, update, reset };
}

export function useSettings() {
  const settings = useStored<{ whatsapp: string }>(SETTINGS_KEY, { whatsapp: WHATSAPP });
  const save = useCallback((s: { whatsapp: string }) => write(SETTINGS_KEY, s), []);
  return { settings, save };
}
