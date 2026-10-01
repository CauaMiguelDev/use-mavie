# USE MAVIÊ | Moda Feminina

Loja on-line de moda feminina de Brasília. Divas usam Maviê.

**Site no ar:** https://cauamigueldev.github.io/use-mavie/

**Painel da loja:** https://cauamigueldev.github.io/use-mavie/painel

## O que tem

- Hero animada com fundo em WebGL que reage ao mouse
- Catálogo com filtros por categoria, tamanhos e aviso de estoque
- Sacola que monta o pedido e envia pelo WhatsApp
- Looks, como comprar e política de troca
- Painel com indicadores, gráficos, alertas de estoque e edição de preço, estoque, visibilidade e WhatsApp, publicando direto no site

## Antes de usar de verdade

- Preços e estoque são exemplos. Ajuste em `app/products.ts`.
- O número do WhatsApp pode ser definido no painel (recomendado) ou em `app/products.ts` (`WHATSAPP`).

## Como usar o painel

1. Abra https://cauamigueldev.github.io/use-mavie/painel
2. Edite preços, estoque, o que aparece na loja e o WhatsApp. As mudanças ficam como rascunho só no seu navegador, para conferir antes.
3. Clique em **Publicar**. Em cerca de 1 minuto todas as clientes veem a loja atualizada.

Para publicar, o painel pede um **token do GitHub** uma única vez por navegador. Qualquer pessoa pode abrir o painel, mas só quem tem o token consegue publicar.

**Criar o token (dono do repositório):**

1. Acesse https://github.com/settings/personal-access-tokens/new
2. Nome: `Painel USE MAVIÊ`. Validade: a que preferir.
3. Repository access: **Only select repositories** e escolha `use-mavie`.
4. Permissions: **Contents: Read and write**.
5. Gere o token e envie para quem administra a loja por um canal privado. Ele aparece só uma vez.

Se o token vazar ou a pessoa sair da loja, apague o token em https://github.com/settings/personal-access-tokens e crie outro.

## Rodar localmente

Requer Node.js 22.13 ou mais novo.

```bash
npm install
npm run dev
```

Abre em http://localhost:5173.

## Publicação

O site é publicado na branch `gh-pages`, que o GitHub Pages serve. Para publicar uma nova versão:

```bash
npm run deploy
```

O script gera o site estático (`scripts/deploy-pages.mjs`) e envia para a branch `gh-pages`, mantendo o `catalog.json` publicado pelo painel. O site atualiza em cerca de um minuto.

Feito com Next.js (vinext), Tailwind CSS, Motion, Lenis e Recharts.
