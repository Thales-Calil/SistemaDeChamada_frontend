

Problemas encontrados: 
1. Ao instalar o vitejs, dava problema de versão por ser a versão mais recente não carregando os módulos ao testar, a solução encontrada foi dar um downgrade de versão nos remotes para 7.3.0 do vite e para 5.1.4 do react. 
2. Ao tentar utilizar o TypeScript como linguagem, havia conflito com o module federation, assim ao usar o federation, o código não entendia o que era o método.

Comandos para atualizar e rodar após alterar:

npm run build:remotes
npm run start

## Frontend - como funciona agora

- **Somente o host é publicado** no Azure Static Web Apps. Os 3 microfrontends são compilados e copiados para `host/dist/remotes/<mfe>/assets/` (mesma origem). O deploy falha se algum `remoteEntry.js` não for gerado.
- **Configuração do SWA**: só o `staticwebapp.config.json` da raiz (o do host) é lido pelo Azure. As regras dos remotes foram migradas para ele (o CORS `*` que existia nos remotes não é mais necessário, pois tudo é servido pela mesma origem).
- **URL do API Gateway**: variável `VITE_API_URL` em GitHub > Settings > Secrets and variables > Actions > Variables (com valor padrão no workflow).
- **Sessão**: o token fica no `sessionStorage`, expira junto com o JWT e qualquer resposta 401 volta para o login.
- **Perfis**: ADMIN vê Chamadas, Alunos (cadastro + matrícula nas turmas) e Usuários; PROFESSOR vê Chamadas e Alunos das suas turmas (sem cadastros); ALUNO vê apenas "Meus dados".
- **Falha de microfrontend**: cada remoto é carregado com novas tentativas e, se falhar, só aquela área mostra o erro (o resto do sistema continua funcionando).

Rodar localmente:

    npm run install:all
    npm run build:remotes
    npm run start
