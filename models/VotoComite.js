'use strict';

module.exports = (sequelize, DataTypes) => {
  const VotoComite = sequelize.define('VotoComite', {
    id_voto: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_integrante: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    voto: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    comentario: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    fecha_voto: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'VotoComite',
    freezeTableName: true,
    timestamps: false
  });

  VotoComite.associate = models => {
    VotoComite.belongsTo(models.IntegranteComite, {
      as: 'integrante',
      foreignKey: 'id_integrante'
    });
  };

  return VotoComite;
};
