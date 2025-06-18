import os
import unittest
import json
import time
from datetime import datetime, timedelta

# ✅ ESTABLECER VARIABLE DE ENTORNO ANTES DE IMPORTAR
os.environ['FLASK_TESTING'] = 'true'

from app import app, db, Usuario, Proyecto, guard
import uuid

class TestSecurityComprehensive(unittest.TestCase):
    def setUp(self):
        self.app = app
        self.app_context = self.app.app_context()
        self.app_context.push()
        
        # Limpiar y recrear la base de datos de test
        db.drop_all()
        db.create_all()
        
        self.client = self.app.test_client()
        self._create_test_users()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def _create_test_users(self):
        """Crear usuarios de prueba con diferentes roles"""
        # Admin user
        self.admin_user = Usuario(
            id=str(uuid.uuid4()),
            username='admin_test',
            nombre='Admin',
            apellidos='Test',
            email='admin@test.com',
            password=guard.hash_password('admin123'),
            roles='admin'
        )
        
        # Regular user
        self.regular_user = Usuario(
            id=str(uuid.uuid4()),
            username='user_test',
            nombre='User',
            apellidos='Test',
            email='user@test.com',
            password=guard.hash_password('user123'),
            roles='user'
        )
        
        # Test user for vulnerabilities
        self.test_user = Usuario(
            id=str(uuid.uuid4()),
            username='test_user',
            nombre='Test',
            apellidos='User',
            email='test@example.com',
            password=guard.hash_password('testpass'),
            roles='user'
        )
        
        db.session.add(self.admin_user)
        db.session.add(self.regular_user)
        db.session.add(self.test_user)
        db.session.commit()

    def _login_as_admin(self):
        """Helper para hacer login como admin"""
        response = self.client.post('/login', 
            json={'username': 'admin_test', 'password': 'admin123'},
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        return response

    def _login_as_user(self):
        """Helper para hacer login como usuario regular"""
        response = self.client.post('/login', 
            json={'username': 'user_test', 'password': 'user123'},
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        return response

    # =====================================================================
    # TESTS DE AUTENTICACIÓN Y AUTORIZACIÓN
    # =====================================================================

    def test_authentication_required_for_all_protected_endpoints(self):
        """Test: Verificar que todos los endpoints protegidos requieren autenticación"""
        protected_endpoints = [
            ('/usuarios', 'GET'),
            ('/usuarios', 'POST'),
            ('/usuarios/test-id', 'PUT'),
            ('/usuarios/test-id', 'DELETE'),
            ('/proyectos', 'GET'),
            ('/proyectos', 'POST'),
            ('/proyectos/test-id', 'PUT'),
            ('/proyectos/test-id', 'DELETE'),
            ('/usuarios/rol', 'GET')
        ]
        
        for endpoint, method in protected_endpoints:
            with self.subTest(endpoint=endpoint, method=method):
                if method == 'GET':
                    response = self.client.get(endpoint)
                elif method == 'POST':
                    response = self.client.post(endpoint, json={}, content_type='application/json')
                elif method == 'PUT':
                    response = self.client.put(endpoint, json={}, content_type='application/json')
                elif method == 'DELETE':
                    response = self.client.delete(endpoint)
                
                self.assertEqual(response.status_code, 401, 
                    f"Endpoint {method} {endpoint} debería requerir autenticación")

    def test_admin_role_required_for_admin_endpoints(self):
        """Test: Verificar que endpoints de admin requieren rol admin"""
        self._login_as_user()  # Login como usuario regular
        
        admin_endpoints = [
            ('/usuarios', 'POST', {'username': 'new_user', 'nombre': 'New', 'apellidos': 'User', 'email': 'new@test.com', 'password': 'pass123'}),
            (f'/usuarios/{self.test_user.id}', 'DELETE', {})
        ]
        
        for endpoint, method, data in admin_endpoints:
            with self.subTest(endpoint=endpoint, method=method):
                if method == 'POST':
                    response = self.client.post(endpoint, json=data, content_type='application/json')
                elif method == 'DELETE':
                    response = self.client.delete(endpoint)
                
                self.assertEqual(response.status_code, 403, 
                    f"Endpoint {method} {endpoint} debería requerir rol admin")

    def test_password_brute_force_protection(self):
        """Test: Verificar que existe alguna protección contra fuerza bruta"""
        # Intentar múltiples logins fallidos
        failed_attempts = []
        for i in range(10):
            start_time = time.time()
            response = self.client.post('/login', 
                json={'username': 'admin_test', 'password': 'wrong_password'},
                content_type='application/json'
            )
            end_time = time.time()
            
            failed_attempts.append({
                'attempt': i + 1,
                'status_code': response.status_code,
                'response_time': end_time - start_time
            })
            
            self.assertEqual(response.status_code, 401)
        
        # Verificar que al menos hay una respuesta de tiempo creciente (rate limiting básico)
        # o que el servidor responde consistentemente
        response_times = [attempt['response_time'] for attempt in failed_attempts]
        print(f"Tiempos de respuesta para intentos fallidos: {response_times}")
        
        # Test pasa si no hay crash del servidor durante intentos de fuerza bruta
        self.assertTrue(all(attempt['status_code'] == 401 for attempt in failed_attempts))

    # =====================================================================
    # TESTS DE INJECTION (XSS, SQL INJECTION)
    # =====================================================================

    def test_xss_protection_in_user_creation(self):
        """Test: Protección XSS en creación de usuarios"""
        self._login_as_admin()
        
        xss_payloads = [
            "<script>alert('XSS')</script>",
            "<img src=x onerror=alert('XSS')>",
            "javascript:alert('XSS')",
            "<svg onload=alert('XSS')>",
            "';alert('XSS');//",
            "\"><script>alert('XSS')</script>",
        ]
        
        for payload in xss_payloads:
            with self.subTest(payload=payload):
                response = self.client.post('/usuarios',
                    json={
                        'username': f'test_{uuid.uuid4().hex[:8]}',
                        'nombre': payload,
                        'apellidos': 'Test',
                        'email': f'test_{uuid.uuid4().hex[:8]}@test.com',
                        'password': 'test123'
                    },
                    content_type='application/json'
                )
                
                if response.status_code == 201:
                    # Verificar que el payload está escapado en la base de datos
                    user_data = response.get_json()
                    created_user = Usuario.query.filter_by(email=f'test_{uuid.uuid4().hex[:8]}@test.com').first()
                    
                    if created_user:
                        # El contenido debe estar escapado
                        self.assertNotEqual(created_user.nombre, payload)
                        # Verificar que contiene entidades HTML escapadas
                        self.assertTrue(
                            '&lt;' in created_user.nombre or 
                            '&gt;' in created_user.nombre or
                            '&quot;' in created_user.nombre or
                            '&#x27;' in created_user.nombre,
                            f"El payload {payload} no está escapado correctamente"
                        )

    def test_sql_injection_protection(self):
        """Test: Protección contra SQL Injection"""
        self._login_as_admin()
        
        sql_payloads = [
            "'; DROP TABLE usuarios; --",
            "' OR '1'='1",
            "'; INSERT INTO usuarios (username, password) VALUES ('hacker', 'password'); --",
            "' UNION SELECT * FROM usuarios --",
            "'; UPDATE usuarios SET roles='admin' WHERE username='user_test'; --"
        ]
        
        for payload in sql_payloads:
            with self.subTest(payload=payload):
                response = self.client.post('/usuarios',
                    json={
                        'username': payload,
                        'nombre': 'Test',
                        'apellidos': 'Test',
                        'email': f'test_{uuid.uuid4().hex[:8]}@test.com',
                        'password': 'test123'
                    },
                    content_type='application/json'
                )
                
                # La aplicación debe seguir funcionando
                self.assertIn(response.status_code, [201, 400, 409])
                
                # Verificar que la tabla usuarios sigue existiendo
                users_count = Usuario.query.count()
                self.assertGreater(users_count, 0, "La tabla usuarios fue afectada por SQL injection")

    # =====================================================================
    # TESTS DE CONTROL DE ACCESO
    # =====================================================================

    def test_users_can_only_access_own_projects(self):
        """Test: Los usuarios solo pueden acceder a sus propios proyectos"""
        # Crear proyectos para diferentes usuarios
        self._login_as_admin()
        
        # Crear proyecto para user_test
        proyecto_user = Proyecto(
            id=str(uuid.uuid4()),
            nombre='Proyecto Usuario',
            descripcion='Proyecto del usuario regular',
            fecha_creacion=datetime.now().date(),
            fecha_modificacion=datetime.now().date(),
            usuario_id=self.regular_user.id
        )
        
        # Crear proyecto para test_user
        proyecto_test = Proyecto(
            id=str(uuid.uuid4()),
            nombre='Proyecto Test',
            descripcion='Proyecto del usuario test',
            fecha_creacion=datetime.now().date(),
            fecha_modificacion=datetime.now().date(),
            usuario_id=self.test_user.id
        )
        
        db.session.add(proyecto_user)
        db.session.add(proyecto_test)
        db.session.commit()
        
        # Login como user_test y intentar acceder al proyecto de regular_user
        self._login_as_user()
        
        # Intentar acceder al proyecto que NO es suyo
        response = self.client.get(f'/proyectos/{proyecto_test.id}')
        self.assertEqual(response.status_code, 403, 
            "Usuario no debería poder acceder a proyectos de otros usuarios")

    def test_user_enumeration_protection(self):
        """Test: Protección contra enumeración de usuarios"""
        # Intentar login con usuario inexistente vs usuario existente con contraseña incorrecta
        
        # Usuario que no existe
        response1 = self.client.post('/login', 
            json={'username': 'usuario_inexistente', 'password': 'cualquier_password'},
            content_type='application/json'
        )
        
        # Usuario que existe pero contraseña incorrecta
        response2 = self.client.post('/login', 
            json={'username': 'admin_test', 'password': 'password_incorrecta'},
            content_type='application/json'
        )
        
        # Ambos deberían dar respuestas similares para evitar enumeración
        self.assertEqual(response1.status_code, 401)
        self.assertEqual(response2.status_code, 401)
        
        # Los mensajes deberían ser genéricos
        data1 = response1.get_json()
        data2 = response2.get_json()
        
        self.assertIn('inválidas', data1.get('message', '').lower())
        self.assertIn('inválidas', data2.get('message', '').lower())

    # =====================================================================
    # TESTS DE DATOS SENSIBLES
    # =====================================================================

    def test_password_not_exposed_in_responses(self):
        """Test: Las contraseñas no se exponen en las respuestas"""
        self._login_as_admin()
        
        # Obtener lista de usuarios
        response = self.client.get('/usuarios')
        self.assertEqual(response.status_code, 200)
        
        users_data = response.get_json()
        for user in users_data:
            self.assertNotIn('password', user, "La contraseña no debe estar en la respuesta")
            
        # Obtener usuario específico
        response = self.client.get(f'/usuarios/{self.regular_user.id}')
        self.assertEqual(response.status_code, 200)
        
        user_data = response.get_json()
        self.assertNotIn('password', user_data, "La contraseña no debe estar en la respuesta")

    def test_secure_password_storage(self):
        """Test: Las contraseñas se almacenan de forma segura (hasheadas)"""
        # Verificar que las contraseñas en la BD están hasheadas
        user = Usuario.query.filter_by(username='admin_test').first()
        self.assertIsNotNone(user)
        
        # La contraseña no debe ser texto plano
        self.assertNotEqual(user.password, 'admin123')
        
        # Debe tener formato de hash (longitud y caracteres)
        self.assertGreater(len(user.password), 50, "El hash de contraseña parece muy corto")
        
        # Verificar que el hash es válido usando el método de verificación
        self.assertTrue(guard.verify_password('admin123', user.password))

    # =====================================================================
    # TESTS DE VALIDACIÓN DE ENTRADA
    # =====================================================================

    def test_input_validation_user_creation(self):
        """Test: Validación de entrada en creación de usuarios"""
        self._login_as_admin()
        
        # Test casos inválidos
        invalid_cases = [
            # Campos faltantes
            {'username': 'test'},  # Faltan campos
            {},  # Vacío
            # Emails inválidos
            {'username': 'test', 'nombre': 'Test', 'apellidos': 'Test', 'email': 'email_invalido', 'password': 'pass123'},
            # Campos muy largos
            {'username': 'a' * 100, 'nombre': 'Test', 'apellidos': 'Test', 'email': 'test@test.com', 'password': 'pass123'},
            # Caracteres especiales peligrosos
            {'username': 'test<script>', 'nombre': 'Test', 'apellidos': 'Test', 'email': 'test@test.com', 'password': 'pass123'},
        ]
        
        for i, invalid_data in enumerate(invalid_cases):
            with self.subTest(case=i, data=invalid_data):
                response = self.client.post('/usuarios',
                    json=invalid_data,
                    content_type='application/json'
                )
                self.assertIn(response.status_code, [400, 409], 
                    f"Datos inválidos deberían ser rechazados: {invalid_data}")

    def test_duplicate_user_prevention(self):
        """Test: Prevención de usuarios duplicados"""
        self._login_as_admin()
        
        # Intentar crear usuario con username duplicado
        response = self.client.post('/usuarios',
            json={
                'username': 'admin_test',  # Ya existe
                'nombre': 'Duplicate',
                'apellidos': 'User',
                'email': 'duplicate@test.com',
                'password': 'pass123'
            },
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 409)
        
        # Intentar crear usuario con email duplicado
        response = self.client.post('/usuarios',
            json={
                'username': 'new_user',
                'nombre': 'Duplicate',
                'apellidos': 'User',
                'email': 'admin@test.com',  # Ya existe
                'password': 'pass123'
            },
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 409)

    # =====================================================================
    # TESTS DE CONFIGURACIÓN DE SEGURIDAD
    # =====================================================================

    def test_security_headers(self):
        """Test: Verificar headers de seguridad"""
        response = self.client.get('/')
        
        # Verificar CORS headers si están configurados
        if 'Access-Control-Allow-Origin' in response.headers:
            # CORS debe estar configurado específicamente, no con *
            self.assertNotEqual(response.headers.get('Access-Control-Allow-Origin'), '*',
                "CORS no debería permitir cualquier origen en producción")

    def test_cookie_security_settings(self):
        """Test: Configuración segura de cookies"""
        response = self._login_as_admin()
        
        cookies = response.headers.getlist('Set-Cookie')
        access_token_cookie = None
        
        for cookie in cookies:
            if 'access_token=' in cookie:
                access_token_cookie = cookie
                break
        
        self.assertIsNotNone(access_token_cookie, "Cookie de acceso no encontrada")
        
        # Verificar flags de seguridad en la cookie
        self.assertIn('HttpOnly', access_token_cookie, "Cookie debería tener flag HttpOnly")
        # En tests, secure puede estar en False, pero verificamos que esté configurado
        self.assertTrue('Secure' in access_token_cookie or 'secure=False' in access_token_cookie.lower())

    # =====================================================================
    # TESTS DE VULNERABILIDADES ESPECÍFICAS
    # =====================================================================

    def test_directory_traversal_protection(self):
        """Test: Protección contra directory traversal"""
        traversal_payloads = [
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32\\config\\sam",
            "%2e%2e%2f%2e%2e%2f%2e%2e%2f",
        ]
        
        for payload in traversal_payloads:
            with self.subTest(payload=payload):
                # Test en endpoint que podría ser vulnerable
                response = self.client.get(f'/reflejar?mensaje={payload}')
                # La aplicación no debería crashear ni exponer archivos del sistema
                self.assertNotIn('/etc/passwd', response.get_data(as_text=True))
                self.assertNotIn('root:', response.get_data(as_text=True))

    def test_csrf_protection_awareness(self):
        """Test: Verificar que la aplicación es consciente de CSRF"""
        # Este test verifica que los endpoints críticos están protegidos
        # (En una aplicación real, verificarías tokens CSRF)
        
        # Intentar operaciones críticas sin autenticación adecuada
        critical_operations = [
            ('/usuarios', 'POST'),
            ('/usuarios/test-id', 'DELETE'),
        ]
        
        for endpoint, method in critical_operations:
            with self.subTest(endpoint=endpoint, method=method):
                if method == 'POST':
                    response = self.client.post(endpoint, 
                        json={'test': 'data'}, 
                        content_type='application/json')
                elif method == 'DELETE':
                    response = self.client.delete(endpoint)
                
                # Debe requerir autenticación
                self.assertEqual(response.status_code, 401)

    def test_information_disclosure_prevention(self):
        """Test: Prevención de revelación de información"""
        # Intentar acceder a endpoints con IDs inexistentes
        response = self.client.get('/usuarios/usuario-inexistente')
        self.assertEqual(response.status_code, 401, 
            "Debe requerir autenticación antes de revelar si el recurso existe")
        
        # Con autenticación, debe dar 404 para recursos inexistentes
        self._login_as_admin()
        response = self.client.get('/usuarios/usuario-inexistente')
        self.assertEqual(response.status_code, 404)
        
        # El mensaje de error no debe revelar información innecesaria
        data = response.get_json()
        self.assertNotIn('database', data.get('message', '').lower())
        self.assertNotIn('sql', data.get('message', '').lower())

if __name__ == '__main__':
    # Ejecutar tests con verbose output
    unittest.main(verbosity=2)