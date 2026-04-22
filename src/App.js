import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import emailjs from '@emailjs/browser';
import { 
  LayoutDashboard, Ticket, Settings, Users, Plus, 
  LogOut, Archive, Trash2, Key, ShieldCheck, Clock, CheckCircle2, ChevronLeft, Bell, Lightbulb
} from 'lucide-react';

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
  const [view, setView] = useState(window.location.hash.replace('#', '') || 'my_tickets');
  const [tickets, setTickets] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, closed: 0 });
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [announcement, setAnnouncement] = useState({ active: false, text: '' });

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
    
    const { data: annData } = await supabase.from('settings').select('*').eq('key', 'system_announcement').maybeSingle();
    if (annData) setAnnouncement(annData.value);

    let ticketsQuery = supabase.from('tickets').select(`*, reporter:users!user_id(name, email), category:categories(name), subcategory:subcategories(name)`);
    
    // סינון קריאות: אדמין רואה הכל, משתמש רואה רק את שלו
    if (activeUser.role !== 'admin') {
      ticketsQuery = ticketsQuery.eq('user_id', activeUser.id);
    }
    
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
      
      {/* Sidebar */}
      <aside className={`hidden md:flex w-64 border-l ${theme.sidebar} ${theme.border} flex-col z-20 shadow-xl`}>
        <div className="p-8 flex flex-col items-center gap-4">
          <img src={KALI_LOGO} alt="Kali Logo" className="w-28" />
          <div className="h-[1px] w-full bg-blue-500/10 mt-2"></div>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          <NavItem icon={<Plus size={18}/>} label="קריאה חדשה" active={view === 'new_ticket'} onClick={() => window.location.hash = 'new_ticket'} />
          <NavItem icon={<Ticket size={18}/>} label="הקריאות שלי" active={view === 'my_tickets'} onClick={() => window.location.hash = 'my_tickets'} />
          {user.role === 'admin' && (
            <div className="pt-4 mt-4 border-t border-blue-500/10 space-y-1">
              <NavItem icon={<LayoutDashboard size={18}/>} label="דשבורד" active={view === 'dashboard'} onClick={() => window.location.hash = 'dashboard'} />
              <NavItem icon={<Archive size={18}/>} label="ארכיון" active={view === 'archive'} onClick={() => window.location.hash = 'archive'} />
              <NavItem icon={<Users size={18}/>} label="ניהול עובדים" active={view === 'users'} onClick={() => window.location.hash = 'users'} />
              <NavItem icon={<Settings size={18}/>} label="הגדרות מערכת" active={view === 'settings'} onClick={() => window.location.hash = 'settings'} />
            </div>
          )}
        </nav>
        <div className="p-6">
          <button onClick={() => { supabase.auth.signOut(); window.location.reload(); }} className="text-red-400 font-bold text-xs flex items-center gap-2 hover:bg-red-500/10 p-3 rounded-xl transition-all w-full justify-center border border-red-500/20">
            <LogOut size={14}/> התנתק
          </button>
        </div>
      </aside>

      {/* Mobile Nav */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 ${theme.sidebar} border-t ${theme.border} z-50 flex justify-around items-center px-2 py-3 shadow-2xl`}>
        <MobileNavItem icon={<Plus size={22}/>} active={view === 'new_ticket'} onClick={() => window.location.hash = 'new_ticket'} />
        <MobileNavItem icon={<Ticket size={22}/>} active={view === 'my_tickets'} onClick={() => window.location.hash = 'my_tickets'} />
        {user.role === 'admin' && (
          <MobileNavItem icon={<LayoutDashboard size={22}/>} active={view === 'dashboard'} onClick={() => window.location.hash = 'dashboard'} />
        )}
        <button onClick={() => { supabase.auth.signOut(); window.location.reload(); }} className="text-red-500 p-2"><LogOut size={22}/></button>
      </nav>

      <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
        {announcement.active && (
          <div className="bg-blue-600 text-white py-2 overflow-hidden relative border-b border-blue-400/30 z-30">
            <div className="whitespace-nowrap animate-marquee inline-block font-bold text-sm">
              {announcement.text} &nbsp;&nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp;&nbsp; {announcement.text}
            </div>
          </div>
        )}

        <header className={`h-14 border-b ${theme.border} flex items-center px-6 justify-between bg-[#0A192F]/50 backdrop-blur-md`}>
            <div className="text-[11px] font-bold text-blue-300/60 uppercase">{user.name} | {user.role}</div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {view === 'dashboard' && user.role === 'admin' && <Dashboard stats={stats} tickets={tickets.filter(t => t.status !== 'closed')} onSelect={setSelectedTicket} theme={theme} />}
          {view === 'new_ticket' && <NewTicket categories={categories} subcategories={subcategories} user={user} onSuccess={() => { loadData(); window.location.hash = 'my_tickets'; }} theme={theme} />}
          {view === 'my_tickets' && <TicketsList title="הקריאות שלי" tickets={tickets} onSelect={setSelectedTicket} theme={theme} isAdmin={user.role === 'admin'} />}
          {view === 'archive' && user.role === 'admin' && <TicketsList title="ארכיון קריאות" tickets={tickets.filter(t => t.status === 'closed')} onSelect={setSelectedTicket} theme={theme} isAdmin={true} />}
          {view === 'users' && user.role === 'admin' && <UsersManager allUsers={allUsers} loadData={loadData} theme={theme} />}
          {view === 'settings' && user.role === 'admin' && <SettingsManager categories={categories} subcategories={subcategories} loadData={loadData} theme={theme} tickets={tickets} userEmail={user.email} announcement={announcement} setAnnouncement={setAnnouncement} />}
        </div>
      </main>

      {selectedTicket && <Modal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} onUpdate={async (status, solution) => { 
        await supabase.from('tickets').update({ status, solution }).eq('id', selectedTicket.id); 
        loadData(); 
        setSelectedTicket(null); 
      }} isAdmin={user.role === 'admin'} theme={theme} />}
      
      <style>{`
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .animate-marquee { animation: marquee 20s linear infinite; }
      `}</style>
    </div>
  );
}

// --- קומפוננטת המודאל עם פתרון ---
function Modal({ ticket, onClose, onUpdate, isAdmin, theme }) {
  const [solutionText, setSolutionText] = useState(ticket.solution || '');

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-end md:items-center justify-center z-[100] p-0 md:p-4 text-right" onClick={onClose}>
      <div className={`w-full md:max-w-md rounded-t-[2.5rem] md:rounded-[2.5rem] border p-8 shadow-2xl ${theme.card} ${theme.border} animate-in slide-in-from-bottom duration-300`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6"><h3 className="text-[10px] font-black text-blue-500 tracking-widest uppercase">פרטי קריאה</h3><button onClick={onClose}>✕</button></div>
        
        <div className="p-5 rounded-2xl mb-4 bg-black/30 border border-blue-900/30">
          <p className="font-black text-lg mb-2">{ticket.title}</p>
          <p className="text-slate-300 text-sm leading-relaxed">{ticket.description}</p>
        </div>

        {/* הצגת פתרון ללקוח במידה וקיים */}
        {ticket.solution && (
          <div className="p-4 rounded-2xl mb-4 bg-emerald-500/10 border border-emerald-500/30">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
              <Lightbulb size={14}/> פתרון צוות IT:
            </div>
            <p className="text-emerald-50 text-sm italic">{ticket.solution}</p>
          </div>
        )}

        {/* עריכת פתרון לאדמין בלבד */}
        {isAdmin && ticket.status !== 'closed' && (
          <div className="mb-6 space-y-2">
            <label className="text-[10px] font-bold text-slate-500 mr-1 uppercase tracking-widest">הוסף פתרון (אופציונלי):</label>
            <textarea 
              value={solutionText} 
              onChange={e => setSolutionText(e.target.value)} 
              placeholder="כתוב כאן איך התקלה נפתרה..."
              className={`w-full p-3 rounded-xl text-xs h-20 outline-none ${theme.input}`}
            />
          </div>
        )}

        {isAdmin && ticket.status !== 'closed' && (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => onUpdate('in_progress', solutionText)} className="bg-amber-600 text-white py-4 rounded-2xl font-black text-xs">בטיפול</button>
            <button onClick={() => onUpdate('closed', solutionText)} className="bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs shadow-lg shadow-emerald-900/20">סגור ושלח פתרון</button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- שאר הקומפוננטות (ללא שינוי מהותי) ---
function NavItem({ icon, label, active, onClick }) { return <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>{icon} {label}</button>; }
function MobileNavItem({ icon, active, onClick }) { return <button onClick={onClick} className={`p-2 rounded-xl transition-all ${active ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>{icon}</button>; }

function NewTicket({ categories, subcategories, user, onSuccess, theme }) {
  const [form, setForm] = useState({ title: '', description: '', category_id: '', subcategory_id: '' });
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.from('tickets').insert([{ ...form, user_id: user.id, status: 'open' }]).select(`*, reporter:users!user_id(name), category:categories(name)`).single();
    if (!error) {
      emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', { title: form.title, reporter_name: user.name, category: data.category?.name || 'כללי', description: form.description, to_email: 'amirshaul10@gmail.com' }, 'YOUR_PUBLIC_KEY');
      onSuccess();
    }
  };
  return (
    <div className="max-w-xl mx-auto"><div className={`p-6 md:p-8 rounded-3xl border ${theme.card} ${theme.border} shadow-2xl`}>
      <h2 className="text-xl font-black mb-6 border-r-4 border-blue-500 pr-4">קריאה חדשה</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input required placeholder="נושא..." value={form.title} onChange={e => setForm({...form, title: e.target.value})} className={`w-full p-4 rounded-xl border ${theme.input} bg-black/20`} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select required className="w-full p-4 rounded-xl border bg-[#0F2445] text-white outline-none" onChange={e => setForm({...form, category_id: e.target.value})}>
            <option value="">קטגוריה</option> {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select required className="w-full p-4 rounded-xl border bg-[#0F2445] text-white outline-none" onChange={e => setForm({...form, subcategory_id: e.target.value})}>
            <option value="">תת-קטגוריה</option> {subcategories.filter(s => s.category_id === form.category_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <textarea rows={4} placeholder="תיאור..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} className={`w-full p-4 rounded-xl border ${theme.input} bg-black/20`} />
        <button className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl">שלח קריאה</button>
      </form>
    </div></div>
  );
}

function TicketsList({ title, tickets, onSelect, theme, isAdmin }) { 
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black italic border-r-4 border-blue-500 pr-3">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tickets.length === 0 && <p className="text-xs opacity-30 italic">אין קריאות להצגה...</p>}
        {tickets.map(t => (
          <div key={t.id} onClick={() => onSelect(t)} className={`p-5 rounded-2xl border ${theme.card} ${theme.border} cursor-pointer hover:border-blue-500/50 transition-all group`}>
            <div className="flex justify-between items-start mb-2">
              <StatusBadge status={t.status} />
              <span className="text-[10px] font-mono opacity-40">{formatJerusalemTime(t.created_at)}</span>
            </div>
            <h3 className="font-bold text-base mb-1 group-hover:text-blue-400 transition-colors">{t.title}</h3>
            <div className="flex justify-between items-center text-[11px] opacity-60">
              <span>{t.category?.name || 'כללי'}</span>
              {t.solution && <span className="flex items-center gap-1 text-emerald-400 font-bold"><CheckCircle2 size={12}/> פתורה</span>}
            </div>
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
      </div>
      <TicketsList title="תור עבודה נוכחי" tickets={tickets.slice(0, 10)} onSelect={onSelect} theme={theme} isAdmin={true} />
    </div>
  );
}

function SettingsManager({ categories, subcategories, loadData, theme, announcement, setAnnouncement }) {
  const [activeTab, setActiveTab] = useState('categories');
  const [newCat, setNewCat] = useState('');
  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className={`flex md:flex-col gap-2 p-2 rounded-2xl border ${theme.card} ${theme.border}`}>
         <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeTab === 'categories' ? 'bg-blue-600 text-white' : 'opacity-40'}`}>קטגוריות</button>
         <button onClick={() => setActiveTab('announcement')} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeTab === 'announcement' ? 'bg-amber-600 text-white' : 'opacity-40'}`}>הודעות</button>
      </div>
      <div className="flex-1">
        {activeTab === 'categories' && (
          <div className={`p-6 rounded-2xl border ${theme.card} ${theme.border} max-w-md`}>
            <div className="flex gap-2 mb-4">
              <input placeholder="קטגוריה חדשה" value={newCat} onChange={e => setNewCat(e.target.value)} className={`flex-1 p-3 rounded-xl text-xs ${theme.input}`} />
              <button onClick={async () => { await supabase.from('categories').insert([{name: newCat}]); setNewCat(''); loadData(); }} className="bg-blue-600 px-4 rounded-xl font-bold text-xs">הוסף</button>
            </div>
            <div className="space-y-1">{categories.map(c => <div key={c.id} className="flex justify-between py-2 border-b border-white/5"><span>{c.name}</span><button onClick={async () => { await supabase.from('categories').delete().eq('id', c.id); loadData(); }}><Trash2 size={14} className="text-red-500"/></button></div>)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, theme }) { return <div className={`p-4 md:p-5 rounded-2xl border ${theme.card} ${theme.border} shadow-lg text-right`}><div className="flex justify-between items-center mb-1"><span className="text-[10px] font-black text-slate-500 uppercase">{label}</span>{icon}</div><p className="text-xl md:text-2xl font-black">{value}</p></div>; }
function StatusBadge({ status }) { const s = { open: 'text-blue-400 bg-blue-400/10 border-blue-400/20', in_progress: 'text-amber-500 bg-amber-500/10 border-amber-500/20', closed: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' }[status]; return <span className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase ${s}`}>{status}</span>; }
function Login({ onLoginSuccess, theme }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const handleLogin = async (e) => { e.preventDefault(); const { data, error } = await supabase.auth.signInWithPassword({ email, password }); if (error) alert("שגיאה"); else onLoginSuccess(data.user); };
  return (
    <div className="relative h-screen w-screen flex items-center justify-center bg-black">
      <video autoPlay loop muted playsInline className="absolute z-0 min-w-full min-h-full object-cover opacity-60"><source src="/bg-finance.mp4" type="video/mp4" /></video>
      <div className="relative z-20 w-[90%] max-w-sm p-10 rounded-[3rem] border border-white/10 bg-[#0A192F]/60 backdrop-blur-xl flex flex-col items-center">
        <img src={KALI_LOGO} alt="Logo" className="w-32 mb-8" />
        <form onSubmit={handleLogin} className="w-full space-y-6">
          <input type="email" placeholder="אימייל" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 rounded-2xl bg-black/40 border border-blue-900/50 text-white outline-none" />
          <input type="password" placeholder="סיסמה" required value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 rounded-2xl bg-black/40 border border-blue-900/50 text-white outline-none" />
          <button className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl">כניסה</button>
        </form>
      </div>
    </div>
  );
}

function UsersManager({ allUsers, loadData, theme }) {
  return <div className="p-4 opacity-50 italic">ניהול עובדים פעיל...</div>;
}