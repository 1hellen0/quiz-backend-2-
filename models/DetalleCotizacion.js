'use strict';

module.exports = (sequelize, DataTypes) => {
  const DetalleCotizacion = sequelize.define('DetalleCotizacion', {
    id_detalle_cotizacion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_cotizacion: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_material: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    cantidad: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false
    },
    precio_unitario: {
      type: DataTypes.DECIMAL(16, 2),
      allowNull: false
    }
  }, {
    tableName: 'DetalleCotizacion',
    freezeTableName: true,
    timestamps: false,
    indexes: [{
      name: 'DetalleCotizacion_id_cotizacion_id_material_unique',
      unique: true,
      fields: ['id_cotizacion', 'id_material']
    }]
  });

  DetalleCotizacion.associate = models => {
    DetalleCotizacion.belongsTo(models.Cotizacion, {
      as: 'cotizacion',
      foreignKey: 'id_cotizacion'
    });
    DetalleCotizacion.belongsTo(models.Material, {
      as: 'material',
      foreignKey: 'id_material'
    });
  };

  return DetalleCotizacion;
};
