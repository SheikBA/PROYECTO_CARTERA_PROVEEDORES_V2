from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd
import json
import os

app = Flask(__name__)
# Permitimos que React se comunique con este servidor
CORS(app)

# --- CONFIGURACIÓN DE LA RUTA ACTUALIZADA ---
# Nombres posibles del archivo (se han detectado variaciones como el doble punto o el sufijo '2')
POSSIBLE_FILE_NAMES = ["FUENTE_DATOS..xlsx",
                       "FUENTE_DATOS2.xlsx", "FUENTE_DATOS.xlsx"]

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

EXCEL_PATH = None
FILE_NAME = POSSIBLE_FILE_NAMES[0]  # Valor por defecto para reportar error

# Buscamos dinámicamente el archivo en las posibles ubicaciones y con los posibles nombres
for base_dir in POSSIBLE_BASE_DIRS:
    for name in POSSIBLE_FILE_NAMES:
        target = os.path.join(base_dir, name)
        if os.path.exists(target):
            EXCEL_PATH = target
            FILE_NAME = name
            break
    if EXCEL_PATH:
        break

# Si no se encontró nada, asignamos la ruta del primer intento para que el log de error sea descriptivo
if not EXCEL_PATH:
    EXCEL_PATH = os.path.join(POSSIBLE_BASE_DIRS[0], POSSIBLE_FILE_NAMES[0])
# ------------------------------------------


@app.route('/api/invoices', methods=['GET'])
def get_invoices():
    # Verificamos si el archivo existe antes de intentar leerlo
    if not os.path.exists(EXCEL_PATH):
        current_dir = os.path.dirname(EXCEL_PATH)
        print(f"ERROR: Archivo '{FILE_NAME}' no encontrado en: {EXCEL_PATH}")
        # Diagnóstico de ayuda: listar archivos en la carpeta
        if os.path.exists(current_dir):
            print(
                f"Archivos encontrados en la carpeta '{current_dir}': {os.listdir(current_dir)}")
        else:
            print(f"La carpeta base no existe: {current_dir}")
        return jsonify({"error": f"El archivo no existe en la ruta: {EXCEL_PATH}"}), 404

    try:
        print(f"Leyendo archivo desde: {EXCEL_PATH}")

        # --- Diagnóstico Mejorado: Listar todas las hojas ---
        xls = pd.ExcelFile(EXCEL_PATH)
        sheet_names = xls.sheet_names
        print(f"Hojas encontradas en el archivo: {sheet_names}")
        # ----------------------------------------------------

        # Intentamos leer la hoja 'LAYOUT'
        target_sheet = 'LAYOUT'
        if target_sheet not in sheet_names:
            print(
                f"ADVERTENCIA: La hoja '{target_sheet}' no se encontró. Se leerá la primera hoja: '{sheet_names[0]}'.")
            target_sheet = sheet_names[0]

        df = pd.read_excel(xls, sheet_name=target_sheet, engine='openpyxl')

        # Limpieza de datos (Nulos a None, columnas a minúsculas/guiones bajos)
        df = df.where(pd.notnull(df), None)
        df.columns = [str(col).strip().lower().replace(" ", "_")
                      for col in df.columns]

        # CORRECCIÓN CRÍTICA: Usar to_json de pandas para manejar fechas (Timestamps) correctamente
        json_str = df.to_json(orient='records', date_format='iso')
        data = json.loads(json_str)

        print(f"¡Éxito! Se leyeron {len(data)} registros.")
        return jsonify(data)

    except Exception as e:
        print(f"Error crítico leyendo el archivo: {str(e)}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    print(f"--- SERVIDOR LOCAL ACTIVO ---")
    print(f"Buscando archivo en: {EXCEL_PATH}")
    print(f"Mantén esta ventana abierta mientras usas la aplicación.")
    app.run(port=5000, debug=True)
