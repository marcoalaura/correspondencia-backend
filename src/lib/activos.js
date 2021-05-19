const _ = require('lodash');
const axios = require('axios');

const config = require('../config/config')();

module.exports = {
  consultar: (textoBuscar = '') => {
    console.log('[libActivos] consultar ...');

    return _buscar(textoBuscar, 'codigo')
      .then(resp1 => _buscar(textoBuscar, 'descripcion').then(resp2 => resp1.concat(resp2)))
      .catch(error => {
        console.log('[libActivos] Error al consultar en el Servicio de Activos: ', error);
        const errMsg = (error.response && error.response.data && error.response.data.mensaje) ? error.response.data.mensaje : `${error}`;
        throw new Error(errMsg);
      });
  },

  consultarPorUsuario: (ci = '') => {
    console.log('[libActivos] consultarPorUsuario ...');

    return new Promise((resolve, reject) => {
      const url = encodeURI(`${config.activos.url_consulta_por_usuario}/${ci}`);
      console.log('[libActivos] url = ', url);
      return axios({ method: 'get', url, headers: { 'Authorization': config.activos.token } })
        .then(resp => {
          if ((resp.status === 200 || resp.status === 202) && resp.data.finalizado) {
            return resolve(resp.data.data || []);
          }
          console.log('[libActivos] Error al consultar en el Servicio de Activos: ', resp.data);
          const errMsg = (resp.data && resp.data.mensaje) ? resp.data.mensaje : 'Error al consultar en el Servicio de Activos';
          return reject(errMsg);
        })
        .catch(error => {
          console.log('[libActivos] Error al consultar en el Servicio de Activos: ', error);
          const errMsg = (error.response && error.response.data && error.response.data.mensaje) ? error.response.data.mensaje : `${error}`;
          return reject(errMsg);
        });
    });
  },

  asignar: (data) => {
    console.log('[libActivos] asignar ....'.blue, data);

    return new Promise((resolve, reject) => {
      const url = encodeURI(config.activos.url_asignacion);
      console.log('[libActivos] url = '.blue, url);
      //  return axios({
      //    method: 'post',
      //    url,
      //    headers: {
      //      'Authorization': config.almacen.token,
      //    },
      //    data: datos,
      //  })
      return axios({ method: 'post', url, data, headers: { 'Authorization': config.activos.token } })
        .then(resp => {
          console.log('[libActivos] revisando respuesta'.blue, resp);
          if ((resp.status === 200 || resp.status === 202) && resp.data.finalizado) {
            return resolve();
            // return resolve(resp.data.pdf);
          }
          console.log('[libActivos] Error al consultar en el Servicio de Activos: ', resp.data);
          const errMsg = (resp.data && resp.data.mensaje) ? resp.data.mensaje : 'Error al consultar en el Servicio de Activos';
          return reject(new Error(errMsg));
        })
        .catch(error => {
          console.log('[libActivos] Error al consultar en el Servicio de Activos: ', error);
          const errMsg = (error.response && error.response.data && error.response.data.mensaje) ? error.response.data.mensaje : `${error}`;
          return reject(new Error(errMsg));
        });
    });
  },

  devolver: (data) => {
    console.log('[libActivos] devolver _________...'.yellow);

    return new Promise((resolve, reject) => {
      const url = encodeURI(config.activos.url_devolucion);
      console.log('[libActivos] url = ', url);
      return axios({ method: 'post', url, data, headers: { 'Authorization': config.activos.token } })
      .then(resp => {
        console.log('[libActivos] revisando la resp', resp)
        if ((resp.status === 200 || resp.status === 202) && resp.data.finalizado) {
          return resolve();
          // return resolve(resp.data.pdf);
        }
        console.log('[libActivos] Error al consultar en el Servicio de Activos: ', resp.data);
        const errMsg = (resp.data && resp.data.mensaje) ? resp.data.mensaje : 'Error al consultar en el Servicio de Activos';
        return reject(new Error(errMsg));
      })
      .catch(error => {
        console.log('[libActivos] Error al consultar en el Servicio de Activos: ', error);
        const errMsg = (error.response && error.response.data && error.response.data.mensaje) ? error.response.data.mensaje : `${error}`;
        return reject(new Error(errMsg));
      });
    });
  },
};

function _buscar(textoBuscar, campo = 'descripcion') {
  return new Promise((resolve, reject) => {
    const url = encodeURI(`${config.activos.url_consulta}?${campo}=${textoBuscar}`);

    console.log('[libActivos] url = ', url);
    return axios({ method: 'get', url, headers: { 'Authorization': config.activos.token } })
      .then(resp => {
        if ((resp.status === 200 || resp.status === 202) && resp.data.finalizado) {
          return resolve(resp.data.data || []);
        }
        console.log('[libActivos] Error al consultar en el Servicio de Activos: ', resp.data);
        const errMsg = (resp.data && resp.data.mensaje) ? resp.data.mensaje : 'Error al consultar en el Servicio de Activos';
        return reject(errMsg);
      })
      .catch(error => {
        console.log('[libActivos] Error al consultar en el Servicio de Activos: ', error);
        const errMsg = (error.response && error.response.data && error.response.data.mensaje) ? error.response.data.mensaje : `${error}`;
        return reject(errMsg);
      });
  });
}
