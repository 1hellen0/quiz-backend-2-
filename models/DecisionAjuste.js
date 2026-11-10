'use strict';

module.exports = (sequelize, DataTypes) => {
  const DecisionAjuste = sequelize.define('DecisionAjuste', {
    id_decision_ajuste: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_solicitud_ajuste: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    id_administrador: {
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
    tableName: 'DecisionAjuste',
    freezeTableName: true,
    timestamps: false
  });

  DecisionAjuste.associate = models => {
    DecisionAjuste.belongsTo(models.SolicitudAjuste, {
      as: 'solicitud',
      foreignKey: 'id_solicitud_ajuste'
    });
    DecisionAjuste.belongsTo(models.Usuario, {
      as: 'administrador',
      foreignKey: 'id_administrador'
    });
    DecisionAjuste.hasOne(models.MovimientoInventario, {
      as: 'movimientoInventario',
      foreignKey: 'id_decision_ajuste'
    });
  };

  return DecisionAjuste;
};
