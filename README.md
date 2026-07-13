# EcoTree

EcoTree é uma aplicação web voltada para sustentabilidade, gamificação e acompanhamento de hábitos, ações e metas ecológicas. A proposta do projeto é unir controle pessoal, metas e uma árvore virtual que evolui conforme o usuário registra ações no sistema.

No EcoTree, o usuário pode criar uma conta, fazer login, acompanhar o painel principal, visualizar e atualizar sua árvore, registrar transações e gerenciar metas. As principais rotas do sistema são protegidas por autenticação JWT, garantindo que cada usuário acesse apenas seus próprios dados.

## Tecnologias utilizadas

### Backend

- Python
- FastAPI
- SQLite
- JWT com `python-jose`
- Uvicorn
- `pwdlib[argon2]` para hash e verificação de senha

### Frontend

- React
- Vite
- JavaScript
- CSS

### Outros

- Git
- PowerShell/terminal
- Swagger UI para documentação e testes da API

## Estrutura de pastas

```txt
Projeto_EcoTree/
  EcoTree-backend/
  EcoTree-frontend/
  .gitignore
  README.md
```

O diretório `EcoTree-backend/` contém a API em FastAPI, as rotas, os schemas, a autenticação JWT, a conexão SQLite e os serviços relacionados à árvore.

O diretório `EcoTree-frontend/` contém a interface em React com Vite, as páginas da aplicação, os estilos CSS, a navegação e a camada centralizada de comunicação com a API.

## Funcionalidades principais

- Cadastro de usuário.
- Login com token JWT.
- Logout.
- Dashboard com visão geral do usuário.
- Visualização da árvore do usuário.
- Adição de pontos na árvore.
- Atualização/recalculo da árvore.
- Criação e exclusão de transações.
- Resumo financeiro de transações.
- Criação, edição, atualização de progresso e exclusão de metas.
- Proteção de rotas por usuário autenticado.

## Segurança e autenticação

O fluxo de autenticação do EcoTree usa JWT.

1. O usuário faz login em `POST /users/login`.
2. O backend valida email e senha.
3. O backend retorna um `access_token`.
4. O frontend salva o token no `localStorage`.
5. As requisições protegidas enviam o token no cabeçalho:

```txt
Authorization: Bearer TOKEN
```

No backend, o usuário é identificado a partir do token por meio da função `verificar_token`. Assim, as rotas principais não dependem mais de `user_id` manual enviado pelo frontend.

As rotas sensíveis de árvore, transações, metas e listagem de usuários estão protegidas por JWT. Para transações e metas, o backend também valida se o recurso pertence ao usuário autenticado antes de permitir acesso, alteração ou exclusão.

## Como rodar o backend

Entre na pasta do backend:

```bash
cd D:\Projeto_EcoTree\EcoTree-backend
```

Ative o ambiente virtual:

```bash
.\venv\Scripts\activate
```

Inicie a API:

```bash
uvicorn main:app --reload
```

Outra opção é executar o Uvicorn usando diretamente o Python do ambiente virtual:

```bash
.\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

A API fica disponível em:

```txt
http://127.0.0.1:8000
```

A documentação Swagger fica disponível em:

```txt
http://127.0.0.1:8000/docs
```

Se for necessário instalar as dependências do backend em um novo ambiente:

```bash
pip install -r requirements.txt
```

## Como rodar o frontend

Entre na pasta do frontend:

```bash
cd D:\Projeto_EcoTree\EcoTree-frontend
```

Instale as dependências:

```bash
npm install
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

O frontend fica disponível em:

```txt
http://127.0.0.1:5173
```

Durante o desenvolvimento, o Vite usa proxy para enviar chamadas de `/api` para:

```txt
http://127.0.0.1:8000
```

## Fluxo de uso

1. Abrir o frontend em `http://127.0.0.1:5173`.
2. Criar uma conta na tela de cadastro.
3. Fazer login com email e senha.
4. Acessar o dashboard.
5. Usar a página da árvore para visualizar status, adicionar pontos e atualizar a árvore.
6. Usar a página de transações para registrar entradas/saídas e excluir registros.
7. Usar a página de metas para criar, editar, atualizar progresso e excluir metas.
8. Fazer logout ao finalizar o uso.

## Principais endpoints

### Usuários

- `POST /users/register` - cadastra um novo usuário.
- `POST /users/login` - autentica o usuário e retorna o token JWT.
- `GET /users/me` - retorna dados do usuário autenticado.
- `GET /users/` - lista usuários, protegido por JWT.

### Árvore

- `GET /tree/status` - retorna o status da árvore do usuário autenticado.
- `PATCH /tree/add-points` - adiciona pontos à árvore do usuário autenticado.
- `PUT /tree/update` - recalcula/atualiza a árvore do usuário autenticado.

### Transações

- `GET /transactions/` - lista as transações do usuário autenticado.
- `GET /transactions/summary` - retorna o resumo financeiro do usuário autenticado.
- `POST /transactions/` - cria uma nova transação para o usuário autenticado.
- `DELETE /transactions/{transacao_id}` - exclui uma transação do usuário autenticado.

### Metas

- `GET /goals/` - lista as metas do usuário autenticado.
- `POST /goals/` - cria uma nova meta para o usuário autenticado.
- `GET /goals/{goal_id}` - busca uma meta específica do usuário autenticado.
- `PUT /goals/{goal_id}` - atualiza uma meta do usuário autenticado.
- `PATCH /goals/{goal_id}/progress` - adiciona progresso a uma meta.
- `DELETE /goals/{goal_id}` - exclui uma meta do usuário autenticado.

## Observações importantes

- O banco de dados usado pelo projeto é SQLite local.
- O arquivo do banco é criado/usado pelo backend como `ecotree.db`.
- A `SECRET_KEY` atual está definida diretamente no código e é adequada apenas para desenvolvimento.
- Para produção, o ideal é mover a `SECRET_KEY` para uma variável de ambiente.
- A rota `GET /users/` já exige JWT, mas futuramente o ideal é restringir essa listagem a usuários administradores.
- O frontend não envia mais `user_id` manual para as rotas principais; o backend identifica o usuário pelo token.

## Próximas melhorias

- Criar sistema simples de admin.
- Fazer deploy online do backend e do frontend.
- Melhorar a integração visual com Figma.
- Criar histórico mais detalhado de ações sustentáveis.
- Implementar recuperação de senha.
- Melhorar a responsividade em diferentes tamanhos de tela.
- Adicionar testes automatizados no backend e no frontend.

## Validação desta documentação

Esta etapa alterou apenas a documentação do projeto. Não foi necessário iniciar backend ou frontend, porque nenhuma regra de negócio, rota, banco de dados ou interface foi modificada.
