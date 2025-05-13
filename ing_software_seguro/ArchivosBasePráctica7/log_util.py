from datetime import datetime, timezone
import logging
import os

from src.python.hash_util import hash_cadena

LOG_FILE = "RegistroSeguro.log"

# Definir el formateador personalizado
formatter = logging.Formatter(
    fmt="%(asctime)s: %(levelname)-8s | %(message)s |",
    datefmt="%Y-%m-%d %H:%M:%S"
)

def existe_archivo(archivo):
    return os.path.exists(archivo)

def archivo_vacio(archivo):
    return  os.path.getsize(archivo) == 0

def get_tiempo_legible():
    """
    Devuelve el tiempo actual en un formato legible
    """
    # Obtener la hora actual en UTC
    tiempo_utc = datetime.now(timezone.utc)

    # Formatear la hora en UTC con la zona horaria
    tiempo_legible = tiempo_utc.strftime("%Y-%m-%d %H:%M:%S")
    return tiempo_legible

# Función para configurar el logging en un fichero
def configure_logging(log_file=LOG_FILE):
    """
    Configura el logger y lee el dato de la última línea del archivo de log.

    Parámetros:
        log_file (str): Ruta del archivo de log.
    """
    pass

def inicializar_log(usuario_id, log_file=LOG_FILE):
    """
    Inicializa el log seguro con la primera entrada especial.
    """
    tiempo = get_tiempo_legible()
    nivel = "INFO"
    mensaje = f"Inicialización del log en el tiempo {tiempo} UTC"
    # El hash se calcula solo sobre el mensaje (sin encadenar)
    hash_log = hash_cadena(mensaje)
    linea = f"{tiempo}: {nivel} | {usuario_id} | '{hash_log}': {mensaje} |"
    with open(log_file, "w", encoding="utf-8") as f:
        f.write(linea + "\n")

def anadir_al_log(nivel_log, user, funcion, parametros, resultado, log_file=LOG_FILE):
    """
    Añade una entrada al log seguro siguiendo el formato especificado.
    """
    log_levels = {
        "warning": logging.warning,
        "error": logging.error,
        "debug": logging.debug,
        "info": logging.info
    }

    tiempo = get_tiempo_legible()
    # Formatea los parámetros como string
    params_str = ", ".join([f"{k}={repr(v)}" for k, v in parametros.items()])
    mensaje = f"Llamada a la función '{funcion}' con parámetros: {params_str} -> Resultado: {resultado}"

    # Leer el hash anterior (de la última línea)
    hash_anterior = None
    if existe_archivo(log_file) and not archivo_vacio(log_file):
        with open(log_file, "r", encoding="utf-8") as f:
            lineas = f.readlines()
            if lineas:
                ultima_linea = lineas[-1].strip()
                partes = ultima_linea.split("|")
                if len(partes) >= 3:
                    # El hash está entre comillas simples y dos puntos:  'HASH':
                    hash_part = partes[2].strip()
                    if hash_part.startswith("'") and hash_part.endswith("':"):
                        hash_anterior = hash_part[1:-2]

    # Calcular el hash encadenado
    if hash_anterior:
        hash_actual = hash_cadena(mensaje + hash_anterior)
    else:
        hash_actual = hash_cadena(mensaje)

    linea_log = f"{tiempo}: {nivel_log.upper()} | {user} | '{hash_actual}': {mensaje} |"

    # Escribir en el archivo de log
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(linea_log + "\n")

    # Llama también al logger de Python si quieres (opcional)
    if nivel_log in log_levels:
        log_levels[nivel_log](mensaje)

def leer_ultima_linea_log(log_file):
    """
    Lee la última línea del archivo de log y extrae el dato después de la fecha y el tipo de log.

    Parámetros:
        log_file (str): Ruta del archivo de log.

    Retorna:
        str: El dato extraído, o None si el archivo no existe o está vacío.
    """
    if not existe_archivo(log_file) or archivo_vacio(log_file):
        return None  # Si no hay log, no hay dato

    with open(log_file, "r", encoding="utf-8") as f:
        lineas = f.readlines()

    if not lineas:
        return None  # Archivo vacío

    ultima_linea = lineas[-1].strip()
    partes = ultima_linea.split("|")
    if len(partes) < 3:
        return None  # Formato incorrecto

    # Suponiendo que el dato está en la tercera columna
    dato = partes[2].strip()
    return dato

def verificar_cadena_hashes(log_file=LOG_FILE):
    """
    Verifica que la cadena de hashes en el archivo de log sea correcta.

    Parámetros:
        log_file (str): Ruta del archivo de log.

    Retorna:
        bool: True si la cadena de hashes es correcta, False si hay algún error.
    """
    if not existe_archivo(log_file) or archivo_vacio(log_file):
        return True  # Si no hay log, no hay corrupción

    with open(log_file, "r", encoding="utf-8") as f:
        lineas = f.readlines()

    hash_anterior = None
    for linea in lineas:
        partes = linea.strip().split("|")
        if len(partes) < 4:
            return False  # Formato incorrecto

        # Suponiendo que el hash está en la última columna
        hash_actual = partes[-1].strip()
        # El mensaje a hashear es todo menos el hash
        mensaje = "|".join(partes[:-1]).strip()

        # Calcula el hash esperado
        if hash_anterior is None:
            hash_esperado = hash_cadena(mensaje)
        else:
            hash_esperado = hash_cadena(mensaje + hash_anterior)

        if hash_actual != hash_esperado:
            return False  # Hay manipulación

        hash_anterior = hash_actual

    return True

