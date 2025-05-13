""" doc """
from pkg_resources import register_loader_type

# imports necesarios

REGISTRY_FILE = "registry.log"

registry_manager = SecureLogManager(log_file=REGISTRY_FILE, debug_mode=0)

# Verificar la cadena de hashes
if registry_manager.verificar_cadena_hashes():
    print(f"El log 2 del fichero {REGISTRY_FILE} está intacto.")
else:
    print(f"El log 2 del fichero {REGISTRY_FILE} ha sido modificado o está corrupto.")

registry = MonitorFunciones(log_manager=registry_manager)

# ---- DEFINIR FUNCIONES MONITORIZABLES  ----

@registry(nivel_log="error")
def accion_confidencial(tipo):
    return f"Se accedió a datos de tipo {tipo}"

@registry(nivel_log="info")
def ver_reporte():
    return "Se accedió al reporte..."

@registry(nivel_log="warning")
def editar_usuario(nombre, rol="usuario"):
    return f"Se editó el usuario {nombre} con rol {rol}"

# ---- CÓDIGO DE PRUEBAS ----

# Diccionario para mapear las funciones a sus respectivas llamadas
funciones_soportadas = {
    "ver_reporte": lambda: ver_reporte(),
    "editar_usuario": lambda: editar_usuario(nombre="admin", rol="administrador"),
    "accion_confidencial_c": lambda: accion_confidencial(tipo="confidencial"),
    "accion_confidencial_s": lambda: accion_confidencial(tipo="secreto")
}

seguir_probando = True
while seguir_probando:
    # Leer el nombre de la función desde la consola
    funcion_prueba = input("Por favor, escribe la función a llamar: ")
    # Si el nombre de la función está vacío, salir del bucle
    if not funcion_prueba:
        print("Saliendo del programa...")
        seguir_probando = False  # Cambiamos la variable de control para salir del bucle
    else:
        # Verificar si la función está soportada
        if funcion_prueba in funciones_soportadas:
            # Llamar a la función correspondiente
            resultado = funciones_soportadas[funcion_prueba]()
            print(resultado)
        else:
            print("Función no soportada")
