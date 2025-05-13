import logging

def setup_logger(logger_name, log_file, level=logging.INFO):
    l = logging.getLogger(logger_name)
    formatter = logging.Formatter(
        fmt="%(asctime)s: %(levelname)-8s | %(message)s |",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    fileHandler = logging.FileHandler(log_file, mode='a')
    fileHandler.setFormatter(formatter)
    streamHandler = logging.StreamHandler()
    streamHandler.setFormatter(formatter)

    l.setLevel(level)
    l.addHandler(fileHandler)
    l.addHandler(streamHandler)    


setup_logger('log1', "logFile1.txt")
setup_logger('log2', "logFile2.txt")
logger_1 = logging.getLogger('log1')
logger_2 = logging.getLogger('log2')

logger_1.info('111 - message 1')
logger_2.info('222 - message foo')