const blFirmado = require('../../bl/plantillasFormly/firmadoBL');
module.exports = app => {
  const Modelos = app.src.db.models;
  const util = app.src.lib.util;
  const archivos = app.src.lib.archivos;
  const firmaUtil = app.src.lib.firma;
  const dirDocumento = app.src.config.config.ruta_documentos;
  const Op = app.src.db.Sequelize.Op;

  /**
    @apiVersion 2.0.0
    @apiGroup Verificar
    @apiName Post verificar
    @api {post} /verificar Verificar documento

    @apiDescription Post para verificar, verifica la existencia y contenido de un documento sin necesidad de ser usuario del sistema

    @apiParam (Petición) {Texto} cite Cite del documento que se desea verificar
    @apiParam (Petición) {Texto} codigo Codigo del documento que se desea verificar

    @apiParamExample {json} Ejemplo para enviar:
    {
      "cite":"ENTIDAD/ADA/0100/2015",
      "codigo":"1-0EJEMPLOI"
    }

    @apiSuccess (Respuesta) {Texto} cite Cite del documento verificado
    @apiSuccess (Respuesta) {Texto} hash Hash del documento
    @apiSuccess (Respuesta) {Texto} codigo Codigo del documento verificado
    @apiSuccess (Respuesta) {Array} firmantes Array de los firmantes del documento
    @apiSuccess (Respuesta) {Texto} token Token generado para poder visualizar el documento

    @apiSuccessExample Respuesta:
    HTTP/1.1 200 OK
    {
      "tipoMensaje":"EXITO",
      "mensaje":"Obtención de datos exitosa",
      "datos":{
        "cite":"ENTIDAD/ADA/0100/2015",
        "hash":"es1ejemplo34de56un67hash121",
        "codigo":"1-0EJEMPLOI",
        "firmantes":[
          {
            "firmante":"OSO PARDO",
            "firmo":true,
            "registradoSistema":true,
            "revocado":false,
            "fechaFirma":"29/04/2015 10:35:52",
            "fechaFinValidez":"05/05/2018"
          },
          {
            "firmante":"LEON AFRICANO",
            "firmo":true,
            "registradoSistema":true,
            "revocado":false,
            "fechaFirma":"30/04/2015 09:18:03",
            "fechaFinValidez":"02/05/2018"
          },
          {...}
        ],
        "token":"esto3546es657567un435345TOKEN43634de54698PRueba"
      }
    }

  */
  
  app.post('/verificar', (req, res) => {

    console.log('Iniciando la verificación de documentos firmados digitalmente');
    const Documento = Modelos.documento;
    const Firma = Modelos.firma;
    const Usuario = Modelos.usuario;
    const datos = {};
    const respuesta = {};
    try {
      if (!req.body.cite) throw Error('No se puede realizar la busqqueda sin el cite.');
      if (!req.body.codigo) throw Error('No se puede realizar la busqueda sin el código.');
      Documento.findOne({
          attributes: ['id_documento', 'nombre', 'firmado', 'firmaron', 'de', 'via', 'para'],
          where: {
            nombre: { [Op.iLike]: req.body.cite },
          },
          include: {
            required: false,
            attributes: ['hash', 'codigo', '_usuario_modificacion', '_usuario_creacion'],
            model: Firma,
            as: 'firma',
            where: { codigo: req.body.codigo },
          },
        })
        .then(respDocumento => {

          if (!respDocumento) throw Error('El documento a verificar no es válido, revise los datos introducidos.');
          if (!respDocumento.firma) throw Error('El documento no se puede verificar en este medio, el mismo no posee un codigo válido.');
          if (respDocumento.firmado === false) throw Error('El documento no fue firmado por todos los actores del mismo.');
          respuesta.cite = respDocumento.nombre;
          respuesta.hash = respDocumento.firma.hash;
          respuesta.codigo = respDocumento.firma.codigo;
          datos.nombre = `${util.formatoNombreDoc(respDocumento.nombre)}.pdf`;
          const usuarios = respDocumento.firmaron || [];
          return Usuario.findAll({
            attributes: ['nombres', 'apellidos', 'cargo'],
            where: { id_usuario: { [Op.in]: usuarios }},
          });
        })
        .then(respFirmantes => {
          datos.usuarios = respFirmantes || [];
          return firmaUtil.obtenerFirmas(`${dirDocumento}${datos.nombre}`);
        })
        .then(respFirmas => {
          datos.firmas = respFirmas.data || [];
          return blFirmado.procesarFirmas(datos.usuarios, datos.firmas );
        })
        .then(filtrado => {
          respuesta.firmantes = filtrado;
          return util.generarTokenVerificacion();
        })
        .then(respToken => {
          respuesta.token = respToken;
          return res.send(util.formatearMensaje("EXITO", 'Obtención de datos exitosa', respuesta));
        })
        .catch(errorDocumento => {
          console.log('Error', errorDocumento);
          return res.status(412).send(util.formatearMensaje("ERROR", errorDocumento));
        });
    } catch (error) {
      console.log('Revisando el error desde el catch', error);
      return res.status(412).send(util.formatearMensaje("ADVERTENCIA", error));
    }
  });

  /**
    @apiVersion 2.0.0
    @apiGroup Verificar
    @apiName Post /pdfVerificado
    @api {post} /pdfVerificado Obtiene el pdf de un documento verificado

    @apiDescription Post para /pdfVerificado, obtiene el pdf correspondiente a un documento previamente verificado

    @apiParam (Petición) {Texto} cite Cite del documento
    @apiParam (Petición) {Texto} codigo Codigo del documento
    @apiParam (Petición) {Texto} token Token para poder visualizar el documento

    @apiParamExample {json} Ejemplo para enviar:
    {
      "cite":"ENTIDAD/ADA/0100/2015",
      "codigo":"1-0EJEMPLOI",
      "token":"esto3546es657567un435345TOKEN43634de54698PRueba"
    }

    @apiSuccess (Respuesta) {base64} Documento pdf en formato base64

    @apiSuccessExample (base64) Respuesta:
    HTTP/1.1 200 OK
    
    "JVBERi0xLjQKMSAwIG9iag....."

  */
  app.post('/pdfVerificado', (req, res) => {
    return util.obtenerArchivo(req.body.cite)
    .then(data => {
      return res.send(data);
    })
    .catch(error => {
      console.log('Error en la obtencion del pdf verificado', error);
      return res.status(412).send(util.formatearMensaje("ERROR", error));
    });
  });
  
  app.post('/verificarAnulado', (req, res) => {
    const nombreArchivo = util.formatoNombreDoc(req.body.anular);
    const rutaArchivo = `${dirDocumento}${nombreArchivo}.pdf`;
    return archivos.anular(rutaArchivo, req.body.cite)
    .then(() => res.send(util.formatearMensaje('EXITO', 'Verificacion de documento anulado correctamente')))
    .catch(e => {
      console.log('No se puede anular', e);
      return res.status(412).send(util.formatearMensaje("ERROR", e));
    });
  });
  app.post('/corregir', (req, res) => {

    const nombreArchivo = util.formatoNombreDoc(req.body.iad);
    const rutaArchivo = `${dirDocumento}${nombreArchivo}.pdf`;
    const datos = {
      ruta: rutaArchivo,
      nombre: req.body.iad,
    };
    return archivos.corregirAnulacion(datos, Modelos, app)
    .then((resp) => res.send(util.formatearMensaje('EXITO', 'Verificación de documento anulado correctamente', resp)))
    .catch(e => {
      console.log('No se puede anular', e);
      return res.status(412).send(util.formatearMensaje("ERROR", e));
    });
  });

  
};