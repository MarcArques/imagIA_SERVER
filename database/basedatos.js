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

  telefon: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    unique: true },

  email: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    unique: true },

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

Usuari.hasMany(Peticio, { foreignKey: 'usuariID' });
Peticio.belongsTo(Usuari, { foreignKey: 'usuariID' });

module.exports = { sequelize, Usuari, Peticio };
