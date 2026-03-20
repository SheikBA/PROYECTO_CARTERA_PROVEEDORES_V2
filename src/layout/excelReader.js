import * as XLSX from 'xlsx';

/**
 * Lee un archivo Excel y retorna sus datos en formato JSON.
 * @param {File} file - El archivo subido desde el input.
 * @returns {Promise<Array>} - Promesa que resuelve con un array de objetos.
 */
export const parseExcelFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Tomamos la primera hoja
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Convertimos a JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                // Normalización básica de claves (opcional: convertir a minúsculas, quitar espacios)
                const normalizedData = jsonData.map(row => {
                    const newRow = {};
                    Object.keys(row).forEach(key => {
                        const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');
                        newRow[cleanKey] = row[key];
                    });
                    return newRow;
                });

                resolve(normalizedData);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};