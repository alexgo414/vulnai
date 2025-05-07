import unittest
import hashlib
import bcrypt
from icontract import require, ensure
import re

#añadir logs siempre y cuando se modifique cualquier cosa en el código. 
#verificar que cada clave maestra sea única, y que un usuario con una clave maetra diferente a otro usuario no pueda acceder a sus credenciales

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
        #añadir verificación de que la clave maestra no sea una cadena vacía
        #añadir verificación de que la clave maestra igual que con las contraseñas independientes. 
        """Inicializa el gestor con una clave maestra."""
        self._clave_maestra_hashed = self._hash_clave(clave_maestra)
        self._credenciales = {}

    @require(lambda servicio, usuario: servicio and usuario, error=ErrorPoliticaPassword("El servicio y el usuario no pueden estar vacíos"))
    @require(lambda servicio: all(c not in ";&|" for c in servicio), error=ErrorPoliticaPassword("El servicio no puede contener caracteres especiales como ; & |"))
    @require(lambda password: len(password) >= 12, error=ErrorPoliticaPassword("La contraseña debe tener al menos 12 caracteres"))
    @require(lambda password: any(c.isupper() for c in password), error=ErrorPoliticaPassword("La contraseña debe contener al menos una letra mayúscula"))
    @require(lambda password: any(c.islower() for c in password), error=ErrorPoliticaPassword("La contraseña debe contener al menos una letra minúscula"))
    @require(lambda password: any(c.isdigit() for c in password), error=ErrorPoliticaPassword("La contraseña debe contener al menos un número"))
    @require(lambda password: any(c in "!@#$%^&*" for c in password), error=ErrorPoliticaPassword("La contraseña debe contener al menos un carácter especial"))
    @require(lambda usuario: all(c not in ";&|" for c in usuario), error=ErrorPoliticaPassword("El usuario no puede contener caracteres especiales como ; & |"))
    @ensure(lambda servicio, usuario, result: result is None, error=ErrorCredencialExistente("La credencial ya existe")) # Esta postcondición asegura que la función no devuelve nada si la credencial ya existe
    def añadir_credencial(self, clave_maestra: str, servicio: str, usuario: str, password: str) -> None:
        """Añade una nueva credencial al gestor."""
        if not self._verificar_clave(clave_maestra, self._clave_maestra_hashed):
            raise ErrorAutenticacion("Clave maestra incorrecta")
        if servicio not in self._credenciales:
            self._credenciales[servicio] = {}
        if usuario in self._credenciales[servicio]:
            raise ErrorCredencialExistente("La credencial ya existe")
        self._credenciales[servicio][usuario] = {
            'usuario': usuario,
            'password': self._hash_clave(password)
        }
        # {
        #     "servicio1": {
        #         "usuario1": {
        #             "usuario": "usuario1",
        #             "password": <hash de password1>
        #         },
        #         "usuario2": {
        #             "usuario": "usuario2",
        #             "password": <hash de password2>
        #         }
        #     },
        #     "servicio2": {
        #         "usuario3": {
        #             "usuario": "usuario3",
        #             "password": <hash de password3>
        #         },
        #         "usuario4": {
        #             "usuario": "usuario4",
        #             "password": <hash de password4>
        #         }
        #     }
        # }
        #verificar que el usuario no contenga caracteres especiales como ; & |.


    @require(lambda servicio: servicio)
    @ensure(lambda servicio, result: result is not None)
    def obtener_password(self, clave_maestra: str, servicio: str, usuario: str) -> str:
        """Recupera una contraseña almacenada."""
        if not self._verificar_clave(clave_maestra, self._clave_maestra_hashed):
            raise ErrorAutenticacion("Clave maestra incorrecta.")
        if servicio not in self._credenciales:
            raise ErrorServicioNoEncontrado("El servicio no se encuentra en la lista.")
        credencial = self._credenciales[servicio][usuario]
        if credencial['usuario'] != usuario:
            raise ErrorServicioNoEncontrado("El usuario no coincide con el servicio.")
        return credencial['password']
    #añadir verificación de que la contraseña no se haya modificado de manera externa. 

    @require(lambda servicio: servicio)
    @ensure(lambda servicio, result: result is None)
    def eliminar_credencial(self, clave_maestra: str, servicio: str, usuario: str) -> None:
        """Elimina una credencial existente."""
        pass

    @ensure(lambda result: isinstance(result, list))
    def listar_servicios(self, clave_maestra: str) -> list:
        """Lista todos los servicios almacenados."""
        if not self._verificar_clave(clave_maestra, self._clave_maestra_hashed):
            raise ErrorAutenticacion("Clave maestra incorrecta.")
        return list(self._credenciales.keys())

    def _hash_clave(self, clave: str) -> str:
        """Hashea una clave usando bcrypt."""
        return bcrypt.hashpw(clave.encode('utf-8'), bcrypt.gensalt())

    def _verificar_clave(self, clave: str, clave_hashed: bytes) -> bool:
        """Verifica si una clave coincide con su hash."""
        return bcrypt.checkpw(clave.encode('utf-8'), clave_hashed)

    @require(lambda password: isinstance(password, str) and password, "La contraseña debe ser una cadena no vacía")
    def es_password_segura(self, password):
        if len(password) < 12:  # Cambiar a 12 para coincidir con el decorador
            return False
        if not re.search(r"[A-Z]", password):
            return False
        if not re.search(r"[a-z]", password):
            return False
        if not re.search(r"\d", password):
            return False
        if not re.search(r"[!@#$%^&*]", password):
            return False
        return True