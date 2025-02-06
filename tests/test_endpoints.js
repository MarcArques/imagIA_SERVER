// Importar las librerías necesarias
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

// Configuración global
const BASE_URL = 'http://localhost:3000';

async function runTests() {
  try {
    console.log('Iniciando pruebas...');

    // Prueba: Registro de usuario
    const registroResponse = await axios.post(`${BASE_URL}/api/usuaris/registrar`, {
      telefon: '+34 600 000 001',
      nickname: 'test_user',
      email: 'test_user@example.com',
    });
    assert.strictEqual(registroResponse.data.status, 'OK');
    console.log('Registro de usuario: OK');

    // Prueba: Validación de usuario
    const validacionResponse = await axios.post(`${BASE_URL}/api/usuaris/validar`, {
      telefon: '+34 600 000 001',
      codi_validacio: 123456,
    });
    assert.strictEqual(validacionResponse.data.status, 'OK');
    console.log('Validación de usuario: OK');

    // Prueba: Obtener perfil de usuario
    const perfilResponse = await axios.get(`${BASE_URL}/api/usuaris/perfil`, {
      params: { email: 'test_user@example.com' },
    });
    assert.strictEqual(perfilResponse.data.status, 'OK');
    console.log('Obtener perfil: OK');

    // Prueba: Consultar cuota de usuario
    const cuotaResponse = await axios.get(`${BASE_URL}/api/usuaris/quota`, {
      params: { email: 'test_user@example.com' },
    });
    assert.strictEqual(cuotaResponse.data.status, 'OK');
    console.log('Consultar cuota: OK');

    // Prueba: Actualizar plan de usuario
    const actualizarPlanResponse = await axios.post(`${BASE_URL}/api/admin/usuaris/pla/actualitzar`, {
      email: 'test_user@example.com',
      pla: 'premium',
    });
    assert.strictEqual(actualizarPlanResponse.data.status, 'OK');
    console.log('Actualizar plan: OK');

    // Prueba: Consultar cuota de usuario por admin
    const adminCuotaResponse = await axios.get(`${BASE_URL}/api/admin/usuaris/quota`, {
      params: { email: 'test_user@example.com' },
    });
    assert.strictEqual(adminCuotaResponse.data.status, 'OK');
    console.log('Consultar cuota por admin: OK');

    // Prueba: Actualizar cuota
    const actualizarCuotaResponse = await axios.post(`${BASE_URL}/api/admin/usuaris/quota/actualitzar`, {
      email: 'test_user@example.com',
      limit: 50,
      disponible: 30,
    });
    assert.strictEqual(actualizarCuotaResponse.data.status, 'OK');
    console.log('Actualizar cuota: OK');

    // Prueba: Listar usuarios
    const listarUsuariosResponse = await axios.get(`${BASE_URL}/api/admin/usuaris`);
    assert.strictEqual(listarUsuariosResponse.data.status, 'OK');
    assert(listarUsuariosResponse.data.data.length > 0);
    console.log('Listar usuarios: OK');
    
    const imagePath = path.resolve(__dirname, '../img/img2.png');
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Prueba: Análisis de imágenes
    const analizarImagenResponse = await axios.post(`${BASE_URL}/api/analitzar-imatge`, {
      prompt: 'Describe esta imagen',
      images: [base64Image],
      stream: false,
      model: 'llama3.2-vision:latest',
    });
    assert.strictEqual(analizarImagenResponse.data.status, 'OK');
    console.log('Análisis de imágenes: OK');

    console.log('Todas las pruebas se ejecutaron correctamente.');
  } catch (error) {
    if (error.response) {
      console.error('Error en la prueba:', error.response.data);
    } else {
      console.error('Error general:', error.message);
    }
  }
}

runTests();
