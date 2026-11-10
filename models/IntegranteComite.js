'use strict';

module.exports = (sequelize, DataTypes) => {
  const IntegranteComite = sequelize.define('IntegranteComite', {
    id_integrante: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_comite: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'IntegranteComite',
    freezeTableName: true,
    timestamps: false,
    indexes: [{
      name: 'IntegranteComite_id_comite_id_usuario_unique',
      unique: true,
      fields: ['id_comite', 'id_usuario']
    }]
  });

  IntegranteComite.associate = models => {
    IntegranteComite.belongsTo(models.ComiteAprobacion, {
      as: 'comite',
      foreignKey: 'id_comite'
    });
    IntegranteComite.belongsTo(models.Usuario, {
      as: 'usuario',
      foreignKey: 'id_usuario'
    });
    IntegranteComite.hasOne(models.VotoComite, {
      as: 'voto',
      foreignKey: 'id_integrante'
    });
  };

  return IntegranteComite;
};
