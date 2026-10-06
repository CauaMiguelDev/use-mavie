// Gera o site estático na RAIZ (sem /use-mavie) e publica na branch "hostinger".
// A Hostinger (hPanel > Implante de GitHub) acompanha essa branch e republica sozinha a cada push.
// Uso: npm run deploy:hostinger
import { execSync } from "node:child_process";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const out = "dist/client";
const run = (cmd, opts = {}) => execSync(cmd, { stdio: "inherit", ...opts });
const remote = execSync("git remote get-url origin").toString().trim();
const ghRepo = remote.replace(/^.*github\.com[/:]/, "").replace(/\.git$/, "");

// .htaccess: /painel abre o painel, força HTTPS e guarda os arquivos fixos no navegador.
const htaccess = `# USE MAVIÊ — hospedagem na Hostinger (Apache)
RewriteEngine On

# Sempre HTTPS (cadeado)
RewriteCond %{HTTPS} off
RewriteCond %{HTTP:X-Forwarded-Proto} !https
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]

# O endereço /painel abre o painel da loja
RewriteRule ^painel/?$ painel.html [L]

ErrorDocument 404 /404.html

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/jpeg "access plus 30 days"
  ExpiresByType image/png "access plus 30 days"
  ExpiresByType font/woff2 "access plus 1 year"
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>
`;

rmSync("dist", { recursive: true, force: true });
try {
  run("npm run build", {
    // Base vazia = site na raiz do domínio. MSYS_NO_PATHCONV evita conversão de caminho no Git Bash do Windows.
    env: { ...process.env, GITHUB_PAGES: "1", NEXT_PUBLIC_BASE_PATH: "", NEXT_PUBLIC_GH_REPO: ghRepo, MSYS_NO_PATHCONV: "1" },
  });
} catch (err) {
  // ponytail: o Node 24 no Windows às vezes quebra AO SAIR com o build já pronto.
  if (!["index.html", "painel.html"].every((f) => existsSync(join(out, f)))) throw err;
  console.warn("\nAviso: o Node fechou com erro depois do build, mas as páginas foram geradas. Seguindo.\n");
}

// Sem assetPrefix, o build já sai com /_next na raiz (confirmação de sanidade).
if (!existsSync(join(out, "_next"))) throw new Error(`Build sem ${out}/_next; o NEXT_PUBLIC_BASE_PATH deveria estar vazio.`);
rmSync(join(out, ".vite"), { recursive: true, force: true });
writeFileSync(join(out, ".htaccess"), htaccess); // Hostinger/Apache
// Netlify/Cloudflare usam _redirects (o .htaccess é ignorado lá, e vice-versa): /painel abre o painel.
writeFileSync(join(out, "_redirects"), "/painel  /painel.html  200\n");

const git = `git -c user.name=deploy -c user.email=deploy@users.noreply.github.com`;
run("git init -q -b hostinger", { cwd: out });
run("git add -A", { cwd: out });
run(`${git} commit -q -m "Publica site (Hostinger)"`, { cwd: out });
run(`git push -f ${remote} hostinger`, { cwd: out });
console.log("\nPublicado na branch 'hostinger'. A Hostinger republica sozinha se o Implante de GitHub estiver ligado.\n");
