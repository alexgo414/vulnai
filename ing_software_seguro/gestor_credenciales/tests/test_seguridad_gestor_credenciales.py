import unittest
from src.gestor_credenciales import GestorCredenciales
from src.errores import ErrorPoliticaPassword, ErrorAutenticacion, ErrorServicioNoEncontrado
import logging
from io import StringIO
from src.secure_strategy_factory import SecureStrategyFactory

logger = logging.getLogger()

class TestSeguridadGestorCredenciales(unittest.TestCase):
    def setUp(self):
        """
        Configura el entorno de pruebas.
        """
        user_role = "user" # Ponemos user como ejemplo, puede ser admin o user, dependiendo de una implementación futura
        hash_manager = SecureStrategyFactory.get_hash_manager(user_role)
        self.gestor = GestorCredenciales(clave_maestra="claveMaestraSegura123!", hash_manager=hash_manager)

    def test_password_no_almacenado_en_plano(self):
        """
        Verifica que la contraseña no se almacene en texto plano.
        """
        servicio = "GitHub"
        usuario = "user1"
        password = "PasswordSegura123!"

        self.gestor.anyadir_credencial("claveMaestraSegura123!", servicio, usuario, password)

        # Verificar que el almacenamiento no contiene el password en plano
        stored_password = self.gestor._credenciales[servicio][usuario]
        self.assertNotEqual(stored_password, password, "La contraseña se almacenó en texto plano")
        
        # Chequeo adicional: Verificar que el valor almacenado no contiene el password original
        self.assertNotIn(password, str(stored_password), "El password aparece en el almacenamiento")

        # Chequeo adicional: Verificar que el formato parece cifrado (ejemplo: longitud diferente)
        self.assertNotEqual(len(stored_password), len(password), "El formato no parece cifrado")

    def test_deteccion_inyeccion_servicio(self):
        """
        Verifica que se detecten intentos de inyección en el nombre del servicio.
        """
        casos_inyeccion = ["serv;icio", "servicio|mal", "servicio&", "servicio'--"]
        for servicio in casos_inyeccion:
            with self.subTest(servicio=servicio):
                with self.assertRaises(ErrorPoliticaPassword):
                    self.gestor.anyadir_credencial(
                        "claveMaestraSegura123!",
                        servicio,
                        "usuario_test",
                        "PasswordSegura123!abc"
                    )

    def test_acceso_con_clave_maestra_erronea(self):
        """
        Verifica que no se pueda acceder a las credenciales con una clave maestra incorrecta.
        """
        self.gestor.anyadir_credencial("claveMaestraSegura123!", "GitHub", "user1", "PasswordSegura123!")

        with self.assertRaises(ErrorAutenticacion):
            self.gestor.obtener_password("claveIncorrecta", "GitHub", "user1")

    def test_no_logging_contraseñas_sensibles(self):
        """
        Verifica que las contraseñas no se registren en los logs.
        """
        servicio = "GitHub"
        usuario = "user1"
        password = "PasswordSegura123!"
        
        log_stream = StringIO()
        handler = logging.StreamHandler(log_stream)
        logging.getLogger().addHandler(handler)
        
        try:
            self.gestor.anyadir_credencial("claveMaestraSegura123!", servicio, usuario, password)
            log_output = log_stream.getvalue()
            self.assertNotIn(password, log_output, "La contraseña aparece en los logs")
        finally:
            logging.getLogger().removeHandler(handler)
    
    def test_integridad_credenciales(self):
        """
        Verifica que las credenciales no puedan ser modificadas directamente.
        """
        servicio = "GitHub"
        usuario = "user1"
        password = "PasswordSegura123!"
        
        self.gestor.anyadir_credencial("claveMaestraSegura123!", servicio, usuario, password)
        
        # Intentar modificar directamente el almacenamiento interno
        self.gestor._credenciales[servicio][usuario] = "contraseña_modificada"
        
        # Verificar que el sistema detecta la modificación
        with self.assertRaises(ValueError):
            self.gestor.obtener_password("claveMaestraSegura123!", servicio, usuario)

    def test_clave_maestra_debil(self):
        """
        Verifica que no se permita el uso de claves maestras débiles.
        """
        claves_debiles = ["123", "password", "abc", ""]
        for clave in claves_debiles:
            with self.subTest(clave=clave):
                with self.assertRaises(ValueError):
                    GestorCredenciales(clave)

    def test_auditoria_acciones(self):
        """
        Verifica que las acciones de añadir, obtener y eliminar credenciales se registren correctamente.
        """
        servicio = "GitHub"
        usuario = "user1"
        password = "PasswordSegura123!"
        
        log_stream = StringIO()
        handler = logging.StreamHandler(log_stream)
        logger = logging.getLogger("GestorCredencialesAuditor")
        logger.setLevel(logging.INFO)
        logger.addHandler(handler)
        
        try:
            self.gestor.anyadir_credencial("claveMaestraSegura123!", servicio, usuario, password)
            self.gestor.obtener_password("claveMaestraSegura123!", servicio, usuario)
            self.gestor.eliminar_credencial("claveMaestraSegura123!", servicio, usuario)
            log_output = log_stream.getvalue()
            self.assertIn("anyadir_credencial: servicio=GitHub, usuario=user1", log_output, "No se registró la acción de añadir")
            self.assertIn("obtener_password: servicio=GitHub, usuario=user1", log_output, "No se registró la acción de obtener")
            self.assertIn("eliminar_credencial: servicio=GitHub, usuario=user1", log_output, "No se registró la acción de eliminar")
            self.assertNotIn(password, log_output, "La contraseña aparece en el log de auditoría")
        finally:
            logging.getLogger().removeHandler(handler)

    def test_deteccion_inyeccion_usuario(self):
        """
        Verifica que se detecten intentos de inyección en el nombre del usuario.
        """
        casos_inyeccion = ["user;123", "user|mal", "user&test", "user'--"]
        for usuario in casos_inyeccion:
            with self.subTest(usuario=usuario):
                with self.assertRaises(ErrorPoliticaPassword):
                    self.gestor.anyadir_credencial(
                        "claveMaestraSegura123!",
                        "GitHub",
                        usuario,
                        "PasswordSegura123!abc"
                    )

    def test_acceso_concurrente_claves_diferentes(self):
        """
        Verifica que no se pueda acceder a las credenciales con claves maestras diferentes.
        """
        servicio = "GitHub"
        usuario = "user1"
        password = "PasswordSegura123!"
        self.gestor.anyadir_credencial("claveMaestraSegura123!", servicio, usuario, password)
        gestor2 = GestorCredenciales("otraClaveMaestra123!")
        with self.assertRaises(ErrorServicioNoEncontrado):
            gestor2.obtener_password("otraClaveMaestra123!", servicio, usuario)
    
    def test_verify_invalid_hashed_value(self):
        """
        Verifica que el método verify no acepte valores hasheados inválidos.
        """
        hash_manager = SecureStrategyFactory.get_hash_manager("user")
        clave = "clave123"
        clave_hashed = "valor_invalido"  # No es un bytes válido
        self.assertFalse(hash_manager.verify(clave, clave_hashed))
    
    def test_eliminar_credencial_clave_incorrecta(self):
        """
        Verifica que no se pueda eliminar una credencial con una clave maestra incorrecta.
        """
        servicio = "GitHub"
        usuario = "user1"
        password = "PasswordSegura123!"
        self.gestor.anyadir_credencial("claveMaestraSegura123!", servicio, usuario, password)
        with self.assertRaises(ErrorAutenticacion):
            self.gestor.eliminar_credencial("claveIncorrecta", servicio, usuario)
    
    def test_eliminar_credencial_servicio_no_encontrado(self):
        """
        Verifica que no se pueda eliminar una credencial de un servicio inexistente.
        """
        servicio = "GitHub"
        usuario = "user1"
        password = "PasswordSegura123!"
        self.gestor.anyadir_credencial("claveMaestraSegura123!", servicio, usuario, password)
        with self.assertRaises(ErrorServicioNoEncontrado):
            self.gestor.eliminar_credencial("claveMaestraSegura123!", "ServicioInexistente", usuario)

    def test_listar_servicios_clave_incorrecta(self):
        """
        Verifica que no se puedan listar los servicios con una clave maestra incorrecta.
        """
        servicio = "GitHub"
        usuario = "user1"
        password = "PasswordSegura123!"
        self.gestor.anyadir_credencial("claveMaestraSegura123!", servicio, usuario, password)
        with self.assertRaises(ErrorAutenticacion):
            self.gestor.listar_servicios("claveIncorrecta")

if __name__ == "__main__":
    unittest.main()
