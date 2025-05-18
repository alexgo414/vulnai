import unittest
from src.gestor_credenciales.gestor_credenciales import GestorCredenciales
from src.gestor_credenciales.errores import ErrorPoliticaPassword, ErrorAutenticacion, ErrorServicioNoEncontrado, ErrorCredencialExistente
from src.gestor_credenciales.secure_strategy_factory import SecureStrategyFactory

class TestFuncionalesGestorCredenciales(unittest.TestCase):
    def setUp(self):
        """
        Configura el entorno de pruebas.
        """
        user_role = "admin" # Ponemos user como ejemplo, puede ser admin o user, dependiendo de una implementación futura
        hash_manager = SecureStrategyFactory.get_hash_manager(user_role)
        self.gestor = GestorCredenciales(clave_maestra="claveMaestraSegura123!", hash_manager=hash_manager)

    def test_anyadir_credencial(self):
        """
        Verifica la funcionalidad de añadir credenciales.
        """
        clave_maestra = "claveMaestraSegura123!"
        # Test 1 - contraseña segura
        self.gestor.anyadir_credencial(clave_maestra, "servicio1", "usuario1", "Password123!")
        self.assertIn("servicio1", self.gestor._credenciales)
        self.assertEqual(self.gestor._credenciales["servicio1"]['usuario1']['usuario'], "usuario1")
        self.assertNotEqual(self.gestor._credenciales["servicio1"]['usuario1']['password'], "Password123!")
        # Test 2 - contraseña insegura
        with self.assertRaises(ErrorPoliticaPassword):
            self.gestor.anyadir_credencial(clave_maestra, "servicio1", "usuario1", "password")
        # Test 3 - credencial existente
        with self.assertRaises(ErrorCredencialExistente):
            self.gestor.anyadir_credencial(clave_maestra, "servicio1", "usuario1", "Password123!")
        # Test 4 - clave maestra incorrecta
        with self.assertRaises(ErrorAutenticacion):
            self.gestor.anyadir_credencial("claveIncorrecta", "servicio1", "usuario1", "Password123!")
        # Test 5 - servicio vacío
        with self.assertRaises(ErrorPoliticaPassword):
            self.gestor.anyadir_credencial(clave_maestra, "", "usuario1", "Password123!")
        # Test 6 - usuario vacío
        with self.assertRaises(ErrorPoliticaPassword):
            self.gestor.anyadir_credencial(clave_maestra, "servicio1", "", "Password123!")
        # Test 7 - contraseña vacía
        with self.assertRaises(ErrorPoliticaPassword):
            self.gestor.anyadir_credencial(clave_maestra, "servicio1", "usuario1", "")
        # Test 8 - servicio con caracteres no permitidos
        with self.assertRaises(ErrorPoliticaPassword):
            self.gestor.anyadir_credencial(clave_maestra, "servicio1&", "usuario1", "Password123!")
        # Test 9 - usuario con caracteres no permitidos
        with self.assertRaises(ErrorPoliticaPassword):
            self.gestor.anyadir_credencial(clave_maestra, "servicio1", "usuario1|", "Password123!")

    def test_recuperar_credencial(self):
        """
        Verifica la funcionalidad de recuperar credenciales.
        """
        clave_maestra = "claveMaestraSegura123!"
        self.gestor.anyadir_credencial(clave_maestra, "servicio2", "usuario2", "Password123!")
        password_recuperada = self.gestor.obtener_password(clave_maestra, "servicio2", "usuario2")
        self.assertNotEqual(password_recuperada, "Password123!")
        self.assertEqual(password_recuperada, self.gestor._credenciales["servicio2"]['usuario2']['password'])

    def test_eliminar_credencial(self):
        """
        Verifica la funcionalidad de eliminar credenciales.
        """
        clave_maestra = "claveMaestraSegura123!"
        self.gestor.anyadir_credencial(clave_maestra, "servicio2", "usuario2", "Password123!")
        self.gestor.eliminar_credencial(clave_maestra, "servicio2", "usuario2")
        with self.assertRaises(ErrorServicioNoEncontrado):
            self.gestor.obtener_password(clave_maestra, "servicio2", "usuario2")
    
    def test_listar_servicios(self):
        """
        Verifica la funcionalidad de listar servicios.
        """
        clave_maestra = "claveMaestraSegura123!"
        self.gestor.anyadir_credencial(clave_maestra, "servicio3", "usuario3", "Password123!")
        servicios = self.gestor.listar_servicios(clave_maestra)
        self.assertIn("servicio3", servicios)

if __name__ == "__main__":
    unittest.main()
