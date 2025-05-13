import unittest
from src.gestor_credenciales.utils import saludar

class TestUtils(unittest.TestCase):

    # Tests funcionales
    def test_saludar(self):
        assert saludar("Antonio") == "Hola, Antonio!"

if __name__ == "__main__":
        unittest.main()