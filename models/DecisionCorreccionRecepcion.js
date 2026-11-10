'use strict';

module.exports = (sequelize, DataTypes) => {
  const DecisionCorreccionRecepcion = sequelize.define('DecisionCorreccionRecepcion', {
    id_decision_correccion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_solicitud_correccion: {
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
    tableName: 'DecisionCorreccionRecepcion',
    freezeTableName: true,
    timestamps: false
  });

  DecisionCorreccionRecepcion.associate = models => {
    DecisionCorreccionRecepcion.belongsTo(models.SolicitudCorreccionRecepcion, {
      as: 'solicitudCorreccion',
      foreignKey: 'id_solicitud_correccion'
    });
    DecisionCorreccionRecepcion.belongsTo(models.Usuario, {
      as: 'administrador',
      foreignKey: 'id_administrador'
    });
    DecisionCorreccionRecepcion.hasOne(models.MovimientoInventario, {
      as: 'movimientoInventario',
      foreignKey: 'id_decision_correccion'
    });
  };

  return DecisionCorreccionRecepcion;
};
