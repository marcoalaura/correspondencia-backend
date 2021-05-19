const Issuer = require('openid-client').Issuer;
const crypto = require('crypto');
const url = require('url');
const jose = require('node-jose');
const jwt = require("jwt-simple");
const util = require('../../lib/util');
const bl = require('../../bl/seguridad/usuarioBL');
const Uuid = require('uuid');
const moment = require('moment');
const activeDirectory = require('activedirectory');
const _ = require('lodash');

module.exports = (app) => {
  const _app = app;

  // configuracion para authenticacion por base de datos
  // TODO: Realizar varios archivos de autenticación  para diferentes tecnoclogías OAUTH , OAUT2 que esté encapsulado en este archivo
  const usuarios = app.src.db.models.usuario;
  const UsuariosRoles = app.src.db.models.usuario_rol;
  const Roles = app.src.db.models.rol;
  const RolesMenus = app.src.db.models.rol_menu;
  const Menus = app.src.db.models.menu;
  const cfg = app.src.config.config;
  const Unidad = app.src.db.models.unidad;
  const AuthUser = app.src.db.models.auth_user;
  const ConfNotificacion = app.src.db.models.conf_notificacion;


  _app.controller = {};
  _app.controller.autorizacion = {};
  const autorizacionController = _app.controller.autorizacion;
  const usuarioController = _app.controller.usuario;

  // inicializamos parametros del proveedor de identidad
  // const issuer = new Issuer(app.src.config.config.issuer);
  const issuer = new Issuer({
    issuer: `${app.src.config.config.issuer}`,
    authorization_endpoint: `${app.src.config.config.issuer}/auth`,
    token_endpoint: `${app.src.config.config.issuer}/token`,
    revocation_endpoint: `${app.src.config.config.issuer}/revocation`,
    registration_endpoint: `${app.src.config.config.issuer}/reg`,
    userinfo_endpoint: `${app.src.config.config.issuer}/me`,
    introspection_endpoint: `${app.src.config.config.issuer}/token/introspection`,
    check_session_iframe: `${app.src.config.config.issuer}/session/check`,
    end_session_endpoint: `${app.src.config.config.issuer}/session/end`,
    jwks_uri: `${app.src.config.config.issuer}/certs`,
  });

  const keystore = jose.JWK.createKeyStore();

  // inicializamos datos de registro del cliente
  const cliente = new issuer.Client(app.src.config.config.client, keystore);
  cliente.CLOCK_TOLERANCE = 5;

  /**
   * El método permite obtener el state y nonce para iniciar el flujo oauth 2.0
   * @param {object} req
   * @param {object} res
   * @returns {JSON}
   */
  async function codigo(req, res) {
    console.log('----------------------------------getEstado----------------------------------');
    // parámetros necesarios para iniciar el flujo de autenticación
    const _state = crypto.randomBytes(16).toString('hex');
    const _nonce = crypto.randomBytes(16).toString('hex');

    const authorizationRequest = Object.assign({
      redirect_uri: app.src.config.config.client.redirect_uris[0],
      state: _state,
      nonce: _nonce,
    }, app.src.config.config.client_params);

    try {
      const authorizeUrl = cliente.authorizationUrl(authorizationRequest);

      // guardamos el state y nonce para posterior validación
      await app.dao.autorizacion.guardarState(_state, {
        nonce: _nonce,
      });
      res.status(200).json({
        finalizado: true,
        mensaje: '',
        datos: {
          url: authorizeUrl,
          codigo: _state,
        },
      });
    } catch (err) {
      res.status(412).json({
        finalizado: false,
        mensaje: err.message,
        datos: {},
      });
    }
  }

  /**
   * El método permite realizar el intercambio del code por el id_token y access_token
   * @param {object} req
   * @param {object} res
   * @returns {JSON}
   */
  async function autorizar(req, res) {
    console.log('----------------------------------callback-post----------------------------------');
    if (req.query.error) {
      res.status(412).json({
        finalizado: false,
        mensaje: req.query.error,
        datos: {},
      });
    } else {
      let postUrl = cliente.post_logout_redirect_uris[0];
      try {
        const parametros = cliente.callbackParams(req);
        if (!parametros.state) throw new Error('Parámetro state es requerido.');
        if (!parametros.code) throw new Error('Parámetro code es requerido.');
        const resultadoState = await app.dao.autorizacion.buscaState(parametros.state);

        if (resultadoState) {
          const respuestaCode = await cliente.authorizationCallback(cliente.redirect_uris[0], parametros, {
            nonce: resultadoState.parametros.nonce,
            state: resultadoState.state,
          });
          resultadoState.tokens = respuestaCode;
          const claims = await cliente.userinfo(respuestaCode);
          const id_token= respuestaCode.id_token;
          
          const _user = {
            nombre: claims.nombre.nombres,
            apellido: `${claims.nombre.primer_apellido} ${claims.nombre.segundo_apellido}`,
            email: claims.email,
            uid: claims.documento_identidad.numero_documento,
            cargo: 'Sin cargo',
            numero_documento: claims.documento_identidad.numero_documento,
          };

          postUrl = url.format(Object.assign(url.parse(issuer.end_session_endpoint), {
            search: null,
            query: {
              id_token_hint: id_token, 
              post_logout_redirect_uri: cliente.post_logout_redirect_uris[0],
            },
          }));

          const datosJwt = await obtenerJwt(claims.documento_identidad.numero_documento, _user);
          const data = util.formatearMensaje("EXITO","Acceso al sistema correcto",datosJwt.datosTemporal,datosJwt.token);
          resultadoState.id_usuario = datosJwt.datosTemporal.user.id;
          await app.dao.autorizacion.actualizarTokens(resultadoState);

          res.status(200).json(data);
        } else {
          console.log('---------------------------State NOT MATCH');
          res.status(412).json({
            finalizado: false,
            mensaje: 'El state no coincide',
            datos: postUrl,
          });
        }
      } catch (err) {
        console.log('--------------------error autorize ', err);
        res.status(412).json({
          finalizado: false,
          mensaje: err.message,
          datos: postUrl,
        });
      }
    }
  }

  /**
   * La función retorna la url para logout del proveedor de identidad
   * @param {object} req
   * @param {object} res
   * @returns {JSON}
   */
  async function salir(req, res) {

    try {
      // busqueda para obtener el id_token
      const resultadoTokens = await app.dao.autorizacion.buscaToken(req.body.audit_usuario.id_usuario.toString(), req.query.codigo); // validar requerid
      if (!resultadoTokens) {
        console.log('--------------------------------errpr');
      }

      // construcción de la url para la redirección
      const postUrl = url.format(Object.assign(url.parse(issuer.end_session_endpoint), {
        search: null,
        query: {
          id_token_hint: resultadoTokens.tokens.id_token,
          post_logout_redirect_uri: cliente.post_logout_redirect_uris[0],
        },
      }));
      res.status(200).json({
        finalizado: true,
        mensaje: '',
        datos: postUrl,
      });
    } catch (err) {
      res.status(412).json({
        finalizado: false,
        mensaje: err.message,
        datos: postUrl,
      });
    }
  }

  async function obtenerJwt(ci, user) {
    let menu, rol, usuario;
    let roles = [];
    const condicion = {
      numero_documento: ci,
    };
    try {
      const esValidoLdap = await validarConLdap(user);
      if(esValidoLdap.valido == false) throw new Error ('Usted no esta autorizado para ingresar al sistema.');
      let pUsuario = await usuarios.findOne({ where: condicion });      
      if (!pUsuario) {

        const pRespuesta = await bl.procesaUsuario(user, UsuariosRoles, Unidad, AuthUser, usuarios);
        const pConf = await ConfNotificacion.create({
          fid_usuario: pRespuesta.id_usuario,
          _usuario_creacion: pRespuesta.id_usuario,
        });
        pUsuario = pRespuesta;
      }
      // Verifica si el usuario existe y esta activo.
      usuario = pUsuario;
      if (pUsuario.estado !== 'ACTIVO')
        throw new Error("Este usuario esta inactivo.");
      else {
        const pRespuesta2 = await bl.obtenerRoles(UsuariosRoles, Roles, usuario.id_usuario);
        const pRespuestaMenu = await bl.obtenerMenus(RolesMenus, Menus, pRespuesta2);
        menu = pRespuestaMenu.menu;
        roles = pRespuestaMenu.rol;

        const cifrar = {
          id_usuario: usuario.id_usuario,
          usuario: usuario.usuario,
          secret: jwt.encode({
            fecha: moment().tz('America/La_Paz').add(cfg.tiempo_token, 'minutes').format(),
            clave: Uuid.v4(),
          }, cfg.jwtSecret),
          clave: Uuid.v4(),
          tiempo: cfg.tiempo_token,
          roles,
        }

        const usuarioEnviar = {
          id: usuario.id_usuario,
          username: usuario.usuario,
          first_name: usuario.nombres,
          last_name: usuario.apellidos,
          cargo: usuario.cargo,
          doc: usuario.numero_documento,
          email: usuario.email,
          date_joined: usuario._fecha_creacion,
          ldap: true,
        }

        const datosTemporal = {
          user: usuarioEnviar,
          menu: menu.menu,
          menuEntrar: menu.menuEntrar,
          roles,
        }
        const token = jwt.encode(cifrar, app.src.config.config.jwtSecret);
        const sesion = app.get("sesion");

        sesion[usuario.id_usuario] = {
          fecha: moment(moment().tz('America/La_Paz').format()).add(1, 'minutes'),
          backup: null,
          token,
        }
        return {datosTemporal, token};
      }

    } catch (e) {
      console.log('**************************** ', e)
      throw new Error(e);
    }
  }

  async function validarConLdap(user) {
    const respuesta = {
      valido: false,
      mensaje: 'Error en la contrastacion LDAP'
    };
    const configLdap = {
      url: cfg.ldap.server.url,
      baseDN: cfg.ldap.server.searchBase,
      bindDN: cfg.ldap.server.bindDn,
      bindCredentials: cfg.ldap.server.bindCredentials,
      attributes: {
        user: ['mail', 'givenName', 'sn', 'employeeNumber'],
      }
    };
    return new Promise((resolve, reject) => {
      try {
        const ad = new activeDirectory(configLdap);
        const query = `employeeNumber=${user.numero_documento}`;
        return ad.find(query, (error, respLdap) => {
          if (error) {
            respuesta.mensaje = 'El servicio de autenticacion única no responde.'
            respuesta.valido = false;
            return resolve(respuesta);
          };
          if (!respLdap) return resolve(respuesta);
          if (!respLdap.other || respLdap.other.length == 0) return resolve(respuesta);
          if (respLdap.other.length == 1) {
            respuesta.valido = true;
            respuesta.mensaje = 'Contrastacion de datos correcta';
          }
          if (respLdap.length > 1) {
            _.each(respLdap.other, usuario => {
              if (user.numero_documento == usuario.employeeNumber) {
                respuesta.mensaje = 'Contrastacion de datos correcta';
                respuesta.valido = true;
                return resolve(respuesta);
              }
            });

          }
          return resolve(respuesta);

        });
      } catch (e) {
        console.log('Error en la validacion LDAP', e);
        respuesta.mensaje = e;
        respuesta.valido = false;
        return resolve(respuesta);
      }
    });
  }
  
  autorizacionController.codigo = codigo;
  autorizacionController.autorizar = autorizar;
  autorizacionController.salir = salir;
};
