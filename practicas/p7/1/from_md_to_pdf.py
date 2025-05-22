import pypandoc
import os
import sys

def convertir_markdown_a_pdf(archivo_entrada, archivo_salida):
    try:
        # Verificar si el archivo de entrada existe
        if not os.path.exists(archivo_entrada):
            print(f"Error: El archivo {archivo_entrada} no existe.")
            return
        
        # Descargar pandoc si no está instalado
        pypandoc.download_pandoc()

        # Convertir el archivo Markdown a PDF usando pypandoc
        output = pypandoc.convert_file(
            archivo_entrada,
            'pdf',
            outputfile=archivo_salida,
            extra_args=['--pdf-engine=pdflatex']
        )
        print(f"Conversión exitosa: {archivo_salida} creado.")
    except Exception as e:
        print(f"Error durante la conversión: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Uso: python convertir_md_a_pdf.py <archivo_markdown> <archivo_pdf>")
        sys.exit(1)

    archivo_entrada = sys.argv[1]
    archivo_salida = sys.argv[2]
    convertir_markdown_a_pdf(archivo_entrada, archivo_salida)