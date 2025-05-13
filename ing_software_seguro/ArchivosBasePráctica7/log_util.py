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
    tiempo_legible = tiempo_utc.strftime("%Y-%m-%d %H:%M:%S %Z")
    return tiempo_legible

# Función para configurar el logging en un fichero
def configure_logging(log_file=LOG_FILE):
    """
    Configura el logger y lee el dato de la última línea del archivo de log.

    Parámetros:
        log_file (str): Ruta del archivo de log.
    """
    pass

def inicializar_log():
    pass

def anadir_al_log(nivel_log, log_string):
    log_levels = {
        "warning": logging.warning,
        "error": logging.error,
        "debug": logging.debug,
        "info": logging.info
    }

    # Calcular el hash encadenado y crear la cadena a introducir en el registro

    # ... a completar por el alumno

    # Llama a la función de log correspondiente al nivel_log
    # anotado en la función monitorizada

    # ... a completar por el alumno

def leer_ultima_linea_log(log_file):
    """
    Lee la última línea del archivo de log y extrae el dato después de la fecha y el tipo de log.

    Parámetros:
        log_file (str): Ruta del archivo de log.

    Retorna:
        str: El dato extraído, o None si el archivo no existe o está vacío.
    """
    pass

def verificar_cadena_hashes(log_file=LOG_FILE):
    """
    Verifica que la cadena de hashes en el archivo de log sea correcta.

    Parámetros:
        log_file (str): Ruta del archivo de log.

    Retorna:
        bool: True si la cadena de hashes es correcta, False si hay algún error.
    """
    pass

