'use strict';

module.exports = (sequelize, DataTypes) => {
  const ConfiguracionControlCompra = sequelize.define('ConfiguracionControlCompra', {
    id_configuracion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    dias_duplicado: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3
    },
    tolerancia_cantidad_porcentaje: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 10
    },
    dias_fraccionamiento: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 7
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    id_usuario_actualiza: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    fecha_actualizacion: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'ConfiguracionControlCompra',
    freezeTableName: true,
    timestamps: false
  });

  ConfiguracionControlCompra.associate = models => {
    ConfiguracionControlCompra.belongsTo(models.Usuario, {
      as: 'usuarioActualiza',
      foreignKey: 'id_usuario_actualiza'
    });
  };

  return ConfiguracionControlCompra;
};
