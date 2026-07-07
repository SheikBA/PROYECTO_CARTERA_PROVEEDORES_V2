import os
import json
import pandas as pd
from flask_cors import CORS
from flask import Flask, jsonify

app = Flask(__name__)
# Permitimos que React se comunique con este servidor
CORS(app)

# --- CONFIGURACIÓN DE LA RUTA ACTUALIZADA ---
# Nombres posibles del archivo (se han detectado variaciones como el doble punto o el sufijo '2')
POSSIBLE_FILE_NAMES = ["FUENTE_DATOS3.xlsx"]

# Carpetas base candidatas donde podría residir el modelo de datos
POSSIBLE_BASE_DIRS = [
    # Intento 1: Subir dos niveles (Carpeta Documents del usuario)
    os.path.abspath(os.path.join(os.path.dirname(__file__),
                    "..", "..", "MODELO_DATOS_CARTERA_PROVEEDORES")),
    # Intento 2: Subir un nivel
    os.path.abspath(os.path.join(os.path.dirname(__file__),
                    "..", "MODELO_DATOS_CARTERA_PROVEEDORES")),
    # Intento 3: Ruta absoluta directa
    r"C:\Users\ebaeza.HOTEL_SHOPS\Documents\MODELO_DATOS_CARTERA_PROVEEDORES"
]

# Obtener la ruta del directorio actual del script de Python
current_script_dir = os.path.dirname(os.path.abspath(__file__))
# Añadir el directorio del script como una posible carpeta base
POSSIBLE_BASE_DIRS.insert(0, current_script_dir)


def find_excel_file():
    """Busca dinámicamente el archivo en las rutas configuradas."""
    for base_dir in POSSIBLE_BASE_DIRS:
        for name in POSSIBLE_FILE_NAMES:
            target = os.path.join(base_dir, name)
            if os.path.exists(target):
                return target, name
    return None, None


EXCEL_PATH, FILE_NAME = find_excel_file()
# ------------------------------------------


@app.route('/api/invoices', methods=['GET'])
def get_invoices():
    global EXCEL_PATH, FILE_NAME

    # Re-intentar búsqueda si no se había encontrado previamente
    if not EXCEL_PATH:
        EXCEL_PATH, FILE_NAME = find_excel_file()

    if not EXCEL_PATH or not os.path.exists(EXCEL_PATH):
        error_msg = f"ERROR: No se encontró el archivo FUENTE_DATOS3.xlsx en ninguna de las rutas esperadas."
        if FILE_NAME:
            error_msg += f" Último intento fue con '{FILE_NAME}' en '{EXCEL_PATH}'."
        else:
            error_msg += f" Se buscaron los nombres {POSSIBLE_FILE_NAMES} en las rutas: {POSSIBLE_BASE_DIRS}."
        print(error_msg)
        # Intentar listar archivos en el directorio del script para diagnóstico
        try:
            script_dir_files = os.listdir(current_script_dir)
            print(
                f"Archivos en el directorio del script ({current_script_dir}): {script_dir_files}")
        except Exception as e:
            print(f"No se pudo listar el directorio del script: {e}")

        return jsonify({"error": error_msg}), 404

    try:
        print(f"Leyendo archivo desde: {EXCEL_PATH}")

        # Verificar si el archivo es realmente un archivo y no un directorio
        if not os.path.isfile(EXCEL_PATH):
            return jsonify({"error": f"La ruta '{EXCEL_PATH}' no apunta a un archivo válido."}), 400
        # --- Diagnóstico Mejorado: Listar todas las hojas ---
        xls = pd.ExcelFile(EXCEL_PATH)
        sheet_names = xls.sheet_names
        print(f"Hojas encontradas en el archivo: {sheet_names}")
        # ----------------------------------------------------

        # Intentamos leer la hoja 'LAYOUT'
        target_sheet = 'LAYOUT'  # Nombre de la hoja que se espera
        if target_sheet not in sheet_names:
            # Si 'LAYOUT' no existe, intentar con la primera hoja disponible
            if not sheet_names:  # Si no hay hojas, esto sería un error
                return jsonify({"error": f"El archivo Excel '{FILE_NAME}' no contiene ninguna hoja."}), 400
            print(
                f"ADVERTENCIA: La hoja '{target_sheet}' no se encontró. Se leerá la primera hoja: '{sheet_names[0]}'.")
            target_sheet = sheet_names[0]

        # Leemos los datos asegurando que no se mantenga el archivo bloqueado
        df = pd.read_excel(
            EXCEL_PATH, sheet_name=target_sheet, engine='openpyxl')

        # Limpieza de datos (Nulos a None, columnas a minúsculas/guiones bajos)
        df = df.where(pd.notnull(df), None)
        df.columns = [str(col).strip().lower().replace(" ", "_")
                      for col in df.columns]

        # Manejo de columnas duplicadas con mismo nombre (Balance, New Balance)
        # Después de normalizar, Pandas crea "balance" y "balance.1", "new_balance" y "new_balance.1"
        # Asignarlas correctamente según su posición (Z=25, AA=26, AB=27, AC=28)
        columnas_list = list(df.columns)

        # Mapeo: posición en el Excel (0-indexed) → nombre normalizado
        # Z=25 → balance_mn, AA=26 → balance_usd, AB=27 → new_balance_mn, AC=28 → new_balance_usd
        if len(columnas_list) > 25:  # Al menos hasta columna Z
            if columnas_list[25] == 'balance':
                columnas_list[25] = 'balance_mn'
        if len(columnas_list) > 26:  # Columna AA
            if columnas_list[26] == 'balance.1':
                columnas_list[26] = 'balance_usd'
        if len(columnas_list) > 27:  # Columna AB
            if columnas_list[27] == 'new_balance':
                columnas_list[27] = 'new_balance_mn'
        if len(columnas_list) > 28:  # Columna AC
            if columnas_list[28] == 'new_balance.1':
                columnas_list[28] = 'new_balance_usd'

        df.columns = columnas_list

        # Asegurar que la columna B (segunda columna) sea 'destino' para el filtro
        if len(df.columns) >= 2:
            columnas = list(df.columns)
            columnas[1] = 'destino'  # La columna B es el índice 1
            df.columns = columnas

            # Normalización de la columna destino para evitar duplicados por espacios o mayúsculas
            if 'destino' in df.columns:
                df['destino'] = df['destino'].fillna(
                    'POR CLASIFICAR').astype(str).str.strip().str.upper()

        # CORRECCIÓN CRÍTICA: Usar to_json de pandas para manejar fechas (Timestamps) correctamente
        json_str = df.to_json(orient='records', date_format='iso')
        data = json.loads(json_str)

        print(f"¡Éxito! Se leyeron {len(data)} registros.")
        return jsonify(data)

    except FileNotFoundError:
        return jsonify({"error": f"El archivo '{FILE_NAME}' no se encontró en la ruta: {EXCEL_PATH}"}), 404
    except ValueError as ve:
        return jsonify({"error": f"Error al leer el archivo Excel: {ve}. Asegúrate de que el formato es correcto y la hoja 'LAYOUT' (o la primera hoja) existe."}), 400
    except Exception as e:
        print(f"Error crítico leyendo el archivo: {str(e)}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    print(f"--- SERVIDOR LOCAL ACTIVO ---")
    print(f"Buscando archivo en: {EXCEL_PATH}")
    print(f"Mantén esta ventana abierta mientras usas la aplicación.")
    app.run(port=5000, debug=True)
