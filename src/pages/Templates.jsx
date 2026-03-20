import React, { useState } from 'react';
import { Search, Plus, Filter, FileText, Edit2, Trash2, MoreVertical } from 'lucide-react';
import Button from '../components/Button';

const MOCK_TEMPLATES = [
    { id: 'TPL-001', name: 'Factura Estándar v2', type: 'PDF', status: 'active', lastModified: '10 Oct 2025' },
    { id: 'TPL-002', name: 'Recibo Simplificado', type: 'HTML', status: 'active', lastModified: '12 Oct 2025' },
    { id: 'TPL-003', name: 'Comprobante XML', type: 'XML', status: 'draft', lastModified: '14 Oct 2025' },
    { id: 'TPL-004', name: 'Factura Proveedor Internacional', type: 'PDF', status: 'inactive', lastModified: '01 Sep 2025' },
];

const Templates = () => {
    const [searchTerm, setSearchTerm] = useState('');

    return (
        <div className="p-6 h-full flex flex-col space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800">Configuración de Plantillas</h1>
                    <p className="text-slate-500 mt-1">Gestiona los formatos y estructuras de documentos.</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <Button variant="secondary" icon={Filter}>
                        Filtrar
                    </Button>
                    <Button variant="primary" icon={Plus}>
                        Nueva Plantilla
                    </Button>
                </div>
            </div>

            {/* Quick Stats or Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-surface p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-primary">
                        <FileText size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Total Plantillas</p>
                        <p className="text-2xl font-bold text-slate-800">{MOCK_TEMPLATES.length}</p>
                    </div>
                </div>
                <div className="bg-surface p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                        <FileText size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Activas</p>
                        <p className="text-2xl font-bold text-slate-800">2</p>
                    </div>
                </div>
                <div className="bg-surface p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                        <FileText size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">En Borrador</p>
                        <p className="text-2xl font-bold text-slate-800">1</p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 bg-surface border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="relative w-full max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={18} className="text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar plantillas por nombre o ID..."
                            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-sm transition-colors"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                                <th className="p-4 rounded-tl-xl w-24">ID</th>
                                <th className="p-4">Nombre de Plantilla</th>
                                <th className="p-4">Formato</th>
                                <th className="p-4 w-32">Estado</th>
                                <th className="p-4">Última Modificación</th>
                                <th className="p-4 text-center rounded-tr-xl w-24">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/80 text-sm">
                            {MOCK_TEMPLATES.filter(tpl => tpl.name.toLowerCase().includes(searchTerm.toLowerCase()) || tpl.id.toLowerCase().includes(searchTerm.toLowerCase())).map((template) => (
                                <tr key={template.id} className="hover:bg-slate-50/60 transition-colors group">
                                    <td className="p-4 text-slate-500 font-mono text-xs">{template.id}</td>
                                    <td className="p-4 font-medium text-slate-800 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                                            <FileText size={16} />
                                        </div>
                                        {template.name}
                                    </td>
                                    <td className="p-4">
                                        <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 font-mono text-xs font-semibold">
                                            {template.type}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                            template.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                            template.status === 'draft' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                            'bg-slate-100 text-slate-600 border border-slate-200'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                template.status === 'active' ? 'bg-emerald-500' :
                                                template.status === 'draft' ? 'bg-amber-500' :
                                                'bg-slate-400'
                                            }`}></span>
                                            {template.status === 'active' ? 'Activa' : template.status === 'draft' ? 'Borrador' : 'Inactiva'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-500">{template.lastModified}</td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="p-1.5 text-slate-400 hover:text-danger hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                                                <Trash2 size={16} />
                                            </button>
                                            <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="Más">
                                                <MoreVertical size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Templates;
