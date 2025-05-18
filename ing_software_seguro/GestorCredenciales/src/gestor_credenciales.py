from icontract import require, ensure
from .hash_manager import IHashManager
from .bcrypt_hash_manager import BcryptHashManager
from .argon2_hash_manager import Argon2HashManager
from .auditor import Auditor
from .validaciones import validar_nombre, validar_password
from .errores import (
    ErrorAutenticacion,
    ErrorServicioNoEncontrado,
    ErrorCredencialExistente
)

MENSAJE_NO_ENCONTRADO = "Servicio o usuario no encontrado"
MENSAJE_CLAVE_MAESTRA_INCORRECTA = "Clave maestra incorrecta"
MENSAJE_AUTENTICACION_FALLIDA = "Intento de autenticación fallido"

class GestorCredenciales:
    def __init__(self, clave_maestra: str, hash_manager: IHashManager = None, auditor: Auditor = None):
        """
        Inicializa el gestor con una clave maestra.
        :param clave_maestra: Clave maestra para proteger las credenciales.
        :param hash_manager: Implementación de IHashManager (por defecto, BcryptHashManager).
        :param auditor: Auditor para registrar acciones (por defecto, Auditor estándar).
        :raises ValueError: Si la clave maestra no cumple la política de seguridad.
        """
        self.hash_manager = hash_manager or BcryptHashManager() # Ponemos BcryptHashManager como por defecto, aunque podríamos poner Argon2HashManager
        self.auditor = auditor or Auditor()
        if not clave_maestra or len(clave_maestra) < 8 \
            or not any(c.isupper() for c in clave_maestra) \
            or not any(c.islower() for c in clave_maestra) \
            or not any(c.isdigit() for c in clave_maestra) \
            or not any(c in "!@#$%^&*" for c in clave_maestra):
            raise ValueError("La clave maestra no cumple la política de seguridad")
        self._clave_maestra_hashed = self.hash_manager.hash(clave_maestra)
        self._credenciales = {}
        self.auditor.info("GestorCredenciales inicializado")

    def anyadir_credencial(self, clave_maestra: str, servicio: str, usuario: str, password: str) -> None:
        """
        Añade una nueva credencial al gestor.
        :param clave_maestra: Clave maestra para autenticar la operación.
        :param servicio: Nombre del servicio.
        :param usuario: Nombre de usuario.
        :param password: Contraseña del usuario.
        :raises ErrorAutenticacion: Si la clave maestra es incorrecta.
        :raises ErrorCredencialExistente: Si la credencial ya existe.
        :raises ErrorPoliticaPassword: Si la contraseña o los nombres no cumplen la política.
        """

        # Usamos validaciones para lanzar excepciones personalizadas
        validar_nombre(servicio, "servicio")
        validar_nombre(usuario, "usuario")
        validar_password(password)

        if not self.hash_manager.verify(clave_maestra, self._clave_maestra_hashed):
            self.auditor.warning(MENSAJE_AUTENTICACION_FALLIDA)
            raise ErrorAutenticacion(MENSAJE_CLAVE_MAESTRA_INCORRECTA)
        if servicio not in self._credenciales:
            self._credenciales[servicio] = {}
        if usuario in self._credenciales[servicio]:
            raise ErrorCredencialExistente("La credencial ya existe")
        self._credenciales[servicio][usuario] = {
            'usuario': usuario,
            'password': self.hash_manager.hash(password)
        }
        self.auditor.info(f"anyadir_credencial: servicio={servicio}, usuario={usuario}")

    @require(lambda servicio: servicio)
    @require(lambda usuario: usuario)
    @ensure(lambda servicio, usuario, result: result is not None)
    def obtener_password(self, clave_maestra: str, servicio: str, usuario: str) -> str:
        """
        Recupera una contraseña almacenada.
        :param clave_maestra: Clave maestra para autenticar la operación.
        :param servicio: Nombre del servicio.
        :param usuario: Nombre de usuario.
        :return: Contraseña hasheada almacenada.
        :raises ErrorAutenticacion: Si la clave maestra es incorrecta.
        :raises ErrorServicioNoEncontrado: Si el servicio o usuario no existen.
        :raises ValueError: Si la credencial está corrupta.
        """
        if not self.hash_manager.verify(clave_maestra, self._clave_maestra_hashed):
            self.auditor.warning(MENSAJE_AUTENTICACION_FALLIDA)
            raise ErrorAutenticacion(MENSAJE_CLAVE_MAESTRA_INCORRECTA)
        if servicio not in self._credenciales or usuario not in self._credenciales[servicio]:
            self.auditor.warning(MENSAJE_NO_ENCONTRADO)
            raise ErrorServicioNoEncontrado(MENSAJE_NO_ENCONTRADO)
        credencial = self._credenciales[servicio][usuario]
        if not isinstance(credencial, dict) or 'password' not in credencial:
            raise ValueError("Credencial corrupta o modificada")
        self.auditor.info(f"obtener_password: servicio={servicio}, usuario={usuario}")
        return credencial['password']

    @require(lambda servicio: servicio)
    @require(lambda usuario: usuario)
    @ensure(lambda servicio, usuario, result: result is None)
    def eliminar_credencial(self, clave_maestra: str, servicio: str, usuario: str) -> None:
        """
        Elimina una credencial existente.
        :param clave_maestra: Clave maestra para autenticar la operación.
        :param servicio: Nombre del servicio.
        :param usuario: Nombre de usuario.
        :raises ErrorAutenticacion: Si la clave maestra es incorrecta.
        :raises ErrorServicioNoEncontrado: Si el servicio o usuario no existen.
        """
        if not self.hash_manager.verify(clave_maestra, self._clave_maestra_hashed):
            self.auditor.warning(MENSAJE_AUTENTICACION_FALLIDA)
            raise ErrorAutenticacion(MENSAJE_CLAVE_MAESTRA_INCORRECTA)
        if servicio not in self._credenciales or usuario not in self._credenciales[servicio]:
            self.auditor.warning(MENSAJE_NO_ENCONTRADO)
            raise ErrorServicioNoEncontrado(MENSAJE_NO_ENCONTRADO)
        del self._credenciales[servicio][usuario]
        if not self._credenciales[servicio]:
            del self._credenciales[servicio]
        self.auditor.info(f"eliminar_credencial: servicio={servicio}, usuario={usuario}")

    @ensure(lambda result: isinstance(result, list))
    def listar_servicios(self, clave_maestra: str) -> list:
        """
        Lista todos los servicios almacenados.
        :param clave_maestra: Clave maestra para autenticar la operación.
        :return: Lista de nombres de servicios.
        :raises ErrorAutenticacion: Si la clave maestra es incorrecta.
        """
        if not self.hash_manager.verify(clave_maestra, self._clave_maestra_hashed):
            self.auditor.warning(MENSAJE_AUTENTICACION_FALLIDA)
            raise ErrorAutenticacion(MENSAJE_CLAVE_MAESTRA_INCORRECTA)
        self.auditor.info("listar_servicios ejecutado")
        return list(self._credenciales.keys())