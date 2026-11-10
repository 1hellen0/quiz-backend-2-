'use strict';

module.exports = (sequelize, DataTypes) => {
  const HistorialParametrosInventario = sequelize.define('HistorialParametrosInventario', {
    id_historial: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_parametros: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    fecha_cambio: {
      type: DataTypes.DATE,
      allowNull: false
    },
    valores_anteriores: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    valores_nuevos: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    motivo: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  }, {
    tableName: 'HistorialParametrosInventario',
    freezeTableName: true,
    timestamps: false
  });

  HistorialParametrosInventario.associate = models => {
    HistorialParametrosInventario.belongsTo(models.ParametrosInventario, {
      as: 'parametrosInventario',
      foreignKey: 'id_parametros'
    });
    HistorialParametrosInventario.belongsTo(models.Usuario, {
      as: 'usuario',
      foreignKey: 'id_usuario'
    });
  };

  return HistorialParametrosInventario;
};
