require('colors');
const Promise = require('bluebird');
const Uuid = require('uuid');
const Archivo = require('../../lib/archivos');
const sequelize = require('sequelize');
const moment = require('moment');
const _ = require('lodash');
const Util = require('../../lib/util');
const notificar = require('../../lib/notificacion');
const config = require('../../config/config')();
const dirDocumento = config.ruta_documentos;
const blm = require('../monitor/monitorBL');
const libAlmacen = require('../../lib/almacen');
const libActivos = require('../../lib/activos');
const Op = require('sequelize').Op;

module.exports = {


  actualizarDocumento: (pDocumento, pDatos, pModeloHistorial, tr) =>
    new Promise((resolve, reject) =>
    pDocumento.update(pDatos, tr)
    .then(pDoc => {
      const flag=(pDatos.estado == 'DERIVADO' && pDatos.via_actual == pDatos._usuario_modificacion)? false:true;
      
      if(flag ){
        pModeloHistorial.create({
          id_documento:pDoc.id_documento,
          accion:pDatos.estado,
          observacion:(pDatos.observaciones)?pDatos.observaciones:'',
          _usuario_creacion:pDatos._usuario_modificacion,
        }, tr)
        .then(pResultado => resolve(pResultado))
      }
      else resolve();

    })
    .catch(pError => reject(pError))
  ),

  /**
   * Función que realiza el cierre de un documento y el flujo.
   * @param  {Object} pModeloDocumento Objeto Sequelize del modelo de datos documento
   * @param  {Object} pModeloHistorial Objeto Sequelize del modelo de datos historial_flujo
   * @param  {Object} pDocumento       Objeto con informacion sobre el documento
   * @param  {Number} pUsuario         Identificador del usuario que realiza el cambio
   * @return {Promise}                 Promesa.
   */
  cerrarDocumento: (pModelos, pDocumento, pUsuario, tr, Sequelize) => {
    
    const datosActualizar = {
      estado:'CERRADO',
      _usuario_modificacion:pUsuario,
    };
    // if(pDocumento.firmante_actual === null) datosActualizar.firmante_actual = pDocumento.firmante_actual;
    return new Promise((resolve, reject) => {
      if(pDocumento.grupo){
          pModelos.documento.findAll({
            where: {
              grupo: pDocumento.grupo,
              estado: {
                [Op.notIn]: ['ELIMINADO', 'CERRADO'],
              },
            },
            order: [['_fecha_creacion','ASC']],
          })
          .then( pRespuesta =>  {
            if(!Array.isArray(pRespuesta)) pRespuesta = [pRespuesta];
            return resolve(Promise.each(pRespuesta, (it) => {
              const remitentes = JSON.parse(it.de);
              delete datosActualizar.firmante_actual;
              if(it.firmante_actual === null && it.firmaron === null) {
                datosActualizar.firmante_actual = remitentes[0];
              }
              return module.exports.actualizarDocumento(it, datosActualizar, pModelos.historial_flujo, tr);
            }));
          })
          .catch( pError => reject(pError))
      }else {
        resolve(true)
      }

    })
  },

  buscarHijos:(pModeloDocumento,pDocumento) =>
  new Promise((resolve, reject) => pModeloDocumento.findAll({
    where:{documento_padre:pDocumento.dataValues.id_documento},
  })
  .then(pResultado => {(pResultado.length > 0)?resolve(true):resolve(false)})
  .catch(pError => reject(pError))
  ),

  eliminarDocumento: (pIdUsuario, pIdDocumento, pModelo, pModeloHistorial) => {
    const condicion={};
    if(pIdUsuario!=null || pIdUsuario!=undefined) condicion._usuario_creacion=pIdUsuario
    if(pIdDocumento!=null || pIdDocumento!=undefined) condicion.id_documento=pIdDocumento
    return new Promise((resolve, reject) => pModelo.findOne({where:condicion})
    .then(pResultado => {

      if(pResultado != null){
        if(pResultado.estado=='NUEVO' || pResultado.estado=='RECHAZADO'){
          return module.exports.actualizarDocumento(pResultado,
          {
            estado:'ELIMINADO',
            _usuario_modificacion: pIdUsuario,
            documento_padre: -pResultado.documento_padre,
          }, pModeloHistorial)
        }
        else throw new Error("La modificacion no esta disponible en este momento.");
      }
      else throw new Error("El documento solicitado no existe");
    })
    .then(() => resolve())
    .catch(pError => reject(pError)))

  },

  documento_enviar: (modeloHistorialFlujo, doc, tr, pDirector) =>
  new Promise( (resolve, reject) => {
    const via = JSON.parse(doc.via);
    const para = JSON.parse(doc.para);
    let viaActual = 0, i;
    const form = JSON.parse(doc.plantilla);

    let aprobarPorDireccion = false;
    for (let f = 0; f < form.length; f++) {
      if (form[f].type == "datosGenerales" && form[f].templateOptions) {
        aprobarPorDireccion = form[f].templateOptions.aprobarPorDireccion;
        break;
      }
    }

    if (aprobarPorDireccion && via.length==0) {
        viaActual = pDirector;
    } else {
        if (via.length>0) {
            viaActual = via[0];
        } else {
            viaActual = para[0];
        }
    }

    doc.update({
      via_actual: viaActual,
      estado: 'ENVIADO',
      usuario_modificacion: doc._usuario_creacion,
    }, tr)
    .then(doc =>
      modeloHistorialFlujo.create({
        id_documento:doc.id_documento,
        accion: 'ENVIADO',
        observacion: '',
        estado: 'ACTIVO',
        _usuario_creacion: doc._usuario_creacion,
      }, tr)
    )
    .then( resu =>  resolve(resu))
    .catch( e => reject(e));
  }),

  /**
   * Función que crea el registro en el historial
   * @param  {Modelo} modeloHistorialFlujo Instancia del modelo de datos del historial
   * @param  {Número} idDocumento          Identificador del documento
   * @param  {Número} idUsuario            Identificador del usuario que realiza la acción
   * @param  {Objeto} tr                   Instancia de la transacción en curso
   * @return {Promesa}                     Retorna una promesa
   */
  documento_crear: (modeloHistorialFlujo, idDocumento, idUsuario, tr) =>
  new Promise( (resolve, reject) => {
    modeloHistorialFlujo.create({
      id_documento:idDocumento,
      accion:'CREADO',
      observacion:'',
      _usuario_creacion:idUsuario,
    }, tr)
    .then( resu =>  resolve(resu))
    .catch( e => reject(e));
  }),

  /**
   * Función que actualiza el identificador del grupo de  un documento.
   * @param  {Modelo} modeloDocumento Modelo de datos del documento
   * @param  {Objeto} doc             Instancia del documento
   * @param  {Objeto} tr              Instancia de la transacción en curso
   * @return {Promesa}                Retorna una promesa.
   */
  actualizarGrupo: (modeloDocumento, doc, tr) =>
  new Promise( (resolve, reject) => {
    if(doc.documento_padre){
      modeloDocumento.findByPk(doc.documento_padre)
      .then( doc_padre => doc.update({grupo: doc_padre.grupo}, tr))
      .then( resu =>  resolve(resu))
      .catch( e => reject(e));
    }else {
      doc.update({grupo: doc.id_documento}, tr)
      .then( resu =>  resolve(resu))
      .catch( e => reject(e));
    }
  }),

  /**
   * Método que crea fisicamente los base64 que se le envien.
   * @param  {VECTOR} pVector Contiene un vector de objetos, los cuales traen consigo un base64.
   * @param  {TEXTO} pRuta   Cadena de texto con la ruta destino.
   * @return {VECTOR}        Retorna el vector de objetos actualizados, sin base64.
   */
  crearExternos: (pVector, pRuta) => {

    const externos = pVector.map(pItem => {

      const data = pItem.base64;

      if(data!== undefined){
        const tipo = pItem.filetype.substr(pItem.filetype.indexOf('/')+1,pItem.filetype.length);

        pItem.nombre_privado= `${Uuid.v4()}.${tipo}`;
        pItem.nombre_publico=`${pItem.filename}`;
        pItem.url= `${pRuta.substr(1,pRuta.length)}/${pItem.nombre_privado}`;
        delete pItem.base64;

        return Archivo.crearArchivo(pRuta, new Buffer(data, "base64"), pItem.nombre_publico, tipo, pItem.nombre_privado, true)
        .then(pRespuesta => Promise.resolve())
        .catch(pError => Promise.reject(pError));
      }
      else {
        return Promise.resolve();
      }

    });

    return Promise.all(externos)
    .then(() => Promise.resolve(pVector))
    .catch(pError => Promise.reject(pError));
  },
  /**
   * Función que verifica la existencia de archivos externos,
   * si hay los crea fisicamente en el servidor.
   * @param  {OBJETO} pDatos Objeto que contiene los datos de un documento. Entre los cuales se encuentran documentos externos.
   * @param  {TEXTO} pRuta  Cadena de texto que contiene la ruta donde se almacena los documentos.
   * @return {TEXTO}        Retorna un objeto transformado en texto en caso de que existan, de lo contrario nada.
   */
  verificarExternos: (pDatos, pRuta) => {

    let tieneAdjuntos=false;
    let documentos=[];

    return new Promise((resolve, reject) => {

      if(pDatos.plantilla_valor){
        const valores= JSON.parse(pDatos.plantilla_valor);

        for (const i in valores) {
          if(i.search('archivo') > -1){
            tieneAdjuntos=true;
            documentos=documentos.concat(valores[i]);
          }
        }
        if(tieneAdjuntos){
          module.exports.crearExternos(documentos, pRuta)
          .then(pRespuesta => resolve(JSON.stringify(valores)))
          .catch(pError => reject(pError));
        }
        else{
          resolve();
        }
      }
      else {
        resolve();
      }

    });

  },

  /**
   * Función que verifica la existencia del componente cajachica,
   * si hay los crea físicamente en la base de datos del servidor.
   * @param {ENTERO} idUsuario Identificador del usuario de sesión.
   * @param {MODELO} pPartida Modelo sequelizede partida..
   * @param {OBJETO} valores  Retorna un objeto transformado en texto en caso de que existan, de lo contrario nada.
   * @return {TEXTO}  Retorna un objeto transformado en texto en caso de que existan, de lo contrario nada.
   */

  crearModificarPartidas: (idUsuario, pPartida, valores, tieneCite) => {
    
    let partidas = [], par;

    return new Promise((resolve, reject) => {
      // solo se creara si el documento tiene el componente cajachica y no tenga cite
      // la creacion sera para todos los tipos de partidas
      if (!tieneCite && valores['cajachica-0']) {

        // llevamos las filas en un array con formato de la tabla partida
        valores['cajachica-0'].rows.forEach( it => {
          par = {
            cite: valores['cite-0']['cite'],
            numero:  typeof it.partida=='object'? it.partida.numero : it.partida,
            descripcion: it.descripcion,
            monto: it.monto,
            gestion: moment().tz("America/La_Paz").year(),
            tipo: valores['cajachica-0']['tipo'],
            _usuario_creacion: idUsuario,
          };
          if (valores['cajachica-0'].tipo=='PAGADO') {
            par.fid_partida = it.id_comprometido;
            par.cite_ref = it.cite.nombre;
            if (it.pago_multiple) {
              par.fid_partida = (toFloat(it.monto)==toFloat('0.00'))? it.id_comprometido : null;
              par.multiple = it.id_comprometido;
            }
          }
          partidas.push(par);
        });

        // el parametro reurning hace que nos devuelva los ids de las partidas creadas
        pPartida.bulkCreate(partidas, {returning: true})
        .then(pRespuesta => {
          // asignamos el id a los valores del documento
          for (let i = 0; i < pRespuesta.length; i++)
            valores['cajachica-0'].rows[i].id =  pRespuesta[i].id_partida;

          if (valores['cajachica-0'].tipo=='PAGADO') {
            // si la creacion es de pagados actualizaremos el fid_partida de su comprometido

            // ordenar pagos  de mayor a menor  y hacerlos de uno en uno
            partidas = _.sortBy( valores['cajachica-0'].rows, row => -toFloat(row.monto) );
            Promise.each(partidas, it => {
              // si no es pago_multiple o es monto 0.00 actualizaremos el fid_partida de su comprometido
              if ( !it.pago_multiple || toFloat(it.monto)==toFloat('0.00'))
                pPartida.update({ fid_partida: it.id }, {
                  where: {
                    id_partida: it.id_comprometido,
                    tipo: 'COMPROMETIDO',
                  },
                });
              // si es pago_multiple y es ultimo pago 0.00 actualizaremos todos loa pagos
              if ( it.pago_multiple && toFloat(it.monto)==toFloat('0.00'))
                pPartida.update({ fid_partida:it.id }, {
                  where: {
                    id_partida:{ [Op.ne]:it.id },
                    multiple: it.id_comprometido,
                    tipo: 'PAGADO',
                  },
                })
            })

          } else if (valores['cajachica-0'].tipo=='COMPROMETIDO') {
            // si la creacion es de comprometidos,
            // se verifica que el comprometido es de pago_multiple multiple, si es true => se actualiza su columna multiple con su id
            partidas = valores['cajachica-0'].rows.map( it => {
              if (it.pago_multiple) {
                pPartida.findByPk(it.id)
                .then( comp => comp.update({ multiple: comp.id_partida}))
                .then( comp => Promise.resolve())
                .catch( err => Promise.resolve())
              } else
                Promise.resolve()
            });
            Promise.all(partidas);
          }

        })
        .then( pRespuesta => {
          resolve(valores);
        })
        .catch(pError => {
          resolve();
        });

      } else return resolve();
    });

    function toFloat(string) { return parseFloat(parseFloat(string).toFixed(2)); }
  },

  /**
   * Función que se encarga de verficar estado de las partidas para cada caso, si existe el componente caja chica
   * @param {MODELO} pPartida Modelo sequelizede partida..
   * @param {OBJETO} valores  Retorna un objeto transformado en texto en caso de que existan, de lo contrario nada.
   */
  verificarPartidas: (pPartida, valores) => { 
    let
    partidas = [],
    modificados = [],
    pagados = [],
    comprometidos = [],
    saldo, num;
    const
    xnumeros = [],
    partidas_obj = {},
    modificados_obj = {},
    pagados_obj = {},
    comprometidos_obj = {},
    xnumeros_obj = {},
    saldos= {},
    anioActual = `${moment().tz("America/La_Paz").year()}`;

    return new Promise((resolve, reject) => {
      if (valores['cajachica-0']) {
        
        if ( typeof valores['cajachica-0'] == 'object' ){
          if (valores['cajachica-0'].tipo == 'INICIAL') verificarExistenciaIniciales();
          else if (valores['cajachica-0'].tipo == 'COMPROMETIDO' || valores['cajachica-0'].tipo == 'MODIFICADO') verificarMontosPartidas();
          else if (valores['cajachica-0'].tipo == 'PAGADO') verificarExistenciaPagados();
          else reject("Los datos enviados de partidas, son incorrectos");
        } else reject("Los datos enviados de partidas, son incorrectos");

      } else return resolve();
      
      // verificamos que los montos no excedan de las partidas
      function verificarMontosPartidas () {
        valores['cajachica-0'].rows.forEach( row => {
          
          if (!xnumeros_obj[row.partida.numero]) {
            xnumeros.push(row.partida.numero);
            xnumeros_obj[row.partida.numero] = { numero:row.partida.numero, monto:toFloat(row.monto) };
          } else {
            xnumeros_obj[row.partida.numero].monto += toFloat(row.monto);
          }
        });

        pPartida.findAll({
          attributes: ['id_partida', 'numero', 'monto'],
          where: {
            numero: {[Op.in]:xnumeros},
            tipo: 'INICIAL',
            gestion: anioActual,
            estado: 'ACTIVO',
          },
          raw: true,
        })
        .then( resp => {
          partidas = resp;
          return pPartida.findAll({
            attributes: ['numero', [sequelize.fn('SUM',sequelize.fn('COALESCE', (sequelize.col('monto')), 0)), 'monto']],
            where: {
              numero: { [Op.in]:xnumeros },
              tipo: 'MODIFICADO',
              gestion: anioActual,
              estado: 'ACTIVO',
            },
            group: 'numero',
            raw: true,
          })
        })
        .then( resp => {
          modificados = resp;
          return pPartida.findAll({
            attributes: ['numero', [sequelize.fn('SUM',sequelize.fn('COALESCE', (sequelize.col('monto')), 0)), 'monto']],
            where: {
              numero: { [Op.in]:xnumeros },
              tipo: 'COMPROMETIDO',
              gestion: anioActual,
              fid_partida: null, //los comprometidos que no fueron paagados
              estado: 'ACTIVO',
            },
            group: 'numero',
            raw: true,
          })
        })
        .then( resp => {
          comprometidos = resp;
          return pPartida.findAll({
            attributes: ['numero', [sequelize.fn('SUM',sequelize.fn('COALESCE', (sequelize.col('monto')), 0)), 'monto']],
            where: {
              numero: { [Op.in]:xnumeros },
              tipo: 'PAGADO',
              gestion: anioActual,
              fid_partida: {[Op.ne]:null},
              estado: 'ACTIVO',
            },
            group: 'numero',
            raw: true,
          })

        })
        .then( resp => {
          pagados = resp;
          arrToObj(partidas, partidas_obj, 'numero');
          arrToObj(pagados, pagados_obj, 'numero');
          arrToObj(comprometidos, comprometidos_obj, 'numero');
          arrToObj(modificados, modificados_obj, 'numero');
          
          xnumeros.forEach( num => {
            if(!saldos[num]) saldos[num] = {};
            saldo = toFloat( getMonto(partidas_obj, num) - getMonto(comprometidos_obj,num) - getMonto(pagados_obj,num) + getMonto(modificados_obj,num) );
            saldos[num].saldoInicial = saldo;
            if( valores['cajachica-0'].tipo == 'COMPROMETIDO') {
              if ((saldo-getMonto(xnumeros_obj,num))<0) {
                newError(`La partida número ${num} no cuenta con saldo suficiente para el requerimiento.<br>
                Saldo actual < monto total requerido <br>
                ${saldo} < ${getMonto(xnumeros_obj,num)}`);
              }
              else {
                saldos[num].saldoFinal = saldo - getMonto(xnumeros_obj, num);
                saldos[num].montoComprometido = getMonto(xnumeros_obj, num);
              }
            } else if( valores['cajachica-0'].tipo == 'MODIFICADO') {
              if (getMonto(xnumeros_obj,num)<0){
                
                if ((saldo+getMonto(xnumeros_obj,num))<0) {
                  newError(`La partida número ${num} no cuenta con saldo suficiente para la modificación.<br>
                    Saldo actual < monto total a cambiar <br>
                    ${saldo} < ${getMonto(xnumeros_obj,num)}`);
                }
              }
            }
          })
          // throw new Error('---------Error generado manual --------------------');
          
          resolve(saldos);
        })
        .catch( err => { console.log(err); reject('Ocurrio un error al verificar el presupuesto')})
      }

      // verifica que no se inicien dos partidas con el mismo numero para una gestion
      function verificarExistenciaIniciales() {
        valores['cajachica-0'].rows.forEach( row => {
          if (!xnumeros_obj[row.partida]) {
            xnumeros.push(row.partida);
            xnumeros_obj[row.partida] = true;
          }
        });

        pPartida.findAll({
          where: {
            numero: {[Op.in]:xnumeros},
            tipo: 'INICIAL',
            gestion: anioActual,
            estado: 'ACTIVO',
          },
          limit:3,
          raw: true,
        })
        .then( resp => {
          // throw new Error('---------Error generado manual --------------------');
          if (resp.length==0) {
            resolve();
          }
          newError(`La partida número ${resp[0].numero} ya existe. <br> Partida: ${resp[0].numero} - ${resp[0].descripcion}`);
        })
        .catch( err => { console.log(err); reject('Ocurrio un error al verificar las partidas')})
      }

      function verificarExistenciaPagados() {
        valores['cajachica-0'].rows.forEach( row => {

          if (pagados_obj[row.id_comprometido] && !row.pago_multiple) {
            newError(`El pago: <br>
              -cite: ${row.cite.nombre} <br>
              -partida: ${row.partida.num_des} <br>
              No debe repetirse, por favor verifique los datos enviados.`);
          }

          if (row.pago_multiple) {
            if (!pagados_obj[row.id_comprometido]) {
              pagados.push(row.id_comprometido); // pagados multiples
              pagados_obj[row.id_comprometido] = row;
              pagados_obj[row.id_comprometido].pago_total = 0;
            }
            pagados_obj[row.id_comprometido].pago_total += toFloat(row.monto);
          }

          comprometidos.push(row.id_comprometido); // todos

          if (toFloat(row.saldo? row.saldo : row.comprometido)<toFloat(row.monto)) {
            newError(`El pago: <br>
              -cite: ${row.cite.nombre} <br>
              -partida: ${row.partida.num_des} <br>
              -detalle: ${row.descripcion}. <br>
              Excede el ${row.saldo? 'saldo' : 'monto comprometido'}. <br>
              ${row.saldo? 'saldo' : 'comprometido'} < pagado <br>
              ${row.saldo? row.saldo : row.comprometido} < ${row.monto}.`);
          }
        });

        // buscamos a los compromeidos que fueron pagados
        pPartida.findAll({
          where: {
            fid_partida: {[Op.in]:comprometidos},
            tipo: 'PAGADO',
            estado: 'ACTIVO',
          },
          raw: true,
        })
        .then( resp => {
          if (resp.length!=0) {
            newError(`La partida número ${resp[0].numero} con: <br>
              -cite: ${resp[0].cite_ref} <br>
              -detalle: ${resp[0].descripcion} <br>
              Ya fue pagada en el documento ${resp[0].cite}.`);
          }

          // buscamos el total pagado de cada comprometido
          return pPartida.findAll({
            attributes: ['multiple', [sequelize.fn('SUM',sequelize.fn('COALESCE', (sequelize.col('monto')), 0)), 'monto']],
            where: {
              multiple: {[Op.in]:pagados},
              tipo: 'PAGADO',
              estado: 'ACTIVO',
            },
            group: 'multiple',
            raw: true,
          })
        })
        .then( pagos => {
          if (pagos) {
            pagos.forEach( it => {
              if (!xnumeros_obj[it.multiple]) {
                xnumeros_obj[it.multiple] = it;
              }
            });
            for (var k in pagados_obj) {
              num = pagados_obj[k];
              saldo = toFloat(num.comprometido);
              if (xnumeros_obj[num.id_comprometido]) {
                saldo -= toFloat(xnumeros_obj[num.id_comprometido].monto);
              }
              if ( toFloat(num.pago_total) > toFloat(saldo) ) {
                newError(`El pago: <br>
                  -número: ${num.partida.numero} <br>
                  -cite: ${num.cite.nombre} <br>
                  -detalle: ${num.descripcion} <br>
                  Excede el saldo del comprometido. <br>
                  Saldo actual < Pago total <br>
                  ${saldo} < ${toFloat(num.pago_total)}`);
                }
            }

          }
          resolve();
        })
        .catch( err => { console.log(err); reject('Ocurrio un error al verificar las partidas')})

      }

      function newError(msg) { reject(msg); throw new Error(msg); }

      function arrToObj(arr, obj, key) { arr.forEach( row => { if (!obj[row[key]]) { obj[row[key]] = row; }}); }

      function toFloat(string) { return parseFloat(parseFloat(string).toFixed(2)); }

      function getMonto(obj, num) { return  (obj && obj[num] && obj[num].monto)? toFloat(obj[num].monto) : 0; }
    });
  },

  /**
   * Función que valida la relación de un usuario con un documento.
   * @param  {Modelo} pModeloDocumento Instancia del modelo de datos para documento
   * @param  {Modelo} pModeloHistorial Instancia del modelo de datos para historialFlujo
   * @param  {Objeto} pDocumento       Instancia del documento
   * @param  {Objeto} pUsuario         Instancia del usuario solicitante
   * @return {Promesa}                 Retorna una promesa.
   */
  validarPeticionGet:(pModeloDocumento, pModeloHistorial, pDocumento, pUsuario) => {
    return new Promise((resolve, reject) => {

      if(pDocumento.estado !== 'NUEVO'){

        const via = JSON.parse(pDocumento.via);
        const para = JSON.parse(pDocumento.para);
        const de = JSON.parse(pDocumento.de);
        module.exports.obtenerDocumentos(pModeloDocumento, pModeloHistorial, pDocumento)
        .then(pDocumentos => {

          if(pDocumentos.length > 0 ){
            return pDocumentos.forEach((pDoc, pIndice) => {

              switch (pDocumento.estado) {
                case 'CERRADO':
                  pUsuario.roles.forEach(pRol => {
                    switch (pRol.rol.nombre) {
                      case 'OPERADOR':
                        if(pDoc._usuario_creacion == pUsuario.id_usuario ||
                          de.indexOf(pUsuario.id_usuario) > -1 ||
                          pDocumento.via_actual==pUsuario.id_usuario){
                          resolve(true);
                        }
                        else resolve(false);
                      break;
                      case 'CONFIGURADOR':
                        if(pDoc._usuario_creacion == pUsuario.id_usuario ||
                          de.indexOf(pUsuario.id_usuario) > -1 ||
                          pDocumento.via_actual==pUsuario.id_usuario){
                          resolve(true);
                        }
                        else resolve(false);
                      break;
                      case 'JEFE':
                        if(via.indexOf(pUsuario.id_usuario) > -1 ||
                          para.indexOf(pUsuario.id_usuario) > -1 ||
                          pDocumento.via_actual==pUsuario.id_usuario ||
                          pDoc._usuario_creacion == pUsuario.id_usuario){
                          resolve(true);
                        }
                        else resolve(false);
                      break;
                      case 'SECRETARIA':
                        resolve(true);
                      break;
                      case 'CORRESPONDENCIA':
                        if(via.indexOf(pUsuario.id_usuario) > -1 ||
                          para.indexOf(pUsuario.id_usuario) > -1 ||
                          pDocumento.via_actual==pUsuario.id_usuario ||
                          pDoc._usuario_creacion == pUsuario.id_usuario){
                          resolve(true);
                        }
                        else resolve(false);
                      break;
                    }
                  });
                break;
                case 'ENVIADO':
                  pUsuario.roles.forEach(pRol => {
                    switch (pRol.rol.nombre) {
                      case 'OPERADOR':
                        if(pDoc._usuario_creacion == pUsuario.id_usuario ||
                          de.indexOf(pUsuario.id_usuario) > -1 ||
                          pDocumento.via_actual==pUsuario.id_usuario){
                          resolve(true);
                        }
                        else resolve(false);
                      break;
                      case 'CONFIGURADOR':
                        if(pDoc._usuario_creacion == pUsuario.id_usuario ||
                          de.indexOf(pUsuario.id_usuario) > -1 ||
                          pDocumento.via_actual==pUsuario.id_usuario){
                          resolve(true);
                        }
                        else resolve(false);
                      break;
                      case 'JEFE':
                        if(via.indexOf(pUsuario.id_usuario) > -1 ||
                          para.indexOf(pUsuario.id_usuario) > -1 ||
                          pDocumento.via_actual==pUsuario.id_usuario ||
                          pDoc._usuario_creacion == pUsuario.id_usuario ){
                          resolve(true);
                        }
                        else resolve(false);
                      break;
                      case 'SECRETARIA':
                        if(pDoc._usuario_creacion == pUsuario.id_usuario ||
                          de.indexOf(pUsuario.id_usuario) > -1 ||
                          pDocumento.via_actual==pUsuario.id_usuario){
                          resolve(true);
                        }
                        else resolve(false);
                      break;
                      case 'CORRESPONDENCIA':
                        if(via.indexOf(pUsuario.id_usuario) > -1 ||
                          para.indexOf(pUsuario.id_usuario) > -1 ||
                          pDocumento.via_actual==pUsuario.id_usuario ||
                          pDoc._usuario_creacion == pUsuario.id_usuario){
                          resolve(true);
                        }
                        else resolve(false);
                      break;
                    }
                  });
                break;
                case 'RECHAZADO':
                  pUsuario.roles.forEach(pRol => {
                    switch (pRol.rol.nombre) {
                      case 'OPERADOR':
                        if(pDoc._usuario_creacion == pUsuario.id_usuario ||
                          de.indexOf(pUsuario.id_usuario) > -1 ||
                          pDocumento.via_actual == pUsuario.id_usuario){
                          resolve(true);
                        }
                        else resolve(false);
                      break;
                      case 'CONFIGURADOR':
                        if(pDoc._usuario_creacion == pUsuario.id_usuario ||
                          de.indexOf(pUsuario.id_usuario) > -1 ||
                          pDocumento.via_actual==pUsuario.id_usuario){
                          resolve(true);
                        }
                        else resolve(false);
                      break;
                      case 'JEFE':
                        if(via.indexOf(pUsuario.id_usuario) > -1 ||
                          para.indexOf(pUsuario.id_usuario) > -1 ||
                          pDocumento.via_actual==pUsuario.id_usuario ||
                          pDoc._usuario_creacion == pUsuario.id_usuario){
                          resolve(true);
                        }
                        else resolve(false);
                      break;
                      case 'SECRETARIA':
                        if(pDoc._usuario_creacion == pUsuario.id_usuario ||
                          de.indexOf(pUsuario.id_usuario) > -1 ||
                          pDocumento.via_actual==pUsuario.id_usuario){
                          resolve(true);
                        }
                        else resolve(false);
                      break;
                      case 'CORRESPONDENCIA':
                        if(via.indexOf(pUsuario.id_usuario) > -1 ||
                          para.indexOf(pUsuario.id_usuario) > -1 ||
                          pDocumento.via_actual==pUsuario.id_usuario){
                          resolve(true);
                        }
                        else resolve(false);
                      break;
                    }
                  });
                break;
                case 'DERIVADO':
                pUsuario.roles.forEach(pRol => {
                  switch (pRol.rol.nombre) {
                    case 'OPERADOR':
                      if(pDoc._usuario_creacion == pUsuario.id_usuario ||
                        de.indexOf(pUsuario.id_usuario) > -1 ||
                        pDocumento.via_actual==pUsuario.id_usuario){
                        resolve(true);
                      }
                      else resolve(false);
                    break;
                    case 'CONFIGURADOR':
                      if(pDoc._usuario_creacion == pUsuario.id_usuario ||
                        de.indexOf(pUsuario.id_usuario) > -1 ||
                        pDocumento.via_actual==pUsuario.id_usuario){
                        resolve(true);
                      }
                      else resolve(false);
                    break;
                    case 'JEFE':
                      if(via.indexOf(pUsuario.id_usuario) > -1 ||
                        para.indexOf(pUsuario.id_usuario) > -1 ||
                        pDocumento.via_actual==pUsuario.id_usuario){
                        resolve(true);
                      }
                      else resolve(false);
                    break;
                    case 'CORRESPONDENCIA':
                      if(via.indexOf(pUsuario.id_usuario) > -1 ||
                        para.indexOf(pUsuario.id_usuario) > -1 ||
                        pDocumento.via_actual==pUsuario.id_usuario){
                        resolve(true);
                      }
                      else resolve(false);
                    break;
                    case 'SECRETARIA':
                      resolve(true);
                    break;
                  }
                });
                break;

              }
            });
          } else {
            resolve(false);
          }

        })
        .catch(pError => {
          console.log("Error en la obtención de los documentos desde el global", pError);
          resolve(false);
        });

      }
      else if(pDocumento.estado == 'NUEVO'){
        resolve((pDocumento._usuario_creacion == pUsuario.id_usuario)? true:false);
      }
      else resolve(false);
    });

  },

  /**
   * Función que obtiene documentos y su historial.
   * @param  {Modelo} pModeloDocumento Instancia del modelos de datos para documento
   * @param  {Modelo} pModeloHistorial Instancia del modelos de datos para historial
   * @param  {Objeto} pDocumento       Instancia del documento base
   * @return {Promesa}                 Promesa
   */
  obtenerDocumentos: (pModeloDocumento, pModeloHistorial, pDocumento) =>
    new Promise((resolve, reject) =>
      module.exports.obtenerIdDocumentos(pModeloDocumento, pDocumento.grupo)
      .then(pIds => pModeloHistorial.findAll({where:{id_documento:{[Op.in]:pIds}}})
        .then(pDocumentos => resolve(pDocumentos))
      )
      .catch(pError => {
        console.log("Error al buscar en el historial", pError);
        reject(pError);
      })
  ),

  /**
   * Función que obtiene los identificadores de un determinado grupo.
   * @param  {Modelo} pModeloDocumento Instancia del modelo de datos para documento
   * @param  {Número} pGrupo           Identificador del grupo
   * @return {Promesa}                 Promesa
   */
  obtenerIdDocumentos:(pModeloDocumento, pGrupo) => {
    const documentos=[];

    return new Promise((resolve, reject) =>
      pModeloDocumento.findAll({
        attributes:['id_documento'],
        where:{grupo:pGrupo},
      })
      .then(pDocumentos => {

        if(pDocumentos.length > 0){
          return pDocumentos.forEach((pDoc, pIndice) => {
            documentos.push(pDoc.id_documento);
            if(pIndice === pDocumentos.length-1) resolve(documentos);
          });
        } else {
          resolve(documentos);
        }
      })
      .catch(pError => {
        console.log("Error al buscar los ids del grupo", pError);
        reject(pError);
      })
    ); // fin iteracion.

  },
  buscarAnuladores: (datos) => {
    let documentosAnular=[];
    let plantilla = datos;
    if(typeof datos === 'string') plantilla = JSON.parse(plantilla);
    if(Util.verificarJSON(plantilla) === false) return [];
    _.mapKeys(plantilla, (valor, llave) => {
      if(llave.indexOf('documentosAnular')>-1) documentosAnular.push(plantilla[llave]);
    });
    documentosAnular = _.flattenDeep(documentosAnular);
    return documentosAnular;

  },

  anularDocumentos: (pModelos, pDocumento, pRuta, idUsuario, tr) => {
    const paraAnular = module.exports.buscarAnuladores(pDocumento.plantilla_valor);
    return Util.generarAnulador({cite:pDocumento.nombre})
    .then(bufferAnulador => module.exports.ejecutarAnulacion(paraAnular, pRuta, pModelos, idUsuario, pDocumento,bufferAnulador, tr));
  },

  ejecutarAnulacion: (documentos, ruta, pModelos, idUsuario, pDocumento, pBuffer, tr) => {
    const modeloDocumento = pModelos.documento;
    const modeloHistorial = pModelos.historial_flujo;
    
    const promesas = documentos.map(documento => {
      const rutaDocumento = `${ruta}${Util.formatoNombreDoc(documento.nombre)}.pdf`;
      return Archivo.anular(rutaDocumento, pBuffer, tr)
      .then(() => {
        const condicion = {
          where: { id_documento: documento.id_documento}
        };
        const datos = {
          anulado: true,
          _usuario_modificacion: idUsuario,
        };
        return modeloDocumento.update(datos, condicion, tr);
      })
      .then(() => {
        const origen = JSON.parse(pDocumento.de)[0];
        const historico = {
          id_documento: documento.id_documento,
          accion: 'ANULADO',
          observacion: pDocumento.nombre,
          _usuario_creacion: origen,
          _usuario_modificacion: idUsuario,
        };
        return modeloHistorial.create(historico, tr);
      })
      .then(() => Promise.resolve())
      .catch(error => {
        return Promise.reject();
      });
    });

    return Promise.all(promesas)
    .then(() => Promise.resolve())
    .catch((e) => {
      console.log("Revisando el error desde la anulación de documentos", e);
      return Promise.reject(e);
    });
  },

  validarYaFirmo: (firmantes, firmaron, firmanteActual) => {
    const respuesta = {};
    let cont = 0;
    const noFirmaron = [];
    _.map(firmantes, item => {
      if(firmaron.indexOf(item) > -1) cont++;
      else noFirmaron.push(item);
    });
    if(cont === firmantes.length) respuesta.firmado = true;
    else respuesta.firmante_actual = noFirmaron[0];

    return respuesta;
  },

  crearCodigoFirma: (pModelos, documento, req) => {
    let codigo = `${config.prefijo}-${Util.generarCodigo(6, 'A#')}`;
    return pModelos.firma.create({
      fid_documento: documento.id_documento,
      _usuario_creacion: req.body.audit_usuario.id_usuario,
      codigo,
    })
    .then(respuesta => {
      return respuesta.codigo;
    })
    .catch(error => {
      console.log("Revisando el error al crear el codigo", error);
    });
  },

  generarCodigo: (pModelos, pDocumento, idUsuario, tr) => {
    const codigo = `${config.prefijo}-${Util.generarCodigo(8, 'A#')}`;
    const Firma = pModelos.firma;
    return new Promise((resolve, reject) => {
      return Firma.findOne({
        where: {
          codigo,
        }
      }, tr)
      .then(firma => {
        if (!firma || firma.length === 0) {
          return Firma.create({
            fid_documento: pDocumento.id_documento,
            _usuario_creacion: idUsuario,
            codigo,
          }, tr);
        }
      })
      .then((firmaResp) => {

        return resolve(firmaResp);
      })
      .catch(error => {
        console.log('Error en la busqueda de firmas', error);
        return reject(error);
      });
    });

  },

  obtenerCrearHash: (pDocumento, auditUsuario, tr) => {
    
    const nombreDocumento = Util.formatoNombreDoc(pDocumento.nombre);
    const existe = Util.existePdf(nombreDocumento);
    const rutaDocumentos = Util.rutaDocumentos();
    if(!existe || existe === false) {
      const datos = {
        doc: {
          nombre: nombreDocumento,
          plantilla: pDocumento.plantilla
        },
        form_actual: Util.dataToView(JSON.parse(pDocumento.plantilla), JSON.parse(pDocumento.plantilla_valor)),
        model_actual: JSON.parse(pDocumento.plantilla_valor),
        audit_usuario: auditUsuario,
        host: 'hla',
        grupo: pDocumento.grupo,
        codigo: pDocumento.codigo,
      };      
      datos.model_actual['cite-0'].fecha = Util.formatearFecha(datos.model_actual['cite-0'].fecha);

      return Util.generarDocumento(datos, true, tr)
      .then(() => {
        return Util.obtenerHash(nombreDocumento);
      });
    }
    const hash = Util.obtenerHash(nombreDocumento);
    return hash;
  },

  actualizarFirmaHash: (pModelos, pHash, pDoc, idUsuario, tr) => {
    return pModelos.firma.update({
      hash: pHash,
      _usuario_modificacion: idUsuario,
    },
    {
      where: {
        fid_documento: pDoc.id_documento,
      }
    }, tr)
    .then(() => {
      return;
    })
    .catch(error => {
      console.log("Error en la actualizacion del hash", error);
      return;
    });
  },
  
  
  aprobarVia: (modelos, documento, datos) => {
    
    const via = JSON.parse(documento.via) || [];
    const plantilla = JSON.parse(documento.plantilla);
    const para = JSON.parse(documento.para)[0];
    const compDatosGenerales = _.find(plantilla, ['type', 'datosGenerales']);

    let viaActual = documento.via_actual;
    let aprobarPorDireccion = false;
    
    if (compDatosGenerales.templateOptions) {
      const opcionesComponente = compDatosGenerales.templateOptions;
      aprobarPorDireccion = opcionesComponente.aprobarPorDireccion || false;
    }
    let indiceVia = null;
    _.findIndex(via, (item, indice) => {
      if (item == viaActual) {
        return indiceVia = indice + 1;
      }
      
    });
    
    if ((viaActual == via[via.length - 1]) && aprobarPorDireccion) {
      viaActual = (viaActual == datos.director)? para: datos.director;
    }
    else if (via.length == 0 && aprobarPorDireccion) {
      if (viaActual == datos.director) viaActual = para;
    }
    else if ((viaActual == datos.director) && aprobarPorDireccion) {
      viaActual = para;
    }
    else {
      viaActual = (indiceVia < via.length)? via[indiceVia]: para;
    }
    const datosActualizar = {
      via_actual: viaActual,
      estado: 'ENVIADO',
      _usuario_modificacion: datos.usuarioModificacion,
    };
    const condActualizar = {where: { id_documento: datos.idDocumento}};
    const datosHistorial= {
      id_documento: datos.idDocumento,
      accion: 'APROBADO',
      observacion: '',
      _usuario_creacion: datos.usuarioModificacion,
    };
    let datosActualizados = null;
    
    return documento.update(datosActualizar, condActualizar)
    .then(respActualizar => {
      datosActualizados = respActualizar;
      return modelos.historial_flujo.create(datosHistorial);
    })
    .then(() => {
      if(datosActualizados.estado == 'ENVIADO') {
        // console.log('REALIZAR NOTIFICACION');
        
      }
      else if (datosActualizados.estado== 'APROBADO') {
        // console.log('RETORNANDO OBJETO');
      }
    })
    .then(() => datosActualizados)
    .catch(error => {
      console.log('Error en la aprobacion de VIAS', error);
      return error;
      
    });
  },

  aprobarParaMultiple: (modelos, documento, datos, req) => {
    const datosPlantilla = JSON.parse(documento.plantilla_valor);
    const contactos = datosPlantilla['listaContactos-0'];
    const documentos = [];
    let listaContactos = [];
    if (!contactos || contactos.lista) listaContactos = contactos.lista;
    _.map(listaContactos, (item, index) => {
      const clon = JSON.parse(JSON.stringify(documento));
      const contacto = {
        contacto: item.id_contacto,
        lista: listaContactos,
      };
      const tempValor = JSON.parse(clon.plantilla_valor);
      tempValor['listaContactos-0'] = contacto;
      clon.plantilla_valor = JSON.stringify(tempValor);
      if (index > 0) clon.id_documento = null;
      console.log('[documentoBL] Revisando valores para no romper el flujo'.green, clon.grupo, clon.documento_padre );
      documentos.push(clon);
    });
    const contador = 0;
    return new Promise((resolve, reject) => {
      return module.exports.crearAprobarDocumentos(modelos, documentos, datos, req, contador)
      .then(resp => resolve())
      .catch(error => {
        console.log('Error en la creación y aprobación  de documentos', error);
        return reject(error);
      });
    });
  },

  crearAprobarDocumentos: (modelos, listaDocumentos, datos, req, indice) => {

    if(indice < listaDocumentos.length) {
      
      const item = listaDocumentos[indice];
      if (item.id_documento !== null && item.id_documento) {
        const datosTemp = JSON.parse(JSON.stringify(datos));
        let documentoBase;
        return modelos.documento.findByPk(item.id_documento)
        .then(respDoc => {
          datosTemp.id_documento = respDoc.id_documento;
          documentoBase = respDoc;
          return respDoc.update({plantilla_valor: item.plantilla_valor}, {where: {id_documento: item.id_documento}});
        }).
        then((r) => module.exports.aprobarPara(modelos, documentoBase, datosTemp, req))
        .then(() => {
          indice++;
          return module.exports.crearAprobarDocumentos(modelos, listaDocumentos, datos, req, indice);
        });
      }
      else {
        delete item.id_documento;
        delete item.grupo;
        return modelos.documento.create(item)
        .then(documentoResp => {
          const datosTemp = JSON.parse(JSON.stringify(datos));
          datosTemp.idDocumento = documentoResp.id_documento;
          datos.grupo = documentoResp.id_documento;
          return module.exports.aprobarPara(modelos, documentoResp, datos, req);
        })
        .then(() => {
          indice++
          return module.exports.crearAprobarDocumentos(modelos, listaDocumentos, datos, req, indice);
        });
      }
    }
    else {
      return new Promise(resolve => resolve());
    }
      
  },

  aprobarPara: (modelos, documento, datos, req) => {
    return new Promise((resolve, reject) => {

      const datosPlantilla = JSON.parse(documento.plantilla_valor);
      const fecha = moment().tz('America/La_Paz').format();
      const datosActualizar = {
        via_actual: datos.viaActual,
        _usuario_modificacion: datos.usuarioModificacion,
        estado: 'APROBADO',
        fecha,
      };
      let certificacion = {};
      let firmanteActual = null;
      if(datos.derivar == true) datosActualizar.observaciones = datos.observaciones;
      if (documento.multiple && documento.multiple != null && documento.multiple.length>5) {
        datosActualizar.grupo = documento.id_documento;
      }
      return module.exports.verificarPartidas(modelos.partida, datosPlantilla)
      .then(saldos => {
        certificacion = saldos;
        return module.exports.obtenerCrearCite(modelos, documento, datos.usuarioModificacion)
      })
      .then(citeResp => {
        datosActualizar.nombre = citeResp.cite;
        datosActualizar.plantilla_valor = JSON.stringify(citeResp.datosPlantilla);
        return module.exports.crearModificarPartidas(datos.usuarioModificacion, modelos.partida, citeResp.datosPlantilla, datos.tieneCite);
      })
      .then(partidasResp => {
        // TODO: Considerar la respuesta de la creación de partidas
        if (partidasResp) {
          partidasResp['certificacionComprometido-0'] = certificacion;
          datosActualizar.plantilla_valor = JSON.stringify(partidasResp);
        }
        // else {
        //   // // datosActualizar.plantilla_valor = documento.plantilla_valor;
        // }
        return module.exports.crearSolicitudAlmacen(modelos, datosActualizar, documento.id_documento);
      })
      .then(() => {
        console.log('[documentoBL] verificando si tiene el componente para ingreso de materiales');
        return module.exports.crearIngresoAlmacen(modelos, datosActualizar, documento.id_documento);
      })
      .then(() => {
        return module.exports.notificarEntregaAlmacen(modelos, datosActualizar, documento.id_documento);
      })
      .then(() => {
        console.log('[documentoBL] +++++++++++++++++++++++++++++++++++++++++++++++++++++++'.red);
        console.log('[documentoBL] +++++++++++++++++++++++++++++++++++++++++++++++++++++++'.red);
        console.log('[documentoBL] +++++++++++++++++++++++++++++++++++++++++++++++++++++++'.red);
        console.log('[documentoBL] +++++++++++++++++++++++++++++++++++++++++++++++++++++++'.yellow);
        console.log('[documentoBL] +++++++++++++++++++++++++++++++++++++++++++++++++++++++'.yellow);
        return module.exports.asignarActivo(modelos, datosActualizar, documento.id_documento);        
      })
      .then(() => {
        console.log('[documentoBL] +++++++++++++++++++++++++++++++++++++++++++++++++++++++'.white);
        console.log('[documentoBL] antes de actualizar', datosActualizar);
        return module.exports.actualizarDocumento(documento, datosActualizar, modelos.historial_flujo);
      })
      .then(actualizacionResp => {
        return module.exports.generarCodigo(modelos, actualizacionResp, datos.usuarioModificacion);
      })
      .then(codigoResp => {
        documento.codigo = codigoResp.codigo;
        
        const remitentes = JSON.parse(documento.de);
        if (Array.isArray(remitentes) && remitentes.length > 0 && documento.dataValues.firmaron === null) {
          firmanteActual = remitentes[0];
        }
        
        if(datos.derivar === true) {
          const datosDerivar = {
            estado: 'DERIVADO',
            via_actual: datos.usuarioDerivar,
            observaciones: datos.observaciones,
            _usuario_modificacion: datos.usuarioModificacion,
            firmante_actual: firmanteActual,
          };
          return module.exports.actualizarDocumento(documento, datosDerivar, modelos.historial_flujo)
          .then(() => {
            // TODO: registrar la visita en los logs de monitoreo
            const rmip = req.connection.remoteAddress;
            const miIp = rmip.substr(rmip.lastIndexOf(':') + 1, rmip.length);
            const log = {
              fid_usuario: datos.usuarioModificacion,
              fid_documento: documento.id_documento,
              cite: true,
              ip: [miIp],
            };
            return blm.registrarVisita(modelos, log);
          })
          .then(() => notificar.enviar(modelos, documento, 'derivado', {}))
          .then(() => notificar.enviar(modelos, documento, 'aprobado', {}));
        }

        return module.exports.cerrarDocumento(modelos, documento, datos.usuarioModificacion)
        // TODO: Falta el registro de la visita
        .then(() => notificar.enviar(modelos, documento, 'aprobado', {}));
      })
      .then(() => module.exports.anularDocumentos(modelos, documento, dirDocumento, datos.usuarioModificacion))
      .then(() => module.exports.obtenerCrearHash(documento, datos.auditUsuario))
      .then(hashResp => {
        return module.exports.actualizarFirmaHash(modelos, hashResp, documento, datos.usuarioModificacion)
      })
      .then(() => {
        return resolve();
      })
      .catch(error => {
        console.log('Error en la aprobacion para', error);
        // return error;
        return reject(error);  
      });
    });
    
  },

  obtenerCrearCite: (modelos, documento, idUsuario) => {
    const citeGuia = config.sistema.cite_principal;
    const plantilla = JSON.parse(documento.plantilla);
    const datosPlantilla = JSON.parse(documento.plantilla_valor);
    const fechaActual = moment().tz('America/La_Paz').format();
    let citeSinNumero = null;
    let tieneCite = false;
    return modelos.usuario.findOne({
      where: { id_usuario: documento._usuario_creacion },
      include: { model: modelos.unidad, as: 'unidad' },
    })
    .then(usuarioResp => {
      const compCite = _.find(plantilla, ['type', 'cite']);
      const esCiteGeneral = (compCite.templateOptions.tipo == 'general');
      const unidad = usuarioResp.unidad;
      if (!compCite.templateOptions.tipo) throw Error('La plantilla no cuenta con el control de "CITE"');
      if (!unidad) throw Error('El usuario que envió el documento no tiene unidad, solicite al administrador del sistema que le asigne su unidad');
      if (documento.fecha !== undefined && documento.fecha !== null) {
        tieneCite = true;
        return documento.nombre;
      }
      if (esCiteGeneral) return (`${citeGuia}/${documento.abreviacion}`);
      if (unidad) return `${citeGuia}-${unidad.abreviacion}/${documento.abreviacion}`;
    })
    .then(citeResp => {
      citeSinNumero = citeResp;
      return modelos.correlativo.findOne({
        where: {
          abreviacion: citeResp,
          anio: `${moment(fechaActual).year()}`,
        },
      });
    })
    .then(correlativoResp => {
      if(correlativoResp) return correlativoResp;
      return modelos.correlativo.create({
        abreviacion: citeSinNumero,
        anio: `${moment(fechaActual).year()}`,
        valor: 1,
        _usuario_creacion: idUsuario,
      });
    })
    .then(correlativoResp => {
      const cantCeros = config.sistema.cite_ceros - parseInt((`${correlativoResp.valor}`).length);
      let correlativoCeros = '';
      for(let i =0; i< cantCeros; i++) correlativoCeros += '0';
      correlativoCeros += correlativoResp.valor;
      datosPlantilla['cite-0'] = {
        cite: (tieneCite == true) ? citeSinNumero : `${citeSinNumero}/${correlativoCeros}/${correlativoResp.anio}`,
      };
      if (datosPlantilla['cite-0'].fecha == undefined) datosPlantilla['cite-0'].fecha = fechaActual;
      return correlativoResp.update({
        valor: correlativoResp.valor + 1,
        _usuario_modificacion: idUsuario,
      });
    })
    .then(correlativoAct => {
      const respuesta = {
        cite: datosPlantilla['cite-0'].cite,
        datosPlantilla,
      };
      if(tieneCite === true) respuesta.cite = citeSinNumero;
      return respuesta;
    })
    .catch(error => {
      console.log('revisando el error en la obtencion o generacion del cite'.yellow, error);
      
      return error;
    });

  },

  verificarObtenerMultipleX: (datos, tr) => {
    // partidasResp['certificacionComprometido-0'] = certificacion;
    const respuesta = {
      multiple: false,
      documentos: [],
    };
    return new Promise((resolve, reject) => {
      const plantillaValor = JSON.parse(datos.plantilla_valor);
      let listaContactos = plantillaValor['listaContactos-0'];
      if (plantillaValor['listaContactos-0']) {
        listaContactos = listaContactos.lista
      }
      else {
        respuesta.documentos.push(datos);
        return resolve(respuesta);
      }
      if(!listaContactos || listaContactos.length ==0) {
        listaContactos = plantillaValor['listaContactos-0'].lista;
        respuesta.documentos.push(datos);
        return resolve(respuesta);
      }
      respuesta.multiple = true;
      if (!datos.multiple || datos.multiple == null) {
        datos.multiple = Util.generarUiid();
      }
      _.map(listaContactos, (item) => {
        const clon = JSON.parse(JSON.stringify(datos));
        const contacto = {
          contacto: item.id_contacto,
          lista: listaContactos,
        };
        
        const tempValor = JSON.parse(clon.plantilla_valor);
        
        tempValor['listaContactos-0'] = contacto;
        // tempValor['listaContactos-0'] = JSON.stringify(contacto);
        // console.log('Revisando el tempValor', typeof tempValor);
        // tempValor['listaContactos-0'] = tempValor;
        clon.plantilla_valor= JSON.stringify(tempValor);
        respuesta.documentos.push(clon);
        // const tempValor = clon['listaContactos-0']
      });
      return resolve(respuesta);
    });
  },
  verificarObtenerMultiple: (datos, tr) => {
    const respuesta = {
      esMultiple: false,
    };
    return new Promise((resolve, reject) => {
      const plantillaValor = JSON.parse(datos.plantilla_valor);
      const listaContactos = plantillaValor['listaContactos-0'];
      if (listaContactos && Array.isArray(listaContactos.lista)) {
        respuesta.multiple = Util.generarUiid();
        respuesta.esMultiple = true;
      }
      return resolve(respuesta);
    });
  },

  crearMultiple: (modelos, datos, tr) => {
    const promesas = datos.documentos.map(item => {
      let xdoc;
      const model = JSON.parse(item.plantilla_valor);
      return modelos.documento.create(item, tr)
      .then(respDoc => {
        xdoc = respDoc;
        return module.exports.actualizarGrupo(item, respDoc, tr);
      })
      .then(() => {
        if(datos.sw.xenviar) {
          return module.exports.verificarPartidas(modelos.partida, model);
        }
        return;
      })
      .then(() => {
        if (datos.sw.xenviar && datos.sw.es_respuesta) {
          return module.exports.documento_crear(modelos.historial_flujo, xdoc.documento_padre, xdoc._usuario_creacion, tr);
        }
        return;
      })
      .then(() => {
        if (datos.sw.xenviar) {
          return module.exports.documento_enviar(modelos.historial_flujo, xdoc, tr, datos.director)
          // .then(() => t.commit())
          .finally(() => datos.notificar.enviar(modelos, xdoc, 'enviado', tr));
        }
      })
      .then(() => {
        // if (!datos.sw.xenviar) t.commit();
      });
    });

    return Promise.all(promesas)
    .then(respPromesas => {
      return Promise.resolve(respPromesas);
    })
    .catch(error => {
      return Promise.reject(error);
    });
  },

  obtenerDatosUsuario: (modelos, id) => {
    return modelos.usuario.findOne({
      attributes: ['id_usuario', 'nombres', 'apellidos', 'email', 'fid_unidad', 'numero_documento', 'cargo'],
      where: {
        id_usuario: id,
      },
      include: [{
        model: modelos.unidad,
        as : 'unidad',
        attributes: ['nombre'],
      }],
    });
  },

  crearSolicitudAlmacen: (modelos, datosActualizar, id) => {
    console.log('[crearSolicitudAlmacenBL] Iniciando', id);
    console.log('[crearSolicitudAlmacenBL] ================================================================='.red);
    console.log('[crearSolicitudAlmacenBL] datosActualizar'.yellow, datosActualizar);
    console.log('[crearSolicitudAlmacenBL] datosActualizar'.yellow, typeof datosActualizar.plantilla_valor, datosActualizar.plantilla_valor);
    return new Promise((resolve, reject) => {
      // TODO: Buscar todos los componentes consultaAlmacen
      
      // Obtiene los datos del solicitante
      const solicitante = {};
      const responsable = {};
      let componente = null;
      let cite = null;
      const datosPlantilla = JSON.parse(datosActualizar.plantilla_valor);
      // Obtiene los items solicitados
      let itemsSolicitados = [];
      for (const key in datosPlantilla) {
        if (key.indexOf('consultaAlmacen-') > -1) {
          itemsSolicitados = datosPlantilla[key].filas;
          componente = key;
        }
        if (key.indexOf('cite-') > -1) {
          cite = datosPlantilla[key].cite;
        }

        if (key.indexOf('datosGenerales-') > -1) {
          // TODO: Solicitudes grupales en el sistema de almacenes
          const datosGenerales = datosPlantilla[key];
          solicitante.id_usuario = datosGenerales.de[0].id_usuario;

          responsable.id_usuario = datosGenerales.para.id_usuario;
        }
      }

      if (componente == null) return resolve(datosActualizar);

      return module.exports.obtenerDatosUsuario(modelos, solicitante.id_usuario)
      .then(respUsuario => {
        if (!respUsuario || !respUsuario.dataValues.nombres ) {
          throw Error('Los datos del solicitante no son correctos');
        }
        if (!respUsuario || !respUsuario.unidad || !respUsuario.unidad.dataValues.nombre) {
          throw Error('El solicitante no pertenece a una unidad');
        }

        console.log('[crearSolicitudAlmacen] revisando datos solicitante', respUsuario.dataValues);
        solicitante.nombres = respUsuario.nombres;
        solicitante.apellidos = respUsuario.apellidos;
        solicitante.numero_documento = respUsuario.numero_documento;
        solicitante.cargo = respUsuario.cargo;
        solicitante.email = respUsuario.email;
        solicitante.unidad = respUsuario.unidad.dataValues.nombre;
        delete solicitante.id_usuario;
        return module.exports.obtenerDatosUsuario(modelos, responsable.id_usuario);
      })
      .then(respUsuario => {
        if (!respUsuario || !respUsuario.dataValues.nombres ) {
          throw Error('Los datos del solicitante no son correctos');
        }
        if (!respUsuario || !respUsuario.unidad || !respUsuario.unidad.dataValues.nombre) {
          throw Error('El responsable no pertenece a una unidad');
        }
        responsable.nombres = respUsuario.nombres;
        responsable.apellidos = respUsuario.apellidos;
        responsable.numero_documento = respUsuario.numero_documento;
        responsable.cargo = respUsuario.cargo;
        responsable.email = respUsuario.email;
        responsable.unidad = respUsuario.unidad.dataValues.nombre;
        delete responsable.id_usuario;
        
        return libAlmacen.crearSolicitud(solicitante, responsable, itemsSolicitados, id, cite);
      })
      .then(respCreacion => {
        console.log('[documentoBL] respuesta a la creacion', respCreacion);
        if (!respCreacion || !respCreacion.id) {
          throw Error(respCreacion.mensaje);
        }
        // TODO: Corregir los valores en la integracion con el servicio
        datosPlantilla[componente].solicitud = respCreacion.id
        // return resolve();
        datosActualizar.plantilla_valor = JSON.stringify(datosPlantilla);
        return resolve(datosActualizar);
      })
      .catch(error => {
        console.log('[documentoBL] error al crear la solicitud del almacen', error);
        return reject(error);
      });
    });
  },
  crearIngresoAlmacen: (modelos, datosActualizar, id) => {
    console.log('[crearIngresoAlmacenBL] Iniciando', id);
    return new Promise((resolve, reject) => {
      const datosIngresoEnviar = {
        reingreso: 0,
        responsable: {},
        cabecera: {},
        detalle: {
          items: [],
          descuento: "0.00",
          total: "",
        },
        id,
      };
      let idSolicitante = 0;
      let idResponsable = 0;

      const datosPlantilla = JSON.parse(datosActualizar.plantilla_valor);
      // Obtiene los items solicitados
      let datosIngreso = null;
      let componente = null;
      for (const key in datosPlantilla) {
        if (key.indexOf('ingresoAlmacen-') > -1) {
          datosIngreso = datosPlantilla[key];
          componente = key;
        }

        if (key.indexOf('datosGenerales-') > -1) {
          // TODO: Existen solicitudes grupales en el sistema de almacenes
          const datosGenerales = datosPlantilla[key];
          idResponsable = datosGenerales.de[0].id_usuario;
        }
      }

      if (componente == null) return resolve(datosActualizar);
      if (datosIngreso !== null) {
        datosIngresoEnviar.cabecera.proveedor = datosIngreso.proveedor.id;
        datosIngresoEnviar.cabecera.c31 = datosIngreso.c31;
        datosIngresoEnviar.cabecera.c31_fecha = datosIngreso.c31_fecha;
        datosIngresoEnviar.cabecera.nota_entrega_numero = datosIngreso.nota_entrega_numero;
        datosIngresoEnviar.cabecera.nota_entrega_fecha = datosIngreso.nota_entrega_fecha;
        datosIngresoEnviar.cabecera.factura_numero = datosIngreso.factura_numero;
        datosIngresoEnviar.cabecera.factura_autorizacion = datosIngreso.factura_autorizacion;
        datosIngresoEnviar.cabecera.factura_fecha = datosIngreso.factura_fecha;
        datosIngresoEnviar.detalle.items = datosIngreso.items;
        datosIngresoEnviar.detalle.descuento = datosIngreso.descuento;
        datosIngresoEnviar.detalle.subtotal = datosIngreso.subtotal;
        datosIngresoEnviar.detalle.total = datosIngreso.total;
        datosIngresoEnviar.reingreso = datosIngreso.reingreso == true || datosIngreso.reingreso == 'true' ? 1 : 0;
      }

      return module.exports.obtenerDatosUsuario(modelos, idResponsable)
      .then(respResponsable => {
        if (!respResponsable || !respResponsable.dataValues.nombres) {
          throw Error('Los datos del solicitante no son correctos');
        }
        if (!respResponsable || !respResponsable.unidad || !respResponsable.unidad.dataValues.nombre) {
          throw Error('El responsable no pertenece a una unidad');
        }
        datosIngresoEnviar.responsable.nombres = respResponsable.nombres;
        datosIngresoEnviar.responsable.apellidos = respResponsable.apellidos;
        datosIngresoEnviar.responsable.numero_documento = respResponsable.numero_documento;
        datosIngresoEnviar.responsable.email = respResponsable.email;
        datosIngresoEnviar.responsable.cargo = respResponsable.cargo;
        datosIngresoEnviar.responsable.unidad = respResponsable.unidad.dataValues.nombre;
        console.log('[crearIngresoAlmacenBL] Revisando los datos obtenidos', datosIngresoEnviar);
        return libAlmacen.crearIngreso(datosIngresoEnviar);
      })
      .then(respIngreso => {
        console.log('[documentoBL] respuesta a la creacion', respIngreso);
        if (!respIngreso || !respIngreso.id) {
          throw Error(respIngreso.mensaje);
        }
        datosPlantilla[componente].id_ingreso = respIngreso.id
        datosActualizar.plantilla_valor = JSON.stringify(datosPlantilla);
        return resolve(datosActualizar);
      })
      .catch(error => {
        console.log('[documentoBL] error al crear ingreso al almacen', error);
        return reject(error);
      });
    });

  },

  notificarEntregaAlmacen: (modelos, datosActualizar, id) => {
    console.log('Iniciando la notificacion al sistema de almacenes');
    return new Promise((resolve, reject) => {
      const datosNotificar = { };
      let componente = null;
      const datosPlantilla = JSON.parse(datosActualizar.plantilla_valor);
      for (const key in datosPlantilla) {
        if (key.indexOf('cite-') > -1) {
          datosNotificar.cite_ems = datosPlantilla[key].cite;
        }
        if (key.indexOf('recuperarEntregaAlmacen-') > -1) {
          componente = key;
          datosNotificar.cite_sms = datosPlantilla[key].cite_sms;
          datosNotificar.id = datosPlantilla[key].id_solicitud;
        }
      }
      
      if (componente == null) return resolve(datosActualizar);
      return libAlmacen.notificar(datosNotificar)
      .then(() => resolve())
      .catch(error => reject(error));
    });
  },

  asignarActivo: (modelos, datosActualizar, id) => {

    console.log('[asignarActivo] Iniciando la asignacion de activos');
    return new Promise((resolve, reject) => {
      const datosEnviar = {
        estado_usr_nuevo: false,
        solicitante: {},
        id_documento: id,

      };
      const idPersonas = {
        solicitante: null,
        admin: null,
      };
      
      const datosPlantilla = JSON.parse(datosActualizar.plantilla_valor);
      let componenteActivos = null;
      let componenteGenerales = null;
      for (const key in datosPlantilla) {
        if (key.indexOf('tablaActivos-') > -1) {
          const datosActivo = datosPlantilla[key]
          console.log('[asignarActivo] check data'.green, datosActivo );
          componenteActivos = datosActivo;
          // existeComponente = true;
          datosEnviar.asset_ids = _.map(datosActivo.filas, 'id');
          datosEnviar.estado_usr_nuevo = datosActivo.usuario_nuevo;
          idPersonas.solicitante = datosActivo.documentoDe.id_usuario;
          
        }
        if (key.indexOf('datosGenerales-') > -1) {
          const datosGenerales = datosPlantilla[key];
          componenteGenerales = datosGenerales;
          console.log('[asignarActivo] datos generales'.green, datosGenerales);
          idPersonas.admin = datosGenerales.de[0].id_usuario
        }
        if (key.indexOf('cite-') > -1) {
          datosEnviar.cite = datosPlantilla[key].cite;
          datosEnviar.fecha = datosPlantilla[key].fecha;
        }
      }
      console.log('[asignarActivo] Revisando los datos a enviar para la asignacion'.yellow, datosEnviar);

      // TODO: Si el usuario es nuevo obtener los datos
      if (componenteActivos === null ) return resolve();
      if (componenteActivos !== null && componenteActivos.tipoFormulario == 'SOLICITUD' ) return resolve();

      if (componenteActivos.tipoFormularioSeleccionado == 'DEVOLUCION') {
        idPersonas.admin = componenteGenerales.para.id_usuario;
        idPersonas.solicitante = componenteGenerales.de[0].id_usuario;
      }
      return modelos.usuario.findOne({
        attributes: ['id_usuario', 'numero_documento'],
        where: {
          id_usuario: idPersonas.admin,
        },
      })
      .then(respAdmin => {
        if (!respAdmin) return reject('Los datos del administrador de activos no son correctos');
        console.log('Revisando los datos del admin', respAdmin.dataValues);
        datosEnviar.admin_ci = respAdmin.numero_documento;
        return modelos.usuario.findOne({
          attributes: ['id_usuario', 'nombres', 'apellidos', 'numero_documento', 'cargo', 'email'],
          where: {id_usuario: idPersonas.solicitante },
          include: [
            {
              model: modelos.unidad,
              as: 'unidad',
            },
          ],
        });
      })
      .then(respSolicitante => {
        if (!respSolicitante) return reject('Los datos del solicitante no son correctos.');
        datosEnviar.user_ci = respSolicitante.numero_documento;
        datosEnviar.solicitante.numero_documento = respSolicitante.numero_documento;
        datosEnviar.solicitante.nombres = respSolicitante.nombres;
        datosEnviar.solicitante.apellidos = respSolicitante.apellidos,
        datosEnviar.solicitante.email = respSolicitante.email;
        datosEnviar.solicitante.cargo = respSolicitante.cargo;
        if (!respSolicitante.unidad) throw Error('El solicitante no pertenece a una unidad.')
        datosEnviar.solicitante.unidad = respSolicitante.unidad.dataValues.nombre;
        if (datosEnviar.estado_usr_nuevo == true) datosEnviar.user_ci = null;
        console.log('[asignarActivo] revisando data', datosEnviar);
        console.log('Alto!!!! '.red, componenteActivos);
        
        if (componenteActivos.tipoFormularioSeleccionado == 'ASIGNACION') return libActivos.asignar(datosEnviar);
        if (componenteActivos.tipoFormularioSeleccionado == 'DEVOLUCION') return libActivos.devolver(datosEnviar);
      })
      .then(resp => {
        console.log('Respuesta de activos', resp);
        return resolve()
      })
      .catch(error => {
        console.log('Error en activos', error);
        return reject(error);
      });
     
    });
  },
};
