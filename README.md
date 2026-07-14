# EcoTree

EcoTree e uma aplicacao web para sustentabilidade, gamificacao e acompanhamento de habitos, registros financeiros e metas ecologicas. O sistema combina uma API FastAPI com uma interface React/Vite para permitir que cada usuario acompanhe sua propria jornada verde por meio de login, painel, arvore virtual, transacoes, metas e perfil.

## Objetivo

O objetivo do EcoTree e ajudar o usuario a registrar pequenas acoes e evolucoes pessoais, transformar esses registros em progresso visual e manter os dados protegidos por autenticacao JWT. O frontend nao envia `user_id` manual nas rotas principais; a identidade do usuario e derivada do token enviado ao backend.

## Tecnologias

### Backend

- Python
- FastAPI
- SQLite
- Uvicorn
- JWT com `python-jose`
- `pwdlib[argon2]` para hash e verificacao de senha
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
    auth.py
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
    index.html
    package.json
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
- A `SECRET_KEY` ainda esta definida diretamente em `auth.py`; para producao, o ideal e externalizar essa configuracao.
- As rotas antigas com `user_id` em transacoes e metas permanecem protegidas por JWT e checagem de dono por compatibilidade.

## Proximos passos futuros

- Externalizar configuracoes sensiveis do backend por variaveis de ambiente.
- Adicionar testes automatizados para backend e frontend.
- Criar regras de administracao para `GET /users/`.
- Avaliar remocao de rotas de compatibilidade apos estabilizar consumidores.
- Remover componentes nao usados caso nao sejam aproveitados.
- Preparar deploy do frontend e backend.
- Persistir no backend conquistas e sequencias hoje exibidas como dados simulados.
