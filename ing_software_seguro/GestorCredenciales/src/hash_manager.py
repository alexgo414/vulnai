from abc import ABC, abstractmethod

class IHashManager(ABC):
    @abstractmethod
    def hash(self, clave: str) -> bytes:
        pass # pragma: no cover

    @abstractmethod
    def verify(self, clave: str, clave_hashed: bytes) -> bool:
        pass # pragma: no cover