'use strict';

module.exports = (sequelize, DataTypes) => {
  const SolicitudCorreccionRecepcion = sequelize.define('SolicitudCorreccionRecepcion', {
    id_solicitud_correccion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_detalle_recepcion_compra: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_solicitante: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    cantidad_variacion: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false
    },
    motivo: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    estado: {
      type: DataTypes.STRING(25),
      allowNull: false
    },
    fecha_solicitud: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'SolicitudCorreccionRecepcion',
    freezeTableName: true,
    timestamps: false
  });

  SolicitudCorreccionRecepcion.associate = models => {
    SolicitudCorreccionRecepcion.belongsTo(models.DetalleRecepcionCompra, {
      as: 'detalleRecepcionCompra',
      foreignKey: 'id_detalle_recepcion_compra'
    });
    SolicitudCorreccionRecepcion.belongsTo(models.Usuario, {
      as: 'solicitante',
      foreignKey: 'id_solicitante'
    });
    SolicitudCorreccionRecepcion.hasOne(models.DecisionCorreccionRecepcion, {
      as: 'decision',
      foreignKey: 'id_solicitud_correccion'
    });
  };

  return SolicitudCorreccionRecepcion;
};
