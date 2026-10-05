# USE MAVIÊ | Moda Feminina

Loja on-line de moda feminina de Brasília. Divas usam Maviê.

**Site no ar:** https://cauamigueldev.github.io/use-mavie/

**Painel da loja:** https://cauamigueldev.github.io/use-mavie/painel

**Código no GitHub:** https://github.com/CauaMiguelDev/use-mavie

## O que tem

- Hero animada com fundo em WebGL, looks em sequência e atalho para a peça
- Catálogo com filtros por categoria, tamanhos e aviso de estoque, em páginas de 12 peças e em ordem aleatória a cada visita
- Sacola que monta o pedido e envia pelo WhatsApp
- Looks, como comprar e política de troca (prazo de 7 dias corridos)
- Painel com pedidos, pagamentos, vendas, produtos, estoque por tamanho e categorias, ligado à loja em tempo real
- Vitrine no painel: troque, reordene ou adicione as fotos do destaque da página inicial (até 8) e a foto menor da colagem, inclusive enviando foto nova; a ordem muda arrastando as fotos

## Antes de usar de verdade

- Preços e estoque iniciais são exemplos. Ajuste pelo painel.
- O número do WhatsApp fica em `app/products.ts` (`WHATSAPP`).

## Painel e banco de dados (Supabase)

A loja e o painel usam o mesmo banco (Supabase). Quando um pedido é registrado no painel, o estoque cai na hora para todas as clientes; ao chegar a zero, a peça aparece como esgotada. Entradas de estoque, preços, produtos novos e categorias também aparecem na loja em segundos.

- Painel: https://cauamigueldev.github.io/use-mavie/painel (login com e-mail e senha)
- Seções: Visão geral, Pedidos, Pagamentos, Vendas, Produtos (com foto por arrastar e soltar), Estoque por tamanho e Categorias.
- Acesso: o link fica discreto no rodapé (cadeado). Enquanto o Supabase não está conectado, o painel funciona no modo local: a senha já vem definida pela loja (só o hash fica no código, em `app/painel/lock.tsx`), e após 5 erros o painel trava por 5 minutos (cada novo bloqueio dobra o tempo). Com o Supabase, o acesso é por e-mail e senha, com o mesmo limite de tentativas.

### Configuração (uma vez)

1. Crie um projeto em https://supabase.com (plano gratuito).
2. Em **SQL Editor**, cole `supabase/setup.sql`, troque o e-mail na última linha pelo e-mail de quem administra e clique em **Run**.
3. Em **Authentication > Users**, crie o usuário com esse e-mail e uma senha.
4. Em **Authentication > Sign In / Providers**, desligue **Allow new users to sign up**.
5. Em **Authentication > URL Configuration**, coloque `https://cauamigueldev.github.io/use-mavie/painel` em Site URL (para o link de "Esqueci a senha").
6. Em **Project Settings > API**, copie a **Project URL** e a chave **anon public** e coloque em `app/supabase.ts`.

A chave anon é pública por natureza; quem protege os dados são as regras de segurança do `setup.sql`: só e-mails da tabela `admins` alteram dados, e pedidos e telefones de clientes nunca ficam públicos.

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

O script gera o site estático (`scripts/deploy-pages.mjs`) e envia para a branch `gh-pages`. Só é preciso para mudanças no código ou no visual; produtos e estoque mudam pelo painel.

Feito com Next.js (vinext), Tailwind CSS, Motion, Lenis, Recharts e Supabase.
