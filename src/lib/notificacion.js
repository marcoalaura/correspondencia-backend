const Promise = require('bluebird');
const Client = require('node-rest-client').Client;
const config = require('../../src/config/config')();
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport')

const cn=config.notificacion;
const configCorreoLocal=config.correo;
const cliente = new Client();

const transporte = nodemailer.createTransport(smtpTransport(configCorreoLocal));
let usuarioOrigen=null;
let fechaEnvio= null;

function enviar(pModelos, pDocumento, pEntorno, pTr){

  let id_1 = pDocumento._usuario_creacion;
  let id_2 = pDocumento.via_actual;
  if(pEntorno=='derivado'){
    id_1=pDocumento.via_actual;
    id_2=pDocumento._usuario_modificacion;
  }
  if(pEntorno == 'aprobado'){
    id_2=pDocumento._usuario_modificacion;
  }
  return new Promise((resolve, reject) => {
    if(process.env.NODE_ENV =='test') resolve();
    return pModelos.conf_notificacion.findOne({
    // return pModeloConfiguracion.findOne({
      where:{fid_usuario:id_1},
      include:[{
        model:pModelos.usuario,
        as:'usuario'
      }]
    })
    .then(pResultado => {

      if(pResultado!== null){
        usuarioOrigen=pResultado.dataValues;
        return pModelos.conf_notificacion.findOne({
        // return pModeloConfiguracion.findOne({
          where:{fid_usuario:id_2},
          include:[{
            model:pModelos.usuario,
            as:'usuario'
          }]
        })
        .then(pRespuestaUsuario => pRespuestaUsuario.dataValues)
      }
      else throw new Error("Este usuario no tiene la configuracion basica de notificacion")
    })
    .then(pDestino =>
      pModelos.historial_flujo.findOne({
      // pModeloFlujo.findOne({
        attributes:['_fecha_creacion'],
        where:{
          id_documento:pDocumento.id_documento,
          accion:'ENVIADO'
        }
      })
      .then(pEnvio => {
        fechaEnvio=pEnvio._fecha_creacion;
        return pDestino;
      })

    )
    .then(pDestino => {
      let mensaje=null;
      let asunto = `${pDocumento.nombre_plantilla} - ${pEntorno.toUpperCase()} -  Sistema de documentos administrativos`;
      let telefonos=[],correos=[];
      let destino = usuarioOrigen;
      let origen = pDestino;
      let correo = usuarioOrigen.usuario.email;
      let telefono = usuarioOrigen.celular;
      const mifecha=`${fechaEnvio.getDate()}/${fechaEnvio.getMonth()+1}/${fechaEnvio.getFullYear()}`;
      const miHora = `${fechaEnvio.getHours()}:${fechaEnvio.getMinutes()}:${fechaEnvio.getSeconds()}`;
      // Retorna un mensaje, telefono y correo, dependiendo del Entorno.
      switch (pEntorno) {
        case 'observado':
          mensaje = `${pDocumento.nombre_plantilla}, enviado el ${mifecha} a horas ${miHora}  fue ${pEntorno} por ${pDestino.usuario.nombres} ${pDestino.usuario.apellidos}`;
        break;
        case 'enviado':
          mensaje = `${usuarioOrigen.usuario.nombres} ${usuarioOrigen.usuario.apellidos} te ha enviado un(@): ${pDocumento.nombre_plantilla}, en fecha ${mifecha} a horas ${miHora}.`;
          telefono = pDestino.celular;
          correo = pDestino.usuario.email;
          destino = pDestino;
          origen = usuarioOrigen;
        break;
        case 'derivado':
          mensaje= `${pDestino.usuario.nombres} ${pDestino.usuario.apellidos} <strong>te ha derivado</strong> ${pDocumento.nombre_plantilla} con CITE ${pDocumento.nombre} `;
        break;
        case 'aprobado':
          mensaje= `${pDestino.usuario.nombres} ${pDestino.usuario.apellidos} ha aprobado tu ${pDocumento.nombre_plantilla} con CITE ${pDocumento.nombre} `;

        break;
      }

      telefonos.push(telefono);
      correos.push(correo);

      if(destino[pEntorno] == true){
        const datos = {
          destinatario:destino.usuario.id_usuario,
          canal:destino.canal,
          _usuario_creacion:origen.usuario.id_usuario,
          _fecha_creacion:new Date(),
          mensaje,

        }
        switch (destino.canal) {
          case 'SMS':

            if(destino.usuario.id_usuario !== origen.usuario.id_usuario){
              return enviarSMS(mensaje, telefonos, pModelos.notificacion, datos)
              .then(pEnvio => resolve())
            }
            else resolve();
          break;
          case 'CORREO':
            console.log("Enviando el CORREO");
            if(destino.usuario.id_usuario !== origen.usuario.id_usuario){
              return enviarCorreo(asunto, mensaje, correos,pEntorno, pModelos.notificacion, datos,pDocumento.id_documento)
              // return enviarCorreoLocal(asunto, mensaje, correos,pEntorno, pModelos.notificacion, datos,pDocumento.id_documento, pTr)
              .then(() => resolve())
            }else {
              resolve();
            }

          break;
          case 'SMS_CORREO':
            console.log("Enviando el SMS y CORREO");
            if(destino.usuario.id_usuario !== origen.usuario.id_usuario){
              resolve();
              // return enviarCorreo(asunto, mensaje, correos,pEntorno, pModelos.notificacion, datos,pDocumento.id_documento, pTr)
              // .then(pEnvio=>{
              //   return enviarSMS(mensaje, telefonos, pModelos.notificacion, datos, pTr)
              //   .then(pEnvioSms => resolve());
              // })
              // .catch(e => resolve());
            }
            else resolve();
          break;
        }


      }
      else {
        console.log("No requiere notificacion para ", pEntorno);
        resolve();
      }
    })
    .catch(pError => {
      console.log("Error en el envio de la notificacion", pError.message);
      resolve();
    })
  })

}

/**
 * Función que realiza el envio de SMS, haciendo uso de una API.
 * @param  {Texto} pMensaje             Contiene el mensaje a ser enviado via sms.
 * @param  {Vector} pTelefono           Lista de telefonos destinatarios.
 * @param  {Objeto} pModeloNotificacion Modelo de base de datos.
 * @param  {Objeto} pDatos              Datos a ser insertados en el modelo de datos.
 * @param  {Objeto} pTr                 Transaccion propia de sequelize.
 * @return {Promesa}
 */
function enviarSMS(pMensaje,pTelefono,pModeloNotificacion,pDatos,pTr){

  const args = {
    data:{
      mensaje:pMensaje,
      telefonos:[pTelefono]
    },
    headers:{
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cn.sms_token}`
    }
  }
  return new Promise((resolve, reject) => {

    return cliente.post(`${cn.sms_url}`, args, (data, response) => {

      return pModeloNotificacion.create(pDatos,pTr)
      .then(() => resolve())
    })
    .on('error', pError => reject(pError))

  })

}

/**
 * Función que realiza el envio de correos de manera local.
 * @param  {Texto} pMensaje             Contiene el mensaje a ser enviado via correo.
 * @param  {Vector]} pCorreos           Lista de destinatarios.
 * @param  {Texto} pEntorno             Entorno de la notificacion.
 * @param  {Objeto} pModeloNotificacion Modelo de base de datos.
 * @param  {Objeto} pDatos              Datos a ser insertados en el modelo de datos.
 * @param  {Objeto} pTr                 Transaccion propia de sequelize.
 * @return {Promesa}
 */
function enviarCorreoLocal(pAsunto, pMensaje, pCorreos, pEntorno, pModeloNotificacion, pDatos, pId,pTr){
  let html=`Estimado, el siguiente documento fue <strong>${pEntorno}</strong> <br>
  <p>${pMensaje}</p>`;
  if(pEntorno=='observado')html+=`Para mas informacion ingresa a <a href="${config.front}documento/${pId}" >aquí!</a>
  <br> Si el enlace no funciona, prueba a copiar y pegar lo siguiente en tu navegador ${config.front}documento/${pId}`
  else html += `Para mas informacion ingresa al sistema <a href="${config.front}login" >aquí!</a>
  <br> Si el enlace no funciona, prueba a copiar y pegar lo siguiente en tu navegador ${config.front}`
  const contenido={
    from:configCorreoLocal.origen,
    to:pCorreos,
    subject:pAsunto,
    html,
  }
  return new Promise((resolve, reject) => {
    transporte.sendMail(contenido,(pError, pInfo) => {
      if(pError){
        console.log("Error en el envio de correo",pError);
        resolve();
      } else {
        console.log("Correo enviado");
        return pModeloNotificacion.create(pDatos,pTr)
        .then(() => resolve())
      }

    })
  })


}

/**
* Función que realiza el envio de correos consumiendo la API..
* @param  {Texto} pMensaje             Contiene el mensaje a ser enviado via correo.
* @param  {Vector]} pCorreos           Lista de destinatarios.
* @param  {Texto} pEntorno             Entorno de la notificacion.
* @param  {Objeto} pModeloNotificacion Modelo de base de datos.
* @param  {Objeto} pDatos              Datos a ser insertados en el modelo de datos.
* @param  {Objeto} pTr                 Transaccion propia de sequelize.
* @return {Promesa}
 */
function enviarCorreo(pAsunto, pMensaje, pCorreos, pEntorno, pModeloNotificacion, pDatos, pId, pTr){
  let html=`Estimado, el siguiente documento fue <strong>${pEntorno}</strong> <br><p>${pMensaje}</p>`;
  if(pEntorno=='observado')html+=`Para mas informacion ingresa a <a href="${config.front}documento/${pId}" >aquí!</a><br> Si el enlace no funciona, prueba a copiar y pegar lo siguiente en tu navegador ${config.front}documento/${pId}`
  else html += `Para mas informacion ingresa al sistema <a href="${config.front}login" >aquí!</a><br> Si el enlace no funciona, prueba a copiar y pegar lo siguiente en tu navegador ${config.front}`;

  const args={
    data:{
      remitente:configCorreoLocal.remitente,
      origen:configCorreoLocal.origen,
      asunto:pAsunto,
      mensaje:html,
      modo:"html",
      correos:pCorreos,
    },
    headers:{
      'Content-Type': 'application/json',
      'Authorization':`Bearer ${cn.correo_token}`
    }
  }

  return new Promise((resolve, reject) => {
    return cliente.post(`${cn.correo_url}`, args, (data,response) => {
      return pModeloNotificacion.create(pDatos,pTr)
      .then(() => resolve())
    })
    .on('error', pError => reject(pError))
  })
}


module.exports={
  enviar,
  enviarSMS,
  enviarCorreo,
  enviarCorreoLocal
}
