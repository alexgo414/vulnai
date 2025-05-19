class ErrorPoliticaPassword(Exception):
    """Excepción para errores de política de contraseñas."""
    pass

class ErrorAutenticacion(Exception):
    """Excepción para errores de autenticación."""
    pass

class ErrorServicioNoEncontrado(Exception):
    """Excepción para servicios o usuarios no encontrados."""
    pass

class ErrorCredencialExistente(Exception):
    """Excepción para credenciales ya existentes."""
    pass