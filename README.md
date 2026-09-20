# Estudos

App web (PWA) para gerenciar estudos: matérias com início e prazo final, cronograma,
checklist do que estudar em cada dia, login e perfis **Administrador** / **Usuário**
com aprovação de novos cadastros.

**Stack:** Vite + React + TypeScript · Supabase (Auth + Postgres + RLS) · vite-plugin-pwa

## 1. Configurar o Supabase

1. Crie um projeto em <https://supabase.com>.
2. **SQL Editor → New query**: cole todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e execute.
   Cria tabelas, funções, trigger de cadastro e as políticas de segurança (RLS).
3. **Project Settings → API**: copie a _Project URL_ e a chave _anon public_.
4. _(Só num projeto novo/exclusivo)_ **Authentication → Providers → Email → desative "Confirm email"**.
   A aprovação do Administrador já é o filtro de acesso. Essa opção vale para o projeto inteiro:
   **não mude** se outro app no mesmo projeto depende da confirmação. Sem desativar, o usuário
   precisa clicar no link do e-mail **e** ser aprovado.

### Usando um projeto Supabase que já tem outro app

Funciona (o plano gratuito limita a 2 projetos). O `schema.sql` foi feito para isso:
tudo tem o prefixo `estudos_` e **não há trigger em `auth.users`**, então o outro app não é afetado.

- O login (`auth.users`) é compartilhado: quem já tem conta no outro app pode entrar aqui com o mesmo
  e-mail/senha, mas cai em "Aguardando aprovação" até o Administrador liberar. Não vê nada de estudos.
- O perfil é criado no primeiro login neste app. **Seu primeiro login vira Administrador** — entre você
  antes de divulgar o endereço, senão quem entrar primeiro (mesmo vindo do outro app) vira admin.
- Configurações de Auth (confirmação de e-mail, _Site URL_, redirects, templates) são do projeto todo.

## 2. Rodar localmente

```bash
cp .env.example .env      # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
pnpm install --ignore-scripts
pnpm dev                  # http://localhost:5173 (também acessível pela rede local)
```

## 3. Como funcionam os perfis

- **O primeiro login do sistema vira Administrador já aprovado.** Faça-o você mesmo, logo após criar o banco.
- Todo perfil seguinte entra como **Usuário / pendente** e vê a tela "Aguardando aprovação".
- Somente o Administrador enxerga a aba **Usuários**, onde pode aprovar, recusar, bloquear e promover/rebaixar.
  Um badge vermelho no menu indica quantos cadastros esperam aprovação.
- Um Administrador não altera a própria linha (impede que o último admin se rebaixe/bloqueie).
- Cada usuário vê apenas as próprias matérias e tarefas (RLS no banco, não só na interface).

Promover alguém manualmente pelo SQL Editor, se necessário:

```sql
update public.estudos_profiles set role = 'admin', status = 'approved' where email = 'fulano@exemplo.com';
```

## 4. Publicar e instalar no celular

A instalação como app exige **HTTPS**, então publique o build (Vercel, Netlify, Cloudflare Pages…):

```bash
pnpm build                # gera dist/
```

- Build command: `pnpm build` · Output directory: `dist`
- Configure as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no painel do provedor.
- Em **Supabase → Authentication → URL Configuration**, ponha a URL publicada em _Site URL_.

Depois, abra o endereço no celular:

- **Android (Chrome):** menu ⋮ → _Instalar app_ / _Adicionar à tela inicial_.
- **iPhone (Safari):** botão Compartilhar → _Adicionar à Tela de Início_.

O app abre em tela cheia com ícone próprio. O app em si carrega offline, mas os dados
dependem de conexão com o Supabase.

## Scripts

| comando                      | o que faz                           |
| ---------------------------- | ----------------------------------- |
| `pnpm dev`                   | servidor de desenvolvimento         |
| `pnpm build`                 | typecheck + build de produção (PWA) |
| `pnpm test`                  | testes (vitest)                     |
| `pnpm lint`                  | oxlint                              |
| `pnpm format`                | oxfmt                               |
| `node scripts/gen-icons.mjs` | regenera os ícones PNG do app       |

## Estrutura

```
supabase/schema.sql      tabelas estudos_*, função de perfil e RLS
src/auth/                sessão e perfil (AuthContext)
src/data/                matérias e tarefas (DataContext)
src/pages/               Hoje · Matérias · Cronograma · Usuários · Login · Pendente
src/components/          Shell (navegação), formulários, modal, tarefa
src/lib/                 datas (com testes), tipos, cliente Supabase
```
