'use strict';

module.exports = (sequelize, DataTypes) => {
  const ValeSalida = sequelize.define('ValeSalida', {
    id_vale: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    codigo: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true
    },
    id_ubicacion: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_solicitante: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    fecha_solicitud: {
      type: DataTypes.DATE,
      allowNull: false
    },
    motivo: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    estado: {
      type: DataTypes.STRING(30),
      allowNull: false
    }
  }, {
    tableName: 'ValeSalida',
    freezeTableName: true,
    timestamps: false
  });

  ValeSalida.associate = models => {
    ValeSalida.belongsTo(models.Ubicacion, {
      as: 'ubicacion',
      foreignKey: 'id_ubicacion'
    });
    ValeSalida.belongsTo(models.Usuario, {
      as: 'solicitante',
      foreignKey: 'id_solicitante'
    });
    ValeSalida.hasMany(models.DetalleValeSalida, {
      as: 'detalles',
      foreignKey: 'id_vale'
    });
    ValeSalida.hasMany(models.EntregaVale, {
      as: 'entregas',
      foreignKey: 'id_vale'
    });
  };

  return ValeSalida;
};
