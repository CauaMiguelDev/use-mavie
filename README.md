# USE MAVIÊ | Moda Feminina

Loja on-line de moda feminina de Brasília. Divas usam Maviê.

**Site no ar:** https://cauamigueldev.github.io/use-mavie/

**Painel da loja:** https://cauamigueldev.github.io/use-mavie/painel

## O que tem

- Hero animada com fundo em WebGL que reage ao mouse
- Catálogo com filtros por categoria, tamanhos e aviso de estoque
- Sacola que monta o pedido e envia pelo WhatsApp
- Looks, como comprar e política de troca
- Painel com indicadores, gráficos, alertas de estoque e edição de preço, estoque e visibilidade

## Antes de usar de verdade

- Preços e estoque são exemplos. Ajuste em `app/products.ts`.
- O número do WhatsApp pode ser definido em `app/products.ts` (`WHATSAPP`) ou no painel.
- O painel salva as alterações só no navegador de quem editou e não tem login. Para uma área restrita de verdade, é preciso autenticação e banco de dados.

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

O script gera o site estático (`scripts/deploy-pages.mjs`) e envia para a branch `gh-pages`. O site atualiza em cerca de um minuto.

Feito com Next.js (vinext), Tailwind CSS, Motion, Lenis e Recharts.
