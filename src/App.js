import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { 
  LayoutDashboard, Ticket, Settings, Users, Plus, 
  LogOut, Archive, Trash2, Database, History, Key, ShieldCheck, Calendar, Clock, CheckCircle2 
} from 'lucide-react';

const KALI_LOGO = "https://www.kali.co.il/wp-content/uploads/2025/03/logo-1.png";

// פונקציית זמן ירושלים
const formatJerusalemTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  date.setHours(date.getHours() + 3);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} | ${hours}:${minutes}`;
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

  // חסימת גישה לדפים ניהוליים למשתמשים רגילים
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
    
    // --- התיקון כאן: ניתוב אוטומטי לפי תפקיד בכניסה ---
    if (role === 'admin') {
      window.location.hash = 'dashboard';
      setView('dashboard');
    } else {
      window.location.hash = 'my_tickets';
      setView('my_tickets');
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

  const handleLogoClick = () => {
    window.location.hash = user.role === 'admin' ? 'dashboard' : 'my_tickets';
  };

  const theme = {
    bg: 'bg-[#0B1E3B]',
    sidebar: 'bg-[#0A192F]',
    card: 'bg-[#162A4A]',
    border: 'border-blue-900/30',
    text: 'text-blue-50',
    input: 'bg-[#0F2445] border-blue-900/50 text-white placeholder-blue-300/30 focus:border-blue-400'
  };

  if (loading) return <div className={`h-screen flex items-center justify-center ${theme.bg}`}><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div></div>;
  if (!user) return <Login onLoginSuccess={(u) => fetchProfile(u)} theme={theme} />;

  return (
    <div className={`flex h-screen ${theme.bg} ${theme.text} font-sans text-[14px]`} dir="rtl">
      <aside className={`w-56 border-l ${theme.sidebar} ${theme.border} flex flex-col z-20 shadow-xl`}>
        <div className="p-5 flex flex-col items-center gap-4">
          <img src={KALI_LOGO} alt="Kali Logo" className="w-28 cursor-pointer hover:opacity-80 transition-opacity" onClick={handleLogoClick}/>
          <div className="h-[1px] w-full bg-blue-500/10 mt-2"></div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          <NavItem icon={<Plus size={15}/>} label="קריאה חדשה" active={view === 'new_ticket'} onClick={() => window.location.hash = 'new_ticket'} />
          <NavItem icon={<Ticket size={15}/>} label="הקריאות שלי" active={view === 'my_tickets'} onClick={() => window.location.hash = 'my_tickets'} />
          
          {user.role === 'admin' && (
            <div className="pt-3 mt-2 border-t border-blue-500/10 space-y-1">
              <NavItem icon={<LayoutDashboard size={15}/>} label="לוח בקרה" active={view === 'dashboard'} onClick={() => window.location.hash = 'dashboard'} />
              <NavItem icon={<Archive size={15}/>} label="ארכיון קריאות" active={view === 'archive'} onClick={() => window.location.hash = 'archive'} />
              <NavItem icon={<Users size={15}/>} label="ניהול עובדים" active={view === 'users'} onClick={() => window.location.hash = 'users'} />
              <NavItem icon={<Settings size={15}/>} label="הגדרות מערכת" active={view === 'settings'} onClick={() => window.location.hash = 'settings'} />
            </div>
          )}
        </nav>
        <div className="p-4"><button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="text-red-500 font-bold text-[11px] flex items-center gap-2 hover:underline"><LogOut size={13}/> התנתק</button></div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className={`h-12 border-b ${theme.border} flex items-center px-6 justify-between`}>
            <div className="text-[11px] opacity-50">שלום, {user.name} ({user.role === 'admin' ? 'מנהל' : 'משתמש'})</div>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          {view === 'dashboard' && user.role === 'admin' && <Dashboard stats={stats} tickets={tickets.filter(t => t.status !== 'closed')} onSelect={setSelectedTicket} theme={theme} />}
          {view === 'new_ticket' && <NewTicket categories={categories} subcategories={subcategories} user={user} onSuccess={() => { loadData(); window.location.hash = 'my_tickets'; }} theme={theme} />}
          {view === 'my_tickets' && <TicketsList title="הקריאות שלי" tickets={tickets} onSelect={setSelectedTicket} theme={theme} isAdmin={user.role === 'admin'} />}
          {view === 'archive' && user.role === 'admin' && <TicketsList title="ארכיון קריאות" tickets={tickets.filter(t => t.status === 'closed')} onSelect={setSelectedTicket} theme={theme} isAdmin={true} />}
          {view === 'users' && user.role === 'admin' && <UsersManager allUsers={allUsers} loadData={loadData} theme={theme} />}
          {view === 'settings' && user.role === 'admin' && <SettingsManager categories={categories} subcategories={subcategories} loadData={loadData} theme={theme} tickets={tickets} userEmail={user.email} />}
        </div>
      </main>

      {selectedTicket && <Modal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} onUpdate={async (status) => { await supabase.from('tickets').update({ status }).eq('id', selectedTicket.id); loadData(); setSelectedTicket(null); }} isAdmin={user.role === 'admin'} theme={theme} />}
    </div>
  );
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
      <div className="absolute z-10 inset-0 bg-[#0B1E3B]/70 backdrop-blur-[2px]"></div>
      <div className={`relative z-20 w-full max-w-sm p-12 rounded-[3rem] border border-blue-500/20 shadow-[0_0_80px_rgba(0,0,0,0.5)] flex flex-col items-center bg-[#0A192F]/80 backdrop-blur-xl animate-in zoom-in-95 duration-500`}>
        <img src={KALI_LOGO} alt="Kali Logo" className="w-44 mb-10" />
        <form onSubmit={handleLogin} className="w-full space-y-6 text-right">
          <input 
            type="email" 
            placeholder="אימייל ארגוני" 
            required 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            className="w-full p-4 rounded-2xl outline-none border text-sm bg-black/40 border-blue-900/50 text-white focus:border-blue-400 transition-all" 
          />
          <input 
            type="password" 
            placeholder="סיסמה" 
            required 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            className="w-full p-4 rounded-2xl outline-none border text-sm bg-black/40 border-blue-900/50 text-white focus:border-blue-400 transition-all" 
          />
          <button className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-500 transition-all transform active:scale-95">
            כניסה
          </button>
        </form>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) { 
  return <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg font-bold text-[13px] transition-all cursor-pointer ${active ? 'bg-blue-600 text-white shadow-xl translate-x-1' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>{icon} {label}</button>; 
}

function StatCard({ label, value, icon, theme }) { 
  return <div className={`p-5 rounded-xl border ${theme.card} ${theme.border} shadow-lg text-right`}><div className="flex justify-between items-center mb-1"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>{icon}</div><p className="text-2xl font-black">{value}</p></div>; 
}

function StatusBadge({ status }) { 
  const s = { open: 'text-blue-400 bg-blue-400/10 border-blue-400/20', in_progress: 'text-amber-500 bg-amber-500/10 border-amber-500/20', closed: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' }[status]; 
  return <span className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase ${s}`}>{status}</span>; 
}

function Dashboard({ stats, tickets, onSelect, theme }) {
  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="ממתינות לטיפול" value={stats.open} icon={<Clock size={18} className="text-blue-500"/>} theme={theme} />
        <StatCard label="קריאות שנסגרו" value={stats.closed} icon={<CheckCircle2 size={18} className="text-emerald-500"/>} theme={theme} />
        <StatCard label="סה״כ עובדים" value={stats.total} icon={<Users size={18} className="text-amber-500"/>} theme={theme} />
        <StatCard label="SLA יומי" value="100%" icon={<ShieldCheck size={18} className="text-purple-500"/>} theme={theme} />
      </div>
      <div className={`rounded-xl border ${theme.card} ${theme.border} overflow-hidden shadow-2xl`}>
        <div className="px-5 py-3 border-b border-blue-900/10 font-bold text-sm italic">תור עבודה נוכחי (Live)</div>
        <TicketsTable tickets={tickets.slice(0, 15)} onSelect={onSelect} theme={theme} isAdmin={true} />
      </div>
    </div>
  );
}

function TicketsTable({ tickets, onSelect, theme, isAdmin }) {
  return (
    <table className="w-full text-right text-[12px]">
      <thead className="opacity-40 font-black uppercase bg-black/20">
        <tr>
          <th className="px-5 py-2.5">סטטוס</th>
          <th className="px-5 py-2.5">נושא</th>
          <th className="px-5 py-2.5">שולח</th>
          <th className="px-5 py-2.5">זמן פתיחה</th>
          <th className="px-5 py-2.5">{isAdmin ? 'ניהול' : 'פרטים'}</th>
        </tr>
      </thead>
      <tbody className={`divide-y ${theme.border}`}>
        {tickets.map(t => (
          <tr key={t.id} className="hover:bg-blue-500/10 transition-colors group">
            <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
            <td className="px-5 py-3 font-bold">{t.title}</td>
            <td className="px-5 py-3 opacity-60 font-semibold">{t.reporter?.name}</td>
            <td className="px-5 py-3 font-mono text-blue-300/80">{formatJerusalemTime(t.created_at)}</td>
            <td className="px-5 py-3"><button onClick={() => onSelect(t)} className="bg-blue-600 text-white px-3.5 py-1.5 rounded-lg font-bold text-[11px] cursor-pointer hover:bg-blue-500 shadow-md">{isAdmin ? 'נהל' : 'צפה'}</button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TicketsList({ title, tickets, onSelect, theme, isAdmin }) { 
  return (
    <div className="space-y-4 text-right">
      <h2 className="text-sm font-black italic border-r-4 border-blue-500 pr-3 opacity-80 uppercase tracking-tighter">{title}</h2>
      <div className={`rounded-xl border overflow-hidden ${theme.card} ${theme.border} shadow-2xl`}>
        <TicketsTable tickets={tickets} onSelect={onSelect} theme={theme} isAdmin={isAdmin} />
      </div>
    </div>
  ); 
}

function NewTicket({ categories, subcategories, user, onSuccess, theme }) {
  const [form, setForm] = useState({ title: '', description: '', category_id: '', subcategory_id: '' });
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('tickets').insert([{ ...form, user_id: user.id, status: 'open' }]);
    if (error) alert("שגיאה: " + error.message); else { alert("הקריאה נפתחה בהצלחה!"); onSuccess(); }
  };
  return (
    <div className="max-w-md mx-auto">
      <div className={`p-8 rounded-3xl border ${theme.card} ${theme.border} shadow-[0_0_50px_rgba(0,0,0,0.3)] text-right`}>
        <h2 className="text-xl font-black mb-6 italic border-r-4 border-blue-500 pr-4">פתיחת קריאת שירות</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input required placeholder="נושא הפנייה..." value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full p-3 rounded-xl border outline-none text-sm bg-black/40 border-blue-900/50 text-white focus:border-blue-400 transition-all" />
          <div className="grid grid-cols-2 gap-4">
            <select required className="w-full p-3 rounded-xl border text-sm bg-black/40 border-blue-900/50 text-white appearance-none cursor-pointer" onChange={e => setForm({...form, category_id: e.target.value})}>
              <option value="">קטגוריה</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select required className="w-full p-3 rounded-xl border text-sm bg-black/40 border-blue-900/50 text-white appearance-none cursor-pointer" onChange={e => setForm({...form, subcategory_id: e.target.value})}>
              <option value="">תת-קטגוריה</option>
              {subcategories.filter(s => s.category_id === form.category_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <textarea rows={4} placeholder="תיאור מפורט..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full p-4 rounded-xl border outline-none text-sm bg-black/40 border-blue-900/50 text-white resize-none" />
          <button className="w-full py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-500 shadow-lg transition-all transform active:scale-95">שלח קריאה</button>
        </form>
      </div>
    </div>
  );
}

function UsersManager({ allUsers, loadData, theme }) {
  const [nu, setNu] = useState({ name: '', email: '', password: '', role: 'user' });
  return (
    <div className="space-y-5 text-right">
      <div className={`p-5 rounded-xl border ${theme.card} ${theme.border} shadow-lg`}>
        <h3 className="font-bold mb-4 text-[11px] uppercase text-blue-500">הוספת עובד חדש</h3>
        <div className="grid grid-cols-5 gap-3">
          <input placeholder="שם" value={nu.name} onChange={e => setNu({...nu, name: e.target.value})} className="p-2 rounded-lg border text-xs outline-none bg-black/40 border-blue-900/50 text-white" />
          <input placeholder="מייל" value={nu.email} onChange={e => setNu({...nu, email: e.target.value})} className="p-2 rounded-lg border text-xs outline-none bg-black/40 border-blue-900/50 text-white" />
          <input type="password" placeholder="סיסמה" value={nu.password} onChange={e => setNu({...nu, password: e.target.value})} className="p-2 rounded-lg border text-xs outline-none bg-black/40 border-blue-900/50 text-white" />
          <select value={nu.role} onChange={e => setNu({...nu, role: e.target.value})} className="p-2 rounded-lg border text-xs bg-black/40 border-blue-900/50 text-white">
            <option value="user">עובד</option>
            <option value="admin">מנהל</option>
          </select>
          <button onClick={async () => { const { data } = await supabase.auth.signUp({ email: nu.email, password: nu.password }); await supabase.from('users').insert([{ id: data.user.id, name: nu.name, email: nu.email, role: nu.role }]); loadData(); setNu({ name: '', email: '', password: '', role: 'user' }); }} className="bg-blue-600 text-white font-bold rounded-lg text-xs hover:bg-blue-500 shadow-md">הוסף</button>
        </div>
      </div>
      <div className={`rounded-xl border overflow-hidden ${theme.card} ${theme.border} shadow-xl`}>
        <table className="w-full text-right text-[12px]"><thead className="bg-black/20 opacity-50"><tr><th className="px-5 py-3">שם</th><th className="px-5 py-3">מייל</th><th className="px-5 py-3">תפקיד</th><th className="px-5 py-3">פעולה</th></tr></thead><tbody className="divide-y">{allUsers.map(u => (<tr key={u.id} className="hover:bg-white/5"><td className="px-5 py-3 font-bold">{u.name}</td><td className="px-5 py-3 opacity-50">{u.email}</td><td className="px-5 py-3 uppercase font-black text-[10px] text-blue-400">{u.role}</td><td className="px-5 py-3"><button onClick={async () => { if(window.confirm('מחק עובד זה?')) { await supabase.from('users').delete().eq('id', u.id); loadData(); }}} className="text-red-500 p-1 cursor-pointer hover:scale-125 transition-transform"><Trash2 size={14}/></button></td></tr>))}</tbody></table>
      </div>
    </div>
  );
}

function SettingsManager({ categories, subcategories, loadData, theme, tickets, userEmail }) {
  const [activeTab, setActiveTab] = useState('categories');
  const [newCat, setNewCat] = useState('');
  const [newSub, setNewSub] = useState({ name: '', category_id: '' });
  const [passData, setPassData] = useState({ current: '', next: '' });
  const [passLoading, setPassLoading] = useState(false);

  const handleUpdatePassword = async () => {
    if (!passData.current || passData.next.length < 6) return alert("מלא פרטים (מינימום 6 תווים)");
    setPassLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: userEmail, password: passData.current });
    if (authError) alert("סיסמה נוכחית שגויה");
    else {
      const { error: updateError } = await supabase.auth.updateUser({ password: passData.next });
      if (updateError) alert("שגיאה: " + updateError.message);
      else { alert("הסיסמה שונתה!"); setPassData({ current: '', next: '' }); }
    }
    setPassLoading(false);
  };

  return (
    <div className="flex gap-6 text-right animate-in fade-in duration-300">
      <div className={`w-40 space-y-1 p-2 rounded-xl border h-fit ${theme.card} ${theme.border}`}>
         <button onClick={() => setActiveTab('categories')} className={`w-full p-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'categories' ? 'bg-blue-600 text-white' : 'opacity-40 hover:opacity-100'}`}>קטגוריות</button>
         <button onClick={() => setActiveTab('security')} className={`w-full p-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'security' ? 'bg-blue-600 text-white' : 'opacity-40 hover:opacity-100'}`}>אבטחה</button>
         <button onClick={() => setActiveTab('logs')} className={`w-full p-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'logs' ? 'bg-blue-600 text-white' : 'opacity-40 hover:opacity-100'}`}>לוגים</button>
      </div>
      <div className="flex-1">
        {activeTab === 'security' && (
          <div className={`p-5 rounded-xl border ${theme.card} ${theme.border} max-w-sm`}>
            <h4 className="font-bold text-blue-500 mb-4 flex items-center gap-2"><Key size={14}/> שינוי סיסמה</h4>
            <div className="space-y-3">
               <input type="password" placeholder="סיסמה נוכחית" value={passData.current} onChange={e => setPassData({...passData, current: e.target.value})} className="w-full p-2 rounded border outline-none text-xs bg-black/40 border-blue-900/50 text-white" />
               <input type="password" placeholder="סיסמה חדשה" value={passData.next} onChange={e => setPassData({...passData, next: e.target.value})} className="w-full p-2 rounded border outline-none text-xs bg-black/40 border-blue-900/50 text-white" />
               <button onClick={handleUpdatePassword} disabled={passLoading} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold text-xs">{passLoading ? 'מעבד...' : 'עדכן סיסמה'}</button>
            </div>
          </div>
        )}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-2 gap-4">
             <div className={`p-4 rounded-xl border ${theme.card} ${theme.border}`}>
                <h5 className="text-[10px] font-black uppercase opacity-50 mb-3 tracking-widest">קטגוריות אב</h5>
                <div className="flex gap-2 mb-4">
                  <input placeholder="חדש..." value={newCat} onChange={e => setNewCat(e.target.value)} className="flex-1 p-2 rounded border outline-none text-xs bg-black/40 border-blue-900/50 text-white" />
                  <button onClick={async () => { await supabase.from('categories').insert([{name: newCat}]); setNewCat(''); loadData(); }} className="bg-blue-600 px-3 rounded-lg font-bold text-xs">הוסף</button>
                </div>
                <div className="space-y-1">{categories.map(c => <div key={c.id} className="flex justify-between py-1.5 border-b border-white/5"><span>{c.name}</span><button onClick={async () => { await supabase.from('categories').delete().eq('id', c.id); loadData(); }}><Trash2 size={13} className="text-red-500 hover:scale-110 transition-transform"/></button></div>)}</div>
             </div>
             <div className={`p-4 rounded-xl border ${theme.card} ${theme.border}`}>
                <h5 className="text-[10px] font-black uppercase opacity-50 mb-3 tracking-widest">תתי-קטגוריות</h5>
                <div className="space-y-2 mb-4">
                  <select value={newSub.category_id} onChange={e => setNewSub({...newSub, category_id: e.target.value})} className="w-full p-2 rounded border text-xs bg-black/40 border-blue-900/50 text-white">
                    <option value="">בחר אב...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input placeholder="תת..." value={newSub.name} onChange={e => setNewSub({...newSub, name: e.target.value})} className="flex-1 p-2 rounded border outline-none text-xs bg-black/40 border-blue-900/50 text-white" />
                    <button onClick={async () => { await supabase.from('subcategories').insert([{name: newSub.name, category_id: newSub.category_id}]); setNewSub({name:'', category_id:''}); loadData(); }} className="bg-emerald-600 px-3 rounded-lg font-bold text-xs">הוסף</button>
                  </div>
                </div>
                <div className="h-44 overflow-y-auto pr-1">{subcategories.map(s => <div key={s.id} className="flex justify-between py-1.5 border-b border-white/5 text-[11px]"><span>{s.category?.name} {'>'} {s.name}</span><button onClick={async () => { await supabase.from('subcategories').delete().eq('id', s.id); loadData(); }}><Trash2 size={13} className="text-red-500 hover:scale-110 transition-transform"/></button></div>)}</div>
             </div>
          </div>
        )}
        {activeTab === 'logs' && (
            <div className={`p-4 rounded-xl border ${theme.card} ${theme.border} font-mono text-[10px] opacity-60 space-y-2`}>
              {tickets.slice(0, 15).map(t => <div key={t.id}>[{formatJerusalemTime(t.created_at)}] LOG: קריאה #{t.id.toString().substring(0,4)} עודכנה ע"י {t.reporter?.name}</div>)}
            </div>
        )}
      </div>
    </div>
  );
}

function Modal({ ticket, onClose, onUpdate, isAdmin, theme }) {
  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-[100] p-4 text-right" onClick={onClose}>
      <div className={`w-full max-w-sm rounded-[2rem] border p-8 shadow-[0_0_100px_rgba(0,0,0,0.6)] ${theme.card} ${theme.border} animate-in zoom-in-95 duration-200`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6"><h3 className="text-[11px] font-black text-blue-500 uppercase tracking-widest">מידע על קריאה</h3><button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button></div>
        <div className={`p-5 rounded-2xl mb-5 bg-[#0A192F] border ${theme.border}`}><p className="font-black text-base mb-2 italic underline underline-offset-8 decoration-blue-500/30">{ticket.title}</p><p className="text-slate-300 text-[13px] leading-relaxed mt-4">{ticket.description}</p></div>
        <div className="text-[11px] opacity-40 mb-6 font-mono bg-black/20 p-2 rounded-lg inline-block">זמן פתיחה: {formatJerusalemTime(ticket.created_at)}</div>
        {isAdmin && ticket.status !== 'closed' && (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => onUpdate('in_progress')} className="bg-amber-600 text-white py-2.5 rounded-xl font-black text-[11px] shadow-lg hover:bg-amber-500 transition-all">סמן כבטיפול</button>
            <button onClick={() => onUpdate('closed')} className="bg-emerald-600 text-white py-2.5 rounded-xl font-black text-[11px] shadow-lg hover:bg-emerald-500 transition-all">סגור קריאה</button>
          </div>
        )}
      </div>
    </div>
  );
}