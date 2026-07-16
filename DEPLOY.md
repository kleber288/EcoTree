# Deploy do EcoTree

Este guia prepara o deploy online do EcoTree sem publicar automaticamente nada. A versao local continua usando frontend em `http://127.0.0.1:5173` e backend em `http://127.0.0.1:8000`.

## Visao geral

- Frontend: React/Vite/PWA, recomendado para Vercel ou Netlify.
- Backend: FastAPI, recomendado para Render ou Railway.
- Banco atual: SQLite em arquivo local.
- Autenticacao: JWT sem mudanca de fluxo.
- API no frontend: `VITE_API_URL` quando existir, fallback local para `/api`.

## 1. Configurar o backend

Pasta do servico:

```txt
EcoTree-backend
```

Comando de instalacao:

```bash
pip install -r requirements.txt
```

Comando de inicializacao sugerido para Render/Railway:

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

## 5. Testar login e cadastro

Depois de publicar frontend e backend:

1. Abra a URL publica do frontend.
2. Cadastre um usuario de teste.
3. Faca login.
4. Confira dashboard, arvore, metas, transacoes e perfil.
5. Confira se o logout remove o token e volta para a tela de autenticacao.

Se cadastro ou login falhar por CORS, revise `ECOTREE_FRONTEND_ORIGINS` no backend. Ela deve conter exatamente a origem publica do frontend, por exemplo `https://ecotree.vercel.app`.

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
