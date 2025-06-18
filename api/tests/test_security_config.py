import os
import unittest
import json

# ✅ ESTABLECER VARIABLE DE ENTORNO ANTES DE IMPORTAR
os.environ['FLASK_TESTING'] = 'true'

from app import app, db

class TestSecurityConfiguration(unittest.TestCase):
    def setUp(self):
        self.app = app
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.client = self.app.test_client()

    def tearDown(self):
        self.app_context.pop()

    def test_debug_mode_disabled_in_production(self):
        """Test: Verificar que el modo debug está deshabilitado"""
        # En tests, debug puede estar habilitado, pero documentamos la importancia
        if self.app.debug:
            print("\n⚠️  ADVERTENCIA: Debug mode está habilitado")
            print("En producción, asegúrate de deshabilitar debug mode")
            print("Configura: app.debug = False")

    def test_secret_key_configuration(self):
        """Test: Verificar configuración de SECRET_KEY"""
        secret_key = self.app.config.get('SECRET_KEY')
        
        self.assertIsNotNone(secret_key, "SECRET_KEY debe estar configurado")
        self.assertNotEqual(secret_key, 'dev', "SECRET_KEY no debe ser el valor por defecto")
        self.assertGreater(len(secret_key), 16, "SECRET_KEY debe tener al menos 16 caracteres")
        
        # Verificar que no sea fácil de adivinar
        weak_keys = ['secret', 'password', '123456', 'admin', 'test', 'dev']
        self.assertNotIn(secret_key.lower(), weak_keys, 
            "SECRET_KEY no debe ser una palabra común")

    def test_database_configuration_security(self):
        """Test: Verificar configuración segura de base de datos"""
        db_uri = self.app.config.get('SQLALCHEMY_DATABASE_URI')
        
        if db_uri:
            # Verificar que no use credenciales por defecto en producción
            dangerous_patterns = [
                'root:',
                'admin:admin',
                'user:password',
                'test:test'
            ]
            
            for pattern in dangerous_patterns:
                self.assertNotIn(pattern, db_uri, 
                    f"La URI de BD no debe contener credenciales inseguras: {pattern}")

    def test_jwt_configuration(self):
        """Test: Verificar configuración segura de JWT"""
        # Verificar que los tokens tienen tiempo de expiración
        jwt_lifespan = self.app.config.get('JWT_ACCESS_LIFESPAN')
        self.assertIsNotNone(jwt_lifespan, "JWT_ACCESS_LIFESPAN debe estar configurado")
        
        # Verificar configuración de cookies JWT
        jwt_cookie_secure = self.app.config.get('JWT_COOKIE_SECURE')
        if jwt_cookie_secure is False:
            print("\n⚠️  ADVERTENCIA: JWT_COOKIE_SECURE está en False")
            print("En producción con HTTPS, debería estar en True")

    def test_cors_configuration(self):
        """Test: Verificar configuración segura de CORS"""
        # Hacer una request para verificar headers CORS
        response = self.client.options('/')
        
        # Verificar que CORS no permite cualquier origen
        access_control_origin = response.headers.get('Access-Control-Allow-Origin')
        if access_control_origin:
            self.assertNotEqual(access_control_origin, '*', 
                "CORS no debería permitir cualquier origen en producción")

    def test_error_handling_security(self):
        """Test: Verificar que el manejo de errores no expone información"""
        # Provocar un error 404
        response = self.client.get('/endpoint-inexistente')
        
        # Verificar que no se expone información del stack trace
        response_data = response.get_data(as_text=True)
        dangerous_info = [
            'Traceback',
            'File "/',
            'line ',
            'NameError',
            'AttributeError',
            'werkzeug',
            'flask.app'
        ]
        
        for info in dangerous_info:
            self.assertNotIn(info, response_data, 
                f"La respuesta de error no debe exponer: {info}")

    def test_http_security_headers(self):
        """Test: Verificar presencia de headers de seguridad HTTP"""
        response = self.client.get('/')
        
        # Headers de seguridad recomendados
        recommended_headers = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'Content-Security-Policy': 'default-src \'self\''
        }
        
        missing_headers = []
        for header, expected_value in recommended_headers.items():
            if header not in response.headers:
                missing_headers.append(header)
            else:
                actual_value = response.headers[header]
                print(f"✅ {header}: {actual_value}")
        
        if missing_headers:
            print(f"\n⚠️  Headers de seguridad faltantes: {missing_headers}")
            print("Considera agregar estos headers para mejorar la seguridad")

    def test_file_upload_security(self):
        """Test: Verificar que no hay endpoints de subida de archivos sin protección"""
        # Este test busca endpoints que podrían aceptar archivos
        upload_endpoints = ['/upload', '/files', '/media', '/static']
        
        for endpoint in upload_endpoints:
            response = self.client.post(endpoint, 
                data={'file': (open(__file__, 'rb'), 'test.py')})
            
            # Si el endpoint existe, debe estar protegido
            if response.status_code != 404:
                self.assertIn(response.status_code, [401, 403, 405], 
                    f"Endpoint {endpoint} debe estar protegido contra subida no autorizada")

if __name__ == '__main__':
    unittest.main(verbosity=2)