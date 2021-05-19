#!/usr/bin/env sh

FORCE=true node index.js && sequelize db:seed:all --url postgres://${DB_PASSWORD}:${DB_USUARIO}@${DB_HOST}:${DB_PUERTO}/${DB_NOMBRE} --seeders-path src/seeders
