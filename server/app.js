require('dotenv').config(); 
const axios = require('axios');
const express = require('express');
const { Usuari, sequelize, Log } = require('../database/basedatos');
const app = express();
const crypto = require('crypto');
const { Op } = require("sequelize");
const bcrypt = require('bcrypt');
app.use(express.json());

const PORT = process.env.PORT || 3000;
const DEFAULT_FREE_QUOTA = 20;
const DEFAULT_PREMIUM_QUOTA = 40; 
(async () => {
  try {
    await sequelize.authenticate();
    console.log('Conectado a MySQL correctamente.');
  } catch (error) {
    console.error('Error de conexión a la base de datos:', error);
  }
})();

//Función para generar un token seguro de 64 caracteres.
function generarApiToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Función para generar un código de validación de 6 dígitos
function generarCodigoValidacion() {
  return Math.floor(100000 + Math.random() * 900000).toString(); 
}

const codigoVerificacionTemporal = {};

const verificarToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;

    if (!token) {
      return res.status(401).json({ status: 'ERROR', message: 'Token requerido' });
    }

    console.log(`Token recibido: ${token}`);

    const usuario = await Usuari.findOne({ where: { apiToken: token } });

    if (!usuario) {
      return res.status(403).json({ status: 'ERROR', message: 'Token inválido' });
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    console.error('Error en la verificación del token:', error.message);
    return res.status(401).json({ status: 'ERROR', message: 'Token inválido' });
  }
};

// **Registro de usuario**
app.post('/api/usuaris/registrar', async (req, res) => {
  const transaction = await sequelize.transaction(); // Iniciar transacción
  try {
      const { telefon, nickname, email } = req.body;

      if (!telefon || !nickname || !email) {
          await Log.create({ tag: "USUARIS_REGISTRATS", message: "Faltan parámetros en el registro", timestamp: new Date() }, { transaction });
          await transaction.rollback();
          return res.status(400).json({ status: 'ERROR', message: 'Faltan parámetros obligatorios' });
      }

      const usuarioExistente = await Usuari.findOne({ where: { telefon } });

      if (usuarioExistente) {
          await Log.create({ tag: "USUARIS_REGISTRATS", message: `Registro fallido: usuario ${telefon} ya existe`, timestamp: new Date() }, { transaction });
          await transaction.rollback();
          return res.status(400).json({ status: 'ERROR', message: 'El usuario ya está registrado' });
      }

      // Generar código de validación y guardarlo en memoria temporal
      const codi_validacio = generarCodigoValidacion();
      codigoVerificacionTemporal[telefon] = codi_validacio;

      // Intentar enviar SMS
      const smsURL = `http://192.168.1.16:8000/api/sendsms/`;
      const smsParams = { 
          api_token: process.env.SMS_API_TOKEN,
          username: process.env.SMS_USERNAME,   
          receiver: telefon,
          text: `Tu código de verificación es: ${codi_validacio}`,
      };

      let smsEnviado = false;
      try {
          const smsResponse = await axios.get(smsURL, { params: smsParams });
          if (smsResponse.status === 200) {
              smsEnviado = true;
              await Log.create({ tag: "USUARIS_REGISTRATS", message: `SMS enviado a ${telefon}`, timestamp: new Date() }, { transaction });
          } else {
              throw new Error(`Respuesta inesperada del servidor SMS: ${smsResponse.status}`);
          }
      } catch (smsError) {
          await Log.create({ tag: "USUARIS_REGISTRATS", message: `Error al enviar SMS a ${telefon}: ${smsError.message}`, timestamp: new Date() }, { transaction });
          await transaction.rollback();
          return res.status(500).json({ status: 'ERROR', message: 'No se pudo enviar el SMS de verificación' });
      }

      if (!smsEnviado) {
          await transaction.rollback();
          return res.status(500).json({ status: 'ERROR', message: 'No se pudo enviar el SMS de verificación' });
      }

      // Crear usuario en la base de datos
      try {
          await Usuari.create({
              telefon,
              nickname,
              email,
              rol: 'user',
              password: '',
              pla: 'free',
              apiToken: null,
          }, { transaction });

          await Log.create({ tag: "USUARIS_REGISTRATS", message: `Usuario ${telefon} registrado exitosamente`, timestamp: new Date() }, { transaction });

          await transaction.commit();
          res.json({ status: 'OK', message: 'Usuario registrado correctamente. Verifique su teléfono con el código recibido.' });

      } catch (error) {
          await Log.create({ tag: "USUARIS_REGISTRATS", message: `Error al crear usuario ${telefon}: ${error.message}`, timestamp: new Date() }, { transaction });
          await transaction.rollback();
          console.error('Error en la creación del usuario:', error.message);
          return res.status(500).json({ status: 'ERROR', message: 'Error interno al registrar el usuario' });
      }

  } catch (error) {
      await transaction.rollback();
      await Log.create({ tag: "USUARIS_REGISTRATS", message: `Error general en registro: ${error.message}`, timestamp: new Date() });
      console.error('Error en /api/usuaris/registrar:', error.message);
      return res.status(500).json({ status: 'ERROR', message: 'Error interno del servidor' });
  }
});
  

// **Validación de usuario**
app.post('/api/usuaris/validar', async (req, res) => {
  const transaction = await sequelize.transaction(); // Iniciar transacción
  try {
      const { telefon, codi_validacio } = req.body;

      if (!telefon || !codi_validacio) {
          await Log.create({ tag: "USUARIS_VALIDATS", message: "Faltan parámetros en la validación", timestamp: new Date() }, { transaction });
          await transaction.rollback();
          return res.status(400).json({ status: 'ERROR', message: 'Faltan parámetros obligatorios' });
      }

      const usuario = await Usuari.findOne({ where: { telefon } });

      if (!usuario) {
          await Log.create({ tag: "USUARIS_VALIDATS", message: `Intento de validación fallido: usuario ${telefon} no encontrado`, timestamp: new Date() }, { transaction });
          await transaction.rollback();
          return res.status(404).json({ status: 'ERROR', message: 'Usuario no encontrado' });
      }

      if (codigoVerificacionTemporal[telefon] !== codi_validacio) {
          await Log.create({ tag: "USUARIS_VALIDATS", message: `Código incorrecto para ${telefon}`, timestamp: new Date() }, { transaction });
          await transaction.rollback();
          return res.status(400).json({ status: 'ERROR', message: 'Código incorrecto' });
      }

      // Intentar confirmar la validación con el servicio de SMS
      const smsConfirmURL = `http://192.168.1.16:8000/api/sendsms/`;
      const smsConfirmParams = { 
          api_token: process.env.SMS_API_TOKEN,
          username: process.env.SMS_USERNAME,   
          receiver: telefon,
          text: `Confirmación: Código ${codi_validacio} recibido correctamente.`,
      };

      let smsEnviado = false;
      try {
          const smsResponse = await axios.get(smsConfirmURL, { params: smsConfirmParams });
          if (smsResponse.status === 200) {
              smsEnviado = true;
              await Log.create({ tag: "USUARIS_VALIDATS", message: `Confirmación SMS enviada a ${telefon}`, timestamp: new Date() }, { transaction });
          } else {
              throw new Error(`Error en la confirmación SMS: Código ${smsResponse.status}`);
          }
      } catch (smsError) {
          await Log.create({ tag: "USUARIS_VALIDATS", message: `Error al confirmar SMS para ${telefon}: ${smsError.message}`, timestamp: new Date() }, { transaction });
          await transaction.rollback();
          return res.status(500).json({ status: 'ERROR', message: 'No se pudo confirmar la validación por SMS' });
      }

      if (!smsEnviado) {
          await transaction.rollback();
          return res.status(500).json({ status: 'ERROR', message: 'No se pudo confirmar la validación por SMS' });
      }

      // Generar un nuevo API Token y guardarlo en la base de datos
      const nuevoApiToken = generarApiToken();
      usuario.apiToken = nuevoApiToken;
      await usuario.save({ transaction });

      await Log.create({ tag: "USUARIS_VALIDATS", message: `Usuario ${telefon} validado correctamente. API Token generado.`, timestamp: new Date() }, { transaction });

      // Eliminar el código de verificación usado
      delete codigoVerificacionTemporal[telefon];

      await transaction.commit();
      res.json({ status: 'OK', message: 'Usuario validado correctamente', apiToken: nuevoApiToken });

  } catch (error) {
      await transaction.rollback();
      await Log.create({ tag: "USUARIS_VALIDATS", message: `Error en validación: ${error.message}`, timestamp: new Date() });
      console.error('Error en la validación:', error.message);
      res.status(500).json({ status: 'ERROR', message: 'Error interno del servidor' });
  }
});


// **Consultar cuota**
app.get('/api/usuaris/quota', verificarToken, async (req, res) => {
  try {
      const usuario = req.usuario;

      // Determinar la cuota total según el plan del usuario
      const cuotaTotal = usuario.pla === 'premium' ? DEFAULT_PREMIUM_QUOTA : DEFAULT_FREE_QUOTA;
      const cuotaDisponible = usuario.quotaDisponible !== undefined && usuario.quotaDisponible !== null 
      ? usuario.quotaDisponible 
      : cuotaTotal;
      await Log.create({ 
          tag: "USUARIS_QUOTA", 
          message: `Consulta de cuota realizada para usuario ${usuario.telefon}: total=${cuotaTotal}, disponible=${cuotaDisponible}`, 
          timestamp: new Date() 
      });

      res.json({
          status: 'OK',
          message: 'Cuota consultada correctamente',
          data: {
              quota_total: cuotaTotal,
              quota_disponible: cuotaDisponible,
          },
      });

  } catch (error) {
      console.error('Error en /api/usuaris/quota:', error.message);
      await Log.create({ 
          tag: "USUARIS_QUOTA", 
          message: `Error al consultar la cuota: ${error.message}`, 
          timestamp: new Date() 
      });

      res.status(500).json({ status: 'ERROR', message: 'Error interno al obtener la cuota' });
  }
});


app.get('/api/admin/usuaris/quota', async (req, res) => {
  try {
      const { telefon, nickname, email } = req.query;

      if (!telefon && !nickname && !email) {
          await Log.create({ tag: "ADMIN_QUOTA", mensaje: "Intento de consulta sin parámetros", timestamp: new Date() });
          return res.status(400).json({ status: 'ERROR', message: 'Se requiere al menos un parámetro (telefon, nickname o email).' });
      }

      let usuario;
      if (telefon) {
          usuario = await Usuari.findOne({ where: { telefon } });
      } else if (nickname) {
          usuario = await Usuari.findOne({ where: { nickname } });
      } else if (email) {
          usuario = await Usuari.findOne({ where: { email } });
      }

      if (!usuario) {
          await Log.create({ tag: "ADMIN_QUOTA", mensaje: `Consulta fallida: usuario no encontrado (telefon=${telefon}, nickname=${nickname}, email=${email})`, timestamp: new Date() });
          return res.status(404).json({ status: 'ERROR', message: 'Usuario no encontrado' });
      }

      // Definir cuota total según el plan del usuario
      const cuotaTotal = usuario.pla === 'premium' ? DEFAULT_PREMIUM_QUOTA : DEFAULT_FREE_QUOTA;

      // Verificar si se debe resetear la cuota
      const hoy = new Date().toISOString().split('T')[0];
      if (!usuario.ultimaActualizacionQuota || usuario.ultimaActualizacionQuota !== hoy) {
          usuario.quotaDisponible = cuotaTotal; // Resetear la cuota
          usuario.ultimaActualizacionQuota = hoy;
          await usuario.save();
          await Log.create({ tag: "ADMIN_QUOTA", mensaje: `Cuota reseteada para usuario ${usuario.telefon}. Nueva cuota: ${cuotaTotal}`, timestamp: new Date() });
      }

      await Log.create({ tag: "ADMIN_QUOTA", mensaje: `Cuota obtenida para usuario ${usuario.telefon}. Disponible: ${usuario.quotaDisponible}`, timestamp: new Date() });

      res.json({ 
          status: 'OK', 
          message: 'Cuota obtenida correctamente', 
          data: { quota_total: cuotaTotal, quota_disponible: usuario.quotaDisponible } 
      });

  } catch (error) {
      console.error('Error en /api/admin/usuaris/quota:', error.message);
      await Log.create({ tag: "ADMIN_QUOTA", mensaje: `Error al obtener cuota: ${error.message}`, timestamp: new Date() });
      res.status(500).json({ status: 'ERROR', message: 'Error interno al obtener la cuota' });
  }
});


app.post('/api/admin/usuaris/quota/actualitzar', async (req, res) => {
  const transaction = await sequelize.transaction(); 

  try {
      const { telefon, nickname, email, limit, disponible } = req.body;
      const token = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;

      if (!token) {
          await Log.create({ tag: "ADMIN_QUOTA_UPDATE", message: "Intento de actualización sin autenticación", timestamp: new Date() }, { transaction });
          await transaction.rollback();
          return res.status(401).json({ status: 'ERROR', message: 'No autorizado' });
      }

      const admin = await Usuari.findOne({ where: { apiToken: token, rol: 'admin' } });

      if (!admin) {
          await Log.create({ tag: "ADMIN_QUOTA_UPDATE", message: `Acceso denegado para el token ${token}`, timestamp: new Date() }, { transaction });
          await transaction.rollback();
          return res.status(403).json({ status: 'ERROR', message: 'Acceso denegado' });
      }

      if (limit !== undefined && (isNaN(limit) || limit < 0)) {
          return res.status(400).json({ status: 'ERROR', message: 'El valor de limit no es válido' });
      }

      if (disponible !== undefined && (isNaN(disponible) || disponible < 0)) {
          return res.status(400).json({ status: 'ERROR', message: 'El valor de disponible no es válido' });
      }

      if (limit === undefined && disponible === undefined) {
          return res.status(400).json({ status: 'ERROR', message: 'Debe especificar al menos un valor para actualizar' });
      }

      // Buscar usuario con una única consulta
      const usuario = await Usuari.findOne({ 
          where: { 
              [Op.or]: [
                  { telefon: telefon || null },
                  { nickname: nickname || null },
                  { email: email || null }
              ]
          }
      });

      if (!usuario) {
          await Log.create({ tag: "ADMIN_QUOTA_UPDATE", message: `Intento de actualización fallido: usuario no encontrado (telefon=${telefon}, nickname=${nickname}, email=${email})`, timestamp: new Date() }, { transaction });
          await transaction.rollback();
          return res.status(404).json({ status: 'ERROR', message: 'Usuario no encontrado' });
      }

      let cambios = [];
      if (limit !== undefined && usuario.quotaTotal !== limit) {
          usuario.quotaTotal = limit;
          cambios.push(`limit=${limit}`);
      }
      if (disponible !== undefined && usuario.quotaDisponible !== disponible) {
          usuario.quotaDisponible = disponible;
          cambios.push(`disponible=${disponible}`);
      }

      if (cambios.length === 0) {
          await transaction.rollback();
          return res.status(400).json({ status: 'ERROR', message: 'No se han realizado cambios en la cuota' });
      }

      await usuario.save({ transaction });

      await Log.create({ tag: "ADMIN_QUOTA_UPDATE", message: `Cuota actualizada para ${usuario.telefon} (${cambios.join(", ")})`, timestamp: new Date() }, { transaction });

      await transaction.commit();
      res.json({ status: 'OK', message: 'Cuota de usuario actualizada', data: usuario });

  } catch (error) {
      await transaction.rollback();
      console.error('Error al actualizar la cuota del usuario:', error);
      await Log.create({ tag: "ADMIN_QUOTA_UPDATE", message: `Error en actualización de cuota: ${error.message}`, timestamp: new Date() });
      res.status(500).json({ status: 'ERROR', message: 'Error interno al actualizar la cuota' });
  }
});


// **Obtener lista de usuarios**
app.get('/api/admin/usuaris', async (req, res) => {
  try {
      const token = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;

      if (!token) {
          await Log.create({ tag: "ADMIN_USUARIS_LIST", message: "Intento de acceso sin autenticación", timestamp: new Date() });
          return res.status(401).json({ status: 'ERROR', message: 'No autorizado' });
      }

      const admin = await Usuari.findOne({ where: { apiToken: token, rol: 'admin' } });

      if (!admin) {
          await Log.create({ tag: "ADMIN_USUARIS_LIST", message: `Acceso denegado para usuario con token ${token}`, timestamp: new Date() });
          return res.status(403).json({ status: 'ERROR', message: 'Acceso denegado' });
      }

      const usuarios = await Usuari.findAll({
          attributes: ['id', 'telefon', 'nickname', 'email', 'pla']
      });

      if (usuarios.length === 0) {
          return res.status(204).json({ status: 'OK', message: 'No hay usuarios registrados' });
      }

      await Log.create({ tag: "ADMIN_USUARIS_LIST", message: `Lista de usuarios obtenida por admin ID: ${admin.id}`, timestamp: new Date() });

      res.json({ status: 'OK', message: 'Lista de usuarios obtenida', data: usuarios });

  } catch (error) {
      console.error('Error en /api/admin/usuaris:', error.message);
      await Log.create({ tag: "ADMIN_USUARIS_LIST", message: `Error al obtener lista de usuarios: ${error.message}`, timestamp: new Date() });
      res.status(500).json({ status: 'ERROR', message: 'Error interno del servidor' });
  }
});


// **Login de administrador**
app.post('/api/admin/usuaris/login', async (req, res) => {
  try {
      const { email, contrasenya } = req.body;

      if (!email || !contrasenya) {
          await Log.create({ tag: "ADMIN_LOGIN", message: "Intento de login sin parámetros obligatorios", timestamp: new Date() });
          return res.status(400).json({ status: 'ERROR', message: 'Faltan parámetros obligatorios' });
      }

      const admin = await Usuari.findOne({ where: { email, rol: 'admin' } });

      if (!admin) {
          await Log.create({ tag: "ADMIN_LOGIN", message: `Intento de login fallido para ${email}`, timestamp: new Date() });
          return res.status(403).json({ status: 'ERROR', message: 'Acceso denegado' });
      }

      // Comparar la contraseña encriptada
      const contrasenyaValida = await bcrypt.compare(contrasenya, admin.password);
      if (!contrasenyaValida) {
          await Log.create({ tag: "ADMIN_LOGIN", message: `Intento de login fallido para ${email}: contraseña incorrecta`, timestamp: new Date() });
          return res.status(403).json({ status: 'ERROR', message: 'Acceso denegado' });
      }

      await Log.create({ tag: "ADMIN_LOGIN", message: `Inicio de sesión exitoso para admin ID: ${admin.id}`, timestamp: new Date() });

      res.json({ status: 'OK', message: 'Inicio de sesión exitoso', apiToken: admin.apiToken });

  } catch (error) {
      console.error('Error en /api/admin/usuaris/login:', error.message);
      await Log.create({ tag: "ADMIN_LOGIN", message: `Error en autenticación: ${error.message}`, timestamp: new Date() });
      res.status(500).json({ status: 'ERROR', message: 'Error interno del servidor' });
  }
});

app.get('/api/admin/logs', verificarToken, async (req, res) => {
  try {
      if (req.usuario.rol !== 'admin') {
          return res.status(403).json({ status: 'ERROR', message: 'Acceso denegado' });
      }

      const { contenido, tag, pagina = 1, limite = 50 } = req.query;
      let whereClause = {};

      if (contenido) {
          whereClause.mensaje = { [Op.like]: `%${contenido}%` };
      }

      if (tag) {
          whereClause.tag = tag;
      }

      const offset = (pagina - 1) * limite;

      const logs = await Log.findAll({
          where: whereClause,
          order: [['timestamp', 'DESC']], 
          limit: parseInt(limite, 10),
          offset: parseInt(offset, 10)
      });

      res.json({ status: 'OK', message: 'Logs obtenidos correctamente', data: logs });

  } catch (error) {
      console.error('Error en /api/admin/logs:', error.message);
      res.status(500).json({ status: 'ERROR', message: 'Error interno del servidor' });
  }
});

app.get('/api/admin/stats', verificarToken, async (req, res) => {
  try {
      if (req.usuario.rol !== 'admin') {
          return res.status(403).json({ status: 'ERROR', message: 'Acceso denegado' });
      }

      const lastHour = new Date();
      lastHour.setHours(lastHour.getHours() - 1);

      const interaccionesUltimaHora = await Log.count({
          where: { timestamp: { [Op.gte]: lastHour } },
      });

      const eventos = await Log.findAll({
          where: { timestamp: { [Op.gte]: lastHour } },
          attributes: ['tag', 'mensaje', 'timestamp'],
          order: [['timestamp', 'DESC']],
          limit: 100,
      });

      res.json({
          status: 'OK',
          message: 'Estadísticas de la última hora obtenidas correctamente',
          total_interacciones: interaccionesUltimaHora,
          eventos,
      });

  } catch (error) {
      console.error('Error en /api/admin/stats:', error.message);
      res.status(500).json({ status: 'ERROR', message: 'Error interno del servidor' });
  }
});

  
app.post('/api/analitzar-imatge', verificarToken, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
      const usuario = req.usuario;
      const cuotaMaxima = usuario.pla === 'premium' ? 40 : 20;
      const fechaActual = new Date().toISOString().split('T')[0];

      // Resetear cuota si es un nuevo día
      if (usuario.ultimaActualizacionQuota !== fechaActual) {
          usuario.quotaDisponible = cuotaMaxima;
          usuario.ultimaActualizacionQuota = fechaActual;
          await usuario.save({ transaction });

          await Log.create({ 
              tag: "QUOTA_RESET", 
              mensaje: `Cuota reseteada para usuario ${usuario.telefon} (${usuario.pla})`, 
              timestamp: new Date() 
          }, { transaction });
      }

      if (usuario.quotaDisponible <= 0) {
          await Log.create({ 
              tag: "QUOTA_EXHAURIDA", 
              mensaje: `Usuario ${usuario.telefon} intentó realizar una petición sin cuota disponible.`,
              timestamp: new Date() 
          }, { transaction });

          await transaction.commit();
          return res.status(402).json({ status: 'ERROR', message: 'Cuota diaria agotada. No puedes realizar más peticiones hoy.' });
      }

      // Validar la solicitud
      const { prompt, images, stream, model } = req.body;
      if (!prompt || !images || !Array.isArray(images) || images.length === 0 || !model) {
          return res.status(400).json({ status: 'ERROR', message: 'Faltan parámetros obligatorios en la petición' });
      }

      // Enviar petición al servicio externo de análisis de imagen
      const response = await axios.post('http://192.168.1.14:11434/api/generate', {
          model, prompt, images, stream
      });

      const ollamaPrompt = response.data.prompt || 'No se encontró el prompt en la respuesta de Ollama.';

      // Guardar la petición en la base de datos
      const nuevaPeticio = await Peticio.create({
          prompt,
          imatges: JSON.stringify(images),
          model,
          usuariID: usuario.id,
      }, { transaction });

      // Actualizar cuota disponible
      usuario.quotaDisponible = Math.max(0, usuario.quotaDisponible - 1);
      await usuario.save({ transaction });

      await Log.create({ 
          tag: "IMATGE_ANALITZADA", 
          mensaje: `Petición realizada por ${usuario.telefon}. Quedan ${usuario.quotaDisponible} peticiones disponibles.`,
          timestamp: new Date() 
      }, { transaction });

      await transaction.commit();

      res.json({
          status: 'OK',
          message: 'Imagen procesada correctamente',
          prompt: ollamaPrompt,
          data: response.data,
          savedPromptId: nuevaPeticio.id 
      });

  } catch (error) {
      await transaction.rollback();
      console.error('Error al procesar la imagen:', error.response?.data || error.message);

      await Log.create({ 
          tag: "IMATGE_ERROR", 
          mensaje: `Error al analizar imagen: ${error.message}`, 
          timestamp: new Date() 
      });

      res.status(500).json({ status: 'ERROR', message: 'Error interno al procesar la imagen' });
  }
});


// **Iniciar el servidor**
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor en ejecución en el puerto ${PORT}`);
});

