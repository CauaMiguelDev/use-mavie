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

- Painel: https://cauamigueldev.github.io/use-mavie/painel (só a senha da loja)
- Seções: Visão geral, Pedidos, Pagamentos, Vendas, Produtos (com foto por arrastar e soltar), Vitrine, Estoque por tamanho, Categorias e Histórico.
- Acesso: o link fica discreto no rodapé (cadeado). A loja digita só a senha; por trás, o login é o usuário `painel@usemavie.com.br` do Supabase (`ADMIN_EMAIL` em `app/supabase.ts`). Após 5 erros o painel trava por 5 minutos (cada novo bloqueio dobra o tempo).
- Trocar a senha: Supabase > **Authentication > Users** > `painel@usemavie.com.br` > **Reset password** (ou "Update user").
- Banco sempre ativo: o plano grátis pausa após 7 dias sem uso; `.github/workflows/keepalive.yml` lê o catálogo a cada 3 dias. Se o banco cair, a loja continua no ar com o catálogo publicado.

### Configuração (já feita)

Projeto `urrfgrtbgwnzrbussfxe`. Para recriar em outro projeto:

1. Crie um projeto em https://supabase.com (plano gratuito).
2. Em **SQL Editor**, cole `supabase/setup.sql` e clique em **Run**.
3. Em **Authentication > Users**, crie `painel@usemavie.com.br` com a senha do painel e marque **Auto Confirm User**.
4. Em **Authentication > Sign In / Providers**, desligue **Allow new users to sign up**.
5. Em **Project Settings > API Keys**, copie a **Publishable key** e a URL do projeto para `app/supabase.ts` e `.github/workflows/keepalive.yml`.
6. Para levar produtos cadastrados no modo local: **Backup** no painel antigo, **Restaurar** no painel conectado.

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
