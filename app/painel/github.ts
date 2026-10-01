// Publica catalog.json na branch gh-pages pela API do GitHub, com o token de quem administra.
// O token fica só no navegador (localStorage) e nunca vai para o código ou para o site.
import type { Published } from "../use-catalog";

export const REPO = process.env.NEXT_PUBLIC_GH_REPO || "CauaMiguelDev/use-mavie";
const API = `https://api.github.com/repos/${REPO}`;
const TOKEN_KEY = "mavie-gh-token";

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) ?? ""; } catch { return ""; }
}
export function setToken(token: string) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

// Confere se o token pode escrever neste repositório.
export async function checkToken(token: string) {
  const res = await fetch(API, { headers: headers(token), cache: "no-store" });
  if (res.status === 401) throw new Error("Token inválido ou expirado.");
  if (res.status === 404) throw new Error(`Este token não enxerga o repositório ${REPO}.`);
  if (!res.ok) throw new Error(`GitHub respondeu ${res.status}. Tente de novo.`);
  const repo = (await res.json()) as { permissions?: { push?: boolean } };
  // Tokens fine-grained não trazem "permissions"; a escrita é confirmada ao publicar.
  if (repo.permissions && !repo.permissions.push) throw new Error("Este token só pode ler o repositório. Ele precisa de permissão de escrita.");
}

function toBase64(text: string) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

export async function publishCatalog(token: string, data: Published) {
  const url = `${API}/contents/catalog.json`;
  const cur = await fetch(`${url}?ref=gh-pages`, { headers: headers(token), cache: "no-store" });
  if (cur.status === 401) throw new Error("Token inválido ou expirado. Conecte de novo.");
  if (!cur.ok && cur.status !== 404) throw new Error(`Não consegui ler o catálogo atual (${cur.status}).`);
  const sha = cur.ok ? ((await cur.json()) as { sha: string }).sha : undefined;

  const res = await fetch(url, {
    method: "PUT",
    headers: headers(token),
    body: JSON.stringify({
      message: "Atualiza catálogo pelo painel",
      content: toBase64(JSON.stringify(data, null, 2) + "\n"),
      branch: "gh-pages",
      sha,
    }),
  });
  if (res.status === 403 || res.status === 404) throw new Error("Este token não tem permissão de escrita no repositório.");
  if (res.status === 409) throw new Error("O catálogo mudou enquanto você editava. Recarregue a página e publique de novo.");
  if (!res.ok) throw new Error(`GitHub recusou a publicação (${res.status}).`);
}
