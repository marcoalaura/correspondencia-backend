
module.exports = (app) => {
  app.get('/codigo', app.controller.autorizacion.codigo);
  app.get('/autorizar', app.controller.autorizacion.autorizar);
  app.get('/api/v1/salir', app.controller.autorizacion.salir);


  // express-validation
  app.use((err, req, res, next) => {
    res.status(400).json(err);
  });
};
