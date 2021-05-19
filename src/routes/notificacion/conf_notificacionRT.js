const {ModelHandler} = require("sequelize-handlers");
const sequelizeFormly = require("sequelize-formly");

module.exports = app => {
  const conf_notificacion = app.src.db.models.conf_notificacion;
  const sequelizeHandlers = new ModelHandler(conf_notificacion);

/**
  @apiVersion 1.0.0
  @apiGroup Notificación
  @apiName Get conf_notificacion
  @api {get} /api/v1/notificacion/conf_notificacion/ Obtiene la lista completa de conf_notificacion

  @apiDescription Get conf_notificacion

  @apiSuccessExample {json} Respuesta:
  HTTP/1.1 200 OK
  {
    "tipoMensaje": "EXITO",
    "mensaje": "La operación se realizó correctamente.",
    "datos": {
      "total": 21,
      "resultado":[
        {
          "id_conf_notificacion": "1",
          "campo": "xxx",
          "_usuario_creacion": "1",
          "_fecha_creacion": " << fecha y hora >> ",
          "_fecha_modificacion": " << fecha y hora >> "
        },
        {
          "id_conf_notificacion": "2",
          "campo": "zzz",
          "_usuario_creacion": "1",
          "_fecha_creacion": " << fecha y hora >> ",
          "_fecha_modificacion": " << fecha y hora >> "
        },
        ...
      ]

  }

*/

/**
  @apiVersion 1.0.0
  @apiGroup Notificación
  @apiName Get configuración_notificacion
  @api {get} /api/v1/notificacion/conf_notificacion/?order=&limit=&page=&filter= Obtiene la lista paginada de conf_notificacion

  @apiDescription Get conf_notificacion

  @apiParam (Query) {Texto} order Campo por el cual se ordenará el resultado
  @apiParam (Query) {Numérico} limit Cantidad de resultados a obtener
  @apiParam (Query) {Numérico} page Número de página de resultados
  @apiParam (Query) {Texto} filter Texto a buscar en los registros

  @apiSuccess (Respuesta) {Texto} tipoMensaje Tipo del mensaje de respuesta.
  @apiSuccess (Respuesta) {Texto} mensaje Mensaje de respuesta.
  @apiSuccess (Respuesta) {Objeto} datos Objeto de con los datos de respuesta
  @apiSuccess (Respuesta) {Numérico} total Numero de objetos categoria
  @apiSuccess (Respuesta) {Array} resultado Array de objetos categoria


  @apiSuccessExample {json} Respuesta:
    HTTP/1.1 200 OK
    {
      "tipoMensaje": "EXITO",
      "mensaje": "La operación se realizó correctamente.",
      "datos": {
        "total": 21,
        "resultado":[
          {
            "id_conf_notificacion": 1,
            "codigo": "CI",
            "descripcion": "Carnet de identidad",
            "estado": "ACTIVO",
            "_usuario_creacion": 5,
            "_usuario_modificacion": null,
            "_fecha_creacion": "2016-08-29T13:59:22.788Z",
            "_fecha_modificacion": "2016-08-29T13:59:22.788Z"
          },
          {
            "id_conf_notificacion": 2,
            "codigo": "PAS",
            "descripcion": "Pasaporte",
            "estado": "ACTIVO",
            "_usuario_creacion": 5,
            "_usuario_modificacion": null,
            "_fecha_creacion": "2016-08-29T14:02:19.060Z",
            "_fecha_modificacion": "2016-08-29T14:02:19.060Z"
          },
          ...
        ]
    }

*/
  app.get('/api/v1/notificacion/conf_notificacion', sequelizeHandlers.query(conf_notificacion));

/**
  @apiVersion 1.0.0
  @apiGroup Notificación
  @apiName Put actualiza
  @api {put} /api/v1/notificacion/conf_notificacion/:id Actualiza un/a configuración de notificación

  @apiDescription Put actualiza

  @apiParam (Parámetro) {Numérico} id Identificador de conf_notificacion que se quiere actualizar

  @apiParam (Petición) {Texto} campo Decripción del campo

  @apiParamExample {json} Ejemplo para enviar:
  {
    "id_conf_notificacion": 65,
    "canal": "CORREO",
    "enviado": false,
    "celular": null,
    "observado": true,
    "aprobado": true,
    "derivado": false,
    "email": "mi@correo.dominio"
  }

  @apiSuccess (Respuesta) {Numérico} id_conf_notificacion Identificador de conf_notificacion
  @apiSuccess (Respuesta) {Numérico} fid_usuario Identificador del usuario
  @apiSuccess (Respuesta) {Texto} canal Dato respecto a los canales de notificación elegidos por el usuario
  @apiSuccess (Respuesta) {Texto} celular Dato respecto al número de celular al cual se le notificara
  @apiSuccess (Respuesta) {Texto} email Dato respecto al correo al cual se le notificara
  @apiSuccess (Respuesta) {Boolean} enviado Si el usuario requiere notificación cuando se envia un documento para aprobación
  @apiSuccess (Respuesta) {Boolean} derivado Si el usuario requiere notificación cuando se le deriva un documento
  @apiSuccess (Respuesta) {Boolean} observado Si el usuario requiere notificación cuando se le observa/rechaza un documento
  @apiSuccess (Respuesta) {Boolean} aprobado Si el usuario requiere notificación cuando se le aprueba un documento
  @apiSuccess (Respuesta) {Numérico} _usuario_creacion Usuario que crea la configuración de notificación
  @apiSuccess (Respuesta) {Numérico} _usuario_modificacion Usuario que modifica la configuración de notificación
  @apiSuccess (Respuesta) {FechaHora} _fecha_creacion Fecha de creacion de conf_notificacion
  @apiSuccess (Respuesta) {FechaHora} _fecha_modificacion Fecha de modificacion de conf_notificacion

  @apiSuccessExample {json} Respuesta del Ejemplo:
  HTTP/1.1 200 OK
{
  "tipoMensaje": "EXITO",
  "mensaje": "La operación se realizó correctamente.",
  "datos": {
    "id_conf_notificacion": 65,
    "fid_usuario": 70,
    "celular": "77788899",
    "canal": "SMS_CORREO",
    "enviado": false,
    "observado": true,
    "aprobado": true,
    "derivado": false,
    "estado": "ACTIVO",
    "_usuario_creacion": 1,
    "_usuario_modificacion": null,
    "_fecha_creacion": "2017-01-27T14:15:40.000Z",
    "_fecha_modificacion": "2020-01-15T12:50:36.579Z"
  }
}

  @apiSampleRequest off
*/
  app.put('/api/v1/notificacion/conf_notificacion/:id', sequelizeHandlers.update(conf_notificacion));

/**
  @apiVersion 1.0.0
  @apiGroup Notificación
  @apiName Options conf_notificacion
  @api {options} /api/v1/notificacion/conf_notificacion Extrae formly de conf_notificacion

  @apiDescription Options de conf_notificacion

  @apiSuccess (Respuesta) {Texto} key Llave para el campo
  @apiSuccess (Respuesta) {Texto} type Tipo de etiqueta este puede ser input, select, datepicker, etc
  @apiSuccess (Respuesta) {Objeto} templateOptions Objeto de opciones para la etiqueta, el cual varia de acuerdo el tipo de etiqueta

  @apiSuccessExample {json} Respuesta:
  HTTP/1.1 200 OK
  [
    {
      "key": "id_conf_notificacion",
      "type": "input",
      "templateOptions": {
        "type": "number",
        "label": "Id conf_notificacion",
        "required": true
      },
    },
    {
      "key": "campo",
      "type": "input",
      "templateOptions": {
        "type": "text",
        "label": "Campo",
        "required": true
      }
    }
  ]

  @apiSampleRequest off
*/
  app.options('/api/v1/notificacion/conf_notificacion', sequelizeFormly.formly(conf_notificacion, app.src.db.models));
};
