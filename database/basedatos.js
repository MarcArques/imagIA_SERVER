const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('imagia3', 'imagia3user', 'im@gia31234', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false,
});

const Usuari = sequelize.define('usuaris', {
  id: { 
    type: DataTypes.INTEGER, 
    autoIncrement: true, 
    primaryKey: true },

  nickname: {
    type: DataTypes.STRING,
    allowNull: false },

  telefon: { 
    type: DataTypes.STRING, 
    allowNull: false },

  email: { 
    type: DataTypes.STRING, 
    allowNull: false },

  rol: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    defaultValue: 'user' },

  password: { 
    type: DataTypes.STRING, 
    allowNull: false },

  apiToken: { 
    type: DataTypes.STRING, 
    allowNull: true },

  pla: { 
    type: DataTypes.STRING, 
    allowNull: true, 
    defaultValue: 'free' },

}, { timestamps: false });

const Peticio = sequelize.define('peticions', {
  id: { 
    type: DataTypes.INTEGER, 
    autoIncrement: true, 
    primaryKey: true },

  prompt: { 
    type: DataTypes.TEXT, 
    allowNull: false },

  imatges: { 
    type: DataTypes.STRING, 
    allowNull: false },

  model: { 
    type: DataTypes.STRING, 
    allowNull: false },

  usuariID: { 
    type: DataTypes.INTEGER, 
    allowNull: false, 
    references: { model: Usuari, key: 'id' } },
    
}, { timestamps: false });

const Log = sequelize.define('logs', {
    id: { 
      type: DataTypes.INTEGER, 
      autoIncrement: true, 
      primaryKey: true },

    tag: { 
      type: DataTypes.STRING, 
      allowNull: false }, 

    message: { 
      type: DataTypes.TEXT, 
      allowNull: false },

    timestamp: { 
      type: DataTypes.DATE, 
      allowNull: false, 
      defaultValue: Sequelize.NOW },

  }, {
    tableName: 'logs',
    timestamps: false,
  });

Usuari.hasMany(Peticio, { foreignKey: 'usuariID' });
Peticio.belongsTo(Usuari, { foreignKey: 'usuariID' });

module.exports = { sequelize, Usuari, Peticio, Log };
