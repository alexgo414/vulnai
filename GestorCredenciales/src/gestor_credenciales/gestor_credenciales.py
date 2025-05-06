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

    @require(lambda servicio, usuario: servicio and usuario)
    @require(lambda servicio: all(c not in ";&|" for c in servicio))
    @require(lambda password: len(password) >= 12)
    @require(lambda password: any(c.isupper() for c in password))
    @require(lambda password: any(c.islower() for c in password))
    @require(lambda password: any(c.isdigit() for c in password))
    @require(lambda password: any(c in "!@#$%^&*" for c in password))
    @ensure(lambda servicio, usuario, result: result is None)
    def añadir_credencial(self, clave_maestra: str, servicio: str, usuario: str, password: str) -> None:
        print(f"Gurt: {clave_maestra}")
        """Añade una nueva credencial al gestor."""
        if not self._verificar_clave(clave_maestra, self._clave_maestra_hashed):
            print(clave_maestra, self._clave_maestra_hashed, type(clave_maestra), type(self._clave_maestra_hashed))
            print(clave_maestra == self._clave_maestra_hashed)
            raise ErrorAutenticacion("Clave maestra incorrecta")
        if servicio not in self._credenciales:
            self._credenciales[servicio] = {}
        if usuario in self._credenciales[servicio]:
            raise ErrorCredencialExistente("La credencial ya existe")
        self._credenciales[servicio][usuario] = self._hash_clave(password)
        #verificar que el usuario no contenga caracteres especiales como ; & |.


    @require(lambda servicio: servicio)
    @ensure(lambda servicio, result: result is not None)
    def obtener_password(self, clave_maestra: str, servicio: str, usuario: str) -> str:
        """Recupera una contraseña almacenada."""
        if clave_maestra != self._clave_maestra_hashed:
            raise ErrorAutenticacion("Clave maestra incorrecta.")
        if servicio not in self._credenciales:
            raise ErrorServicioNoEncontrado("El servicio no se encuentra en la lista.")
        credencial = self._credenciales[servicio]
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
        if clave_maestra != self._clave_maestra_hashed:
            raise ErrorAutenticacion("Clave maestra incorrecta.")
        return list(self._credenciales.keys())

    def _hash_clave(self, clave: str) -> bytes:
        """Hashea una clave usando bcrypt."""
        hashed = bcrypt.hashpw(clave.encode('utf-8'), bcrypt.gensalt())
        return hashed.decode('utf-8')

    def _verificar_clave(self, clave: str, clave_hashed: str) -> bool:
        """Verifica si una clave coincide con su hash."""
        return bcrypt.checkpw(clave.encode('utf-8'), clave_hashed.encode('utf-8'))

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