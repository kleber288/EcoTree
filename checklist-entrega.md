# Checklist de entrega - EcoTree

## Pronto para apresentacao

- Backend FastAPI organizado por rotas de usuarios, arvore, transacoes e metas.
- Autenticacao JWT funcionando como fonte de identidade do usuario.
- Frontend React/Vite com telas de login, cadastro, dashboard, arvore, registros, metas e perfil.
- Camada de API centralizada em `src/services/api.js`.
- Componentes de layout e UI separados em `src/components`.
- Build do frontend validado com `npm run build`.
- Banco local, caches, logs, `venv`, `node_modules` e `dist` configurados para nao serem versionados.
- README atualizado para entrega e apresentacao.

## Corrigido nesta etapa

- Placeholder pessoal do email de login trocado por exemplo neutro.
- `.gitignore` atualizado para cobrir logs.
- Arquivos gerados que estavam rastreados pelo Git foram removidos apenas do indice, sem apagar os arquivos locais.
- Exemplos de ambiente criados para backend e frontend.

## Documentado para nao alterar comportamento agora

- "Guardiao Verde" e "12 dias" sao dados visuais simulados no perfil.
- `EcoTree-backend/models.py` esta vazio.
- `ActionButton`, `MetricCard` e `ProgressBar` ainda nao sao usados nas telas atuais.
- Algumas rotas de compatibilidade com `user_id` continuam protegidas por JWT.
- `SECRET_KEY` ainda esta no codigo e deve ir para variavel de ambiente em uma etapa futura.

## Proximos passos

- Adicionar testes automatizados.
- Externalizar configuracoes sensiveis do backend.
- Criar regra de administrador para listagem de usuarios.
- Revisar remocao de rotas de compatibilidade quando nao forem mais necessarias.
- Persistir conquistas e sequencias do perfil no backend.
