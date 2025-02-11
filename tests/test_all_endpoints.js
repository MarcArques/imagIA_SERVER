const axios = require('axios');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://imagia3.ieti.site';
let userApiToken = '';
let adminApiToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNzM4MzQ2NTMwLCJleHAiOjE3Mzg0MzI5MzB9.iUk5UplnWAu0PQ6iMTNsRagH5j7pUPlvRGS6V3xAWzo';
let testTelefon = '683798999';
let testEmail = 'test_user@example.com';
let testNickname = 'test_user';
let testPassword = 'password123';
let adminEmail = 'admin@admin.com';
let adminPassword = '1234';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const imagePath = path.resolve(__dirname, '../../img2.png');
const imageBuffer = fs.readFileSync(imagePath);
const base64Image = imageBuffer.toString('base64');

async function runTests() {
    try {
        console.log('🔍 Iniciando pruebas de la API...\n');

        // 🟢 1. Registrar un usuario con contraseña
        console.log('📌 Registrando usuario...');
        const registroResponse = await axios.post(`${BASE_URL}/api/usuaris/registrar`, {
            telefon: testTelefon,
            nickname: testNickname,
            email: testEmail,
            password: testPassword
        });
        console.log('✅ Usuario registrado correctamente.');
        console.log('📄 Respuesta:', registroResponse.data, '\n');

        // 🟢 2. Solicitar código de validación manualmente
        rl.question("Introduce el código de validación recibido por SMS: ", async (codigoUsuario) => {
            try {
                console.log(`📤 Validando usuario con código: ${codigoUsuario}...\n`);

                const validacionResponse = await axios.post(`${BASE_URL}/api/usuaris/validar`, {
                    telefon: testTelefon,
                    codi_validacio: codigoUsuario
                });

                userApiToken = validacionResponse.data.apiToken;
                console.log('✅ Usuario validado correctamente. Token recibido:', userApiToken, '\n');

                // 🟢 11. Analizar imagen (control de cuota)
                console.log('📌 Enviando imagen para análisis...');
                const imageAnalysisResponse = await axios.post(`${BASE_URL}/api/analitzar-imatge`, {
                    prompt: "Test de imagen",
                    images: [base64Image],
                    stream: false,
                    model: "llama3.2-vision"
                }, {
                    headers: { Authorization: `Bearer ${userApiToken}` }
                });

                console.log('✅ Imagen analizada correctamente.');
                console.log('📄 Respuesta:', imageAnalysisResponse.data, '\n');

                // 🟢 12. Obtener historial de imágenes
                console.log('📌 Obteniendo historial de imágenes...');
                const historialResponse = await axios.get(`${BASE_URL}/api/usuaris/historial-imatges`, {
                    headers: { Authorization: `Bearer ${adminApiToken}` }
                });

                console.log('✅ Historial de imágenes obtenido correctamente.');
                console.log('📄 Respuesta:', historialResponse.data, '\n');

                console.log('🎉 TODAS LAS PRUEBAS PASARON CORRECTAMENTE');

            } catch (error) {
                console.error('❌ Error en la prueba:', error.response ? error.response.data : error.message);
            } finally {
                rl.close();
            }
        });

    } catch (error) {
        console.error('❌ Error en la prueba:', error.response ? error.response.data : error.message);
        rl.close();
    }
}

// Ejecutar el test
runTests();
