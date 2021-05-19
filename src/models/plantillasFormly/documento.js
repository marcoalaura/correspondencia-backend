/**
 * Modelo para tabla de Documentos
 * @param {type} sequelize
 * @param {type} DataType
 * @returns documento
 */
module.exports = (sequelize, DataType) => {
    const documento = sequelize.define("documento", {
        id_documento: {
            type: DataType.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            xlabel: 'ID',
        },
        nombre: {
            type: DataType.STRING,
            allowNull: false,
            xlabel: 'Nombre',
        },
        plantilla: {
            type: DataType.TEXT,
            allowNull: false,
            xlabel: 'Plantilla',
        },
        plantilla_valor: {
            type: DataType.TEXT,
            allowNull: false,
            xlabel: 'Valores',
        },
        nombre_plantilla: {
            type: DataType.TEXT,
            allowNull: true,
            xlabel: 'Tipo de documento',
        },
        abreviacion: {
            type: DataType.STRING,
            allowNull: true,
            xlabel: 'Abreviación',
        },
        de: {
            type: DataType.TEXT,
            allowNull: true,
            xlabel: 'De:',
        },
        para: {
            type: DataType.TEXT,
            allowNull: true,
            xlabel: 'Para:',
        },
        via: {
            type: DataType.TEXT,
            allowNull: true,
            xlabel: 'Via',
        },
        via_actual: {
            type: DataType.INTEGER,
            allowNull: true,
            xlabel: 'Via',
        },
        firmado: {
          type: DataType.BOOLEAN,
          xlabel: 'Firmado',
          defaultValue: false,
        },
        firmante_actual: {
          type: DataType.INTEGER,
          xlabel: 'firmante actual',
        },
        firmaron: {
          type: DataType.ARRAY(DataType.INTEGER),
          xlabel: 'Firmaron',
        },
        referencia: {
            type: DataType.TEXT,
            allowNull: true,
            xlabel: 'Ref.:',
        },
        fecha: {
            type: DataType.DATE,
            allowNull: true,
            xlabel: 'Fecha',
        },
        observaciones: {
            type: DataType.TEXT,
            allowNull: true,
            xlabel: 'Observaciones',
        },
        impreso: {
            type: DataType.ENUM('SI', 'NO'),
            allowNull: true,
            defaultValue: 'NO',
            xlabel: 'Impreso',
        },
        anulado: {
            type: DataType.BOOLEAN,
            defaultValue: false,
            xlabel: 'Anulado',
        },
        documento_padre: {
            type: DataType.INTEGER,
            xlabel: 'Derivado de',
        },
        grupo: {
            type: DataType.INTEGER,
            xlabel: 'Grupo',
        },
        multiple: {
            type: DataType.TEXT,
            xlabel: 'Código multiple',
        },
        estado: {
            type: DataType.ENUM('NUEVO', 'ENVIADO', 'APROBADO', 'RECHAZADO','DERIVADO','CERRADO','ELIMINADO'),
            defaultValue: 'NUEVO',
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
        },
    },{
        createdAt: '_fecha_creacion',
        updatedAt: '_fecha_modificacion',
        freezeTableName: true,
        classMethods: {

        },
    });

    documento.associate = (models) => {
        documento.hasOne(models.firma, {as:'firma', foreignKey:'fid_documento'});
    };
    return documento;
};
