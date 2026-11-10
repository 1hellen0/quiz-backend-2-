'use strict';

module.exports = (sequelize, DataTypes) => {
  const DecisionAprobacionCompra = sequelize.define('DecisionAprobacionCompra', {
    id_decision_compra: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_aprobacion: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_rol: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    decision: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    motivo: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    fecha_decision: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'DecisionAprobacionCompra',
    freezeTableName: true,
    timestamps: false,
    indexes: [{
      name: 'DecisionAprobacionCompra_id_aprobacion_id_usuario_unique',
      unique: true,
      fields: ['id_aprobacion', 'id_usuario']
    }]
  });

  DecisionAprobacionCompra.associate = models => {
    DecisionAprobacionCompra.belongsTo(models.AprobacionCompra, {
      as: 'aprobacion',
      foreignKey: 'id_aprobacion'
    });
    DecisionAprobacionCompra.belongsTo(models.Usuario, {
      as: 'usuario',
      foreignKey: 'id_usuario'
    });
    DecisionAprobacionCompra.belongsTo(models.Rol, {
      as: 'rol',
      foreignKey: 'id_rol'
    });
  };

  return DecisionAprobacionCompra;
};
