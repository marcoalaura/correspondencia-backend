/**
Archivo con los metodos necesarios para la asignacion de un administrador
introducido por parametro e inactivacion del administrador por defecto.
 */

const Promise = require('bluebird');
const {Client} = require('pg');
const config = require(`${__dirname}/src/config/config`)().database;

console.log('Revisnado el config obtenido', config);
const configDB = `${config.params.dialect}://${config.username}:${config.password}@${config.params.host}:${config.params.port}/${config.name}`;

const pgCliente = new Client(configDB);

pgCliente.connect();
const usuario = JSON.parse(process.env.npm_config_argv).remain[0];
const fecha = new Date();
const fechaEnviar = `${fecha.getFullYear()}-${fecha.getMonth()+1}-${fecha.getDate()}`;

// Inactiva al usuario admin por defecto.
ejecutarConsulta("UPDATE usuario SET estado = 'INACTIVO' WHERE usuario = 'admin';")

.then(() =>

  // Busca el identificador del usuario.
  ejecutarConsulta(`SELECT id_usuario from usuario where usuario ='${usuario}'`)
  .then(pRespuestaUsuario => {

    if(pRespuestaUsuario.length>0){
      // Valida si el usuario ya posee el rol.
      return ejecutarConsulta(`SELECT fid_usuario FROM usuario_rol WHERE fid_usuario=${pRespuestaUsuario[0].id_usuario} AND fid_rol=1;`)
      .then(pRespuestaRol => {
        // Si el usuario ya posee el rol administrador.
        if(pRespuestaRol.length>0){
          console.log(`El usuario ${usuario} ya cuenta con los privilegios de administrador.`);
          pgCliente.end();
        }
        // Si no posee el rol administrador.
        else{
          // Crea la relacion usuario-rol para otorgar rol administrador.
          return ejecutarConsulta(`INSERT INTO usuario_rol(fid_usuario, fid_rol, estado, _usuario_creacion, _fecha_creacion,_fecha_modificacion)
            VALUES (${pRespuestaUsuario[0].id_usuario}, 1, 'ACTIVO', 1,'${fechaEnviar}','${fechaEnviar}');`)
          .then(pRespuestaCrear => {
            console.log(`El usuario ${usuario}, ahora posee los privilegios de administrador.`);
            pgCliente.end();
          })
        }
      })
    }
    else {
      console.log(`El usuario ${usuario} no existe, verifique la informacion introducida.`);
      pgCliente.end();
    }
  })

)
.catch(pError => {
  console.log("Error al ejecutar la consulta", pError);
  pgCliente.end();
})

/**
 Funcion que ejecuta una promesa.
 @param {pConsulta} Texto Cadena que contiene la consulta a ejecutar.
 @return retorna una promesa.
 */
function  ejecutarConsulta(pConsulta){

  return new Promise((resolve,reject) => {
    pgCliente.query(pConsulta)
    .then(resp => {
      if(resp.command == 'UPDATE') (resp.rowCount ==1)? resolve(true):resolve(false);
      else if(resp.command == 'INSERT') (resp.rowCount ==1)?resolve(true):resolve(false);
      else resolve(resp.rows);
    })
    .catch(errorQuery => {
      console.log('Error en el query', errorQuery);
      resolve(false);
    });
  });
}
