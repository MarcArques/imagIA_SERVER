// Importación de módulos necesarios
const axios = require('axios');
const express = require('express');
const app = express();
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 3000;

// Variables simuladas para almacenar datos en memoria
let usuarios = [];
let usuariosAdmin = [];

// Función auxiliar para buscar usuario
const buscarUsuario = (campo, valor) => usuarios.find((user) => user[campo] === valor);

// Rutas de usuarios

// Registro de usuario
app.post('/api/usuaris/registrar', (req, res) => {
  const { telefon, nickname, email } = req.body;

  if (!telefon || !nickname || !email) {
    return res.status(400).json({ status: 'ERROR', message: 'Faltan parámetros obligatorios' });
  }

  if (buscarUsuario('email', email)) {
    return res.status(400).json({ status: 'ERROR', message: 'El usuario ya existe' });
  }

  const nuevoUsuario = { telefon, nickname, email, validat: false, pla: 'basic', quota: { total: 20, consumida: 0, disponible: 20 } };
  usuarios.push(nuevoUsuario);
  res.json({ status: 'OK', message: 'Usuario registrado correctamente', data: nuevoUsuario });
});

// Validación de usuario
app.post('/api/usuaris/validar', (req, res) => {
  const { telefon, codi_validacio } = req.body;

  if (!telefon || !codi_validacio) {
    return res.status(400).json({ status: 'ERROR', message: 'Faltan parámetros obligatorios' });
  }

  const usuario = buscarUsuario('telefon', telefon);
  if (!usuario) {
    return res.status(404).json({ status: 'ERROR', message: 'Usuario no encontrado' });
  }

  usuario.validat = true;
  res.json({ status: 'OK', message: 'Usuario validado correctamente', data: usuario });
});

// Obtener perfil
app.get('/api/usuaris/perfil', (req, res) => {
  const email = req.query.email;

  if (!email) {
    return res.status(400).json({ status: 'ERROR', message: 'Falta el parámetro email' });
  }

  const usuario = buscarUsuario('email', email);
  if (!usuario) {
    return res.status(404).json({ status: 'ERROR', message: 'Usuario no encontrado' });
  }

  res.json({ status: 'OK', message: 'Perfil obtenido correctamente', data: usuario });
});

// Consultar cuota
app.get('/api/usuaris/quota', (req, res) => {
  const email = req.query.email;

  if (!email) {
    return res.status(400).json({ status: 'ERROR', message: 'Falta el parámetro email' });
  }

  const usuario = buscarUsuario('email', email);
  if (!usuario) {
    return res.status(404).json({ status: 'ERROR', message: 'Usuario no encontrado' });
  }

  res.json({ status: 'OK', message: 'Cuota consultada correctamente', data: usuario.quota });
});

// Actualizar plan de usuario
app.post('/api/admin/usuaris/pla/actualitzar', (req, res) => {
  const { email, pla } = req.body;

  if (!email || !pla) {
    return res.status(400).json({ status: 'ERROR', message: 'Faltan parámetros obligatorios' });
  }

  const usuario = buscarUsuario('email', email);
  if (!usuario) {
    return res.status(404).json({ status: 'ERROR', message: 'Usuario no encontrado' });
  }

  usuario.pla = pla;
  res.json({ status: 'OK', message: 'Plan actualizado correctamente', data: usuario });
});

// Consultar cuota de un usuario
app.get('/api/admin/usuaris/quota', (req, res) => {
  const email = req.query.email;

  if (!email) {
    return res.status(400).json({ status: 'ERROR', message: 'Falta el parámetro email' });
  }

  const usuario = buscarUsuario('email', email);
  if (!usuario) {
    return res.status(404).json({ status: 'ERROR', message: 'Usuario no encontrado' });
  }

  res.json({ status: 'OK', message: 'Cuota obtenida correctamente', data: usuario.quota });
});

// Actualizar cuota de usuario
app.post('/api/admin/usuaris/quota/actualitzar', (req, res) => {
  const { email, limit, disponible } = req.body;

  if (!email) {
    return res.status(400).json({ status: 'ERROR', message: 'Faltan parámetros obligatorios' });
  }

  const usuario = buscarUsuario('email', email);
  if (!usuario) {
    return res.status(404).json({ status: 'ERROR', message: 'Usuario no encontrado' });
  }

  if (limit !== undefined) usuario.quota.total = limit;
  if (disponible !== undefined) usuario.quota.disponible = disponible;

  res.json({ status: 'OK', message: 'Cuota actualizada correctamente', data: usuario.quota });
});

// Listar usuarios
app.get('/api/admin/usuaris', (req, res) => {
  res.json({ status: 'OK', message: 'Lista de usuarios obtenida correctamente', data: usuarios });
});

app.post('/api/analitzar-imatge', async (req, res) => {
  console.log('Solicitud recibida en /api/analitzar-imatge:', req.body);

  const { prompt, images, stream, model } = req.body;

  if (!prompt || !images || !Array.isArray(images) || images.length === 0 || !model) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Faltan parámetros obligatorios en la petición',
    });
  }

  try {
    const response = await axios.post('https://127.0.0.1:11111/api/generate', {
      model,
      prompt,
      images,
      stream,
    });

    console.log('Respuesta de Ollama:', response.data);

    const ollamaPrompt = response.data.prompt || 'No se encontró el prompt en la respuesta de Ollama.';

    res.json({
      status: 'OK',
      message: 'Imagen procesada correctamente',
      prompt: ollamaPrompt,
      data: response.data,
    });
  } catch (error) {
    console.error('Error al procesar la imagen:', error.response?.data || error.message);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error interno al procesar la imagen',
    });
  }
});

// Iniciar el servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});