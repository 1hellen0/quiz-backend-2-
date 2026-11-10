'use strict';

module.exports = (sequelize, DataTypes) => {
  const DetalleValeSalida = sequelize.define('DetalleValeSalida', {
    id_detalle_vale: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_vale: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_material: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    cantidad_solicitada: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false
    }
  }, {
    tableName: 'DetalleValeSalida',
    freezeTableName: true,
    timestamps: false,
    indexes: [{
      name: 'DetalleValeSalida_id_vale_id_material_unique',
      unique: true,
      fields: ['id_vale', 'id_material']
    }]
  });

  DetalleValeSalida.associate = models => {
    DetalleValeSalida.belongsTo(models.ValeSalida, {
      as: 'valeSalida',
      foreignKey: 'id_vale'
    });
    DetalleValeSalida.belongsTo(models.Material, {
      as: 'material',
      foreignKey: 'id_material'
    });
    DetalleValeSalida.hasMany(models.DetalleEntregaVale, {
      as: 'detallesEntrega',
      foreignKey: 'id_detalle_vale'
    });
  };

  return DetalleValeSalida;
};
