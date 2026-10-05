"use client";

// Conexão com o Supabase (banco da loja). A chave "anon" é pública por natureza:
// quem protege os dados são as regras RLS em supabase/setup.sql.
import { useEffect, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { catalog as fallback, type Catalog } from "./products";

// Preencha com Project Settings > API do Supabase ("Project URL" e chave "anon public").
const PROJECT_URL = "https://urrfgrtbgwnzrbussfxe.supabase.co";
const ANON_KEY = "sb_publishable_mC6JXMoUgGGVLXbjnUamyw_mXhg_ndk";
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || PROJECT_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ANON_KEY;
// Login do painel: a loja digita só a senha; este é o usuário criado em Authentication > Users.
export const ADMIN_EMAIL = "painel@usemavie.com.br";
export const supabaseReady = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let client: SupabaseClient | null = null;
export function supabase() {
  if (!supabaseReady) throw new Error("Supabase não configurado.");
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}

// Catálogo ao vivo para a loja: começa com o estático (sem tela vazia) e troca pelo do banco,
// atualizando sozinho quando o painel salva (Realtime).
export function useLiveCatalog(): Catalog {
  const [cat, setCat] = useState<Catalog>(fallback);
  useEffect(() => {
    if (!supabaseReady) return;
    const db = supabase();
    let alive = true;
    const apply = (c: unknown) => {
      const next = c as Catalog | null;
      if (alive && next?.products && next.categories) setCat(next);
    };
    db.from("store_state").select("catalog").eq("id", 1).maybeSingle().then(({ data }) => apply(data?.catalog));
    const channel = db
      .channel("store-catalog")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "store_state" }, (p) => apply((p.new as { catalog?: unknown }).catalog))
      .subscribe();
    return () => {
      alive = false;
      db.removeChannel(channel);
    };
  }, []);
  return cat;
}
