from .errores import ErrorPoliticaPassword

CARACTERES_PROHIBIDOS = ";&|'"

def validar_nombre(nombre: str, campo: str):
    if not nombre:
        raise ErrorPoliticaPassword(f"El nombre de {campo} no puede estar vacío")
    if any(c in CARACTERES_PROHIBIDOS for c in nombre):
        raise ErrorPoliticaPassword(f"El nombre de {campo} contiene caracteres no permitidos")

def validar_password(password: str):
    if len(password) < 12 \
        or not any(c.isupper() for c in password) \
        or not any(c.islower() for c in password) \
        or not any(c.isdigit() for c in password) \
        or not any(c in "!@#$%^&*" for c in password):
        raise ErrorPoliticaPassword("La contraseña no cumple la política de seguridad")