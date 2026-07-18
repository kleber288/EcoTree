# EcoTree

EcoTree e uma aplicacao web para sustentabilidade, gamificacao e acompanhamento de habitos, registros financeiros e metas ecologicas. O sistema combina uma API FastAPI com uma interface React/Vite para permitir que cada usuario acompanhe sua propria jornada verde por meio de login, painel, arvore virtual, transacoes, metas e perfil.

## Objetivo

O objetivo do EcoTree e ajudar o usuario a registrar pequenas acoes e evolucoes pessoais, transformar esses registros em progresso visual e manter os dados protegidos por autenticacao JWT. O frontend nao envia `user_id` manual nas rotas principais; a identidade do usuario e derivada do token enviado ao backend.

## Tecnologias

### Backend

- Python
- FastAPI
- SQLite em desenvolvimento local
- PostgreSQL em producao via `DATABASE_URL`
- Uvicorn
- JWT com `python-jose`
- `pwdlib[argon2]` para hash e verificacao de senha
- `python-dotenv` para carregar variaveis de ambiente locais
- Swagger UI gerado pelo FastAPI

### Frontend

- React
- Vite
- JavaScript
- CSS
- `localStorage` apenas para armazenar o token JWT atual

## Funcionalidades principais

- Cadastro de usuario.
- Login com token JWT.
- Logout.
- Dashboard autenticado com resumo da jornada.
- Visualizacao e atualizacao da arvore EcoTree.
- Adicao de pontos na arvore.
- Cadastro, listagem e exclusao de transacoes.
- Resumo financeiro das transacoes do usuario autenticado.
- Cadastro, edicao, progresso e exclusao de metas.
- Perfil autenticado com resumo de conta, arvore, metas e registros.

## Estrutura resumida

```txt
Projeto_EcoTree/
  EcoTree-backend/
    .env.example
    auth.py
    config.py
    database.py
    main.py
    schemas.py
    tree_service.py
    requirements.txt
    routes/
      users.py
      tree.py
      transactions.py
      goals.py
  EcoTree-frontend/
    .env.example
    index.html
    package.json
    public/
    vite.config.js
    src/
      App.jsx
      main.jsx
      services/
        api.js
      components/
      pages/
      styles.css
  .gitignore
  DEPLOY.md
  README.md
  checklist-entrega.md
```

## Como rodar o backend

Entre na pasta do backend:

```bash
cd D:\Projeto_EcoTree\EcoTree-backend
```

Ative o ambiente virtual, se ja existir:

```bash
.\venv\Scripts\activate
```

Instale dependencias em um ambiente novo:

```bash
pip install -r requirements.txt
```

Inicie a API:

```bash
uvicorn main:app --reload
```

Ou rode diretamente pelo Python do ambiente virtual:

```bash
.\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

URLs principais:

```txt
API:     http://127.0.0.1:8000
Swagger: http://127.0.0.1:8000/docs
```

## Como rodar o frontend

Entre na pasta do frontend:

```bash
cd D:\Projeto_EcoTree\EcoTree-frontend
```

Instale as dependencias:

```bash
npm install
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

URL padrao:

```txt
http://127.0.0.1:5173
```

Durante o desenvolvimento, o Vite envia chamadas de `/api` para `http://127.0.0.1:8000` por proxy. Se necessario, o frontend tambem aceita `VITE_API_URL` em `.env`, conforme `EcoTree-frontend/.env.example`.

## Versao PWA

O frontend do EcoTree tambem pode ser gerado como PWA, ou seja, uma versao instalavel pelo navegador em celulares e computadores. Essa versao inclui manifest, icones do app e service worker para cache basico dos arquivos estaticos do frontend. As chamadas reais para a API continuam acontecendo normalmente e nao devem ser tratadas como dados offline.

Para testar localmente:

```bash
cd D:\Projeto_EcoTree\EcoTree-frontend
npm install
npm run build
npm run preview
```

Depois acesse a URL exibida pelo Vite Preview, normalmente:

```txt
http://127.0.0.1:4173
```

No DevTools do navegador, abra a aba Application e confira:

- Manifest com nome EcoTree, cores e icones.
- Service Worker registrado.
- Opcao de instalacao do app disponivel no navegador.

Para instalar no Android:

- Abra o EcoTree pelo Chrome no celular.
- Toque no menu do navegador.
- Escolha "Instalar app" ou "Adicionar a tela inicial".
- Confirme a instalacao.

Para instalar no iPhone:

- Abra o EcoTree pelo Safari.
- Toque no botao de compartilhamento.
- Escolha "Adicionar a Tela de Inicio".
- Confirme o nome EcoTree.

Observacao: para usar o app fora do computador de desenvolvimento, o backend precisa estar acessivel na rede local ou publicado online. Se o celular abrir apenas o frontend, mas nao conseguir acessar a API, login, perfil, arvore, metas e registros nao conseguirao carregar dados reais.

## Preparacao para deploy

O EcoTree esta preparado para publicar frontend e backend separadamente, mantendo o modo local funcionando.

- Frontend: pode ser publicado em Vercel ou Netlify.
- Backend: pode ser publicado em Render ou Railway.
- Banco local: SQLite em arquivo, usado somente sem `DATABASE_URL` fora de producao.
- Banco de producao: PostgreSQL, recomendado no Supabase, acessado apenas pelo backend.
- Deploy real: ainda deve ser feito manualmente depois de escolher as URLs finais.

### Variaveis de ambiente do frontend

O frontend usa `src/services/api.js` com:

```txt
VITE_API_URL ou /api
```

Configuracao local:

```env
VITE_API_URL=/api
```

Tambem e possivel nao criar `.env` no frontend durante o desenvolvimento, porque o fallback `/api` usa o proxy do Vite para `http://127.0.0.1:8000`.

Configuracao online:

```env
VITE_API_URL=https://sua-api-publica.com
```

Use a URL publica real do backend, sem barra final. Exemplo: `https://ecotree-api.onrender.com`.

### Variaveis de ambiente do backend

O backend carrega variaveis a partir de `EcoTree-backend/.env` no ambiente local e tambem aceita variaveis configuradas no painel da plataforma de deploy.

```env
ECOTREE_SECRET_KEY=troque-por-uma-chave-forte-em-producao
ECOTREE_ENV=development
DATABASE_URL=
ECOTREE_ACCESS_TOKEN_EXPIRE_MINUTES=60
ECOTREE_DATABASE_FILE=ecotree.db
ECOTREE_CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
```

Para deploy online, `ECOTREE_SECRET_KEY` deve ser obrigatoriamente trocada por uma chave forte e privada. Tambem configure `ECOTREE_ENV=production` e `DATABASE_URL` no backend online. Em producao, a API nao inicia sem `DATABASE_URL`, evitando SQLite no sistema de arquivos temporario do Render. Nao commite `.env` real.

`ECOTREE_CORS_ORIGINS` aceita uma ou mais origens exatas separadas por virgula. Em producao, configure:

```env
ECOTREE_CORS_ORIGINS=https://eco-tree-ten.vercel.app
```

### CORS

Em desenvolvimento, o backend aceita por padrao o Vite em `http://127.0.0.1:5173` e `http://localhost:5173`. Em producao, as origens locais nao sao adicionadas; o Render usa `ECOTREE_CORS_ORIGINS=https://eco-tree-ten.vercel.app`.

Evite usar `*` em producao. O ideal e liberar apenas o dominio real do frontend.

### Banco em deploy

O SQLite continua disponivel para desenvolvimento local. Em producao, use PostgreSQL por `DATABASE_URL`; o Supabase pode ser usado apenas como banco PostgreSQL, mantendo JWT e hash de senha no FastAPI.

Nao use Supabase Auth, nao conecte o frontend diretamente ao Supabase e nao exponha anon key, service_role ou connection string no frontend.

No Supabase, as tabelas do EcoTree no schema `public` recebem uma protecao idempotente na inicializacao do backend: RLS habilitada, nenhuma policy publica criada e grants de `anon` e `authenticated` revogados nas tabelas e sequences da aplicacao. O backend continua acessando o banco pelo usuario PostgreSQL da `DATABASE_URL`.

### HTTPS e PWA

Para que o PWA seja instalavel de forma confiavel em celulares e computadores, o frontend publicado deve estar em HTTPS. Plataformas como Vercel, Netlify, Render e Railway normalmente oferecem HTTPS nas URLs publicas.

Um passo a passo separado esta em `DEPLOY.md`.

## Endpoints principais

### Geral

- `GET /` - status publico da API.

### Usuarios

- `POST /users/register` - cria usuario e arvore inicial.
- `POST /users/login` - autentica usuario e retorna `access_token`.
- `GET /users/me` - retorna o usuario autenticado pelo token.
- `GET /users/` - lista usuarios; exige JWT.

### Arvore

- `GET /tree/status` - retorna a arvore do usuario autenticado.
- `GET /tree/me` - rota equivalente para arvore do usuario autenticado.
- `PATCH /tree/add-points` - adiciona pontos na arvore autenticada.
- `PUT /tree/update` - recalcula a arvore a partir dos dados do usuario.
- `GET /tree/` - rota publica informativa sobre o modulo de arvore.

### Transacoes

- `GET /transactions/` - lista transacoes do usuario autenticado.
- `POST /transactions/` - cria transacao para o usuario autenticado.
- `GET /transactions/summary` - retorna resumo financeiro do usuario autenticado.
- `DELETE /transactions/{transacao_id}` - exclui transacao do usuario autenticado.
- `GET /transactions/user` - rota autenticada de compatibilidade para o usuario logado.
- `GET /transactions/user/{user_id}` - rota autenticada de compatibilidade com checagem de dono.
- `GET /transactions/summary/{user_id}` - rota autenticada de compatibilidade com checagem de dono.

### Metas

- `GET /goals/` - lista metas do usuario autenticado.
- `POST /goals/` - cria meta para o usuario autenticado.
- `GET /goals/{goal_id}` - busca meta do usuario autenticado.
- `PUT /goals/{goal_id}` - atualiza meta do usuario autenticado.
- `PATCH /goals/{goal_id}/progress` - adiciona progresso a uma meta.
- `DELETE /goals/{goal_id}` - exclui meta do usuario autenticado.
- `GET /goals/user` - rota autenticada de compatibilidade para o usuario logado.
- `GET /goals/user/{user_id}` - rota autenticada de compatibilidade com checagem de dono.

## Autenticacao

O login em `POST /users/login` retorna um JWT. O frontend salva o token em `localStorage` na chave `token` e a camada `src/services/api.js` envia:

```txt
Authorization: Bearer TOKEN
```

No backend, `verificar_token` valida o bearer token e retorna `user_id` e `email`. As rotas principais de arvore, transacoes, metas e perfil usam essa identidade autenticada.

## Dados simulados conhecidos

O projeto mantem alguns dados visuais simulados apenas no frontend:

- No perfil, a conquista "Guardiao Verde" e exibida como conquista recente.
- No perfil, a sequencia de "12 dias" e exibida como dado visual fixo.

Esses valores nao vem do backend nesta etapa e devem ser tratados como conteudo demonstrativo para apresentacao.

## Versionamento e arquivos locais

Arquivos de ambiente, dependencias, build, caches, banco local e logs nao devem entrar no versionamento:

- `.env`
- `.env.local`
- `node_modules/`
- `dist/`
- `venv/`
- `__pycache__/`
- `*.pyc`
- `*.db`
- `*.sqlite`
- `*.sqlite3`
- `*.log`

O banco local usado em desenvolvimento e `EcoTree-backend/ecotree.db`. Ele deve permanecer local.

## Observacoes tecnicas da entrega

- `EcoTree-backend/models.py` esta vazio e pode ser removido em uma etapa futura se nao for adotado.
- `ActionButton`, `MetricCard` e `ProgressBar` existem como componentes de UI, mas nao estao em uso nas telas atuais.
- Existem pequenas duplicacoes de helpers de usuario entre rotas e servicos do backend; a consolidacao pode ficar para uma refatoracao futura.
- A `SECRET_KEY` agora e lida por variavel de ambiente em `EcoTree-backend/config.py`, com fallback apenas para desenvolvimento local.
- As rotas antigas com `user_id` em transacoes e metas permanecem protegidas por JWT e checagem de dono por compatibilidade.

## Proximos passos futuros

- Adicionar testes automatizados para backend e frontend.
- Criar regras de administracao para `GET /users/`.
- Avaliar remocao de rotas de compatibilidade apos estabilizar consumidores.
- Remover componentes nao usados caso nao sejam aproveitados.
- Preparar deploy do frontend e backend.
- Configurar as URLs reais em `VITE_API_URL` e `ECOTREE_CORS_ORIGINS`.
- Configurar `DATABASE_URL` no Render apontando para o PostgreSQL do Supabase antes de usar dados reais em producao.
- Persistir no backend conquistas e sequencias hoje exibidas como dados simulados.
