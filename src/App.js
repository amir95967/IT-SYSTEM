import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import emailjs from '@emailjs/browser';
import { Turnstile } from '@marsidev/react-turnstile';
import { 
  LayoutDashboard, Ticket, Settings, Users, Plus, 
  LogOut, Archive, Trash2, Bell, Clock, CheckCircle2, 
  ChevronDown, Key, Database, Lightbulb
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
  const [announcement, setAnnouncement] = useState({ active: false, text: '', type: 'info', speed: 20, expiresAt: null });

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
    await loadData(profile);
    setLoading(false);
  };

  const loadData = async (currentUser) => {
    const activeUser = currentUser || user;
    if (!activeUser) return;
    
    const { data: annData } = await supabase.from('settings').select('*').eq('key', 'system_announcement').maybeSingle();
    if (annData) setAnnouncement(annData.value);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.hash = '';
    setUser(null);
    window.location.reload();
  };

  const handleLogoClick = () => {
    window.location.hash = user?.role === 'admin' ? 'dashboard' : 'my_tickets';
  };

  const theme = {
    bg: 'bg-[#0B1E3B]',
    sidebar: 'bg-[#0A192F]',
    card: 'bg-[#162A4A]',
    border: 'border-blue-900/30',
    text: 'text-blue-50',
    input: 'bg-[#0F2445] border-blue-900/50 text-white focus:border-blue-400'
  };

  const isExpired = announcement.expiresAt && new Date(announcement.expiresAt) < new Date();
  const showAnnouncement = announcement.active && !isExpired;

  const getAnnColor = () => {
    if (announcement.type === 'critical') return 'bg-red-600';
    if (announcement.type === 'warning') return 'bg-amber-500 text-black';
    return 'bg-blue-600';
  };

  if (loading) return <div className={`h-screen flex items-center justify-center ${theme.bg}`}><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div></div>;
  if (!user) return <Login onLoginSuccess={(u) => fetchProfile(u)} theme={theme} />;

  return (
    <div className={`flex flex-col md:flex-row h-screen ${theme.bg} ${theme.text} font-sans overflow-hidden`} dir="rtl">
      
      <aside className={`hidden md:flex w-64 border-l ${theme.sidebar} ${theme.border} flex-col z-20 shadow-xl`}>
        <div className="p-8 flex flex-col items-center gap-4">
          <img src={KALI_LOGO} alt="Kali Logo" className="w-28 cursor-pointer hover:opacity-80 transition-opacity" onClick={handleLogoClick} />
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
          <button onClick={handleLogout} className="text-red-400 font-bold text-xs flex items-center gap-2 hover:bg-red-500/10 p-3 rounded-xl transition-all w-full justify-center border border-red-500/20">
            <LogOut size={14}/> התנתק
          </button>
        </div>
      </aside>

      <nav className={`md:hidden fixed bottom-0 left-0 right-0 ${theme.sidebar} border-t ${theme.border} z-50 flex justify-around items-center px-2 py-3 shadow-2xl`}>
        <MobileNavItem icon={<Plus size={22}/>} active={view === 'new_ticket'} onClick={() => window.location.hash = 'new_ticket'} />
        <MobileNavItem icon={<Ticket size={22}/>} active={view === 'my_tickets'} onClick={() => window.location.hash = 'my_tickets'} />
        {user.role === 'admin' && <MobileNavItem icon={<Settings size={22}/>} active={view === 'settings'} onClick={() => window.location.hash = 'settings'} />}
      </nav>

      <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
        {showAnnouncement && (
          <div className={`${getAnnColor()} py-2 overflow-hidden relative border-b border-white/10 z-30 text-center`}>
            <div className="whitespace-nowrap animate-marquee inline-block font-bold text-sm" style={{ animationDuration: `${announcement.speed || 20}s` }}>
              {announcement.text} &nbsp;&nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp;&nbsp; {announcement.text}
            </div>
          </div>
        )}

        <header className={`h-14 border-b ${theme.border} flex items-center px-6 justify-between bg-[#0A192F]/50 backdrop-blur-md`}>
            <div className="text-[11px] font-bold text-blue-300/60 uppercase">{user.name} | {user.role}</div>
            <img src={KALI_LOGO} alt="Kali" className="md:hidden h-6 cursor-pointer" onClick={handleLogoClick} />
            <button onClick={handleLogout} className="md:hidden text-red-500"><LogOut size={18}/></button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 text-right">
          {view === 'dashboard' && user.role === 'admin' && <Dashboard stats={stats} tickets={tickets.filter(t => t.status !== 'closed')} onSelect={setSelectedTicket} theme={theme} />}
          {view === 'new_ticket' && <NewTicket categories={categories} subcategories={subcategories} user={user} onSuccess={() => { loadData(); window.location.hash = 'my_tickets'; }} theme={theme} />}
          {view === 'my_tickets' && <TicketsList title="הקריאות שלי" tickets={tickets} onSelect={setSelectedTicket} theme={theme} isAdmin={user.role === 'admin'} />}
          {view === 'archive' && user.role === 'admin' && <TicketsList title="ארכיון קריאות" tickets={tickets.filter(t => t.status === 'closed')} onSelect={setSelectedTicket} theme={theme} isAdmin={true} />}
          {view === 'users' && user.role === 'admin' && <UsersManager allUsers={allUsers} loadData={loadData} theme={theme} />}
          {view === 'settings' && user.role === 'admin' && <SettingsManager categories={categories} subcategories={subcategories} loadData={loadData} theme={theme} tickets={tickets} announcement={announcement} setAnnouncement={setAnnouncement} />}
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

function SettingsManager({ categories, subcategories, loadData, theme, tickets, announcement, setAnnouncement }) {
  const [activeTab, setActiveTab] = useState('categories');
  const [newCat, setNewCat] = useState('');
  const [newSub, setNewSub] = useState({ name: '', category_id: '' });
  const [annLoading, setAnnLoading] = useState(false);
  const [isPermanent, setIsPermanent] = useState(!announcement.expiresAt);
  const [passData, setPassData] = useState({ next: '' });

  const saveAnnouncement = async (newData) => {
    setAnnLoading(true);
    const finalData = { ...newData, expiresAt: isPermanent ? null : newData.expiresAt };
    const { error } = await supabase.from('settings').upsert({ key: 'system_announcement', value: finalData });
    if (error) alert("שגיאה בעדכון"); else setAnnouncement(finalData);
    setAnnLoading(false);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className={`flex md:flex-col gap-2 p-2 rounded-2xl border h-fit ${theme.card} ${theme.border}`}>
         <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'categories' ? 'bg-blue-600 text-white' : 'opacity-40'}`}>קטגוריות</button>
         <button onClick={() => setActiveTab('announcement')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'announcement' ? 'bg-amber-600 text-white' : 'opacity-40'}`}>הודעות</button>
         <button onClick={() => setActiveTab('security')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'security' ? 'bg-blue-600 text-white' : 'opacity-40'}`}>אבטחה</button>
         <button onClick={() => setActiveTab('logs')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'logs' ? 'bg-slate-700 text-white' : 'opacity-40'}`}>לוגים</button>
      </div>
      
      <div className="flex-1">
        {activeTab === 'announcement' && (
          <div className={`p-6 rounded-2xl border ${theme.card} ${theme.border} max-w-lg shadow-xl`}>
            <h4 className="font-bold text-amber-500 mb-6 flex items-center gap-2 justify-end"><Bell size={18}/> ניהול הודעות מערכת</h4>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => saveAnnouncement({ ...announcement, active: !announcement.active })} className={`py-3 rounded-xl text-[10px] font-black uppercase ${announcement.active ? 'bg-green-600' : 'bg-slate-700 opacity-50'}`}>{announcement.active ? 'הודעה פעילה' : 'הודעה כבויה'}</button>
                <select value={announcement.type || 'info'} onChange={(e) => setAnnouncement({...announcement, type: e.target.value})} className={`p-3 rounded-xl text-xs ${theme.input} outline-none`}><option value="info" className="bg-[#0A192F]">מידע (כחול)</option><option value="warning" className="bg-[#0A192F]">אזהרה (צהוב)</option><option value="critical" className="bg-[#0A192F]">קריטי (אדום)</option></select>
              </div>
              <textarea value={announcement.text} onChange={(e) => setAnnouncement({...announcement, text: e.target.value})} className={`w-full p-4 rounded-xl text-sm h-24 ${theme.input} text-white outline-none`} placeholder="תוכן ההודעה..." />
              <div className="bg-black/20 p-4 rounded-2xl border border-white/5 text-right">
                <label className="text-[10px] font-bold opacity-40 block mb-3">זמן תצוגה</label>
                <div className="flex gap-2 mb-4">
                  <button onClick={() => setIsPermanent(true)} className={`flex-1 py-2 rounded-lg text-xs font-bold ${isPermanent ? 'bg-blue-600 text-white' : 'bg-white/5 opacity-50'}`}>לצמיתות</button>
                  <button onClick={() => setIsPermanent(false)} className={`flex-1 py-2 rounded-lg text-xs font-bold ${!isPermanent ? 'bg-blue-600 text-white' : 'bg-white/5 opacity-50'}`}>לזמן מסוים</button>
                </div>
                {!isPermanent && <input type="datetime-local" value={announcement.expiresAt || ''} onChange={(e) => setAnnouncement({...announcement, expiresAt: e.target.value})} className={`w-full p-3 rounded-xl text-xs ${theme.input} outline-none border-blue-500/30`} />}
              </div>
              <input type="number" placeholder="מהירות גלילה" value={announcement.speed || 20} onChange={(e) => setAnnouncement({...announcement, speed: e.target.value})} className={`w-full p-3 rounded-xl text-xs ${theme.input} outline-none`} />
              <button onClick={() => saveAnnouncement(announcement)} disabled={annLoading} className="w-full bg-amber-600 py-4 rounded-xl font-bold text-xs">{annLoading ? 'שומר...' : 'שמור והפעל'}</button>
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className={`p-6 rounded-2xl border ${theme.card} ${theme.border}`}>
                <h5 className="text-[10px] font-black opacity-50 mb-4">קטגוריות אב</h5>
                <div className="flex gap-2 mb-4"><input placeholder="חדשה..." value={newCat} onChange={e => setNewCat(e.target.value)} className={`flex-1 p-3 rounded-xl text-xs ${theme.input} outline-none`} /><button onClick={async () => { if(newCat) { await supabase.from('categories').insert([{name: newCat}]); setNewCat(''); loadData(); }}} className="bg-blue-600 px-4 rounded-xl font-bold text-xs">הוסף</button></div>
                <div className="space-y-1 max-h-60 overflow-y-auto pr-2">{categories.map(c => <div key={c.id} className="flex justify-between py-2 border-b border-white/5"><span>{c.name}</span><button onClick={async () => { if(window.confirm('מחק?')){ await supabase.from('categories').delete().eq('id', c.id); loadData(); }}}><Trash2 size={14} className="text-red-500"/></button></div>)}</div>
             </div>
             <div className={`p-6 rounded-2xl border ${theme.card} ${theme.border}`}>
                <h5 className="text-[10px] font-black opacity-50 mb-4">תתי-קטגוריות</h5>
                <select value={newSub.category_id} onChange={e => setNewSub({...newSub, category_id: e.target.value})} className={`w-full p-3 rounded-xl border text-xs ${theme.input} mb-3 outline-none`}><option value="" className="bg-[#0A192F]">בחר אב...</option>{categories.map(c => <option key={c.id} value={c.id} className="bg-[#0A192F]">{c.name}</option>)}</select>
                <div className="flex gap-2"><input placeholder="תת..." value={newSub.name} onChange={e => setNewSub({...newSub, name: e.target.value})} className={`flex-1 p-3 rounded-xl text-xs ${theme.input} outline-none`} /><button onClick={async () => { if(newSub.name && newSub.category_id) { await supabase.from('subcategories').insert([{name: newSub.name, category_id: newSub.category_id}]); setNewSub({name:'', category_id:''}); loadData(); }}} className="bg-emerald-600 px-4 rounded-xl font-bold text-xs">הוסף</button></div>
             </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className={`p-6 rounded-2xl border ${theme.card} ${theme.border} max-w-sm`}><h4 className="font-bold text-blue-500 mb-4 flex items-center gap-2 justify-end"><Key size={14}/> אבטחת חשבון</h4><input type="password" placeholder="סיסמה חדשה" value={passData.next} onChange={e => setPassData({...passData, next: e.target.value})} className={`w-full p-3 rounded-xl mb-4 text-xs ${theme.input} text-right text-white outline-none`} /><button onClick={async () => { const { error } = await supabase.auth.updateUser({ password: passData.next }); if (error) alert(error.message); else alert("הסיסמה שונתה!"); }} className="w-full bg-blue-600 py-3 rounded-xl font-bold text-xs">עדכן סיסמה</button></div>
        )}

        {activeTab === 'logs' && (
          <div className={`p-4 rounded-2xl border ${theme.card} ${theme.border} font-mono text-[10px] opacity-60 max-h-96 overflow-y-auto pr-2`}><h4 className="font-bold mb-4 flex items-center gap-2 justify-end text-blue-400"><Database size={14}/> היסטוריית פעולות (LOG)</h4>{tickets.slice(0, 50).map(t => <div key={t.id} className="pb-1 border-b border-white/5 mb-1">[{formatJerusalemTime(t.created_at)}] LOG: קריאה #{t.id.toString().substring(0,6)} הועלתה</div>)}</div>
        )}
      </div>
    </div>
  );
}

function NewTicket({ categories, subcategories, user, onSuccess, theme }) {
  const [form, setForm] = useState({ title: '', description: '', category_id: '', subcategory_id: '' });
  const [token, setToken] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    setIsSubmitting(true);
    const { data, error } = await supabase.from('tickets').insert([{ ...form, user_id: user.id, status: 'open' }]).select(`*, reporter:users!user_id(name), category:categories(name)`).single();
    if (!error) {
      emailjs.send('service_291xozn', 'template_jfpphhn', { title: form.title, reporter_name: user.name, category: data.category?.name || 'כללי', description: form.description, to_email: 'amirshaul10@gmail.com' }, 'NMGue82wzpuAr07T7');
      onSuccess();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-xl mx-auto"><div className={`p-6 md:p-8 rounded-3xl border ${theme.card} ${theme.border} shadow-2xl`}>
      <h2 className="text-xl font-black mb-6 border-r-4 border-blue-500 pr-4">קריאה חדשה</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input required placeholder="נושא הקריאה..." value={form.title} onChange={e => setForm({...form, title: e.target.value})} className={`w-full p-4 rounded-xl border ${theme.input} bg-black/20 text-right text-white outline-none placeholder-blue-300/30`} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative"><select required className={`w-full p-4 rounded-xl border ${theme.input} bg-black/20 text-white outline-none text-right appearance-none cursor-pointer`} onChange={e => setForm({...form, category_id: e.target.value})}><option value="" className="bg-[#0A192F]">בחר קטגוריה</option>{categories.map(c => <option key={c.id} value={c.id} className="bg-[#0A192F]">{c.name}</option>)}</select><ChevronDown size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none opacity-50" /></div>
          <div className="relative"><select required className={`w-full p-4 rounded-xl border ${theme.input} bg-black/20 text-white outline-none text-right appearance-none cursor-pointer`} onChange={e => setForm({...form, subcategory_id: e.target.value})}><option value="" className="bg-[#0A192F]">תת-קטגוריה</option>{subcategories.filter(s => s.category_id === form.category_id).map(s => <option key={s.id} value={s.id} className="bg-[#0A192F]">{s.name}</option>)}</select><ChevronDown size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none opacity-50" /></div>
        </div>
        <textarea rows={4} placeholder="תיאור מפורט..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} className={`w-full p-4 rounded-xl border ${theme.input} bg-black/20 text-right text-white outline-none placeholder-blue-300/30`} />
        <div className="flex justify-center py-2" dir="ltr"><Turnstile siteKey="0x4AAAAAADBXidxuKx1OLauD" onSuccess={(t) => setToken(t)} options={{ theme: 'dark' }} /></div>
        <button disabled={!token || isSubmitting} className={`w-full py-4 font-black rounded-2xl shadow-xl transition-all ${!token ? 'bg-slate-700 opacity-50' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>{isSubmitting ? 'שולח...' : 'שלח קריאה'}</button>
      </form>
    </div></div>
  );
}

// --- שאר הקומפוננטות ללא שינוי ---
function NavItem({ icon, label, active, onClick }) { return <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>{icon} {label}</button>; }
function MobileNavItem({ icon, active, onClick }) { return <button onClick={onClick} className={`p-2 rounded-xl transition-all ${active ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>{icon}</button>; }
function StatCard({ label, value, icon, theme }) { return <div className={`p-5 rounded-2xl border ${theme.card} ${theme.border} shadow-lg text-right hover:scale-105 transition-transform`}><div className="flex justify-between items-center mb-1"><span className="text-[10px] font-black text-slate-500 uppercase">{label}</span>{icon}</div><p className="text-2xl font-black">{value}</p></div>; }
function StatusBadge({ status }) { const s = { open: 'text-blue-400 bg-blue-400/10 border-blue-400/20', in_progress: 'text-amber-500 bg-amber-500/10 border-amber-500/20', closed: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' }[status]; return <span className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-wider ${s}`}>{status}</span>; }
function Dashboard({ stats, tickets, onSelect, theme }) { return <div className="space-y-6"><div className="grid grid-cols-2 md:grid-cols-4 gap-3"><StatCard label="ממתינות" value={stats.open} icon={<Clock size={18} className="text-blue-500"/>} theme={theme} /><StatCard label="סגורות" value={stats.closed} icon={<CheckCircle2 size={18} className="text-emerald-500"/>} theme={theme} /><StatCard label="עובדים" value={stats.total} icon={<Users size={18} className="text-amber-500"/>} theme={theme} /></div><TicketsList title="תור עבודה נוכחי" tickets={tickets.slice(0, 10)} onSelect={onSelect} theme={theme} /></div>; }
function Login({ onLoginSuccess, theme }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const handleLogin = async (e) => { e.preventDefault(); const { data, error } = await supabase.auth.signInWithPassword({ email, password }); if (error) alert("שגיאה"); else onLoginSuccess(data.user); };
  return (
    <div className="relative h-screen w-screen flex items-center justify-center bg-black overflow-hidden"><div className="absolute z-10 inset-0 bg-[#0B1E3B]/80 backdrop-blur-sm"></div><div className="relative z-20 w-[85%] max-w-[380px] p-10 rounded-[3rem] border border-white/10 bg-[#0A192F]/60 backdrop-blur-xl flex flex-col items-center"><img src={KALI_LOGO} alt="Logo" className="w-32 mb-8 object-contain" /><form onSubmit={handleLogin} className="w-full space-y-6"><input type="email" placeholder="אימייל" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 rounded-2xl bg-black/40 border border-blue-900/50 text-white outline-none text-right" /><input type="password" placeholder="סיסמה" required value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 rounded-2xl bg-black/40 border border-blue-900/50 text-white outline-none text-right" /><button className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl">כניסה</button></form></div></div>
  );
}
function TicketsList({ title, tickets, onSelect, theme }) { 
  return (
    <div className="space-y-4"><h2 className="text-lg font-black italic border-r-4 border-blue-500 pr-3">{title}</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{tickets.map(t => (<div key={t.id} onClick={() => onSelect(t)} className={`p-5 rounded-2xl border ${theme.card} ${theme.border} cursor-pointer hover:border-blue-500/50 transition-all`}><div className="flex justify-between items-start mb-2"><StatusBadge status={t.status} /><span className="text-[10px] opacity-40 font-mono">{formatJerusalemTime(t.created_at)}</span></div><h3 className="font-bold text-base mb-1">{t.title}</h3><div className="flex justify-between items-center text-[11px] opacity-60"><span>{t.category?.name}</span>{t.solution && <span className="text-emerald-400 font-bold">פתורה</span>}</div></div>))}</div></div>
  ); 
}
function Modal({ ticket, onClose, onUpdate, isAdmin, theme }) {
  const [solutionText, setSolutionText] = useState(ticket.solution || '');
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-end md:items-center justify-center z-[100] p-0 md:p-4 text-right" onClick={onClose}><div className={`w-full md:max-w-md rounded-t-[2.5rem] md:rounded-[2.5rem] border p-8 shadow-2xl ${theme.card} ${theme.border}`} onClick={e => e.stopPropagation()}><div className="flex justify-between items-center mb-6"><h3 className="text-[10px] font-black text-blue-500 uppercase">פרטי קריאה</h3><button onClick={onClose}>✕</button></div><div className="p-5 rounded-2xl mb-4 bg-black/30 border border-blue-900/30 text-right"><p className="font-black text-lg mb-2">{ticket.title}</p><p className="text-slate-300 text-sm leading-relaxed">{ticket.description}</p></div>{ticket.solution && <div className="p-4 rounded-2xl mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-50 text-sm italic">{ticket.solution}</div>}{isAdmin && ticket.status !== 'closed' && <textarea value={solutionText} onChange={e => setSolutionText(e.target.value)} placeholder="פתרון..." className={`w-full p-3 rounded-xl text-xs h-20 mb-4 ${theme.input} text-right text-white outline-none`} />}{isAdmin && ticket.status !== 'closed' && (<div className="grid grid-cols-2 gap-3"><button onClick={() => onUpdate('in_progress', solutionText)} className="bg-amber-600 text-white py-4 rounded-2xl font-black text-xs">בטיפול</button><button onClick={() => onUpdate('closed', solutionText)} className="bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs">סגור</button></div>)}</div></div>
  );
}
function UsersManager({ allUsers, loadData, theme }) {
  return (
    <div className="space-y-4"><h3 className="font-bold text-blue-500 uppercase text-[10px] tracking-widest border-r-4 border-blue-500 pr-3 text-right">עובדים</h3><div className="grid gap-3">{allUsers.map(u => (<div key={u.id} className={`p-4 rounded-2xl border ${theme.card} ${theme.border} flex justify-between items-center`}><div className="flex flex-col text-right"><span className="font-bold">{u.name}</span><span className="text-[11px] opacity-40">{u.email}</span></div><div className="flex items-center gap-3"><span className="px-2 py-0.5 bg-blue-500/10 rounded text-[10px] font-bold text-blue-400 uppercase">{u.role}</span><button onClick={async () => { if(window.confirm('מחק?')) { await supabase.from('users').delete().eq('id', u.id); loadData(); }}}><Trash2 size={16} className="text-red-500"/></button></div></div>))}</div></div>
  );
}