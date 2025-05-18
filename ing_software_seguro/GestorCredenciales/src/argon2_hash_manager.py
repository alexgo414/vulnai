from .hash_manager import IHashManager
import argon2

class Argon2HashManager(IHashManager):
    def hash(self, clave: str) -> str:
        return argon2.PasswordHasher().hash(clave)
    def verify(self, clave: str, clave_hashed: str) -> bool:
        try:
            return argon2.PasswordHasher().verify(clave_hashed, clave)
        except argon2.exceptions.VerifyMismatchError:
            return False