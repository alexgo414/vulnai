from log_manager import SecureLogManager, inicializar_log
from monitor import MonitorFunciones
from access_control import access_control
from config import REGISTRY_FILE, users

# Pedir usuario al inicio
usuario_actual = input("Introduce tu usuario: ").strip()
if usuario_actual not in users:
    print("Usuario no válido. Saliendo del programa...")
    exit(1)

# Inicializar el log
inicializar_log(usuario_actual, REGISTRY_FILE)

registry_manager = SecureLogManager(log_file=REGISTRY_FILE, user=usuario_actual, debug_mode=0)

registry = MonitorFunciones(log_manager=registry_manager, user=usuario_actual)

# ---- DEFINIR FUNCIONES MONITORIZABLES ----
@registry(nivel_log="warning")
@access_control
def accion_confidencial(user, tipo):
    return f"{user} accedió a datos de tipo {tipo}"

@registry(nivel_log="info")
@access_control
def ver_reporte(user):
    return f"{user} accedió al reporte..."

@registry(nivel_log="warning")
@access_control
def editar_usuario(user, nombre, rol="usuario"):
    return f"{user} editó el usuario {nombre} con rol {rol}"

# Mapear nombres de funciones a las funciones reales
funciones = {
    "ver_reporte": ver_reporte,
    "editar_usuario": editar_usuario,
    "accion_confidencial": accion_confidencial,
}

# ---- CÓDIGO DE PRUEBAS ----
seguir_probando = True
while seguir_probando:
    funcion_prueba = input("Por favor, escribe la función a llamar: ")
    if not funcion_prueba:
        print("Saliendo del programa...")
        seguir_probando = False
    else:
        if funcion_prueba in funciones:
            try:
                # Proporcionar argumentos adicionales según la función
                if funcion_prueba == "accion_confidencial":
                    resultado = funciones[funcion_prueba](usuario_actual, tipo="confidencial")
                elif funcion_prueba == "editar_usuario":
                    resultado = funciones[funcion_prueba](usuario_actual, nombre="nuevo_usuario", rol="normal_user")
                else:
                    resultado = funciones[funcion_prueba](usuario_actual)
                print(resultado)
            except PermissionError as e:
                print(e)
        else:
            print("Función no soportada")