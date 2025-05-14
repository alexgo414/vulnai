import unittest
import hashlib
import bcrypt
from icontract import require, ensure
import re
import logging
from io import StringIO

MENSAJE_ERROR_AUTENTICACION = "Clave maestra incorrecta"

# Configuración de logging seguro
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ErrorPoliticaPassword(Exception):
    pass

class ErrorAutenticacion(Exception):
    pass

class ErrorServicioNoEncontrado(Exception):
    pass

class ErrorCredencialExistente(Exception):
    pass

class GestorCredenciales:
    def __init__(self, clave_maestra: str):
        """Inicializa el gestor con una clave maestra."""
        # Validar que la clave maestra no sea vacía y cumpla la política
        if not clave_maestra:
            raise ValueError("La clave maestra no puede estar vacía")
        # Política de fortaleza:
        if (
            len(clave_maestra) < 8
            or not any(c.isupper() for c in clave_maestra)
            or not any(c.islower() for c in clave_maestra)
            or not any(c.isdigit() for c in clave_maestra)
            or not any(c in "!@#$%^&*" for c in clave_maestra)
        ):
            raise ValueError("La clave maestra no cumple la política de seguridad")
        self._clave_maestra_hashed = self._hash_clave(clave_maestra)
        self._credenciales = {}
        logger.info("GestorCredenciales inicializado")

    @require(lambda servicio, usuario: servicio and usuario, error=ErrorPoliticaPassword("El servicio y el usuario no pueden estar vacíos"))
    @require(lambda servicio: all(c not in ";&|" for c in servicio), error=ErrorPoliticaPassword("El servicio no puede contener caracteres especiales como ; & |"))
    @require(lambda password: len(password) >= 12, error=ErrorPoliticaPassword("La contraseña debe tener al menos 12 caracteres"))
    @require(lambda password: any(c.isupper() for c in password), error=ErrorPoliticaPassword("La contraseña debe contener al menos una letra mayúscula"))
    @require(lambda password: any(c.islower() for c in password), error=ErrorPoliticaPassword("La contraseña debe contener al menos una letra minúscula"))
    @require(lambda password: any(c.isdigit() for c in password), error=ErrorPoliticaPassword("La contraseña debe contener al menos un número"))
    @require(lambda password: any(c in "!@#$%^&*" for c in password), error=ErrorPoliticaPassword("La contraseña debe contener al menos un carácter especial"))
    @require(lambda usuario: all(c not in ";&|'--" for c in usuario), error=ErrorPoliticaPassword("El usuario no puede contener caracteres especiales como ; & | ' --"))
    @ensure(lambda servicio, usuario, result: result is None, error=ErrorCredencialExistente("La credencial ya existe"))
    @require(lambda servicio: all(c not in ";&|'--" for c in servicio), error=ErrorPoliticaPassword("El servicio no puede contener caracteres especiales como ; & | ' --"))
    def anyadir_credencial(self, clave_maestra: str, servicio: str, usuario: str, password: str) -> None:
        """Añade una nueva credencial al gestor."""
        if not self._verificar_clave(clave_maestra, self._clave_maestra_hashed):
            logger.warning("Intento de autenticación fallido")
            raise ErrorAutenticacion(MENSAJE_ERROR_AUTENTICACION)
        if servicio not in self._credenciales:
            self._credenciales[servicio] = {}
        if usuario in self._credenciales[servicio]:
            raise ErrorCredencialExistente("La credencial ya existe")
        self._credenciales[servicio][usuario] = {
            'usuario': usuario,
            'password': self._hash_clave(password)
        }
        logger.info(f"anyadir_credencial: servicio={servicio}, usuario={usuario}")

    @require(lambda servicio: servicio)
    @ensure(lambda servicio, result: result is not None)
    def obtener_password(self, clave_maestra: str, servicio: str, usuario: str) -> str:
            if not self._verificar_clave(clave_maestra, self._clave_maestra_hashed):
                logger.warning("Intento de autenticación fallido")
                raise ErrorAutenticacion(MENSAJE_ERROR_AUTENTICACION)
            if servicio not in self._credenciales or usuario not in self._credenciales[servicio]:
                logger.warning("Servicio o usuario no encontrado")
                raise ErrorServicioNoEncontrado("Servicio o usuario no encontrado")
            credencial = self._credenciales[servicio][usuario]
            # Verificar que credencial es un diccionario y tiene un hash válido
            if not isinstance(credencial, dict) or 'password' not in credencial:
                raise ValueError("Credencial corrupta o modificada")
            try:
                bcrypt.checkpw(b"dummy", credencial['password'])
            except ValueError:
                raise ValueError("Credencial corrupta o modificada")
            logger.info(f"obtener_password: servicio={servicio}, usuario={usuario}")
            return credencial['password']

    @require(lambda servicio: servicio)
    @ensure(lambda servicio, result: result is None)
    def eliminar_credencial(self, clave_maestra: str, servicio: str, usuario: str) -> None:
        """Elimina una credencial existente."""
        if not self._verificar_clave(clave_maestra, self._clave_maestra_hashed):
            logger.warning("Intento de autenticación fallido")
            raise ErrorAutenticacion(MENSAJE_ERROR_AUTENTICACION)
        if servicio not in self._credenciales or usuario not in self._credenciales[servicio]:
            logger.warning("Servicio o usuario no encontrado")
            raise ErrorServicioNoEncontrado("Servicio o usuario no encontrado")
        del self._credenciales[servicio][usuario]
        if not self._credenciales[servicio]:
            del self._credenciales[servicio]
        logger.info(f"eliminar_credencial: servicio={servicio}, usuario={usuario}")

    @ensure(lambda result: isinstance(result, list))
    def listar_servicios(self, clave_maestra: str) -> list:
        """Lista todos los servicios almacenados."""
        if not self._verificar_clave(clave_maestra, self._clave_maestra_hashed):
            logger.warning("Intento de autenticación fallido")
            raise ErrorAutenticacion(MENSAJE_ERROR_AUTENTICACION)
        logger.info("listar_servicios ejecutado")
        return list(self._credenciales.keys())

    def _hash_clave(self, clave: str) -> bytes:
        """Hashea una clave usando bcrypt."""
        return bcrypt.hashpw(clave.encode('utf-8'), bcrypt.gensalt())

    def _verificar_clave(self, clave: str, clave_hashed: bytes) -> bool:
        """Verifica si una clave coincide con su hash."""
        try:
            return bcrypt.checkpw(clave.encode('utf-8'), clave_hashed)
        except ValueError:
            return False