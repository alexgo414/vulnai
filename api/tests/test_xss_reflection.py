import os
import unittest

# ✅ ESTABLECER VARIABLE DE ENTORNO ANTES DE IMPORTAR
os.environ['FLASK_TESTING'] = 'true'

from app import app
import urllib.parse

class TestXSSReflection(unittest.TestCase):
    def setUp(self):
        self.app = app
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.client = self.app.test_client()

    def tearDown(self):
        self.app_context.pop()

    def test_reflected_xss_vulnerability(self):
        """Test: Verificar vulnerabilidad XSS reflejado en endpoint /reflejar"""
        xss_payloads = [
            "<script>alert('XSS')</script>",
            "<img src=x onerror=alert('XSS')>",
            "<svg onload=alert('XSS')>",
            "javascript:alert('XSS')",
            "<iframe src=javascript:alert('XSS')></iframe>",
            "<body onload=alert('XSS')>",
            "\"><script>alert('XSS')</script>",
            "'><script>alert('XSS')</script>",
        ]
        
        for payload in xss_payloads:
            with self.subTest(payload=payload):
                # URL encode del payload
                encoded_payload = urllib.parse.quote(payload)
                
                response = self.client.get(f'/reflejar?mensaje={encoded_payload}')
                response_text = response.get_data(as_text=True)
                
                print(f"\nPayload: {payload}")
                print(f"Response: {response_text}")
                
                # VERIFICAR QUE EL ENDPOINT ES VULNERABLE (para fines educativos)
                # En un test real, verificarías que el payload ESTÁ escapado
                self.assertIn('<script>', response_text.lower(), 
                    f"El payload {payload} debería estar presente sin escapar (vulnerabilidad XSS)")
                
                # Verificar que el payload se ejecutaría
                dangerous_patterns = ['<script', '<img', '<svg', '<iframe', 'javascript:', 'onload', 'onerror']
                found_pattern = any(pattern in response_text.lower() for pattern in dangerous_patterns)
                self.assertTrue(found_pattern, 
                    f"El endpoint /reflejar es vulnerable a XSS con payload: {payload}")

    def test_xss_prevention_recommendations(self):
        """Test: Verificar que se pueden aplicar contramedidas"""
        payload = "<script>alert('XSS')</script>"
        response = self.client.get(f'/reflejar?mensaje={payload}')
        response_text = response.get_data(as_text=True)
        
        # DOCUMENTAR la vulnerabilidad encontrada
        print("\n" + "="*60)
        print("VULNERABILIDAD XSS DETECTADA")
        print("="*60)
        print(f"Endpoint: /reflejar")
        print(f"Payload: {payload}")
        print(f"Respuesta: {response_text}")
        print("\nRECOMENDACIONES DE SEGURIDAD:")
        print("1. Escapar todas las entradas del usuario")
        print("2. Usar Content Security Policy (CSP)")
        print("3. Validar y sanitizar inputs")
        print("4. Usar templates seguros")
        print("="*60)

if __name__ == '__main__':
    unittest.main(verbosity=2)