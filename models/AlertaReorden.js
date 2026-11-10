'use strict';

module.exports = (sequelize, DataTypes) => {
  const AlertaReorden = sequelize.define('AlertaReorden', {
    id_alerta: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_parametros: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    estado: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    stock_detectado: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false
    },
    punto_reorden_detectado: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false
    },
    fecha_apertura: {
      type: DataTypes.DATE,
      allowNull: false
    },
    fecha_cierre: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'AlertaReorden',
    freezeTableName: true,
    timestamps: false
  });

  AlertaReorden.associate = models => {
    AlertaReorden.belongsTo(models.ParametrosInventario, {
      as: 'parametrosInventario',
      foreignKey: 'id_parametros'
    });
  };

  return AlertaReorden;
};
