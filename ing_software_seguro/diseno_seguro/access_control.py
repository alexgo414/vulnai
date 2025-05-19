from functools import wraps
from config import users, access_rules, role_hierarchy

def has_access(user_role, required_role):
    """
    Verifica si el rol del usuario tiene acceso al rol requerido.
    """
    if user_role == required_role:
        return True
    return required_role in role_hierarchy.get(user_role, {}).get("implied_roles", set())

def access_control(func):
    @wraps(func)
    def wrapper(user, *args, **kwargs):
        # Verificar si el usuario existe
        if user not in users:
            raise PermissionError(f"Acceso denegado: el usuario '{user}' no existe.")

        # Obtener el rol del usuario
        user_role = users[user]["rol"]

        # Obtener el rol requerido para la función
        required_role = access_rules.get(func.__name__, {}).get("rol")

        if not required_role:
            raise PermissionError(f"Acceso denegado: no hay reglas de acceso definidas para '{func.__name__}'.")

        # Verificar si el rol del usuario cumple con el rol requerido
        if not has_access(user_role, required_role):
            raise PermissionError(f"Acceso denegado: el rol '{user_role}' no tiene permiso para ejecutar '{func.__name__}'.")

        # Si pasa todas las verificaciones, ejecutar la función
        return func(user, *args, **kwargs)

    return wrapper