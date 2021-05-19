const params = require('./config.json');
const logger = require('../lib/logger');

module.exports = () => {
  let env = process.env.NODE_ENV;

  if (!env) {
    env = 'development';
  }

  if (!params.hasOwnProperty(env)) {
    env = 'development';
  }
  const config = {
    database: {
      name: process.env.DB_NOMBRE || params[env].database,
      username: process.env.DB_USUARIO || params[env].username,
      password: process.env.DB_PASSWORD || params[env].password,
      timezone: process.env.TZ || '-04:00',
      lang: process.env.DB_LANGUAGE || 'es',
      params: {
        dialect: params[env].dialect || 'postgres',
        port: process.env.DB_PUERTO || params[env].port,
        host: process.env.DB_HOST || params[env].host,
        sync: {
          force: process.env.FORCE || false,
        },
        logging: (sql) => {
          if (env === 'development') {
            // logger.log('info', `[${new Date()}] ${sql}`);
          }
        },
        define: {
          freezeTableName: true,
        },
      },
    },
    ruta_externos: process.env.RUTA_ARCHIVOS_EXTERNOS || "./public/externos", // ".public/externos"
    ruta_documentos: process.env.RUTA_DOCUMENTOS || "./public/documentos/",
    host: process.env.HOST_BACKEND || 'localhost:8001', // Host backend sobre dominio
    front: process.env.HOST_FRONTEND || 'localhost:3000', // Host frontend sobre dominio
    urlVerificar: process.env.URL_VERIFICACION || 'https://mi.dominio.net/verificar',
    prefijo: 1, // Prefijo en los documentos para su verificación
    tiempo_token: process.env.TIEMPO_TOKEN || 60, // Tiempo en minutos, tiempo de vida del token.
    validacion: {},
    sistema: {
      // remover el [], dejar solamente el numero identificador.
      director: process.env.IDENTIFICADOR_DIRECTOR || 1, // id_usuario del usuario con cargo de MAE
      direccion: process.env.IDENTIFICADOR_DIRECTOR_UNIDAD || 1, // id_unidad de la unidad Dirección General Ejecutiva
      cite_ceros: process.env.CITE_DIGITOS || 5, // Cantidad de digitos que posee el cite.
      cite_principal: process.env.CITE_GUIA || 'PLANTILLAS', // Descripción guia del cite, miCiteGuia/IT/0001/2020
    },
    correo: {
      port: process.env.CORREO_PUERTO || 25, // 25
      host: process.env.CORREO_HOST || 'localhost', // localhost
      remitente: process.env.CORREO_REMITENTE || 'Sistema de plantillas', // Sistema de ...
      origen: process.env.CORREO_ORIGEN || 'plantillas@entidad.net', // example@abc.de
      secure: process.env.CORREO_SECURE || false,
      ignoreTLS: process.env.CORREO_IGNORETLS || false,
      tls: {
        rejectUnauthorized: process.env.CORREO_TLS_RECHAZAR || false,
      },
    },
    notificacion: {
      sms_url: process.env.NOTIFICACION_SMS_URL || 'http://localhost/miApiSms',
      sms_token: process.env.NOTIFICACION_SMS_TOKEN || '[miTokenSms]',
      correo_url: process.env.NOTIFICACION_CORREO_URL || 'http://localhost/miApiCorreo',
      correo_token: process.env.NOTIFICACION_CORREO_TOKEN || '[miTokenCorreo]',
    },
    ldap: {
      server: {
        url: process.env.LDAP_URL || 'ldaps://ldap.example.abc:123',
        bindDn: process.env.LDAP_BIND_DN || 'uid=usuarioLDAP...',
        bindCredentials: process.env.LDAP_BIND_PASSWORD || 'pwdLDAP',
        searchBase: process.env.LDAP_SEARCHBASE || 'ou=usuarios...',
        searchFilter: process.env.LDAP_SEARCHFILTER || '(uid={{username}})',
      },
    },
    // configuracion con jwt poner una palabra secreta segura
    jwtSecret: process.env.JWT_SECRET || 'AGETIC-2020', //Se recomienda una llave alfanumerica generada min de 20 caracteres
    jwtSession: {
      session: process.env.JWT_SESSION || false,
    },
    puerto: process.env.BACKEND_PUERTO || 8001, // Puerto donde se expone el api
    almacen: {
      url_estado: process.env.ALMACEN_ESTADO || 'http://localhost:3000/',
      url_consulta: process.env.ALMACEN_CONSULTA || 'http://localhost:3000/api/v2/almacenes/articulos',
      url_crear_solicitud: process.env.ALMACEN_CREAR_SOLICITUD || 'http://localhost:3000/api/v2/almacenes/solicitud',
      url_recuperar: process.env.ALMACEN_RECUPERAR || 'http://localhost:3000/api/v2/almacenes/solicitud',
      url_notificar: process.env.ALMACEN_NOTIFICAR || 'http://localhost:3000/api/v2/almacenes/solicitud',
      url_proveedor: process.env.ALMACEN_PROVEEDOR || 'http://localhost:3000/api/v2/almacenes/proveedores',
      url_ingreso: process.env.ALMACEN_INGRESO || 'http://localhost:3000/api/v2/almacenes/ingreso',
      token: process.env.ALMACEN_TOKEN || 'Bearer TOKEN_ACCESSO',
    },
    activos: {
      url_estado: process.env.ACTIVOS_ESTADO || 'http://localhost:3000/',
      url_consulta: process.env.ACTIVOS_CONSULTA || 'http://localhost:3000/api/v2/activos/buscar',
      url_asignacion: process.env.ACTIVOS_ASIGNACION || 'http://localhost:3000/api/v2/activos/asignacion',
      url_devolucion: process.env.ACTIVOS_DEVOLUCION || 'http://localhost:3000/api/v2/activos/devolucion',
      url_consulta_por_usuario: process.env.ACTIVOS_CONSULTA_POR_USUARIO || 'http://localhost:3000/api/v2/activos/usuario',
      token: process.env.ACTIVOS_TOKEN || 'Bearer TOKEN_ACCESO',
    },
    // Configuracion de cliente, para ciudadania digital
    issuer: process.env.ISSUER || 'https://account-idetest.agetic.gob.bo/',
    client: {
      "application_type": "web",
      "grant_types": [
        "authorization_code",
        "refresh_token"
      ],
      "id_token_signed_response_alg": "RS256",
      "require_auth_time": true,
      "response_types": [
        "code"
      ],
      "subject_type": "public",
      "token_endpoint_auth_method": "client_secret_basic",
      "introspection_signed_response_alg": "RS256",
      "post_logout_redirect_uris": [
        "http://localhost:3000/logout"
      ],
      "backchannel_logout_session_required": false,
      "frontchannel_logout_session_required": false,
      "authorization_signed_response_alg": "RS256",
      "web_message_uris": [],
      "client_id_issued_at": process.env.CLIENT_ISSUED || 1578685914,
      "client_id": process.env.CLIENT_ID || "144089dc-cb78-4208-85ed-dd86a40266f2",
      "client_name": process.env.CLIENT_NAME || "cliente_plantillas",
      "client_secret_expires_at": 0,
      "client_secret": process.env.CLIENT_SECRET || "hGZYkvSzOH/GOJGZTZ4mr7g+DGyW8gT8urbXcFJqo2hvHv429gU/9uy1X/ACW9Nm",
      "contacts": [
        process.env.CLIENT_CONTACT || "usuario@correo.com",
      ],
      "logo_uri": "http://localhost:3000/logo",
      "redirect_uris": [
        "http://localhost:3000/login"
      ],
      "introspection_endpoint_auth_method": "client_secret_basic",
      "revocation_endpoint_auth_method": "client_secret_basic",
      "registration_client_uri": "https://account-idetest.agetic.gob.bo/reg/144089dc-cb78-4208-85ed-dd86a40266f2",
      "registration_access_token": "aUDfqj5AYWHoTL0fj~QoOLYjWn~xIPkLzB0DHcOI5yU"
    },
    client_params: {
      scope: ['openid documento_identidad nombre email'],
      // prompt: 'consent',
    },
  };

  return config;
};
