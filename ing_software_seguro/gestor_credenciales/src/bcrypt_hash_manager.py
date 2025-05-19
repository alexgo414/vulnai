import bcrypt
from .hash_manager import IHashManager

class BcryptHashManager(IHashManager):
    def hash(self, clave: str) -> bytes:
        return bcrypt.hashpw(clave.encode('utf-8'), bcrypt.gensalt())

    def verify(self, clave: str, clave_hashed: bytes) -> bool:
        try:
            return bcrypt.checkpw(clave.encode('utf-8'), clave_hashed)
        except TypeError:
            return False