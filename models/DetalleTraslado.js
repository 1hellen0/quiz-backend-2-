'use strict';

module.exports = (sequelize, DataTypes) => {
  const DetalleTraslado = sequelize.define('DetalleTraslado', {
    id_detalle_traslado: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_traslado: {
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
    tableName: 'DetalleTraslado',
    freezeTableName: true,
    timestamps: false,
    indexes: [{
      name: 'DetalleTraslado_id_traslado_id_material_unique',
      unique: true,
      fields: ['id_traslado', 'id_material']
    }]
  });

  DetalleTraslado.associate = models => {
    DetalleTraslado.belongsTo(models.Traslado, {
      as: 'traslado',
      foreignKey: 'id_traslado'
    });
    DetalleTraslado.belongsTo(models.Material, {
      as: 'material',
      foreignKey: 'id_material'
    });
    DetalleTraslado.hasMany(models.DetalleDespachoTraslado, {
      as: 'detallesDespacho',
      foreignKey: 'id_detalle_traslado'
    });
  };

  return DetalleTraslado;
};
