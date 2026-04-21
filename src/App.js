import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { 
  LayoutDashboard, Ticket, Settings, Users, Plus, 
  LogOut, Archive, Trash2, Key, ShieldCheck, Clock, CheckCircle2, ChevronLeft
} from 'lucide-react';

// הכתובת החדשה של הלוגו ששלחת
const KALI_LOGO = "https://www.kali.co.il/wp-content/uploads/2025/03/logo-1.png";

const formatJerusalemTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  date.setHours(date.getHours() + 3);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month} | ${hours}:${minutes}`;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(window.location.hash.replace('#', '') || '');
  const [tickets, setTickets] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, closed: 0 });
  const [selectedTicket, setSelectedTicket] = useState(null);

  useEffect(() => {
    const handleHashChange = () => setView(window.location.hash.replace('#', '') || 'my_tickets');
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await fetchProfile(session.user);
      else setLoading(false);
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (user && user.role !== 'admin' && ['dashboard', 'archive', 'users', 'settings'].includes(view)) {
      window.location.hash = 'my_tickets';
    }
  }, [view, user]);

  const fetchProfile = async (authUser) => {
    const { data } = await supabase.from('users').select('*').eq('id', authUser.id).maybeSingle();
    const role = (authUser.email === 'amirshaul10@gmail.com' || data?.role === 'admin') ? 'admin' : 'user';
    const profile = { id: authUser.id, email: authUser.email, name: data?.name || authUser.email.split('@')[0], role };
    setUser(profile);
    
    if (!window.location.hash || window.location.hash === '#') {
        const defaultView = role === 'admin' ? 'dashboard' : 'my_tickets';
        window.location.hash = defaultView;
        setView(defaultView);
    }
    await loadData(profile);
    setLoading(false);
  };

  const loadData = async (currentUser) => {
    const activeUser = currentUser || user;
    if (!activeUser) return;
    let ticketsQuery = supabase.from('tickets').select(`*, reporter:users!user_id(name, email), category:categories(name), subcategory:subcategories(name)`);
    if (activeUser.role !== 'admin') ticketsQuery = ticketsQuery.eq('user_id', activeUser.id);
    const { data: ticketsData } = await ticketsQuery.order('created_at', { ascending: false });
    const [c, sc, u] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('subcategories').select('*, category:categories(name)').order('name'),
      supabase.from('users').select('*').order('name')
    ]);
    setTickets(ticketsData || []);
    setCategories(c.data || []);
    setSubcategories(sc.data || []);
    setAllUsers(u.data || []);
    setStats({ 
      total: u.data?.length || 0, 
      open: ticketsData?.filter(i => i.status !== 'closed').length || 0, 
      closed: ticketsData?.filter(i => i.status === 'closed').length || 0 
    });
  };

  const theme = {
    bg: 'bg-[#0B1E3B]',
    sidebar: 'bg-[#0A192F]',
    card: 'bg-[#162A4A]',
    border: 'border-blue-900/30',
    text: 'text-blue-50',
    input: 'bg-[#0F2445] border-blue-900/50 text-white focus:border-blue-400'
  };

  if (loading) return <div className={`h-screen flex items-center justify-center ${theme.bg}`}><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div></div>;
  if (!user) return <Login onLoginSuccess={(u) => fetchProfile(u)} theme={theme} />;

  return (
    <div className={`flex flex-col md:flex-row h-screen ${theme.bg} ${theme.text} font-sans overflow-hidden`} dir="rtl">
      
      {/* Sidebar - Desktop */}
      <aside className={`hidden md:flex w-64 border-l ${theme.sidebar} ${theme.border} flex-col z-20 shadow-xl`}>
        <div className="p-6 flex flex-col items-center gap-4">
          <img src={KALI_LOGO} alt="Kali Logo" className="w-32 cursor-pointer object-contain" onClick={() => window.location.hash = user.role === 'admin' ? 'dashboard' : 'my_tickets'}/>
          <div className="h-[1px] w-full bg-blue-500/10 mt-2"></div>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          <NavItem icon={<Plus size={18}/>} label="קריאה חדשה" active={view === 'new_ticket'} onClick={() => window.location.hash = 'new_ticket'} />
          <NavItem icon={<Ticket size={18}/>} label="הקריאות שלי" active={view === 'my_tickets'} onClick={() => window.location.hash = 'my_tickets'} />
          {user.role === 'admin' && (
            <div className="pt-4 mt-4 border-t border-blue-500/10 space-y-1">
              <NavItem icon={<LayoutDashboard size={18}/>} label="דשבורד" active={view === 'dashboard'} onClick={() => window.location.hash = 'dashboard'} />
              <NavItem icon={<Users size={18}/>} label="עובדים" active={view === 'users'} onClick={() => window.location.hash = 'users'} />
              <NavItem icon={<Settings size={18}/>} label="הגדרות" active={view === 'settings'} onClick={() => window.location.hash = 'settings'} />
            </div>
          )}
        </nav>
        <div className="p-6">
          <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="text-red-400 font-bold text-xs flex items-center gap-2 hover:bg-red-500/10 p-3 rounded-xl transition-all w-full justify-center border border-red-500/20">
            <LogOut size={14}/> התנתק
          </button>
        </div>
      </aside>

      {/* Mobile Nav - Bottom Bar */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 ${theme.sidebar} border-t ${theme.border} z-50 flex justify-around items-center px-2 py-3 shadow-2xl`}>
        <MobileNavItem icon={<Plus size={22}/>} active={view === 'new_ticket'} onClick={() => window.location.hash = 'new_ticket'} />
        <MobileNavItem icon={<Ticket size={22}/>} active={view === 'my_tickets'} onClick={() => window.location.hash = 'my_tickets'} />
        {user.role === 'admin' && (
          <>
            <MobileNavItem icon={<LayoutDashboard size={22}/>} active={view === 'dashboard'} onClick={() => window.location.hash = 'dashboard'} />
            <MobileNavItem icon={<Users size={22}/>} active={view === 'users'} onClick={() => window.location.hash = 'users'} />
          </>
        )}
        <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="text-red-500 p-2"><LogOut size={22}/></button>
      </nav>

      <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
        <header className={`h-14 border-b ${theme.border} flex items-center px-4 md:px-6 justify-between bg-[#0A192F]/50 backdrop-blur-md`}>
            <div className="flex items-center gap-3">
               <img src={KALI_LOGO} alt="Logo" className="h-7 md:h-8 object-contain" />
            </div>
            <div className="text-[11px] font-bold text-blue-300/60 uppercase tracking-tighter">
               {user.name} | {user.role}
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {view === 'dashboard' && user.role === 'admin' && <Dashboard stats={stats} tickets={tickets.filter(t => t.status !== 'closed')} onSelect={setSelectedTicket} theme={theme} />}
          {view === 'new_ticket' && <NewTicket categories={categories} subcategories={subcategories} user={user} onSuccess={() => { loadData(); window.location.hash = 'my_tickets'; }} theme={theme} />}
          {view === 'my_tickets' && <TicketsList title="הקריאות שלי" tickets={tickets} onSelect={setSelectedTicket} theme={theme} isAdmin={user.role === 'admin'} />}
          {view === 'users' && user.role === 'admin' && <UsersManager allUsers={allUsers} loadData={loadData} theme={theme} />}
          {view === 'settings' && user.role === 'admin' && <SettingsManager categories={categories} subcategories={subcategories} loadData={loadData} theme={theme} tickets={tickets} userEmail={user.email} />}
        </div>
      </main>

      {selectedTicket && <Modal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} onUpdate={async (status) => { await supabase.from('tickets').update({ status }).eq('id', selectedTicket.id); loadData(); setSelectedTicket(null); }} isAdmin={user.role === 'admin'} theme={theme} />}
    </div>
  );
}

// --- Responsive Components ---

function NavItem({ icon, label, active, onClick }) { 
  return <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>{icon} {label}</button>; 
}

function MobileNavItem({ icon, active, onClick }) {
  return <button onClick={onClick} className={`p-2 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-md scale-110' : 'text-slate-500'}`}>{icon}</button>;
}

function Login({ onLoginSuccess, theme }) {
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const handleLogin = async (e) => { 
    e.preventDefault(); 
    const { data, error } = await supabase.auth.signInWithPassword({ email, password }); 
    if (error) alert("שגיאה: " + error.message); 
    else onLoginSuccess(data.user); 
  };
  return (
    <div className="relative h-screen w-screen flex items-center justify-center overflow-hidden bg-black">
      <video autoPlay loop muted playsInline className="absolute z-0 min-w-full min-h-full object-cover opacity-60">
        <source src="/bg-finance.mp4" type="video/mp4" />
      </video>
      <div className="absolute z-10 inset-0 bg-[#0B1E3B]/80 backdrop-blur-[2px]"></div>
      <div className={`relative z-20 w-[90%] max-w-sm p-10 md:p-12 rounded-[3rem] border border-white/10 shadow-2xl flex flex-col items-center bg-[#0A192F]/60 backdrop-blur-xl animate-in zoom-in-95 duration-500`}>
        <div className="bg-white/10 p-4 rounded-3xl mb-8 backdrop-blur-sm">
            <img src={KALI_LOGO} alt="Kali Logo" className="w-36 md:w-44 h-auto object-contain" />
        </div>
        <form onSubmit={handleLogin} className="w-full space-y-6 text-right">
          <input type="email" placeholder="אימייל ארגוני" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 rounded-2xl outline-none border text-sm bg-black/40 border-blue-900/50 text-white focus:border-blue-400 transition-all" />
          <input type="password" placeholder="סיסמה" required value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 rounded-2xl outline-none border text-sm bg-black/40 border-blue-900/50 text-white focus:border-blue-400 transition-all" />
          <button className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-500 transition-all transform active:scale-95">כניסה לפורטל KALI</button>
        </form>
      </div>
    </div>
  );
}

// --- Components Helpers ---

function TicketsList({ title, tickets, onSelect, theme, isAdmin }) { 
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black italic border-r-4 border-blue-500 pr-3">{title}</h2>
      <div className="hidden md:block rounded-2xl border overflow-hidden ${theme.card} ${theme.border} shadow-2xl">
        <table className="w-full text-right text-sm">
          <thead className="bg-black/20 opacity-50 text-xs font-black">
            <tr><th className="px-6 py-4">סטטוס</th><th className="px-6 py-4">נושא</th><th className="px-6 py-4">שולח</th><th className="px-6 py-4">זמן</th><th className="px-6 py-4">פעולה</th></tr>
          </thead>
          <tbody className="divide-y border-blue-900/20">
            {tickets.map(t => (
              <tr key={t.id} className="hover:bg-blue-500/5 transition-colors">
                <td className="px-6 py-4"><StatusBadge status={t.status} /></td>
                <td className="px-6 py-4 font-bold">{t.title}</td>
                <td className="px-6 py-4 opacity-70">{t.reporter?.name}</td>
                <td className="px-6 py-4 font-mono text-xs opacity-50">{formatJerusalemTime(t.created_at)}</td>
                <td className="px-6 py-4"><button onClick={() => onSelect(t)} className="bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded-lg font-bold text-xs">נהל</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:hidden space-y-3">
        {tickets.map(t => (
          <div key={t.id} onClick={() => onSelect(t)} className={`p-4 rounded-2xl border ${theme.card} ${theme.border} active:scale-95 transition-transform`}>
            <div className="flex justify-between items-start mb-2"><StatusBadge status={t.status} /><span className="font-mono text-[10px] opacity-40">{formatJerusalemTime(t.created_at)}</span></div>
            <h3 className="font-bold text-base mb-1">{t.title}</h3>
            <div className="flex justify-between items-center text-xs opacity-60"><span>{t.reporter?.name}</span><ChevronLeft size={16} className="text-blue-500" /></div>
          </div>
        ))}
      </div>
    </div>
  ); 
}

function Dashboard({ stats, tickets, onSelect, theme }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="ממתינות" value={stats.open} icon={<Clock size={18} className="text-blue-500"/>} theme={theme} />
        <StatCard label="סגורות" value={stats.closed} icon={<CheckCircle2 size={18} className="text-emerald-500"/>} theme={theme} />
        <StatCard label="עובדים" value={stats.total} icon={<Users size={18} className="text-amber-500"/>} theme={theme} />
        <StatCard label="SLA" value="100%" icon={<ShieldCheck size={18} className="text-purple-500"/>} theme={theme} />
      </div>
      <TicketsList title="תור עבודה נוכחי" tickets={tickets.slice(0, 10)} onSelect={onSelect} theme={theme} isAdmin={true} />
    </div>
  );
}

function StatCard({ label, value, icon, theme }) { 
  return <div className={`p-4 md:p-5 rounded-2xl border ${theme.card} ${theme.border} shadow-lg text-right`}><div className="flex justify-between items-center mb-1"><span className="text-[10px] font-black text-slate-500 uppercase">{label}</span>{icon}</div><p className="text-xl md:text-2xl font-black">{value}</p></div>; 
}

function StatusBadge({ status }) { 
  const s = { open: 'text-blue-400 bg-blue-400/10 border-blue-400/20', in_progress: 'text-amber-500 bg-amber-500/10 border-amber-500/20', closed: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' }[status]; 
  return <span className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase ${s}`}>{status}</span>; 
}

function NewTicket({ categories, subcategories, user, onSuccess, theme }) {
  const [form, setForm] = useState({ title: '', description: '', category_id: '', subcategory_id: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await supabase.from('tickets').insert([{ ...form, user_id: user.id, status: 'open' }]);
    if (error) alert("שגיאה: " + error.message); else onSuccess();
    setIsSubmitting(false);
  };
  return (
    <div className="max-w-xl mx-auto">
      <div className={`p-6 md:p-8 rounded-3xl border ${theme.card} ${theme.border} shadow-2xl`}>
        <h2 className="text-xl font-black mb-6 italic border-r-4 border-blue-500 pr-4">פתיחת קריאה</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input required placeholder="נושא הפנייה..." value={form.title} onChange={e => setForm({...form, title: e.target.value})} className={`w-full p-4 rounded-xl border outline-none text-sm ${theme.input} bg-black/20`} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select required className="w-full p-4 rounded-xl border text-sm bg-[#0F2445] text-white appearance-none" onChange={e => setForm({...form, category_id: e.target.value})}>
              <option value="">קטגוריה</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select required className="w-full p-4 rounded-xl border text-sm bg-[#0F2445] text-white appearance-none" onChange={e => setForm({...form, subcategory_id: e.target.value})}>
              <option value="">תת-קטגוריה</option>
              {subcategories.filter(s => s.category_id === form.category_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <textarea rows={5} placeholder="תיאור..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} className={`w-full p-4 rounded-xl border outline-none text-sm resize-none ${theme.input} bg-black/20`} />
          <button disabled={isSubmitting} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-500 transition-all transform active:scale-95">{isSubmitting ? 'שולח...' : 'שלח קריאה'}</button>
        </form>
      </div>
    </div>
  );
}

function UsersManager({ allUsers, loadData, theme }) {
  const [nu, setNu] = useState({ name: '', email: '', password: '', role: 'user' });
  return (
    <div className="space-y-6">
      <div className={`p-6 rounded-2xl border ${theme.card} ${theme.border} shadow-lg`}>
        <h3 className="font-bold mb-4 text-xs uppercase text-blue-500">עובד חדש</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input placeholder="שם" value={nu.name} onChange={e => setNu({...nu, name: e.target.value})} className="p-3 rounded-xl border text-sm outline-none bg-[#0F2445] text-white" />
          <input placeholder="מייל" value={nu.email} onChange={e => setNu({...nu, email: e.target.value})} className="p-3 rounded-xl border text-sm outline-none bg-[#0F2445] text-white" />
          <input type="password" placeholder="סיסמה" value={nu.password} onChange={e => setNu({...nu, password: e.target.value})} className="p-3 rounded-xl border text-sm outline-none bg-[#0F2445] text-white" />
          <select value={nu.role} onChange={e => setNu({...nu, role: e.target.value})} className="p-3 rounded-xl border text-sm bg-[#0F2445] text-white"><option value="user">עובד</option><option value="admin">מנהל</option></select>
          <button onClick={async () => { const { data } = await supabase.auth.signUp({ email: nu.email, password: nu.password }); await supabase.from('users').insert([{ id: data.user.id, name: nu.name, email: nu.email, role: nu.role }]); loadData(); setNu({ name: '', email: '', password: '', role: 'user' }); }} className="bg-blue-600 text-white font-bold rounded-xl py-3">הוסף</button>
        </div>
      </div>
      {allUsers.map(u => (
        <div key={u.id} className={`p-4 rounded-2xl border ${theme.card} ${theme.border} flex justify-between items-center`}>
           <div className="flex flex-col"><span className="font-bold">{u.name}</span><span className="text-[11px] opacity-40">{u.email}</span></div>
           <button onClick={async () => { if(window.confirm('מחק עובד?')) { await supabase.from('users').delete().eq('id', u.id); loadData(); }}} className="text-red-500 p-2"><Trash2 size={16}/></button>
        </div>
      ))}
    </div>
  );
}

function SettingsManager({ categories, subcategories, loadData, theme }) {
  const [newCat, setNewCat] = useState('');
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className={`p-6 rounded-2xl border ${theme.card} ${theme.border}`}>
        <h5 className="text-[10px] font-black uppercase opacity-50 mb-4 tracking-widest">קטגוריות</h5>
        <div className="flex gap-2 mb-4">
          <input placeholder="חדש..." value={newCat} onChange={e => setNewCat(e.target.value)} className="flex-1 p-3 rounded-xl border outline-none text-xs bg-[#0F2445] text-white" />
          <button onClick={async () => { await supabase.from('categories').insert([{name: newCat}]); setNewCat(''); loadData(); }} className="bg-blue-600 px-4 rounded-xl font-bold text-xs">הוסף</button>
        </div>
        <div className="space-y-2">{categories.map(c => <div key={c.id} className="flex justify-between py-2 border-b border-white/5"><span>{c.name}</span><button onClick={async () => { await supabase.from('categories').delete().eq('id', c.id); loadData(); }}><Trash2 size={14} className="text-red-500"/></button></div>)}</div>
      </div>
    </div>
  );
}

function Modal({ ticket, onClose, onUpdate, isAdmin, theme }) {
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-end md:items-center justify-center z-[100] p-0 md:p-4 text-right" onClick={onClose}>
      <div className={`w-full md:max-w-md rounded-t-[2.5rem] md:rounded-[2.5rem] border p-8 shadow-2xl ${theme.card} ${theme.border} animate-in slide-in-from-bottom md:zoom-in-95 duration-300`} onClick={e => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6 md:hidden"></div>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">מידע</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">✕</button>
        </div>
        <div className="p-5 rounded-2xl mb-6 bg-black/30 border border-blue-900/30">
          <p className="font-black text-lg mb-3 leading-tight">{ticket.title}</p>
          <p className="text-slate-300 text-sm leading-relaxed">{ticket.description}</p>
        </div>
        {isAdmin && ticket.status !== 'closed' && (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => onUpdate('in_progress')} className="bg-amber-600 text-white py-4 rounded-2xl font-black text-xs">בטיפול</button>
            <button onClick={() => onUpdate('closed')} className="bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs">סגור</button>
          </div>
        )}
      </div>
    </div>
  );
}