import unittest
from src.gestor_credenciales.gestor_credenciales import GestorCredenciales, ErrorPoliticaPassword, ErrorAutenticacion
from hypothesis import given
from hypothesis.strategies import text


class TestSeguridadGestorCredenciales(unittest.TestCase):
    def setUp(self):
        self.gestor = GestorCredenciales("claveMaestraSegura123!")

    # Tests de seguridad

    # Política de passwords:
    #   Mínimo 8 caracteres
    #   Al menos una letra mayúscula
    #   Al menos una letra minúscula
    #   Al menos un número
    #   Al menos un símbolo especial(!@  # $%^&* etc.)


    def test_password_no_almacenado_en_plano(self):
        servicio = "GitHub"
        usuario = "user1"
        password = "PasswordSegura123!"

        self.gestor.añadir_credencial("claveMaestraSegura123!", servicio, usuario, password)

        # Verificar que el almacenamiento no contiene el password en plano
        stored_password = self.gestor._credenciales[servicio][usuario]
        self.assertNotEqual(stored_password, password, "La contraseña se almacenó en texto plano")
        
        # Chequeo adicional: Verificar que el valor almacenado no contiene el password original
        self.assertFalse(password in str(stored_password), "El password aparece en el almacenamiento")
        
        # Chequeo adicional: Verificar que el formato parece cifrado (ejemplo: longitud diferente)
        self.assertNotEqual(len(stored_password), len(password), "El formato no parece cifrado")

    # Este es un test parametrizado usando subTests
    def test_deteccion_inyeccion_servicio(self):
        casos_inyeccion = ["serv;icio", "servicio|mal", "servicio&", "servicio'--"]
        for servicio in casos_inyeccion:
            with self.subTest(servicio=servicio):
                with self.assertRaises(ValueError):
                    self.gestor.añadir_credencial(
                        "claveMaestra123!",
                        servicio,
                        "usuario_test",
                        "PasswordSegura123!"
                    )

    # Test con Fuzzing (usa Hypothesis)
    @given(text(min_size=1, max_size=20))  # Genera contraseñas de hasta 20 caracteres
    def test_fuzz_politica_passwords_con_passwords_debiles(self, contrasena_generada):
        """Prueba diferentes passwords que no cumplen la política
        Args:
            contrasena_generada (str): La contraseña generada por Hypothesis

        Returns:
            Nada. Es un test
        """

        try:
            self.gestor.añadir_credencial("claveMaestraSegura123!", "servicio", "usuario", contrasena_generada)
        except ErrorPoliticaPassword:
            pass  # ✅ Comportamiento esperado
        except Exception as e:
            self.fail(f"Se lanzó una excepción inesperada: {e}")
        else:
            # Si la contraseña fue aceptada, debería cumplir con las condiciones
            self.assertTrue(self.gestor.es_password_segura(contrasena_generada),
                            f"Se aceptó una contraseña débil: {contrasena_generada}")

    def test_politica_passwords_con_password_robusta(self):
        servicio = "GitHub"
        usuario = "user1"
        password = "Segura123!"

        try:
            self.gestor.añadir_credencial("claveMaestraSegura123!", servicio, usuario, password)
            self.assertTrue(self.gestor.es_password_segura(password), "La contraseña robusta no fue aceptada")
        except ErrorPoliticaPassword:
            self.fail("La contraseña robusta fue rechazada incorrectamente")


    def test_acceso_con_clave_maestra_erronea(self):
        self.gestor.añadir_credencial("claveMaestraSegura123!", "GitHub", "user1", "PasswordSegura123!")

        with self.assertRaises(ErrorAutenticacion):
            self.gestor.obtener_password("claveIncorrecta", "GitHub", "user1")


if __name__ == "__main__":
    unittest.main()
