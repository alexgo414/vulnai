import sqlite3

class DB:
    def __init__(self):
        self.conn = sqlite3.connect(":memory:")
        self._create_tables("usuarios")

    def _create_tables(self, table_name):
        self.conn.execute(f"CREATE TABLE {table_name} (id INT, name TEXT)")

    def execute(self, query):
        cursor = self.conn.cursor()
        # ❌ No usa parámetros preparados
        cursor.execute(query)
        return str(cursor.fetchall())
