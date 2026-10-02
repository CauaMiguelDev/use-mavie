// Gera o site estático e publica na branch gh-pages (GitHub Pages).
// Uso: npm run deploy
import { execSync } from "node:child_process";
import { cpSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const repo = "use-mavie";
const out = "dist/client";
const run = (cmd, opts = {}) => execSync(cmd, { stdio: "inherit", ...opts });

const remote = execSync("git remote get-url origin").toString().trim();
const ghRepo = remote.replace(/^.*github\.com[/:]/, "").replace(/\.git$/, "");

rmSync("dist", { recursive: true, force: true });
try {
  run("npm run build", {
    // MSYS_NO_PATHCONV: no Git Bash do Windows, impede "/use-mavie" de virar caminho de disco.
    env: { ...process.env, GITHUB_PAGES: "1", NEXT_PUBLIC_BASE_PATH: `/${repo}`, NEXT_PUBLIC_GH_REPO: ghRepo, MSYS_NO_PATHCONV: "1" },
  });
} catch (err) {
  // ponytail: o Node 24 no Windows às vezes quebra AO SAIR (UV_HANDLE_CLOSING) com o build já pronto.
  // Só segue se as páginas finais foram geradas (dist é apagado antes, então não são de um build antigo).
  if (!["index.html", "painel.html"].every((f) => existsSync(join(out, f)))) throw err;
  console.warn("\nAviso: o Node fechou com erro depois do build, mas as páginas foram geradas. Seguindo com a publicação.\n");
}

// O assetPrefix grava /_next dentro de dist/client/<repo>; o Pages serve a raiz em /<repo>/.
if (!existsSync(join(out, repo, "_next"))) throw new Error(`Build sem ${out}/${repo}/_next; confira o assetPrefix.`);
cpSync(join(out, repo), out, { recursive: true });
rmSync(join(out, repo), { recursive: true, force: true });
rmSync(join(out, ".vite"), { recursive: true, force: true });
writeFileSync(join(out, ".nojekyll"), "");

const git = `git -c user.name=deploy -c user.email=deploy@users.noreply.github.com`;
run("git init -q -b gh-pages", { cwd: out });
run("git add -A", { cwd: out });
run(`${git} commit -q -m "Publica site"`, { cwd: out });
run(`git push -f ${remote} gh-pages`, { cwd: out });
console.log(`\nPublicado: https://${remote.split("/").at(-2).toLowerCase()}.github.io/${repo}/`);
