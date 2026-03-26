import React, { useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Save, Trash2, Database, RefreshCw, BookOpen } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import { parseExcelFile } from './excelReader';
import { invoicesArraySchema } from './invoiceSchema';

const DataLoad = ({ setRawInvoices, setCurrentModule, setCatalogs }) => {
    const [previewData, setPreviewData] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fileName, setFileName] = useState('');

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        setError(null);
        setFileName(file.name);

        try {
            // 1. Leer Excel
            const rawData = await parseExcelFile(file);

            // 2. Validar con Zod
            const result = invoicesArraySchema.safeParse(rawData);

            if (result.success) {
                setPreviewData(result.data);
            } else { // El mensaje de error ahora es más genérico y útil
                console.error("Error de validación Zod:", result.error);

                // Diagnóstico para el usuario: Mostrar qué columnas se encontraron
                const detectedKeys = rawData.length > 0 ? Object.keys(rawData[0]).join(", ") : "Ninguna columna detectada";
                const firstError = result.error.issues[0]?.message || "Error de formato";

                setError(`Error: ${firstError}. Columnas detectadas en tu archivo: [${detectedKeys}].`);
                setPreviewData([]); // Limpiamos la previsualización si hay error
            }
        } catch (err) {
            console.error(err);
            setError("Error crítico al procesar el archivo.");
        } finally {
            setLoading(false);
        }
    };

    // Función A: Cargar SOLO Catálogos (JSONs)
    const handleLoadCatalogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('http://localhost:5000/api/catalogs');
            if (!response.ok) throw new Error("Error conectando con API de catálogos");

            const jsonCatalogs = await response.json();
            if (setCatalogs) setCatalogs(jsonCatalogs);

            alert("¡Catálogos cargados correctamente! Ahora puedes ver la estructura en 'Gestión de Pagos'.");
        } catch (err) {
            console.error(err);
            setError(`Error cargando catálogos: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Función B: Cargar SOLO Facturas (Excel FUENTE_DATOS)
    const handleLoadInvoicesOnly = async () => {
        setLoading(true);
        setError(null);
        setFileName('Conectando con servidor local...');

        try {
            // 1. Petición de Facturas (Excel)
            const response = await fetch('http://localhost:5000/api/invoices');
            const jsonData = await response.json();

            if (!response.ok) {
                throw new Error(jsonData.error || "Error de conexión con el servidor local.");
            }

            // Validamos igual que si fuera un archivo subido
            const result = invoicesArraySchema.safeParse(jsonData);

            if (result.success) {
                setPreviewData(result.data);
                setFileName(`Sincronización Local: ${jsonData.length} registros encontrados en disco.`);
            } else {
                const firstError = result.error.issues[0]?.message || "Error de formato en datos locales";
                setError(`Error de validación: ${firstError}`);
            }
        } catch (err) {
            console.error(err);
            if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
                setError("Error de Conexión: No se pudo contactar al servidor en http://localhost:5000. Asegúrate de que el script 'python server.py' se está ejecutando en una terminal separada y no muestra errores.");
            } else {
                setError(`Ocurrió un error inesperado: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmLoad = () => {
        if (previewData.length === 0) return;

        setRawInvoices(prev => [...prev, ...previewData]);

        alert(`${previewData.length} registros importados correctamente.`);
        setPreviewData([]);
        setFileName('');

        // Redirigir al módulo de pagos para ver los datos
        if (setCurrentModule) setCurrentModule('payments');
    };

    const handleClear = () => {
        setPreviewData([]);
        setFileName('');
        setError(null);
    };

    return (
        <div className="p-6 h-full flex flex-col space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800">Cargar Fuente de Datos</h1>
                    <p className="text-slate-500 mt-1">Sube tus archivos Excel para alimentar el flujo de pagos.</p>
                </div>
            </div>

            <Card className={`border-2 border-dashed transition-colors ${error ? 'border-red-300 bg-red-50/50' : 'border-slate-300 hover:border-primary'}`}>
                <div className="p-12 flex flex-col items-center justify-center text-center">
                    <div className={`p-4 rounded-full mb-4 ${error ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-primary'}`}>
                        {error ? <AlertCircle size={32} /> : <Upload size={32} />}
                    </div>

                    <h3 className="text-lg font-semibold text-slate-800">
                        {loading ? 'Procesando datos...' : 'Fuente de Datos'}
                    </h3>

                    <div className="flex gap-4 mt-6">
                        {/* Botón 1: Cargar Catálogos */}
                        <Button variant="secondary" icon={BookOpen} onClick={handleLoadCatalogs} disabled={loading}>
                            Cargar Catálogos
                        </Button>

                        {/* Botón 2: Sincronizar Datos (Excel) */}
                        <Button variant="primary" icon={Database} onClick={handleLoadInvoicesOnly} disabled={loading}>
                            Sincronizar Local
                        </Button>

                        <span className="text-slate-300 py-2">|</span>

                        <div className="relative">
                            <Button variant="outline" icon={FileSpreadsheet}>Subir Manualmente</Button>
                            <input type="file" accept=".xlsx, .xls" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileUpload} disabled={loading} />
                        </div>
                    </div>

                    {fileName && <p className="mt-4 text-sm font-medium text-slate-700">{fileName}</p>}
                </div>
            </Card>

            {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg flex items-center gap-2"><AlertCircle size={20} /> {error}</div>}

            {previewData.length > 0 && (
                <div className="flex-1 flex flex-col space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center">
                        <span className="text-emerald-700 font-medium flex gap-2"><CheckCircle2 /> {previewData.length} registros listos</span>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={handleClear} icon={Trash2}>Cancelar</Button>
                            <Button variant="success" onClick={handleConfirmLoad} icon={Save}>Confirmar Carga</Button>
                        </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl overflow-auto flex-1 max-h-[400px]">
                        {/* La tabla de previsualización ahora muestra más datos */}
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 sticky top-0">
                                <tr>
                                    <th className="p-3 font-semibold text-slate-600">Factura #</th>
                                    <th className="p-3 font-semibold text-slate-600">UUID</th>
                                    <th className="p-3 font-semibold text-slate-600">Proveedor</th>
                                    <th className="p-3 font-semibold text-slate-600 text-right">Monto</th>
                                    <th className="p-3 font-semibold text-slate-600">Moneda</th>
                                    <th className="p-3 font-semibold text-slate-600">Vencimiento</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {previewData.slice(0, 50).map((r, i) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="p-3 text-slate-500">{r.meta.invoice}</td>
                                        <td className="p-3 font-mono text-xs text-slate-400">{r.uuid?.slice(0, 8)}...</td>
                                        <td className="p-3 font-medium text-slate-800">{r.providerName}</td>
                                        <td className="p-3 text-right font-bold text-slate-700">{r.amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</td>
                                        <td className="p-3 text-center"><span className="font-bold text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full">{r.currency}</span></td>
                                        <td className="p-3 text-slate-500">{r.dueDate}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataLoad;