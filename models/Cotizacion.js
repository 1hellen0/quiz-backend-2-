'use strict';

module.exports = (sequelize, DataTypes) => {
  const Cotizacion = sequelize.define('Cotizacion', {
    id_cotizacion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_version: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_proveedor: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    codigo: {
      type: DataTypes.STRING(60),
      allowNull: true
    },
    fecha_cotizacion: {
      type: DataTypes.DATE,
      allowNull: false
    },
    vigencia_hasta: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    monto_total: {
      type: DataTypes.DECIMAL(16, 2),
      allowNull: false
    }
  }, {
    tableName: 'Cotizacion',
    freezeTableName: true,
    timestamps: false,
    indexes: [{
      name: 'Cotizacion_id_version_id_proveedor_unique',
      unique: true,
      fields: ['id_version', 'id_proveedor']
    }]
  });

  Cotizacion.associate = models => {
    Cotizacion.belongsTo(models.VersionOrdenCompra, {
      as: 'versionOrdenCompra',
      foreignKey: 'id_version'
    });
    Cotizacion.belongsTo(models.Proveedor, {
      as: 'proveedor',
      foreignKey: 'id_proveedor'
    });
    Cotizacion.hasMany(models.DetalleCotizacion, {
      as: 'detalles',
      foreignKey: 'id_cotizacion'
    });
    Cotizacion.hasMany(models.VersionOrdenCompra, {
      as: 'versionesQueLaEligen',
      foreignKey: 'id_cotizacion_elegida'
    });
  };

  return Cotizacion;
};
