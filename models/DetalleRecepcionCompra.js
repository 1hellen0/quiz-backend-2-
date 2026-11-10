'use strict';

module.exports = (sequelize, DataTypes) => {
  const DetalleRecepcionCompra = sequelize.define('DetalleRecepcionCompra', {
    id_detalle_recepcion_compra: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_recepcion_compra: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_detalle_version: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    cantidad_entregada: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false
    },
    cantidad_aceptada: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false
    },
    cantidad_rechazada: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false
    }
  }, {
    tableName: 'DetalleRecepcionCompra',
    freezeTableName: true,
    timestamps: false,
    indexes: [{
      name: 'DetalleRecepcionCompra_id_recepcion_id_detalle_version_unique',
      unique: true,
      fields: ['id_recepcion_compra', 'id_detalle_version']
    }]
  });

  DetalleRecepcionCompra.associate = models => {
    DetalleRecepcionCompra.belongsTo(models.RecepcionCompra, {
      as: 'recepcionCompra',
      foreignKey: 'id_recepcion_compra'
    });
    DetalleRecepcionCompra.belongsTo(models.DetalleVersionOrdenCompra, {
      as: 'detalleVersionOrdenCompra',
      foreignKey: 'id_detalle_version'
    });
    DetalleRecepcionCompra.hasMany(models.SolicitudCorreccionRecepcion, {
      as: 'solicitudesCorreccion',
      foreignKey: 'id_detalle_recepcion_compra'
    });
    DetalleRecepcionCompra.hasOne(models.MovimientoInventario, {
      as: 'movimientoInventario',
      foreignKey: 'id_detalle_recepcion_compra'
    });
  };

  return DetalleRecepcionCompra;
};
