// Importar Sequelize
const { Sequelize, DataTypes } = require('sequelize');

// Connexió a la base de dades MySQL
const sequelize = new Sequelize('imagia3', 'imagia3user', 'im@gia31234', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false, // Desactiva el logging SQL si no ho necessites
});

// Model 'usuaris' amb el camp 'rol' per a usuari
const Usuari = sequelize.define('Usuari', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  telefon: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  nickname: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  rol: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'user', 
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  }
}, {
  tableName: 'usuaris',
  freezeTableName: true,
  timestamps: false,
});

// Model 'peticions' amb la clau forana 'usuariId'
const Peticio = sequelize.define('Peticio', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true, // Defineix l'ID com a clau primària
  },
  prompt: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  imatges: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  model: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  usuariId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Usuari, 
      key: 'id', 
    },
  },
}, {
  tableName: 'peticions',
  freezeTableName: true,
  timestamps: false,
});

// Relación entre 'Usuari' y 'Peticio' (un usuari pot tenir moltes peticions)
Usuari.hasMany(Peticio, { foreignKey: 'usuariId' }); 
Peticio.belongsTo(Usuari, { foreignKey: 'usuariId' }); 

// Funció per sincronitzar les taules i crear l'usuari admin
async function syncDatabase() {
  try {
    // Verificar connexió
    await sequelize.authenticate();
    console.log('Connexió a la base de dades establerta amb èxit.');

    // Sincronitzar models i recrear les taules (elimina les dades existents)
    await sequelize.sync({ force: true });
    console.log('Models sincronitzats amb èxit.');

    // Crear l'usuari admin amb la contrasenya 1234
    const adminUser = await Usuari.create({
      telefon: '000000000',
      nickname: 'admin',
      email: 'admin@admin.com',
      rol: 'admin',
      password: '1234',
    });

    console.log('Usuari admin creat amb èxit:', adminUser.nickname);

    // Crear una petició per aquest usuari admin
    const peticio = await Peticio.create({
      prompt: 'Imagen paisaje',
      imatges: 'image1.jpg',
      model: 'Model1',
      usuariId: adminUser.id, 
    });

    console.log('Petició creat amb èxit:', peticio.id);
  } catch (error) {
    console.error('Error en la connexió o sincronització de la base de dades:', error);
  } finally {
    await sequelize.close();
  }
}

// Executar la sincronització de les taules i creació de l'usuari admin
syncDatabase();
