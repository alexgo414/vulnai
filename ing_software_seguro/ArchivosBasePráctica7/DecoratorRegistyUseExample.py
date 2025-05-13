""" doc """
from pkg_resources import register_loader_type
from log_util import verificar_cadena_hashes, anadir_al_log
from functools import wraps

# imports necesarios

REGISTRY_FILE = "registry.log"

# --- Datos de prueba: usuarios y roles ---
users = {
    "alice": {"rol": "admin"},
    "bob": {"rol": "normal_user"},
    "eve": {"rol": "admin"},
}

# --- Reglas de acceso por función ---
access_rules = {
    "accion_confidencial": {"rol": "admin"},
    "ver_reporte": {"rol": "normal_user"},
    "editar_usuario": {"rol": "admin"},
}

# --- Jerarquía de roles ---
role_hierarchy = {
    "admin": {"implied_roles": {"normal_user"}},  # admin incluye normal_user
    "normal_user": {"implied_roles": set()},
}

class SecureLogManager:
    def __init__(self, log_file, user, debug_mode=0):
        self.log_file = log_file
        self.debug_mode = debug_mode
        self.user = user

    def verificar_cadena_hashes(self):
        return verificar_cadena_hashes(self.log_file)
    
    def anadir_al_log(self, nivel_log, user, funcion, parametros, resultado):
        anadir_al_log(nivel_log, user, funcion, parametros, resultado, self.log_file)

class MonitorFunciones:
    def __init__(self, log_manager, user):
        self.log_manager = log_manager
        self.user = user

    def __call__(self, func=None, *, nivel_log="info"):
        def decorator(f):
            def wrapper(*args, **kwargs):
                resultado = f(*args, **kwargs)
                parametros = kwargs.copy()
                # Si hay parámetros posicionales, puedes mapearlos si quieres
                self.log_manager.anadir_al_log(
                    nivel_log,
                    self.user,
                    f.__name__,
                    parametros,
                    resultado
                )
                return resultado
            return wrapper

        if func is None:
            return decorator
        else:
            return decorator(func)

# Pedir usuario al inicio
usuario_actual = input("Introduce tu usuario: ").strip()

registry_manager = SecureLogManager(log_file=REGISTRY_FILE, user=usuario_actual, debug_mode=0)

def has_access(user_role, required_role):
    if user_role == required_role:
        return True
    # Verificar si hereda el rol requerido
    return required_role in role_hierarchy.get(user_role, {}).get("implied_roles", set())

def access_control(func):
    @wraps(func)
    def wrapper(user, *args, **kwargs):
        if user not in users:
            registry_manager.anadir_al_log(
                nivel_log="error",
                user=user,
                funcion=func.__name__,
                parametros={"user": user},
                resultado=f"Acceso denegado: usuario desconocido '{user}'"
            )
            raise PermissionError(f"{user} | Acceso denegado: usuario desconocido '{user}'")

        user_role = users[user]["rol"]
        required_role = access_rules.get(func.__name__, {}).get("rol")

        if required_role is None:
            registry_manager.anadir_al_log(
                nivel_log="error",
                user=user,
                funcion=func.__name__,
                parametros={"user": user},
                resultado=f"Acceso denegado: no hay regla de acceso definida para '{func.__name__}'"
            )
            raise PermissionError(f"{user} | Acceso denegado: no hay regla de acceso definida para '{func.__name__}'")

        # Verificar si el rol del usuario cumple con el requerido
        if not has_access(user_role, required_role):
            registry_manager.anadir_al_log(
                nivel_log="error",
                user=user,
                funcion=func.__name__,
                parametros={"user": user},
                resultado=f"Acceso denegado para '{user}' con rol '{user_role}' a '{func.__name__}' (requiere '{required_role}')"
            )
            raise PermissionError(f"{user} | Acceso denegado: rol '{user_role}' no tiene acceso a '{func.__name__}' (requiere '{required_role}')")

        return func(user, *args, **kwargs)
    return wrapper

# Verificar la cadena de hashes
if registry_manager.verificar_cadena_hashes():
    print(f"El log 2 del fichero {REGISTRY_FILE} está intacto.")
else:
    print(f"El log 2 del fichero {REGISTRY_FILE} ha sido modificado o está corrupto.")

registry = MonitorFunciones(log_manager=registry_manager, user=usuario_actual)

# ---- DEFINIR FUNCIONES MONITORIZABLES  ----

@registry(nivel_log="warning")
@access_control
def accion_confidencial(user, tipo):
    return f"{user} accedió a datos de tipo {tipo}"

@registry(nivel_log="info")
@access_control
def ver_reporte(user):
    return "{user} accedió al reporte..."

@registry(nivel_log="warning")
@access_control
def editar_usuario(user, nombre, rol="usuario"):
    return f"{user} editó el usuario {nombre} con rol {rol}"

# ---- CÓDIGO DE PRUEBAS ----

# Diccionario para mapear las funciones a sus respectivas llamadas
funciones_soportadas = {
    "ver_reporte": lambda user: ver_reporte(user),
    "editar_usuario": lambda user: editar_usuario(user, nombre="admin", rol="administrador"),
    "accion_confidencial_c": lambda user: accion_confidencial(user, tipo="confidencial"),
    "accion_confidencial_s": lambda user: accion_confidencial(user, tipo="secreto")
}

seguir_probando = True
while seguir_probando:
    funcion_prueba = input("Por favor, escribe la función a llamar: ")
    if not funcion_prueba:
        print("Saliendo del programa...")
        seguir_probando = False
    else:
        if funcion_prueba in funciones_soportadas:
            try:
                resultado = funciones_soportadas[funcion_prueba](usuario_actual)
                print(resultado)
            except PermissionError as e:
                print(e)
        else:
            print("Función no soportada")
