'use strict';

module.exports = (sequelize, DataTypes) => {
  const DetalleVersionOrdenCompra = sequelize.define('DetalleVersionOrdenCompra', {
    id_detalle_version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_version: {
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
    tableName: 'DetalleVersionOrdenCompra',
    freezeTableName: true,
    timestamps: false,
    indexes: [{
      name: 'DetalleVersionOrdenCompra_id_version_id_material_unique',
      unique: true,
      fields: ['id_version', 'id_material']
    }]
  });

  DetalleVersionOrdenCompra.associate = models => {
    DetalleVersionOrdenCompra.belongsTo(models.VersionOrdenCompra, {
      as: 'versionOrdenCompra',
      foreignKey: 'id_version'
    });
    DetalleVersionOrdenCompra.belongsTo(models.Material, {
      as: 'material',
      foreignKey: 'id_material'
    });
    DetalleVersionOrdenCompra.hasMany(models.DetalleRecepcionCompra, {
      as: 'detallesRecepcionCompra',
      foreignKey: 'id_detalle_version'
    });
  };

  return DetalleVersionOrdenCompra;
};
