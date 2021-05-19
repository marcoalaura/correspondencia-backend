/**
 * Modelo para tabla de Documentos
 * @param {type} sequelize
 * @param {type} DataType
 * @returns historial_flujo
 */
module.exports = (sequelize, DataType) => {
    const historial_flujo = sequelize.define("historial_flujo", {
        id_historial_flujo: {
            type: DataType.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            xlabel: 'ID',
        },
        id_documento: {
            type: DataType.INTEGER,
            xlabel: 'ID_DOCUMENTO',
        },
        accion: {
            type: DataType.ENUM('ENVIADO', 'APROBADO','RECHAZADO','DERIVADO','CERRADO','CREADO','ELIMINADO', 'FIRMO'),
            xlabel: 'Accion',
        },
        observacion: {
            type: DataType.STRING,
            xlabel: 'Observación',
        },
        estado: {
            type: DataType.ENUM('INACTIVO', 'ACTIVO'),
            defaultValue: 'ACTIVO',
            xlabel: 'Estado',
        },
        _usuario_creacion: {
            type: DataType.INTEGER,
            allowNull: false,
            xlabel: 'Usuario de creación',
        },
        _usuario_modificacion: {
            type: DataType.INTEGER,
            xlabel: 'Usuario de modificación',
            allowNull: true,
        },
    },{
        createdAt: '_fecha_creacion',
        updatedAt: '_fecha_modificacion',
        freezeTableName: true,
        classMethods: {
          associate: (models) => {},
        },

    });

    return historial_flujo;
};
