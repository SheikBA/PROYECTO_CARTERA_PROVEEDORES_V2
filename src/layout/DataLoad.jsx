import { useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Save, Trash2, Database } from 'lucide-react';
import { API_BASE_URL } from '../data/catalogs.js';
import Button from '../components/Button';
import Card from '../components/Card';
import { parseExcelFile } from './excelReader';
import { invoicesArraySchema } from './invoiceSchema';
import { formatCurrency, formatDate } from '../utils/formatters.js';

const DataLoad = ({ setRawInvoices, setCurrentModule }) => {
    const [previewData, setPreviewData] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fileName, setFileName] = useState('');
    const [successMsg, setSuccessMsg] = useState(null);
    const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3500); };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        setError(null);
        setFileName(file.name);

        try {
            // 1. Leer Excel
            const rawData = await parseExcelFile(file);

            // 2. Validar y Transformar con Zod
            // El esquema ya invoca sp_process_invoice_data automáticamente via .transform()
            const result = invoicesArraySchema.safeParse(rawData);

            if (result.success) {
                setPreviewData(result.data);
            } else {
                const detectedKeys = rawData.length > 0 ? Object.keys(rawData[0]).join(", ") : "Ninguna columna detectada";
                const firstError = result.error.issues[0]?.message || "Error de formato";
                setError(`Error: ${firstError}. Columnas detectadas en tu archivo: [${detectedKeys}].`);
                setPreviewData([]);
            }
        } catch (_err) {
            setError("Error crítico al procesar el archivo.");
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
            const response = await fetch(`${API_BASE_URL}/api/invoices`);
            const jsonData = await response.json();

            if (!response.ok) {
                throw new Error(jsonData.error || "Error de conexión con el servidor local.");
            }

            // Validamos y transformamos los datos crudos del servidor
            const result = invoicesArraySchema.safeParse(jsonData);

            if (result.success) {
                setPreviewData(result.data);
                setFileName(`Sincronización Local: ${result.data.length} registros encontrados en disco.`);
            } else {
                const firstError = result.error.issues[0]?.message || "Error de formato en datos locales";
                setError(`Error de validación: ${firstError}`);
            }
        } catch (err) {
            if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
                setError(`Error de Conexión: No se pudo contactar al servidor en ${API_BASE_URL}. Asegúrate de que el script 'python server.py' se está ejecutando en una terminal separada y no muestra errores.`);
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

        showSuccess(`${previewData.length} registros importados correctamente.`);
        setPreviewData([]);
        setFileName('');

        // Redirigir al módulo de pagos para ver los datos
        if (setCurrentModule) setCurrentModule('payments-v2');
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
                        <Button
                            variant="primary"
                            icon={Database}
                            onClick={handleLoadInvoicesOnly}
                            disabled={loading}
                            title="Lee el archivo FUENTE_DATOS..xlsx desde la carpeta del servidor"
                        >
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
                                        <td className="p-3 text-slate-500">
                                            <div className="flex items-center gap-2">
                                                {r.meta.invoice}
                                                {r.meta?.isH2H && <span className="bg-indigo-600 text-white text-[9px] px-1.5 py-0.5 rounded-sm font-black shadow-sm ring-1 ring-indigo-700/50 uppercase tracking-tighter">H2H</span>}
                                                {r.meta?.isKissflow && <span className="bg-purple-600 text-white text-[9px] px-1.5 py-0.5 rounded-sm font-black shadow-sm ring-1 ring-purple-700/50 uppercase tracking-tighter">KISSFLOW</span>}
                                            </div>
                                        </td>
                                        <td className="p-3 font-mono text-xs text-slate-400">{r.uuid?.slice(0, 8)}...</td>
                                        <td className="p-3 font-medium text-slate-800">{r.providerName}</td>
                                        <td className="p-3 text-right font-bold text-slate-700">{formatCurrency(r.amount, r.currency)}</td>
                                        <td className="p-3 text-center"><span className="font-bold text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full">{r.currency}</span></td>
                                        <td className="p-3 text-slate-500">{formatDate(r.dueDate)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {successMsg && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] animate-fade-in">
                    <div className="bg-slate-800 text-white text-xs font-semibold px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2">
                        <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                        {successMsg}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataLoad;