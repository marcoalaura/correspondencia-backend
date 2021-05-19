module.exports = app => {
  const modelos = app.src.db.models;
  const CatalogoUsuario = modelos.catalogo_usuario;
  const Usuario = modelos.Usuario;
  const util = app.src.lib.util;
 

  app.put('/api/v1/plantillasFormly/catalogo/usuario/:id', (req, res) => {
    console.log('Iniciando con la modificacion de un catalogo_usuario', req.body);

    return CatalogoUsuario.findOne({
      where: {
        id_catalogo_usuario: req.params.id,
        fid_catalogo: req.body.fid_catalogo,
      },
    })
    .then(resp => {
      if (!resp) throw Error('No existe el recurso solicitado.');
      console.log('Revisando la resp', resp);
      if (resp._usuario_creacion !== req.body.audit_usuario.id_usuario) throw Error('Usted no esta autorizado para realizar la modificación.');
      return resp.update(req.body.actualizar);
    })
    .then(res.send(util.formatearMensaje("EXITO", 'Modificación exitosa')))
    .catch(error => {
      console.log('Error en la modificacion de un catalogo_usuario');
      res.status(412).send(util.formatearMensaje("ERROR", error));
    })
  });



}