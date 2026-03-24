import React, { useState } from 'react';
import { Landmark, ArrowRight } from 'lucide-react';
import Button from '../components/Button';
import { APP_VERSION } from '../data/versionHistory';

const Login = ({ onLogin }) => {
    const [loading, setLoading] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Validación de credenciales específicas
        setTimeout(() => {
            if (username === 'Vladislav' && password === '1234') {
                if (onLogin) {
                    onLogin({ name: 'Vladislav', role: 'Administrador' });
                }
            } else {
                setError('Usuario o contraseña incorrectos.');
                setLoading(false);
            }
        }, 800);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sección Izquierda: Imagen / Branding */}
            <div className="hidden lg:flex flex-1 bg-slate-900 relative items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-slate-900/90 z-10"></div>
                {/* Imagen de fondo decorativa */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>

                <div className="relative z-20 text-white p-12 max-w-xl text-center">
                    <div className="mx-auto h-24 w-24 bg-white/10 backdrop-blur-md text-white flex items-center justify-center rounded-2xl mb-8 border border-white/20 shadow-2xl">
                        <Landmark size={48} />
                    </div>
                    <h1 className="text-4xl font-bold mb-4 tracking-tight">Cartera de Proveedores</h1>
                    <p className="text-lg text-slate-200/90 leading-relaxed">
                        Sistema integral para la gestión y control de pagos.
                    </p>
                </div>
            </div>

            {/* Sección Derecha: Formulario de Login */}
            <div className="flex-1 flex items-center justify-center p-8 bg-white">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold text-slate-800">Bienvenido</h2>
                        <p className="mt-2 text-slate-500">Ingresa tus credenciales para acceder.</p>
                    </div>

                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <input type="text" placeholder="Usuario" className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary outline-none transition-all" value={username} onChange={(e) => setUsername(e.target.value)} />
                            <input type="password" placeholder="Contraseña" className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary outline-none transition-all" value={password} onChange={(e) => setPassword(e.target.value)} />
                        </div>
                        {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}
                        <Button type="submit" variant="primary" className="w-full justify-center py-3 text-lg" disabled={loading} icon={ArrowRight}>
                            {loading ? 'Iniciando...' : 'Iniciar Sesión'}
                        </Button>
                        <div className="text-center pt-2">
                            <button type="button" className="text-sm text-primary hover:text-blue-700 font-medium hover:underline transition-colors">
                                Actualizar contraseña
                            </button>
                        </div>
                    </form>
                    <div className="text-center pt-8">
                        <span className="text-xs font-mono text-slate-300">v{APP_VERSION}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
