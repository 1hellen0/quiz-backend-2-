'use strict';

module.exports = (sequelize, DataTypes) => {
  const ParametrosInventario = sequelize.define('ParametrosInventario', {
    id_parametros: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_material: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_ubicacion: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    stock_minimo: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false
    },
    stock_maximo: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false
    },
    demanda_diaria_promedio: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false
    },
    demanda_diaria_maxima: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false
    },
    tiempo_reposicion_dias: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'ParametrosInventario',
    freezeTableName: true,
    timestamps: false,
    indexes: [{
      name: 'ParametrosInventario_id_material_id_ubicacion_unique',
      unique: true,
      fields: ['id_material', 'id_ubicacion']
    }]
  });

  ParametrosInventario.associate = models => {
    ParametrosInventario.belongsTo(models.Material, {
      as: 'material',
      foreignKey: 'id_material'
    });
    ParametrosInventario.belongsTo(models.Ubicacion, {
      as: 'ubicacion',
      foreignKey: 'id_ubicacion'
    });
    ParametrosInventario.hasMany(models.HistorialParametrosInventario, {
      as: 'historialCambios',
      foreignKey: 'id_parametros'
    });
    ParametrosInventario.hasMany(models.AlertaReorden, {
      as: 'alertasReorden',
      foreignKey: 'id_parametros'
    });
  };

  return ParametrosInventario;
};
