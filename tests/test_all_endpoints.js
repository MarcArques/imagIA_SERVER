const axios = require('axios');
const readline = require('readline');

const BASE_URL = 'https://imagia3.ieti.site';
let userApiToken = '';
let adminApiToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNzM4MzQ2NTMwLCJleHAiOjE3Mzg0MzI5MzB9.iUk5UplnWAu0PQ6iMTNsRagH5j7pUPlvRGS6V3xAWzo';
let testTelefon = '683798999';
let testEmail = 'test_user@example.com';
let testNickname = 'test_user';
let testPassword = 'password123'; // Nueva contraseña para el test
let adminEmail = 'admin@admin.com';
let adminPassword = '1234';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function runTests() {
    try {
        console.log('🔍 Iniciando pruebas de la API...\n');

        // 🟢 1. Registrar un usuario con contraseña
        console.log('📌 Registrando usuario...');
        await axios.post(`${BASE_URL}/api/usuaris/registrar`, {
            telefon: testTelefon,
            nickname: testNickname,
            email: testEmail,
            password: testPassword // Ahora el test envía una contraseña
        });

        console.log('✅ Usuario registrado correctamente.\n');

        // 🟢 2. Solicitar código de validación manualmente
        rl.question("Introduce el código de validación recibido por SMS: ", async (codigoUsuario) => {
            try {
                console.log(`📤 Validando usuario con código: ${codigoUsuario}...\n`);

                const response = await axios.post(`${BASE_URL}/api/usuaris/validar`, {
                    telefon: testTelefon,
                    codi_validacio: codigoUsuario
                });

                userApiToken = response.data.apiToken;
                console.log('✅ Usuario validado correctamente. Token recibido:', userApiToken, '\n');

                // 🟢 3. Obtener perfil del usuario
                console.log('📌 Obteniendo perfil de usuario...');
                await axios.get(`${BASE_URL}/api/usuaris/quota`, {
                    headers: { Authorization: `Bearer ${userApiToken}` }
                });
                console.log('✅ Perfil de usuario obtenido correctamente.\n');

                // 🟢 4. Consultar cuota de usuario
                console.log('📌 Consultando cuota...');
                const quotaResponse = await axios.get(`${BASE_URL}/api/usuaris/quota`, {
                    headers: { Authorization: `Bearer ${userApiToken}` }
                });
                console.log('✅ Cuota obtenida:', quotaResponse.data, '\n');

                // 🟢 5. Login de administrador
                console.log('📌 Iniciando sesión como administrador...');
                const loginResponse = await axios.post(`${BASE_URL}/api/admin/usuaris/login`, {
                    email: adminEmail,
                    contrasenya: adminPassword
                });
                adminApiToken = loginResponse.data.apiToken;
                console.log('✅ Admin autenticado correctamente. Token recibido:', adminApiToken, '\n');

                // 🟢 6. Obtener lista de usuarios
                console.log('📌 Listando usuarios...');
                await axios.get(`${BASE_URL}/api/admin/usuaris`, {
                    headers: { Authorization: `Bearer ${adminApiToken}` }
                });
                console.log('✅ Lista de usuarios obtenida correctamente.\n');

                // 🟢 7. Consultar cuota de usuario por admin
                console.log('📌 Consultando cuota por admin...');
                await axios.get(`${BASE_URL}/api/admin/usuaris/quota`, {
                    params: { telefon: testTelefon },
                    headers: { Authorization: `Bearer ${adminApiToken}` }
                });
                console.log('✅ Cuota obtenida correctamente por admin.\n');

                // 🟢 8. Actualizar cuota de usuario
                console.log('📌 Actualizando cuota del usuario...');
                await axios.post(`${BASE_URL}/api/admin/usuaris/quota/actualitzar`, {
                    telefon: testTelefon,
                    limit: 50,
                    disponible: 30
                }, {
                    headers: { Authorization: `Bearer ${adminApiToken}` }
                });
                console.log('✅ Cuota actualizada correctamente.\n');

                // 🟢 9. Consultar logs del sistema
                console.log('📌 Consultando logs...');
                await axios.get(`${BASE_URL}/api/admin/logs`, {
                    headers: { Authorization: `Bearer ${adminApiToken}` }
                });
                console.log('✅ Logs obtenidos correctamente.\n');

                // 🟢 10. Consultar estadísticas de la última hora
                console.log('📌 Consultando estadísticas...');
                await axios.get(`${BASE_URL}/api/admin/stats`, {
                    headers: { Authorization: `Bearer ${adminApiToken}` }
                });
                console.log('✅ Estadísticas obtenidas correctamente.\n');

                // 🟢 11. Analizar imagen (control de cuota)
                console.log('📌 Enviando imagen para análisis...');
                const imageAnalysisResponse = await axios.post(`${BASE_URL}/api/analitzar-imatge`, {
                    prompt: "Test de imagen",
                    images: ["base64_encoded_image_data"],
                    stream: false,
                    model: "imagenAI"
                }, {
                    headers: { Authorization: `Bearer ${userApiToken}` }
                });

                console.log('✅ Imagen analizada correctamente:', imageAnalysisResponse.data, '\n');

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
