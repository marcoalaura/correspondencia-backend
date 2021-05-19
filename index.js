const express = require("express");
const consign = require("consign");
const app= express();

console.log("inicio");
consign()
  .include("src/config/config.js")
  .then("src/lib/util.js")
  .then("src/lib/firma.js")
  .then("src/lib/archivos.js")
  .then("src/db.js")
  .then("src/lib/middlewares.js")
  .then("src/bl/seguridad/autorizacion.dao.js")
  .then("src/bl/seguridad/autorizacion.controller.js")
  .then("src/routes")
  .then("src/lib/boot.js")
  .into(app);
module.exports=app;
