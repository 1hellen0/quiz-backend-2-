'use strict';

module.exports = (sequelize, DataTypes) => {
  const DetalleRecepcionTraslado = sequelize.define('DetalleRecepcionTraslado', {
    id_detalle_recepcion_traslado: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_recepcion_traslado: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_detalle_despacho: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    cantidad_recibida: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false
    }
  }, {
    tableName: 'DetalleRecepcionTraslado',
    freezeTableName: true,
    timestamps: false,
    indexes: [{
      name: 'DetalleRecepcionTraslado_id_recepcion_id_detalle_despacho_unique',
      unique: true,
      fields: ['id_recepcion_traslado', 'id_detalle_despacho']
    }]
  });

  DetalleRecepcionTraslado.associate = models => {
    DetalleRecepcionTraslado.belongsTo(models.RecepcionTraslado, {
      as: 'recepcion',
      foreignKey: 'id_recepcion_traslado'
    });
    DetalleRecepcionTraslado.belongsTo(models.DetalleDespachoTraslado, {
      as: 'detalleDespacho',
      foreignKey: 'id_detalle_despacho'
    });
    DetalleRecepcionTraslado.hasOne(models.MovimientoInventario, {
      as: 'movimientoInventario',
      foreignKey: 'id_detalle_recepcion_traslado'
    });
  };

  return DetalleRecepcionTraslado;
};
