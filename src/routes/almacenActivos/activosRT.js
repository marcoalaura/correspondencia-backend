const _ = require('lodash');
const moment = require('moment');

const util = require('../../lib/util');
const libActivos = require('../../lib/activos');
module.exports = app => {
  const modelos = app.src.db.models;
  const Op = app.src.db.Sequelize.Op;

  app.get('/api/v1/activos/consulta', (req, res) => {
    return libActivos.consultar(req.query.filter)
      .then(resp => res.status(200).send(util.formatearMensaje('EXITO', 'Consulta exitosa', resp)))
      .catch(error => {
        console.log('[activosRT] Error: ', error);
        return res.status(400).send(util.formatearMensaje('ERROR', error.message ? error.message : error));
      });
  });

  app.get('/api/v1/activos/consulta/usuario/:ci', (req, res) => {
    return libActivos.consultarPorUsuario(req.params.ci)
      .then(resp => res.status(200).send(util.formatearMensaje('EXITO', 'Consulta exitosa', resp)))
      .catch(error => {
        console.log('[activosRT] Error: ', error);
        return res.status(400).send(util.formatearMensaje('ERROR', error.message ? error.message : error));
      });
  });

  app.post('/api/v1/activos/asignacion', (req, res) => {
    return libActivos.asignar(req.body)
      .then(resp => res.status(200).send(util.formatearMensaje('EXITO', 'Consulta exitosa', resp)))
      .catch(error => {
        console.log('[activosRT] Error: ', error);
        return res.status(400).send(util.formatearMensaje('ERROR', error.message ? error.message : error));
      });
  });

  app.post('/api/v1/activos/devolucion', (req, res) => {
    return libActivos.devolver(req.body)
      .then(resp => res.status(200).send(util.formatearMensaje('EXITO', 'Consulta exitosa', resp)))
      .catch(error => {
        console.log('[activosRT] Error: ', error);
        return res.status(400).send(util.formatearMensaje('ERROR', error.message ? error.message : error));
      });
  });

  app.post('/api/v1/activos/recuperar', (req, res) => {
    const Documento = modelos.documento;
    return Documento.findOne({
      fields: ['id_documento', 'plantilla', 'estado', 'plantilla_valor', 'anulado'],
      where: {
        nombre: {
          [Op.like]: req.body.cite,
        },
      },
    })
    .then(docResp => {
      if (!docResp) throw new Error('No existe el documento solicitado');

      const datosPlantilla = JSON.parse(docResp.plantilla_valor);
      let listaActivosSolicitados = null;
      let tipoFormulario = null;

      let documentoDe   = { nombre: null, cargo: null };
      let documentoPara = { nombre: null, cargo: null };

      for (const key in datosPlantilla) {
        if (key.indexOf('tablaActivos-') > -1) {
          listaActivosSolicitados = datosPlantilla[key].filas;
          tipoFormulario = datosPlantilla[key].tipoFormulario;
          // solicitadoPor = datosPlantilla[key].solicitadoPor;
          // entregadoPor = datosPlantilla[key].entregadoPor;
          // devueltoPor = datosPlantilla[key].devueltoPor;
        }
        if (key.indexOf('datosGenerales-') > -1) {
          documentoDe = datosPlantilla[key].de[0];
          documentoPara = datosPlantilla[key].para;
        }
      }

      if (!tipoFormulario || tipoFormulario !== 'SOLICITUD') {
        throw new Error('Debe ingresar el CITE de un documento de tipo SOLICITUD de activos fijos.');
      }

      // if (tipoFormulario === 'SOLICITUD') {
      //   solicitadoPor = documentoDe;
      //   entregadoPor  = documentoPara;
      //   devueltoPor   = documentoPara;
      // }
      const cabecera = {
        documentoDe,
        documentoPara,
      };
      return { items: listaActivosSolicitados, cabecera };
    })
    .then(resp => res.status(200).send(util.formatearMensaje('EXITO', 'Consulta exitosa', resp)))
    .catch(error => {
      console.log('[activosRT] Error: ', error);
      return res.status(400).send(util.formatearMensaje('ERROR', error.message ? error.message : error));
    });
  });
};
