from .bcrypt_hash_manager import BcryptHashManager
from .argon2_hash_manager import Argon2HashManager

class SecureStrategyFactory:
    @staticmethod
    def get_hash_manager(user_role: str):
        """
        Devuelve la estrategia de hash adecuada según el rol del usuario.
        """
        if user_role == "admin":
            return Argon2HashManager()
        else:
            return BcryptHashManager()