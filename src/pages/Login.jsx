import React, { useState } from 'react';
import { Landmark, Globe, KeyRound, ShieldCheck } from 'lucide-react';
import Button from '../components/Button';

const Login = ({ onLogin }) => {
    const [user, setUser] = useState('');
    const [pass, setPass] = useState('');
    const [loading, setLoading] = useState(false);
    const [lang, setLang] = useState('es');

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => {
            if (user === 'Vladislav' && pass === '1234') onLogin({ name: user, role: 'Admin', lang });
            else { alert(lang === 'es' ? "Error: Credenciales inválidas (Usa Vladislav / 1234)" : "Error: Invalid credentials"); setLoading(false); }
        }, 1000);
    };

    return (
        <div className="min-h-screen w-full flex bg-background">
            {/* Left Side: Decorative Panel */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-slate-900/80 z-10"></div>
                
                {/* Abstract Shapes */}
                <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-emerald-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                
                <div className="relative z-20 flex items-center gap-3 text-white">
                    <Landmark size={32} className="text-blue-400" />
                    <span className="text-2xl font-bold tracking-wide">HotelShops</span>
                </div>
                
                <div className="relative z-20 space-y-6">
                    <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                        Sistema Inteligente de<br/>
                        <span className="text-blue-400">Cartera de Proveedores</span>
                    </h1>
                    <p className="text-slate-400 text-lg max-w-md">
                        Gestiona, autoriza y consolida propuestas de pago corporativas de manera centralizada y segura.
                    </p>
                    <div className="flex items-center gap-4 mt-8">
                        <div className="flex -space-x-3">
                            <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center"><ShieldCheck size={18} className="text-emerald-400"/></div>
                            <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center"><KeyRound size={18} className="text-blue-400"/></div>
                        </div>
                        <span className="text-sm font-medium text-slate-400">Acceso cifrado de extremo a extremo</span>
                    </div>
                </div>
                
                <div className="relative z-20 italic text-slate-500 text-sm">
                    &copy; 2026 HotelShops Corp. Todos los derechos reservados.
                </div>
            </div>

            {/* Right Side: Form Panel */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 relative animate-fade-in">
                {/* Language Toggle */}
                <div className="absolute top-8 right-8 flex gap-2">
                    <button onClick={() => setLang('es')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${lang === 'es' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>ES</button>
                    <button onClick={() => setLang('en')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${lang === 'en' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>EN</button>
                </div>

                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <div className="lg:hidden flex items-center justify-center gap-2 mb-6 text-primary">
                            <Landmark size={32} />
                            <span className="text-2xl font-bold text-slate-800">HotelShops</span>
                        </div>
                        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
                            {lang === 'es' ? 'Bienvenido de nuevo' : 'Welcome back'}
                        </h2>
                        <p className="text-slate-500 mt-2">
                            {lang === 'es' ? 'Ingresa tus credenciales corporativas.' : 'Enter your corporate credentials.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">{lang === 'es' ? 'Usuario' : 'Username'}</label>
                            <input 
                                type="text" 
                                placeholder="Ej. Vladislav" 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800"
                                value={user} 
                                onChange={e => setUser(e.target.value)} 
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-semibold text-slate-700">{lang === 'es' ? 'Contraseña' : 'Password'}</label>
                                <a href="#" onClick={(e) => { e.preventDefault(); alert("Contacto al administrador IT."); }} className="text-sm font-medium text-primary hover:text-blue-700 transition-colors">
                                    {lang === 'es' ? '¿Olvidaste tu contraseña?' : 'Forgot password?'}
                                </a>
                            </div>
                            <input 
                                type="password" 
                                placeholder="••••••••" 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800"
                                value={pass} 
                                onChange={e => setPass(e.target.value)} 
                                required
                            />
                        </div>
                        
                        <Button type="submit" className="w-full py-3.5 text-base mt-4" loading={loading} variant="primary">
                            {lang === 'es' ? 'Iniciar Sesión' : 'Sign In'}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
