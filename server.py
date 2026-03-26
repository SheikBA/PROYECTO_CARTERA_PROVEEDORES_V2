from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd
import json
import os

app = Flask(__name__)
# Permitimos que React se comunique con este servidor
CORS(app)

# --- CONFIGURACIÓN DE LA RUTA ACTUALIZADA ---
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(
    __file__), "..", "MODELO_DATOS_CARTERA_PROVEEDORES"))
FILE_NAME = "FUENTE_DATOS.xlsx"
EXCEL_PATH = os.path.join(BASE_DIR, FILE_NAME)
# ------------------------------------------


@app.route('/api/invoices', methods=['GET'])
def get_invoices():
    # Verificamos si el archivo existe antes de intentar leerlo
    if not os.path.exists(EXCEL_PATH):
        print(f"ERROR: Archivo no encontrado en: {EXCEL_PATH}")
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

        df = pd.read_excel(xls, sheet_name=target_sheet)

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


@app.route('/api/catalogs', methods=['GET'])
def get_catalogs():
    # Estructura vacía por defecto
    catalogs = {
        "banks": [],
        "companies": [],
        "groups": []
    }

    # Mapa de claves vs nombres de archivo esperados en disco
    files_map = {
        "companies": "empresas_epicor.json",
        "groups": "grupo_proveedores.json",
        "banks": "cuentas_pagadoras_empresa.json"
    }

    print("Cargando catálogos JSON...")
    for key, filename in files_map.items():
        path = os.path.join(BASE_DIR, filename)
        if os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    # Lógica para extraer los datos correctos de cada tipo de catálogo
                    if key == 'banks' and isinstance(data, dict) and 'catalogo_cuentas_pagadoras' in data:
                        catalogs[key] = data['catalogo_cuentas_pagadoras'].get(
                            'cuentas', [])
                    elif isinstance(data, dict) and 'registros' in data:
                        catalogs[key] = data['registros']
                    else:
                        catalogs[key] = data
                print(f" -> {filename}: OK ({len(catalogs[key])} registros)")
            except Exception as e:
                print(f" -> Error leyendo {filename}: {e}")
        else:
            print(f" -> Advertencia: No se encontró {filename}")

    return jsonify(catalogs)


if __name__ == '__main__':
    print(f"--- SERVIDOR LOCAL ACTIVO ---")
    print(f"Buscando archivo en: {EXCEL_PATH}")
    print(f"Mantén esta ventana abierta mientras usas la aplicación.")
    app.run(port=5000, debug=True)
