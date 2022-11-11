#!/bin/bash
git pull
docker-compose up -d --build
sleep 5
docker-compose exec backend npx sequelize db:migrate