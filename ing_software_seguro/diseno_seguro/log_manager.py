from log_util import verificar_cadena_hashes, anadir_al_log, inicializar_log

class SecureLogManager:
    def __init__(self, log_file, user, debug_mode=0):
        self.log_file = log_file
        self.debug_mode = debug_mode
        self.user = user

    def verificar_cadena_hashes(self):
        return verificar_cadena_hashes(self.log_file)
    
    def anadir_al_log(self, nivel_log, user, funcion, parametros, resultado):
        anadir_al_log(nivel_log, user, funcion, parametros, resultado, self.log_file)