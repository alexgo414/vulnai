from abc import ABC, abstractmethod

class IHashManager(ABC):
    @abstractmethod
    def hash(self, clave: str) -> bytes:
        pass

    @abstractmethod
    def verify(self, clave: str, clave_hashed: bytes) -> bool:
        pass