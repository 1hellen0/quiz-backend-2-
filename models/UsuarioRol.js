'use strict';

module.exports = (sequelize, DataTypes) => {
  const UsuarioRol = sequelize.define('UsuarioRol', {
    id_usuario_rol: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_rol: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'UsuarioRol',
    freezeTableName: true,
    timestamps: false,
    indexes: [{
      name: 'UsuarioRol_id_usuario_id_rol_unique',
      unique: true,
      fields: ['id_usuario', 'id_rol']
    }]
  });

  UsuarioRol.associate = models => {
    UsuarioRol.belongsTo(models.Usuario, {
      as: 'usuario',
      foreignKey: 'id_usuario'
    });
    UsuarioRol.belongsTo(models.Rol, {
      as: 'rol',
      foreignKey: 'id_rol'
    });
  };

  return UsuarioRol;
};
