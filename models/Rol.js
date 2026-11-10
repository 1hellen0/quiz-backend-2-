'use strict';

module.exports = (sequelize, DataTypes) => {
  const Rol = sequelize.define('Rol', {
    id_rol: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    nombre: {
      type: DataTypes.STRING(70),
      allowNull: false,
      unique: true
    }
  }, {
    tableName: 'Rol',
    freezeTableName: true,
    timestamps: false
  });

  Rol.associate = models => {
    Rol.hasMany(models.UsuarioRol, {
      as: 'asignacionesUsuario',
      foreignKey: 'id_rol'
    });
    Rol.belongsToMany(models.Usuario, {
      as: 'usuarios',
      through: models.UsuarioRol,
      foreignKey: 'id_rol',
      otherKey: 'id_usuario'
    });
    Rol.hasMany(models.DecisionAprobacionCompra, {
      as: 'decisionesAprobacionCompra',
      foreignKey: 'id_rol'
    });
  };

  return Rol;
};
