import React, { useState } from 'react';
import { Landmark, ArrowRight } from 'lucide-react';
import Button from '../components/Button';
import { APP_VERSION } from '../data/versionHistory';

// Tokens HS según el Design System
const HS = {
    tealDark: "#195655",   // hs-teal-8
    tealBase: "#3bbeb4",   // hs-teal-4
    blueBase: "#0082a6",   // hs-blue-7
    orange: "#f79962",     // hs-orange-base
    white: "#ffffff",
    gray3: "#b0b0b0",
    fontTitle: "'Open Sans', sans-serif",
    fontBody: "'Roboto', sans-serif",
};

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
                    onLogin('Vladislav');
                }
            } else {
                setError('Usuario o contraseña incorrectos.');
                setLoading(false);
            }
        }, 800);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;700&family=Roboto:wght@400;600;700&display=swap');
                
                .hs-wordmark-pattern {
                    background-color: ${HS.tealDark};
                    background-image: repeating-linear-gradient(
                        -45deg,
                        transparent,
                        transparent 40px,
                        rgba(255,255,255,0.03) 40px,
                        rgba(255,255,255,0.03) 41px
                    );
                    position: relative;
                }
                .hs-wordmark-pattern::after {
                    content: "hotelshops hotelshops hotelshops";
                    position: absolute;
                    font-family: ${HS.fontBody};
                    font-weight: 300;
                    color: rgba(255,255,255,0.08);
                    font-size: 2rem;
                    transform: rotate(-45deg);
                    white-space: nowrap;
                    top: 20%;
                    left: -10%;
                    pointer-events: none;
                }
            `}</style>

            {/* Sección Izquierda: Branding Corporativo */}
            <div className="hidden lg:flex flex-1 hs-wordmark-pattern items-center justify-center overflow-hidden">
                <div className="relative z-20 text-white p-12 max-w-xl text-center" style={{ fontFamily: HS.fontTitle }}>
                    <div className="mx-auto h-24 w-24 bg-white/10 backdrop-blur-md text-white flex items-center justify-center rounded-2xl mb-8 border border-white/20 shadow-2xl">
                        <Landmark size={48} />
                    </div>
                    <h1 className="text-4xl font-light mb-4 tracking-tight">Cartera de Proveedores</h1>
                    <p className="text-lg text-slate-200/90 leading-relaxed" style={{ fontFamily: HS.fontBody }}>
                        Nuestro <span style={{ color: HS.orange, fontWeight: 'bold' }}>ÉXITO</span>, un equipo conformado por <span style={{ color: HS.orange, fontWeight: 'bold' }}>MAGNÍFICOS</span> colaboradores.
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
                            <button
                                type="button"
                                title="Funcionalidad disponible en la versión con gestión de usuarios"
                                className="text-sm text-slate-400 font-medium cursor-not-allowed"
                                disabled
                            >
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
