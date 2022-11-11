# Sacmais

Seguem abaixo algumas instruções de como realizar a configuração customizadas da versão Sacmais. Para facilitar o processo de instalação, criamos um setup automatizado utilizando container docker.

1 - Antes de começar você precisa instalar o docker e o docker-compose:

* Docker: https://docs.docker.com/engine/install/ubuntu/
* Docker compose: https://docs.docker.com/compose/install/

2 - Faz uma cópia do arquivo .env.example com o nome .env

3 - Alimente as variáveis de ambiente

|Variável | Descrição | Exemplo
|:-:|:-:|:-:|
VALUMES | Pasta que espelhará conteúdo dos container | ../sacmais1
MARIADB_DATABASE | Nome do banco de dados | sacmais
MARIADB_USER | Nome do usuário | sacmais
MARIADB_PASS | Senha do usuário | sacmais
MARIADB_PORT | Porta do exposta pelo mysql | 3306
CHROME_PORT | Porta do exposta pelo serviço do chrome | 3000
BACKEND_PORT | Porta do exposta pelo serviço do backend | 8080
FRONTEND_PORT | Porta do exposta pelo serviço do backend | 3333

4 - O setup do .env do frontend e backend continuam os mesmos, apenas uma pequena diferença ocorrerá no DB_HOST do backend, que receberá o mesmo valor do nome do serviço do docker, no caso mariadb. Ele reconhece o host a partir do link definido do docker-compose.yml. Veja o exemplo abaixo:

```bash
# backend .env
NODE_ENV=development
BACKEND_URL=http://192.168.1.101
FRONTEND_URL=http://192.168.1.101:3499
PROXY_PORT=8099
PORT=8099

DB_DIALECT=
DB_HOST=mariadb
DB_USER=sacmais
DB_PASS=sacmais
DB_NAME=sacmais

# Valor esperado ws://chrome:3000 (porta definida pra o serviço do chrome)
CHROME_URI=

JWT_SECRET=123456
JWT_REFRESH_SECRET=123456

```

5 - Por fim, para subir os container basta executar o comando na raiz do projeto:

```bash
docker-compose up -d
docker-compose exec backend npx sequelize db:migrate #executa as migrations
```

6 - Também criamos um arquivo para facilitar o processo inicial de deploy, para utilizá-lo basta executar o seguinte comando:

```bash
chmod +x ./deploy.sh # EXECUTAR ESSE COMANDO APENAS UMA VEZ PARA LIBERAR A PERMISSÃO DE EXECUÇÃO
./deploy.sh #script
#!/bin/bash
#git pull
#docker-compose up -d --build
#sleep 5
#docker-compose exec backend npx sequelize db:migrate
```

7 - Para utilizar os seeders, basta executar o comando abaixo dentro do serviçco do backend:

```bash
docker-compose exec backend npx sequelize db:seed:all
```

8 - Para atualizar o sistema:

```bash
git pull
docker-compose up -d --build backend frontend # atenção, apenas esses dois serviços devem ser buildados novamente
docker image prune # remove imagens ociosas
```
