# Deploy do EcoTree

Este guia prepara o deploy online do EcoTree sem publicar automaticamente nada. A versao local continua usando frontend em `http://127.0.0.1:5173` e backend em `http://127.0.0.1:8000`.

## Visao geral

- Frontend: React/Vite/PWA, recomendado para Vercel ou Netlify.
- Backend: FastAPI, recomendado para Render ou Railway.
- Banco local: SQLite em arquivo, somente para desenvolvimento.
- Banco de producao: PostgreSQL via `DATABASE_URL`, recomendado no Supabase.
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
DATABASE_URL=connection-string-do-postgresql
ECOTREE_SECRET_KEY=uma-chave-forte-e-privada
ECOTREE_ENV=production
ECOTREE_ACCESS_TOKEN_EXPIRE_MINUTES=60
ECOTREE_FRONTEND_ORIGINS=https://seu-frontend.vercel.app
```

Use uma `ECOTREE_SECRET_KEY` nova no ambiente online. Nao use a chave de exemplo em producao. Com `ECOTREE_ENV=production`, o backend nao deve iniciar se essa chave estiver ausente. Tambem nao deve iniciar sem `DATABASE_URL`, porque o SQLite local nao e seguro no sistema de arquivos temporario do Render.

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
8. Em Environment, cadastre as variaveis listadas acima, incluindo `DATABASE_URL`.
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

Nao configure SQLite para producao. O arquivo `ECOTREE_DATABASE_FILE` continua existindo apenas para desenvolvimento local quando `DATABASE_URL` estiver vazia.

## 2. Configurar o frontend

Pasta do projeto:

```txt
EcoTree-frontend
```

O frontend tambem possui `EcoTree-frontend/vercel.json` para manter o app Vite como SPA na Vercel, redirecionando rotas do navegador para `index.html`.

Configuracao recomendada na Vercel:

```txt
Root Directory: EcoTree-frontend
Framework Preset: Vite
Install Command: npm install
Build Command: npm run build
Output Directory: dist
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

### Deploy do frontend na Vercel

1. Acesse o painel da Vercel.
2. Conecte sua conta do GitHub, se ainda nao estiver conectada.
3. Clique em Add New > Project.
4. Importe o repositorio do EcoTree.
5. Em Root Directory, selecione `EcoTree-frontend`.
6. Em Framework Preset, selecione `Vite`.
7. Confirme Install Command como `npm install`.
8. Confirme Build Command como `npm run build`.
9. Confirme Output Directory como `dist`.
10. Em Environment Variables, adicione `VITE_API_URL` com a URL HTTPS real do backend no Render, sem barra final.
11. Clique em Deploy.
12. Ao finalizar, copie a URL publica da Vercel, por exemplo `https://ecotree.vercel.app`.

Se a URL do backend no Render ainda nao estiver disponivel, nao publique o frontend final. A variavel `VITE_API_URL` precisa apontar para a API real para cadastro, login, dashboard, arvore, transacoes, metas e perfil funcionarem online.

### Atualizar CORS do backend depois da Vercel

Depois que a Vercel gerar a URL publica do frontend, volte ao Render e atualize `ECOTREE_FRONTEND_ORIGINS` no backend para incluir essa origem:

```env
ECOTREE_FRONTEND_ORIGINS=https://sua-url.vercel.app,http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:4173,http://localhost:4173
```

Depois de salvar a variavel no Render, faça redeploy ou restart do backend para que o CORS use a nova configuracao.

### Testes do frontend publicado

1. Abra a URL publica da Vercel em HTTPS.
2. Abra o console do navegador e confirme que nao ha erros de JavaScript.
3. Cadastre um usuario de teste.
4. Faca login.
5. Abra dashboard e perfil para validar indiretamente `/users/me`.
6. Teste arvore, transacoes, metas e logout.
7. Confira se o app continua instalavel como PWA.

Problemas comuns:

- CORS: a URL da Vercel nao esta em `ECOTREE_FRONTEND_ORIGINS`.
- API incorreta: `VITE_API_URL` esta com placeholder, barra final problematica ou URL diferente da API Render.
- Backend dormindo: no plano gratuito do Render, a primeira chamada pode demorar.
- PostgreSQL ausente: se `ECOTREE_ENV=production` estiver definido sem `DATABASE_URL`, o backend falha na inicializacao.
- Supabase inacessivel: revise se a connection string esta correta e se voce usou direct connection ou Session pooler conforme a rede do Render.
- Cache antigo: o service worker pode manter arquivos antigos; limpe dados do site ou force novo deploy.
- Mixed content: o frontend em HTTPS deve chamar backend em HTTPS, nunca `http://`.

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

## 7. Configurar PostgreSQL no Supabase

Use o Supabase somente como PostgreSQL. Nao use Supabase Auth, nao conecte o frontend direto ao Supabase e nao coloque anon key, service_role ou connection string no frontend.

Passos manuais:

1. Entre no Supabase.
2. Crie um projeto.
3. Defina e guarde a senha do banco fora do repositorio.
4. Abra o botao Connect.
5. Escolha conexao direta se o ambiente suportar IPv6.
6. Escolha Session pooler para backend persistente em rede IPv4, normalmente usando porta 5432, se a conexao direta IPv6 nao funcionar no Render.
7. Copie a connection string.
8. Substitua apenas o placeholder de senha localmente, sem colar a senha em conversas ou commits.
9. No Render, abra o Web Service do backend.
10. Entre em Environment.
11. Crie a variavel `DATABASE_URL` com a connection string do Supabase.
12. Confirme `ECOTREE_ENV=production`.
13. Confirme que `ECOTREE_SECRET_KEY` esta definida.
14. Salve e faca deploy somente quando decidir publicar.
15. Confira os logs sem expor credenciais.
16. Teste `/health`.
17. Crie uma conta.
18. Entre na mesma conta em aba anonima ou outro dispositivo.

## 8. Criar o esquema no PostgreSQL

Na inicializacao, o backend executa uma criacao idempotente do esquema com SQLAlchemy. Ela cria tabelas ausentes, aplica a migracao versionada `20260716_split_tree_points` e reaplica a protecao `20260717_secure_supabase_public_tables` sem apagar tabelas existentes.

Nao execute `DROP TABLE` em producao. Se a criacao do esquema falhar, revise a variavel `DATABASE_URL`, a senha do banco e a conectividade com o Supabase.

### Seguranca das tabelas no Supabase

O Supabase expoe o schema `public` pela Data API. Como o EcoTree usa o Supabase apenas como PostgreSQL do backend, as tabelas da aplicacao ficam protegidas assim:

- RLS habilitada em `users`, `transactions`, `goals`, `tree_status` e `schema_migrations`;
- nenhuma policy publica criada;
- permissoes `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES` e `TRIGGER` revogadas de `anon` e `authenticated`;
- permissoes `USAGE`, `SELECT` e `UPDATE` revogadas dessas roles nas sequences de `id`;
- `FORCE ROW LEVEL SECURITY` nao e usado, para o backend conectado como proprietario continuar funcionando.

Depois de configurar o Supabase, confira no painel:

1. Abra Table Editor.
2. Entre em cada tabela da aplicacao.
3. Confirme que RLS aparece habilitada.
4. Abra Authentication > Policies ou a aba Policies da tabela.
5. Confirme que nao ha policies publicas nessas tabelas.

Tambem rode a verificacao automatica, sem commitar a connection string:

```bash
cd D:\Projeto_EcoTree\EcoTree-backend
python scripts/verify_supabase_security.py
```

Esse script usa `DATABASE_URL`, confirma RLS e revogacoes para `anon` e `authenticated`, e testa `SELECT`, `INSERT`, `UPDATE` e `DELETE` do backend dentro de uma transacao com rollback.

## 9. Migracao opcional do SQLite

Se os dados locais forem apenas testes, a alternativa mais simples e configurar o PostgreSQL e criar novas contas.

Para copiar dados do SQLite local para PostgreSQL, use o script opcional:

```bash
cd D:\Projeto_EcoTree\EcoTree-backend
python scripts/migrate_sqlite_to_postgres.py --sqlite-file ecotree.db --dry-run
python scripts/migrate_sqlite_to_postgres.py --sqlite-file ecotree.db --confirm-import
```

O script:

- le o SQLite somente como origem;
- nao altera nem apaga o SQLite;
- importa usuarios, depois arvore, transacoes e metas;
- preserva IDs quando possivel;
- preserva hashes de senha e datas;
- trata registros existentes e emails duplicados;
- executa a importacao em transacao;
- sincroniza sequences do PostgreSQL;
- mostra apenas contagens, sem senhas ou hashes.

Execute a importacao real somente depois de configurar `DATABASE_URL` no ambiente e conferir o `--dry-run`.

## 10. Teste entre dispositivos

1. Abra o site publicado no PC 1.
2. Crie uma conta com um email de teste.
3. Crie uma transacao.
4. Crie uma meta.
5. Confira a arvore.
6. Saia da conta.
7. Abra o site no PC 2, celular ou janela anonima.
8. Entre com o mesmo email e senha.
9. Confirme que arvore, transacoes e metas sao as mesmas.
10. Confirme que dados de outra conta nao aparecem.

O `localStorage` guarda somente o token daquele navegador. A conta, a arvore, as transacoes e as metas ficam no PostgreSQL por meio do backend.

## 11. Foto de perfil

A foto de perfil ainda fica salva apenas no navegador. Esta tarefa nao implementa upload de foto.

Para sincronizar foto futuramente, sera necessario armazenar o arquivo em um servico online e salvar uma URL no banco.
