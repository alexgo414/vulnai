class MonitorFunciones:
    def __init__(self, log_manager, user):
        self.log_manager = log_manager
        self.user = user

    def __call__(self, func=None, *, nivel_log="info"):
        def decorator(f):
            def wrapper(*args, **kwargs):
                # Verificar la integridad del log antes de ejecutar la función
                if not self.log_manager.verificar_cadena_hashes():
                    raise PermissionError("El log ha sido modificado o está corrupto. No se puede ejecutar la función.")

                # Ejecutar la función monitorizada
                resultado = f(*args, **kwargs)

                # Registrar la ejecución en el log
                parametros = kwargs.copy()
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