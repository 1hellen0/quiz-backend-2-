'use strict';

module.exports = (sequelize, DataTypes) => {
  const Material = sequelize.define('Material', {
    id_material: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    codigo: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true
    },
    nombre: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    unidad_medida: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'Material',
    freezeTableName: true,
    timestamps: false
  });

  Material.associate = models => {
    Material.hasMany(models.ParametrosInventario, {
      as: 'parametrosInventario',
      foreignKey: 'id_material'
    });
    Material.hasMany(models.DetalleValeSalida, {
      as: 'detallesValesSalida',
      foreignKey: 'id_material'
    });
    Material.hasMany(models.DetalleTraslado, {
      as: 'detallesTraslado',
      foreignKey: 'id_material'
    });
    Material.hasMany(models.SolicitudAjuste, {
      as: 'solicitudesAjuste',
      foreignKey: 'id_material'
    });
    Material.hasMany(models.DetalleVersionOrdenCompra, {
      as: 'detallesVersionesOrdenCompra',
      foreignKey: 'id_material'
    });
    Material.hasMany(models.DetalleCotizacion, {
      as: 'detallesCotizacion',
      foreignKey: 'id_material'
    });
    Material.hasMany(models.MovimientoInventario, {
      as: 'movimientosInventario',
      foreignKey: 'id_material'
    });
  };

  return Material;
};
