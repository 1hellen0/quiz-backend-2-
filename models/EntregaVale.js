'use strict';

module.exports = (sequelize, DataTypes) => {
  const EntregaVale = sequelize.define('EntregaVale', {
    id_entrega: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_vale: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_usuario_entrega: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    fecha_entrega: {
      type: DataTypes.DATE,
      allowNull: false
    },
    observacion: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'EntregaVale',
    freezeTableName: true,
    timestamps: false
  });

  EntregaVale.associate = models => {
    EntregaVale.belongsTo(models.ValeSalida, {
      as: 'valeSalida',
      foreignKey: 'id_vale'
    });
    EntregaVale.belongsTo(models.Usuario, {
      as: 'usuarioEntrega',
      foreignKey: 'id_usuario_entrega'
    });
    EntregaVale.hasMany(models.DetalleEntregaVale, {
      as: 'detalles',
      foreignKey: 'id_entrega'
    });
  };

  return EntregaVale;
};
