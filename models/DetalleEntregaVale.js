'use strict';

module.exports = (sequelize, DataTypes) => {
  const DetalleEntregaVale = sequelize.define('DetalleEntregaVale', {
    id_detalle_entrega: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_entrega: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_detalle_vale: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    cantidad_entregada: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false
    }
  }, {
    tableName: 'DetalleEntregaVale',
    freezeTableName: true,
    timestamps: false,
    indexes: [{
      name: 'DetalleEntregaVale_id_entrega_id_detalle_vale_unique',
      unique: true,
      fields: ['id_entrega', 'id_detalle_vale']
    }]
  });

  DetalleEntregaVale.associate = models => {
    DetalleEntregaVale.belongsTo(models.EntregaVale, {
      as: 'entregaVale',
      foreignKey: 'id_entrega'
    });
    DetalleEntregaVale.belongsTo(models.DetalleValeSalida, {
      as: 'detalleValeSalida',
      foreignKey: 'id_detalle_vale'
    });
    DetalleEntregaVale.hasOne(models.MovimientoInventario, {
      as: 'movimientoInventario',
      foreignKey: 'id_detalle_entrega_vale'
    });
  };

  return DetalleEntregaVale;
};
