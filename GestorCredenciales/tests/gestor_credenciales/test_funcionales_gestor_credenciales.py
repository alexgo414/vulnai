import unittest
from src.gestor_credenciales.gestor_credenciales import GestorCredenciales, ErrorPoliticaPassword, ErrorAutenticacion
from hypothesis import given
from hypothesis.strategies import text


class TestFuncionalesGestorCredenciales(unittest.TestCase):
    def setUp(self):
        self.gestor = GestorCredenciales("claveMaestraSegura123!")

    # Tests funcionales
    def test_añadir_credencial(self):
        # Implementar según TDD
        clave_maestra = self.gestor._clave_maestra_hashed
        self.gestor.añadir_credencial(clave_maestra, "servicio1", "usuario1", "Password123!")
        self.assertIn("servicio1", self.gestor._credenciales)
        self.assertEqual(self.gestor._credenciales["servicio1"]['usuario'], "usuario1")
        self.assertNotEqual(self.gestor._credenciales["servicio1"]['password'], "Password123!")
        # self.fail()

    def test_recuperar_credencial(self):
        # Implementar según TDD
        clave_maestra = self.gestor._clave_maestra_hashed
        self.gestor.añadir_credencial(clave_maestra, "servicio2", "usuario2", "Password123!")
        password_recuperada = self.gestor.obtener_password(clave_maestra, "servicio2", "usuario2")
        self.assertNotEqual(password_recuperada, "Password123!")
        self.assertEqual(password_recuperada, self.gestor._credenciales["servicio2"]['password'])
        # self.fail()

    def test_listar_servicios(self):
        # Implementar según TDD
        clave_maestra = self.gestor._clave_maestra_hashed
        self.gestor.añadir_credencial(clave_maestra, "servicio3", "usuario3", "Password123!")
        servicios = self.gestor.listar_servicios(clave_maestra)
        self.assertIn("servicio3", servicios)

if __name__ == "__main__":
    unittest.main()
