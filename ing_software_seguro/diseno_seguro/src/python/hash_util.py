import hashlib

def hash_cadena(mensaje):
    """
    Calcula el hash de una cadena de texto.

    Parámetros:
        mensaje (str): Cadena de texto a hashear.

    Retorna:
        str: Hash de la cadena.
    """
    return hashlib.sha256(mensaje.encode()).hexdigest()