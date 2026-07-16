# Deploy do EcoTree

Este guia prepara o deploy online do EcoTree sem publicar automaticamente nada. A versao local continua usando frontend em `http://127.0.0.1:5173` e backend em `http://127.0.0.1:8000`.

## Visao geral

- Frontend: React/Vite/PWA, recomendado para Vercel ou Netlify.
- Backend: FastAPI, recomendado para Render ou Railway.
- Banco atual: SQLite em arquivo local.
- Autenticacao: JWT sem mudanca de fluxo.
- API no frontend: `VITE_API_URL` quando existir, fallback local para `/api`.

## 1. Configurar o backend no Render

Pasta do servico:

```txt
EcoTree-backend
```

O repositorio tambem possui `render.yaml` na raiz. Ele configura um Web Service Python para a pasta `EcoTree-backend`, sem gravar segredos no codigo.

Se fizer pelo painel manual do Render, use estes valores:

```txt
Service type: Web Service
Runtime: Python
Root Directory: EcoTree-backend
Build Command: pip install -r requirements.txt
Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
Health Check Path: /
```

Comando de instalacao:

```bash
pip install -r requirements.txt
```

Comando de inicializacao para Render/Railway:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Variaveis do backend:

```env
ECOTREE_SECRET_KEY=uma-chave-forte-e-privada
ECOTREE_ENV=production
ECOTREE_ACCESS_TOKEN_EXPIRE_MINUTES=60
ECOTREE_DATABASE_FILE=ecotree.db
ECOTREE_FRONTEND_ORIGINS=https://seu-frontend.vercel.app
```

Use uma `ECOTREE_SECRET_KEY` nova no ambiente online. Nao use a chave de exemplo em producao. Com `ECOTREE_ENV=production`, o backend nao deve iniciar se essa chave estiver ausente.

Para gerar uma chave forte no PowerShell:

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

Copie o valor gerado e cole apenas no painel do Render, em `ECOTREE_SECRET_KEY`.

### Opcao com Blueprint

1. Suba o repositorio para GitHub, GitLab ou Bitbucket.
2. No Render, escolha New > Blueprint.
3. Selecione o repositorio.
4. Confirme o arquivo `render.yaml` da raiz.
5. Preencha `ECOTREE_SECRET_KEY` quando o Render pedir.
6. Crie o Blueprint e aguarde o deploy.

### Opcao manual pelo painel

1. No Render, escolha New > Web Service.
2. Conecte o repositorio do EcoTree.
3. Selecione o branch correto.
4. Configure Root Directory como `EcoTree-backend`.
5. Configure Runtime como `Python`.
6. Configure Build Command como `pip install -r requirements.txt`.
7. Configure Start Command como `uvicorn main:app --host 0.0.0.0 --port $PORT`.
8. Em Environment, cadastre as variaveis listadas acima.
9. Clique em Create Web Service.
10. Aguarde o deploy finalizar e copie a URL `https://...onrender.com`.

Enquanto o frontend online ainda nao existir, `ECOTREE_FRONTEND_ORIGINS` pode ficar com origens locais para permitir teste com o frontend em desenvolvimento:

```env
ECOTREE_FRONTEND_ORIGINS=http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:4173,http://localhost:4173
```

Quando o frontend for publicado, troque ou acrescente a URL publica dele:

```env
ECOTREE_FRONTEND_ORIGINS=https://seu-frontend.vercel.app
```

Se voce usar disco persistente pago para manter SQLite no Render, monte um disco em `/var/data` e altere:

```env
ECOTREE_DATABASE_FILE=/var/data/ecotree.db
```

Sem disco persistente, mantenha `ECOTREE_DATABASE_FILE=ecotree.db` apenas para demonstracao.

## 2. Configurar o frontend

Pasta do projeto:

```txt
EcoTree-frontend
```

Comando de instalacao:

```bash
npm install
```

Comando de build:

```bash
npm run build
```

Pasta de saida:

```txt
dist
```

Variavel do frontend em Vercel/Netlify:

```env
VITE_API_URL=https://sua-api-publica.com
```

Use a URL publica do backend, sem barra final.

## 3. Configuracao local

Backend local:

```bash
cd D:\Projeto_EcoTree\EcoTree-backend
uvicorn main:app --reload
```

Frontend local:

```bash
cd D:\Projeto_EcoTree\EcoTree-frontend
npm run dev
```

No frontend local, `VITE_API_URL` pode ficar ausente ou como:

```env
VITE_API_URL=/api
```

Assim o Vite continua usando o proxy para `http://127.0.0.1:8000`.

## 4. Testar a API online

Depois de publicar o backend:

1. Acesse `https://sua-api-publica.com/`.
2. Acesse `https://sua-api-publica.com/docs`.
3. Confirme que a resposta da rota raiz mostra a API online.
4. Confirme que o Swagger carrega.
5. No Render, abra Logs e confirme que nao ha erro de importacao, porta ou `ECOTREE_SECRET_KEY`.

## 5. Testar cadastro, login e token no backend

Depois de publicar o backend:

1. Acesse `https://sua-api-publica.com/docs`.
2. Execute `POST /users/register` com um usuario de teste.
3. Execute `POST /users/login` com o mesmo email e senha.
4. Copie o `access_token` retornado no login.
5. Clique em Authorize no Swagger.
6. Informe o token como bearer.
7. Execute `GET /users/me`.
8. Confirme que a resposta traz `user_id` e `email`.

Quando o frontend for publicado e algum fluxo falhar por CORS, revise `ECOTREE_FRONTEND_ORIGINS` no backend. Ela deve conter exatamente a origem publica do frontend, por exemplo `https://ecotree.vercel.app`.

## 6. Testar o PWA

1. Abra o frontend publicado em HTTPS.
2. No navegador, confira se aparece a opcao de instalar o app.
3. Instale o PWA.
4. Abra o app instalado.
5. Teste login, dashboard e navegacao principal.

O service worker deve cuidar apenas dos arquivos estaticos do frontend. Os dados reais continuam vindo da API.

## 7. Limite do SQLite

O SQLite atual pode funcionar para demonstracao. Em deploy gratuito, o arquivo do banco pode ser perdido se a plataforma nao oferecer armazenamento persistente.

Antes de usar dados reais em producao, considere migrar para Postgres. Essa migracao nao faz parte desta etapa.
