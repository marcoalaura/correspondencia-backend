const _ = require('lodash');

module.exports = {
  procesarFirmas: (usuarios, firmas) => {
    return new Promise((resolve,reject) => {
      try {
        const firmaUsada = [];
        const validas = usuarios.map(usuario => {
          const nombreUsuario = `${usuario.nombres} ${usuario.apellidos}`.toUpperCase();
          const buscado = _.findIndex(firmas, item => item.nombreComunSubject.toUpperCase() === nombreUsuario);
          const obj = {
            firmante: nombreUsuario,
            firmo: false,
            registradoSistema: true,
          };
          if (buscado > -1) {
            obj.revocado = !firmas[buscado].no_revocado;
            obj.fechaFirma = firmas[buscado].fechaFirma;
            obj.fechaFinValidez = firmas[buscado].finValidez;
            obj.firmo = true;
            firmaUsada.push(firmas[buscado]);
          } else {
            obj.revocado = null;
            obj.fechaFirma = null;
            obj.fechaFinValidez = null;
          }
          return obj;
        });
  
        const firmaNoUsada = _.differenceWith(firmas, firmaUsada, _.isEqual);
        const noValidas = firmaNoUsada.map(firma => ({
          firmante: firma.nombreComunSubject.toUpperCase(),
          firmo: true,
          registradoSistema: false,
          revocado: !firma.no_revocado,
          fechaFirma: firma.fechaFirma,
          fechaFinValidez: firma.finValidez,
        }));
        let respuesta = validas.concat(noValidas);
        respuesta = _.orderBy(respuesta, 'fechaFirma', 'desc')
        return resolve(respuesta);
      } catch (error) {
        console.log('Revisando el error al filtrar las firmas',error);
        
        return reject(error);
      }
    });
  },
};