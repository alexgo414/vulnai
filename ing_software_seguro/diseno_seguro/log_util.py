from datetime import datetime, timezone
import logging
import os
from config import REGISTRY_FILE

from src.python.hash_util import hash_cadena

LOG_FILE = REGISTRY_FILE

# Solo aparecerán por consola los mensajes de log que tengan un nivel igual o superior a CRITICAL
logging.basicConfig(level=logging.CRITICAL)

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

def inicializar_log(usuario_id, log_file=LOG_FILE):
    """
    Inicializa el log seguro si no existe, añadiendo una entrada inicial.
    """
    if not os.path.exists(log_file) or os.path.getsize(log_file) == 0:
        tiempo = get_tiempo_legible()
        nivel = "INFO"
        mensaje = f"Inicialización del log en el tiempo {tiempo} UTC"
        hash_log = hash_cadena(mensaje)
        # Formato especial: sin usuario
        linea = f"{tiempo}: {nivel} | '{hash_log}': {mensaje} |"
        with open(log_file, "w", encoding="utf-8") as f:
            f.write(linea + "\n")

def anadir_al_log(nivel_log, user, funcion, parametros, resultado, log_file=LOG_FILE):
    log_levels = {
        "warning": logging.warning,
        "error": logging.error,
        "debug": logging.debug,
        "info": logging.info
    }

    tiempo = get_tiempo_legible()
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
                # Busca la parte que contiene el hash (la que contiene "':")
                hash_part = None
                for p in partes:
                    if "':" in p:
                        hash_part = p.strip()
                        break
                if hash_part:
                    hash_split = hash_part.split("':", 1)
                    if len(hash_split) == 2:
                        hash_anterior = hash_split[0][1:]

    # Calcular el hash encadenado
    if hash_anterior:
        hash_actual = hash_cadena(mensaje + hash_anterior)
    else:
        hash_actual = hash_cadena(mensaje)

    linea_log = f"{tiempo}: {nivel_log.upper()} | {user} | '{hash_actual}': {mensaje} |"

    with open(log_file, "a", encoding="utf-8") as f:
        f.write(linea_log + "\n")

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
    if not existe_archivo(log_file) or archivo_vacio(log_file):
        return True

    with open(log_file, "r", encoding="utf-8") as f:
        lineas = f.readlines()

    hash_anterior = None
    for i, linea in enumerate(lineas):
        partes = linea.strip().split("|")
        if i == 0:
            # Formato: fecha: nivel | 'HASH': mensaje |
            if len(partes) < 2 or "':" not in partes[1]:
                return False  # Log corrupto o sin inicialización
            hash_and_msg = partes[1].strip()
            hash_split = hash_and_msg.split("':", 1)
            if len(hash_split) != 2:
                return False  # Log corrupto
            hash_actual = hash_split[0][1:]
            mensaje = hash_split[1].strip()
            if mensaje.endswith("|"):
                mensaje = mensaje[:-1].strip()
            hash_esperado = hash_cadena(mensaje)
        else:
            # Formato: fecha: nivel | usuario | 'HASH': mensaje |
            usuario = partes[1].strip()
            hash_and_msg = partes[2].strip()
            hash_split = hash_and_msg.split("':", 1)
            hash_actual = hash_split[0][1:]
            mensaje = hash_split[1].strip()
            if mensaje.endswith("|"):
                mensaje = mensaje[:-1].strip()
            hash_esperado = hash_cadena(mensaje + hash_anterior)

        if hash_actual != hash_esperado:
            return False
        hash_anterior = hash_actual

    return True