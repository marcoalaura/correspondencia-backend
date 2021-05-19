const options = require('sequelize-formly');

module.exports = app => {
  const modelos = app.src.db.models;
  const Catalogo = modelos.catalogo;
  const CatalogoUsuarios = modelos.catalogo_usuario;
  const CatalogoDocumentos = modelos.catalogo_documento;
  const util = app.src.lib.util;
  const sequelize = app.src.db.sequelize;
  const Op = app.src.db.Sequelize.Op;

  const bl = require('../../bl/plantillasFormly/catalogoBL');


  const filtros = (req, res, next) => {
    if (req.query.filter != '' && req.query.filter !== undefined) util.consulta(req, res, next, Catalogo);
    else next();
  }

  app.post('/api/v1/plantillasFormly/catalogo', (req, res) => {
    req.body._usuario_creacion= req.body.audit_usuario.id_usuario;
    const datosCatalogo = JSON.parse(JSON.stringify(req.body));
    const datosUsuarios = datosCatalogo.usuarios || [];
    const datosDocumentos = datosCatalogo.documentos || [];
    const usuarios = [];
    const documentos = [];
    delete datosCatalogo.usuarios;
    delete datosCatalogo.documentos;

    let catalogo = null;
    sequelize.transaction().then(t => {
      const tr = { transaction: t };

      return Catalogo.create(datosCatalogo, tr)
      .then(resp => {
        catalogo = resp.dataValues;
        catalogo.audit_usuario = req.body.audit_usuario;
        datosUsuarios.map(item => {
          item.fid_catalogo = catalogo.id_catalogo;
          item.fid_usuario = item.id_usuario;
          item._usuario_creacion = req.body.audit_usuario.id_usuario;
          usuarios.push(item.id_usuario);
        });
        return CatalogoUsuarios.bulkCreate(datosUsuarios, tr)
      })
      .then(respUsuarios => {
        const promesas = datosDocumentos.map(item => {
          item.fid_catalogo = catalogo.id_catalogo;
          item.fid_documento = item.id_documento;
          item._usuario_creacion = req.body.audit_usuario.id_usuario
          return bl.crearCatalogoDocumento(modelos, item, catalogo, tr)
        });
        return Promise.all(promesas)
        .then(() => Promise.resolve())
        .catch((error) => Promise.resolve());
      })
      .then(() => {
        t.commit();
        res.send(util.formatearMensaje("EXITO", 'Creacion exitosa', { id_catalogo:catalogo.id_catalogo }));
      })
      .catch(error => {
        t.rollback();
        res.status(412).send(util.formatearMensaje('ERROR', error));
      });
    });
  });

  app.put('/api/v1/plantillasFormly/catalogo/:id', (req, res) => {
    const catalogo = JSON.parse(JSON.stringify(req.body));
    const documentos = catalogo.documentos;
    const usuarios = catalogo.usuarios;
    delete catalogo.documentos;
    delete catalogo.usuarios;
    sequelize.transaction().then(t => {
      const tr = { transaction: t };
      return Catalogo.findOne({
        where: {
          _usuario_creacion: req.body.audit_usuario.id_usuario,
          id_catalogo: req.params.id,
        },
      }, tr)
      .then(respCatalogo => {
        if (!respCatalogo) throw Error ('El catalogo a modificar no se encuentra disponible');
        return bl.crearActualizarDocumentos(modelos, documentos, catalogo, tr);
      })
      .then(() => bl.crearActualizarUsuarios(modelos, usuarios, catalogo, tr))
      .then(() => {
        t.commit();
        res.send(util.formatearMensaje("EXITO", 'Actualización exitosa'));
      })
      .catch(error => {
        t.rollback();
        res.status(412).send(util.formatearMensaje('ERROR', error));
      });
    });
  });

  app.get('/api/v1/plantillasFormly/catalogo/:id', (req, res) => {
    const datosResp = {
      documentos: [],
      usuarios: [],
    }
    const opcionesCatalogo = {
      where: {
        id_catalogo: req.params.id,
        estado: { [Op.ne]: 'ELIMINADO' },
      },
      include: [
        {
          model: CatalogoUsuarios,
          as: 'catalogo_usuario',
        },
        {
          model: modelos.catalogo_documento,
          as: 'catalogo_documento',
        },
      ],
    };
    if (req.query.filter && (req.query.filter === 'true' || req.query.filter === true)) {
      opcionesCatalogo.include[0].where = {estado: 'ACTIVO'};
      opcionesCatalogo.include[1].where = {estado: 'ACTIVO'};
    }

    return Catalogo.findOne(opcionesCatalogo)
    .then(respCatalogo => {
      if (!respCatalogo) throw Error('El catalogo solicitado no se encuentra disponible.');
      datosResp.id_catalogo = respCatalogo.id_catalogo;
      datosResp.nombre = respCatalogo.nombre;
      datosResp.descripcion = respCatalogo.descripcion;
      datosResp.estado = respCatalogo.estado;
      datosResp._usuario_creacion = respCatalogo._usuario_creacion;
      datosResp.catalogo_documento = respCatalogo.catalogo_documento || [];
      datosResp.catalogo_usuario = respCatalogo.catalogo_usuario || [];

      if (req.query.filter && (req.query.filter === 'true' || req.query.filter === true)) {
        const usuarios = datosResp.catalogo_usuario;
        let usuarioValido = false;
        for (let i = 0; i < usuarios.length; i++) {
          if (usuarios[i].fid_usuario == req.body.audit_usuario.id_usuario) {
            usuarioValido = true;
          }
        }
        if (usuarioValido == false) throw Error('Usted no se encuentra autorizado');
      }
      else {
        if (datosResp._usuario_creacion !== req.body.audit_usuario.id_usuario) {
          throw Error('Usted no cuenta con la autorizacion para ver este catalogo');
        }
      }
    })
    .then(() => bl.obtenerInfoDocumentos(modelos, datosResp.catalogo_documento))
    .then(respDocumentos => {
      datosResp.documentos = respDocumentos;
      return bl.obtenerInfoUsuarios(modelos, datosResp.catalogo_usuario);
    })
    .then(respUsuarios => {
      datosResp.usuarios = respUsuarios;
      delete datosResp.catalogo_usuario;
      delete datosResp.catalogo_documento;
      res.send(util.formatearMensaje("EXITO", 'Obtención de catalogo exitosa.', datosResp));
    })
    .catch(error => res.status(412).send(util.formatearMensaje('ERROR', error)));
  });

  app.get('/api/v1/plantillasFormly/catalogo/:id/miscatalogos', filtros, (req,res) => {
    const opcionesCatalogo = {
      where: {
        _usuario_creacion: req.body.audit_usuario.id_usuario,
      },
    };
    if (req.query.fields) {
      opcionesCatalogo.attributes = req.query.fields.split(',');
      opcionesCatalogo.attributes.push('_usuario_creacion');
    }
    if (req.query.filter !== '' && req.xfilter) {
      opcionesCatalogo.where[Op.or] = req.xfilter;
    }
    return Catalogo.findAll(opcionesCatalogo)
    .then(respCatalogos => res.send(util.formatearMensaje("EXITO", 'Obtención de catalogos exitosa.', {
      total: respCatalogos.length,
      resultado: respCatalogos,
    })))
    .catch(error => res.status(412).send(util.formatearMensaje('ERROR', error)));
  });

  app.get('/api/v1/plantillasFormly/catalogo/:id/compartidos', filtros, (req,res) => {
    const opcionesCatUsuario = {
      where: { 
        fid_usuario: req.body.audit_usuario.id_usuario,
        estado: 'ACTIVO',
      },
    }
    const opcionesCatalogo = {
      where: {
        estado: 'ACTIVO',
      },
    };
    const catalogos = [];
    return CatalogoUsuarios.findAll(opcionesCatUsuario)
    .then(respCatUsu => {
      respCatUsu.map(item => {
        if(catalogos.indexOf(item.dataValues.fid_catalogo) == -1) catalogos.push(item.dataValues.fid_catalogo);
      });
    })
    .then(() => {
      opcionesCatalogo.where.id_catalogo = {[Op.in]: catalogos};
      if (req.query.filter !== '' && req.xfilter) {
        opcionesCatalogo.where[Op.or] = req.xfilter;
      }
      return Catalogo.findAll(opcionesCatalogo);
    })
    .then(respCatalogos => {
      res.send(util.formatearMensaje("EXITO", 'Obtención de catalogos exitosa.', {
        total: respCatalogos.length,
        resultado: respCatalogos,
      }));
    })
    .catch(error => res.status(412).send(util.formatearMensaje('ERROR', error)));
  });
  
  app.route('/api/v1/plantillasFormly/catalogo').options(options.formly(Catalogo, modelos));
  app.route('/api/v1/plantillasFormly/catalogo/:id/miscatalogos').options(options.formly(Catalogo, modelos));
  app.route('/api/v1/plantillasFormly/catalogo/:id/compartidos').options(options.formly(Catalogo, modelos));
};