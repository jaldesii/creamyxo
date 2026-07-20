import React, { useState, useEffect, useRef } from 'react';
import { Users, MessageCircle, Clock, Radio, Wifi, Copy, Check, AlertTriangle, Server, TrendingUp, Mic, Download, Ban, UserX, VolumeX, DoorOpen, Eye, EyeOff, Megaphone, Send, Info, AlertOctagon, CheckCircle, Timer, Inbox, XCircle, CheckCircle2, DollarSign, Trash2, MessageSquare } from 'lucide-react';
import { jsPDF } from 'jspdf';
import socket from '../../socket';
import './AdminPanel.scss';

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001'
  : `http://${window.location.hostname}:3001`;

const AdminPanel = () => {
  const [data, setData] = useState({ users: [], rooms: [], waitingCount: 0, totalOnline: 0, totalUsers: 0, messageLog: [], serverUptime: 0, totalMessages: 0, totalVoiceMessages: 0, totalVoiceDuration: 0, reportedUsers: [], totalFWPosts: 0, totalFWStories: 0, totalFWComments: 0, freedomWallPosts: [] });
  const [copied, setCopied] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showMessages, setShowMessages] = useState(true);
  const [announceMessage, setAnnounceMessage] = useState('');
  const [announceType, setAnnounceType] = useState('info');
  const [announceDuration, setAnnounceDuration] = useState(300);
  const [announceSent, setAnnounceSent] = useState(false);
  const [announceHistory, setAnnounceHistory] = useState([]);
  const [showAnnouncePreview, setShowAnnouncePreview] = useState(false);
  const [broadcastRequests, setBroadcastRequests] = useState([]);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearPassword, setClearPassword] = useState('');
  const [clearing, setClearing] = useState(false);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const durationDropdownRef = useRef(null);

  const durationOptions = [
    { value: 60, label: '1 min' }, { value: 180, label: '3 min' }, { value: 300, label: '5 min' },
    { value: 600, label: '10 min' }, { value: 1800, label: '30 min' }, { value: 3600, label: '1 hour' }, { value: 0, label: 'Permanent' }
  ];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (durationDropdownRef.current && !durationDropdownRef.current.contains(e.target)) {
        setShowDurationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { 
    socket.connect(); 
    socket.emit('set-name', { name: 'ADMIN' }); 
    socket.on('admin-update', (u) => setData(prev => ({ ...prev, ...u }))); 
    
    fetch(`${API_URL}/api/broadcast-requests`)
      .then(res => res.json())
      .then(requests => setBroadcastRequests(requests))
      .catch(err => console.error('Failed to fetch requests:', err));

    socket.on('new-broadcast-request', (request) => {
      setBroadcastRequests(prev => [request, ...prev]);
    });

    socket.on('broadcast-request-updated', (updatedRequest) => {
      setBroadcastRequests(prev => prev.map(r => r.id === updatedRequest.id ? updatedRequest : r));
    });

    return () => { 
      socket.off('admin-update'); 
      socket.off('new-broadcast-request');
      socket.off('broadcast-request-updated');
    }; 
  }, []);

  const handleSendAnnounce = () => {
    if (!announceMessage.trim()) return;
    socket.emit('admin-announce', { message: announceMessage.trim(), type: announceType, duration: announceDuration, from: 'Cremyxo Admin' });
    setAnnounceHistory(prev => [{ id: Date.now(), message: announceMessage.trim(), type: announceType, duration: announceDuration, time: new Date().toLocaleTimeString(), icon: announceType === 'info' ? <Info size={12} /> : announceType === 'warning' ? <AlertTriangle size={12} /> : announceType === 'success' ? <CheckCircle size={12} /> : <AlertOctagon size={12} /> }, ...prev.slice(0, 4)]);
    setAnnounceSent(true); setAnnounceMessage(''); setShowAnnouncePreview(false);
    setTimeout(() => setAnnounceSent(false), 3000);
  };

  const handleBroadcastFromRequest = (request) => {
    setAnnounceMessage(request.message);
    setAnnounceType(request.type);
    setAnnounceDuration(request.duration);
    setActiveTab('overview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const approveRequest = (id) => {
    fetch(`${API_URL}/api/broadcast-request/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'approved' }) })
      .then(res => res.json()).then(d => {
        if (d.success) {
          setBroadcastRequests(prev => prev.map(r => r.id === id ? d.request : r));
          setAnnounceHistory(prev => [{ id: Date.now(), message: d.request.message, type: d.request.type, duration: d.request.duration, time: new Date().toLocaleTimeString(), icon: d.request.type === 'info' ? <Info size={12} /> : d.request.type === 'warning' ? <AlertTriangle size={12} /> : d.request.type === 'success' ? <CheckCircle size={12} /> : <AlertOctagon size={12} /> }, ...prev.slice(0, 4)]);
        }
      }).catch(err => console.error('Approve error:', err));
  };

  const rejectRequest = (id) => {
    fetch(`${API_URL}/api/broadcast-request/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'rejected' }) })
      .then(res => res.json()).then(d => {
        if (d.success) setBroadcastRequests(prev => prev.map(r => r.id === id ? d.request : r));
      }).catch(err => console.error('Reject error:', err));
  };

  const handleClearData = async () => {
    if (clearPassword !== 'admin123') { alert('Invalid password!'); return; }
    setClearing(true);
    try {
      const response = await fetch(`${API_URL}/api/clear-data`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: clearPassword }) });
      const result = await response.json();
      if (result.success) { setBroadcastRequests([]); setShowClearModal(false); setClearPassword(''); alert('All data cleared successfully!'); }
    } catch (error) { console.error('Clear error:', error); alert('Failed to clear data.'); }
    setClearing(false);
  };

  // Revenue calculations
  const packagePrices = { '1hour': 25, '6hours': 99, '24hours': 199 };
  const totalRevenue = broadcastRequests.filter(r => r.status === 'approved').reduce((total, r) => total + (packagePrices[r.selectedPackage] || 0), 0);
  const pendingRevenue = broadcastRequests.filter(r => r.status === 'pending').reduce((total, r) => total + (packagePrices[r.selectedPackage] || 0), 0);
  const totalEarnings = totalRevenue + pendingRevenue;
  const approvedCount = broadcastRequests.filter(r => r.status === 'approved').length;
  const rejectedCount = broadcastRequests.filter(r => r.status === 'rejected').length;

  const formatDurationLabel = (s) => { if (s === 0) return '∞'; if (s < 60) return `${s}s`; if (s < 3600) return `${Math.floor(s/60)}m`; return `${Math.floor(s/3600)}h`; };
  const copyToClipboard = (t, id) => { navigator.clipboard.writeText(t); setCopied(id); setTimeout(() => setCopied(null), 2000); };
  const handleKick = (id) => { socket.emit('admin-kick', { socketId: id, reason: 'Kicked' }); };
  const handleBan = (id) => { if (window.confirm('Ban?')) socket.emit('admin-ban', { socketId: id }); };
  const handleMute = (id) => { socket.emit('admin-mute', { socketId: id }); };
  const handleCloseRoom = (id) => { if (window.confirm('Close?')) socket.emit('admin-close-room', { roomId: id }); };
  const formatUptime = (s) => { const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60; return `${h}h ${m}m ${sec}s`; };
  const formatDuration = (s) => { const m=Math.floor(s/60), sec=s%60; return `${m}:${sec.toString().padStart(2,'0')}`; };
  const onlineUsers = data.users?.filter(u => u.status === 'online') || [];
  const peakHour = () => new Date().getHours() >= 20 || new Date().getHours() <= 2 ? '🔥 Peak' : '📊 Normal';
  const getTypeStyles = (t) => ({ info: { bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.3)', icon: '#6366f1' }, warning: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', icon: '#f59e0b' }, success: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', icon: '#22c55e' }, error: { bg: 'rgba(255,45,85,0.1)', border: 'rgba(255,45,85,0.3)', icon: '#ff2d55' } }[t] || { bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.3)', icon: '#6366f1' });
  const ts = getTypeStyles(announceType);
  const pendingRequests = broadcastRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="admin">
      <header className="admin__header">
        <div className="admin__header-left"><div className="admin__logo">C</div><div><h1 className="admin__title">Cremyxo Admin</h1><span className="admin__subtitle">Control Panel</span></div></div>
        <div className="admin__header-right">
          <button className="admin__export-pdf-btn" onClick={() => {}} title="Export to PDF"><Download size={14} /> Export PDF</button>
          <button className="admin__clear-btn" onClick={() => setShowClearModal(true)} title="Clear All Data"><Trash2 size={14} /> Clear Data</button>
          <div className="admin__badge admin__badge--live"><span className="admin__badge-dot"/>Live</div>
          <div className="admin__badge admin__badge--uptime"><Server size={12}/>{formatUptime(data.serverUptime)}</div>
        </div>
      </header>

      <div className="admin__stats">
        {[{icon:<Wifi size={20}/>,val:data.totalOnline,label:'Online',clr:'green'},{icon:<Users size={20}/>,val:data.totalUsers,label:'Total',clr:'purple'},{icon:<Clock size={20}/>,val:data.waitingCount,label:'Queue',clr:'orange'},{icon:<MessageCircle size={20}/>,val:data.rooms?.length||0,label:'Rooms',clr:'pink'},{icon:<DollarSign size={20}/>,val:`₱${totalRevenue}`,label:'Revenue',clr:'teal'},{icon:<MessageSquare size={20}/>,val:data.totalFWPosts||0,label:'FW Posts',clr:'indigo'}].map((s,i)=>(<div key={i} className="admin__stat-card"><div className={`admin__stat-icon admin__stat-icon--${s.clr}`}>{s.icon}</div><div className="admin__stat-info"><span className="admin__stat-value">{s.val}</span><span className="admin__stat-label">{s.label}</span></div></div>))}
      </div>

      <nav className="admin__tabs">
        {[
          {id:'overview',icon:<TrendingUp size={16}/>,label:'Overview'},
          {id:'users',icon:<Users size={16}/>,label:'Users'},
          {id:'rooms',icon:<MessageCircle size={16}/>,label:'Rooms'},
          {id:'broadcasts',icon:<Inbox size={16}/>,label:`Broadcasts${pendingRequests > 0 ? ` (${pendingRequests})` : ''}`},
          {id:'revenue',icon:<DollarSign size={16}/>,label:'Revenue'},
          {id:'freedom-wall',icon:<MessageSquare size={16}/>,label:`FW (${data.totalFWPosts||0})`},
          {id:'messages',icon:<Eye size={16}/>,label:'Messages'},
          {id:'reports',icon:<AlertTriangle size={16}/>,label:`Reports (${data.reportedUsers?.length||0})`}
        ].map(tab=>(<button key={tab.id} className={`admin__tab ${activeTab===tab.id?'admin__tab--active':''}`} onClick={()=>setActiveTab(tab.id)}>{tab.icon}<span>{tab.label}</span></button>))}
      </nav>

      {/* Announce Section - same as before */}
      <div className="admin__announce-section">
        <div className="admin__announce-header"><Megaphone size={16} style={{color:'#f59e0b'}}/><h3>Send Announcement</h3><span className="admin__announce-badge">Broadcast</span></div>
        <div className="admin__announce-body">
          <div className="admin__announce-input-group"><textarea value={announceMessage} onChange={(e)=>{setAnnounceMessage(e.target.value);setShowAnnouncePreview(true);}} placeholder="Type announcement..." className="admin__announce-textarea" rows={2} onFocus={()=>setShowAnnouncePreview(true)} maxLength={500}/><div className="admin__announce-char-count">{announceMessage.length}/500</div></div>
          <div className="admin__announce-controls">
            <div className="admin__announce-types">{[{type:'info',icon:<Info size={14}/>,label:'Info'},{type:'warning',icon:<AlertTriangle size={14}/>,label:'Warn'},{type:'success',icon:<CheckCircle size={14}/>,label:'Success'},{type:'error',icon:<AlertOctagon size={14}/>,label:'Alert'}].map(t=>(<button key={t.type} className={`admin__announce-type-btn ${announceType===t.type?'admin__announce-type-btn--active':''}`} onClick={()=>setAnnounceType(t.type)} style={announceType===t.type?{background:getTypeStyles(t.type).bg,borderColor:getTypeStyles(t.type).border,color:getTypeStyles(t.type).icon}:{}}>{t.icon} {t.label}</button>))}</div>
            <div className="admin__announce-duration" ref={durationDropdownRef}>
              <Timer size={14} />
              <div className="admin__announce-duration-display" onClick={() => setShowDurationDropdown(!showDurationDropdown)}>
                <span>{durationOptions.find(o => o.value === announceDuration)?.label || '5 min'}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
              </div>
              {showDurationDropdown && (<div className="admin__announce-duration-dropdown">{durationOptions.map(o => (<div key={o.value} className={`admin__announce-duration-option ${announceDuration === o.value ? 'admin__announce-duration-option--active' : ''}`} onClick={() => { setAnnounceDuration(o.value); setShowDurationDropdown(false); }}><span>{o.label}</span>{announceDuration === o.value && <Check size={14} />}</div>))}</div>)}
            </div>
            <button className="admin__announce-send-btn" onClick={handleSendAnnounce} disabled={!announceMessage.trim()}><Send size={14}/> {announceSent?'Sent! ✓':'Broadcast'}</button>
          </div>
        </div>
        {showAnnouncePreview && announceMessage && (<div className="admin__announce-preview" style={{background:ts.bg,borderColor:ts.border}}><div className="admin__announce-preview-header"><Megaphone size={14} style={{color:ts.icon}}/><span style={{color:ts.icon,fontWeight:700,fontSize:11,textTransform:'uppercase'}}>Admin Announcement</span><span className="admin__announce-preview-duration"><Timer size={10}/> {formatDurationLabel(announceDuration)}</span></div><p className="admin__announce-preview-text" style={{color:ts.icon}}>{announceMessage}</p></div>)}
        {announceHistory.length>0&&(<div className="admin__announce-history"><h4>Recent</h4><div className="admin__announce-history-list">{announceHistory.map(h=>(<div key={h.id} className="admin__announce-history-item" style={{borderLeftColor:getTypeStyles(h.type).icon}}><span style={{color:getTypeStyles(h.type).icon}}>{h.icon}</span><p>{h.message}</p><span className="admin__announce-history-duration">{formatDurationLabel(h.duration)}</span><span className="admin__announce-history-time">{h.time}</span></div>))}</div></div>)}
      </div>

      {/* Overview Tab */}
      {activeTab==='overview'&&(<div className="admin__grid"><div className="admin__panel"><div className="admin__panel-header"><h2><TrendingUp size={16}/>Server Health</h2></div><div className="admin__health">{[{l:'Uptime',v:formatUptime(data.serverUptime)},{l:'Total Messages',v:data.totalMessages},{l:'Voice Msgs',v:data.totalVoiceMessages},{l:'VM Duration',v:formatDuration(data.totalVoiceDuration)},{l:'FW Posts',v:data.totalFWPosts||0},{l:'FW Stories',v:data.totalFWStories||0},{l:'FW Comments',v:data.totalFWComments||0},{l:'Revenue Today',v:`₱${totalRevenue}`}].map((h,i)=>(<div key={i} className="admin__health-item"><span>{h.l}</span><strong>{h.v}</strong></div>))}</div></div><div className="admin__panel"><div className="admin__panel-header"><h2><Radio size={16}/>Active Rooms</h2></div><div className="admin__table-wrapper"><table className="admin__table"><thead><tr><th>Room</th><th>Users</th><th>Msgs</th><th>Duration</th><th>Actions</th></tr></thead><tbody>{data.rooms?.length===0?<tr><td colSpan="5" className="admin__empty">No rooms</td></tr>:data.rooms?.map(r=>(<tr key={r.id}><td className="admin__socket-id" onClick={()=>copyToClipboard(r.id,r.id)}>{r.id.substring(0,12)}...{copied===r.id&&<Check size={12}/>}</td><td>{r.users?.map(u=>u.name).join(' ↔ ')}</td><td>{r.messageCount}</td><td>{formatDuration(r.duration)}</td><td><button className="admin__action-btn admin__action-btn--danger" onClick={()=>handleCloseRoom(r.id)}><DoorOpen size={14}/></button></td></tr>))}</tbody></table></div></div></div>)}

      {/* Users Tab */}
      {activeTab==='users'&&(<div className="admin__panel"><div className="admin__panel-header"><h2><Wifi size={16}/>Online ({onlineUsers.length})</h2><a href={`${API_URL}/api/export/users`} className="admin__export-btn"><Download size={14}/>Export</a></div><div className="admin__table-wrapper"><table className="admin__table"><thead><tr><th>Name</th><th>IP</th><th>Socket ID</th><th>Room</th><th>Connected</th><th>Actions</th></tr></thead><tbody>{onlineUsers.length===0?<tr><td colSpan="6" className="admin__empty">No users</td></tr>:onlineUsers.map(u=>(<tr key={u.socketId}><td><div className="admin__user-cell"><div className="admin__user-avatar">{u.name.charAt(0).toUpperCase()}</div>{u.name}</div></td><td><span className="admin__ip" onClick={()=>copyToClipboard(u.ip,u.socketId)}>{u.ip}{copied===u.socketId&&<Check size={12}/>}</span></td><td className="admin__socket-id">{u.socketId.substring(0,10)}...</td><td>{u.room?<span className="admin__room-badge"><Radio size={10}/>Active</span>:'—'}</td><td>{u.connectedAt}</td><td><div className="admin__actions"><button className="admin__action-btn admin__action-btn--warn" onClick={()=>handleKick(u.socketId)}><UserX size={14}/></button><button className="admin__action-btn admin__action-btn--danger" onClick={()=>handleBan(u.socketId)}><Ban size={14}/></button><button className="admin__action-btn admin__action-btn--info" onClick={()=>handleMute(u.socketId)}><VolumeX size={14}/></button></div></td></tr>))}</tbody></table></div></div>)}

      {/* Rooms Tab */}
      {activeTab==='rooms'&&(<div className="admin__panel"><div className="admin__panel-header"><h2><MessageCircle size={16}/>Rooms</h2></div><div className="admin__table-wrapper"><table className="admin__table"><thead><tr><th>Room ID</th><th>Users</th><th>Msgs</th><th>Duration</th><th>Created</th><th>Actions</th></tr></thead><tbody>{data.rooms?.length===0?<tr><td colSpan="6" className="admin__empty">No rooms</td></tr>:data.rooms?.map(r=>(<tr key={r.id}><td className="admin__socket-id">{r.id.substring(0,14)}...</td><td>{r.users?.map(u=>u.name).join(' ↔ ')}</td><td>{r.messageCount}</td><td>{formatDuration(r.duration)}</td><td>{r.createdAt}</td><td><button className="admin__action-btn admin__action-btn--danger" onClick={()=>handleCloseRoom(r.id)}><DoorOpen size={14}/>Close</button></td></tr>))}</tbody></table></div></div>)}

      {/* Broadcasts Tab */}
      {activeTab==='broadcasts'&&(<div className="admin__panel"><div className="admin__panel-header"><h2><Inbox size={16}/>Broadcast Requests ({broadcastRequests.length})</h2><span className="admin__export-btn" style={{cursor:'default'}}>{pendingRequests > 0 ? <span style={{color:'#f59e0b'}}>{pendingRequests} Pending</span> : 'All done ✓'}</span></div><div className="admin__table-wrapper"><table className="admin__table"><thead><tr><th>Requester</th><th>Message</th><th>Type</th><th>Duration</th><th>Paid</th><th>Status</th><th>Actions</th></tr></thead><tbody>{broadcastRequests.length===0 ? <tr><td colSpan="7" className="admin__empty">No broadcast requests yet</td></tr> : broadcastRequests.map((req) => (<tr key={req.id}><td><div className="admin__user-cell"><div className="admin__user-avatar">{req.name.charAt(0).toUpperCase()}</div><div><div style={{fontWeight:500}}>{req.name}</div><div style={{fontSize:'10px',color:'#64748b'}}>{req.time}</div></div></div></td><td style={{maxWidth:'250px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{req.message}</td><td><span style={{display:'inline-block',padding:'3px 10px',borderRadius:'100px',fontSize:'10px',fontWeight:600,textTransform:'uppercase',background:getTypeStyles(req.type).bg,color:getTypeStyles(req.type).icon,border:`1px solid ${getTypeStyles(req.type).border}`}}>{req.type}</span></td><td>{formatDurationLabel(req.duration)}</td><td style={{fontWeight:600,color:'#22c55e'}}>{req.paid}</td><td><span style={{display:'inline-block',padding:'4px 12px',borderRadius:'100px',fontSize:'10px',fontWeight:600,textTransform:'uppercase',background:req.status==='approved'?'rgba(34,197,94,0.1)':req.status==='rejected'?'rgba(255,45,85,0.1)':'rgba(245,158,11,0.1)',color:req.status==='approved'?'#22c55e':req.status==='rejected'?'#ff2d55':'#f59e0b',border:`1px solid ${req.status==='approved'?'rgba(34,197,94,0.3)':req.status==='rejected'?'rgba(255,45,85,0.3)':'rgba(245,158,11,0.3)'}`}}>{req.status}</span></td><td><div className="admin__actions">{req.status === 'pending' && (<><button className="admin__action-btn admin__action-btn--success" onClick={()=>approveRequest(req.id)} title="Approve & Broadcast"><CheckCircle2 size={14}/></button><button className="admin__action-btn admin__action-btn--danger" onClick={()=>rejectRequest(req.id)} title="Reject"><XCircle size={14}/></button></>)}{req.status === 'approved' && (<span style={{fontSize:'10px',color:'#22c55e',fontWeight:600}}>✓ Broadcasted</span>)}<button className="admin__action-btn admin__action-btn--info" onClick={()=>handleBroadcastFromRequest(req)} title="Load to broadcaster"><Send size={14}/></button></div></td></tr>))}</tbody></table></div></div>)}

      {/* Revenue Tab */}
      {activeTab==='revenue'&&(<div className="admin__grid"><div className="admin__panel"><div className="admin__panel-header"><h2><DollarSign size={16}/>Revenue Overview</h2></div><div className="admin__health"><div className="admin__health-item"><span>Total Revenue</span><strong style={{color:'#22c55e'}}>₱{totalRevenue}</strong></div><div className="admin__health-item"><span>Pending Payments</span><strong style={{color:'#f59e0b'}}>₱{pendingRevenue}</strong></div><div className="admin__health-item"><span>Total Earnings</span><strong style={{color:'#6366f1'}}>₱{totalEarnings}</strong></div><div className="admin__health-item"><span>Approved</span><strong>{approvedCount}</strong></div><div className="admin__health-item"><span>Rejected</span><strong>{rejectedCount}</strong></div><div className="admin__health-item"><span>Pending</span><strong>{pendingRequests}</strong></div></div></div><div className="admin__panel"><div className="admin__panel-header"><h2><CheckCircle2 size={16}/>Approved Broadcasts</h2></div><div className="admin__table-wrapper"><table className="admin__table"><thead><tr><th>Requester</th><th>Package</th><th>Amount</th><th>Time</th></tr></thead><tbody>{broadcastRequests.filter(r=>r.status==='approved').length===0 ? <tr><td colSpan="4" className="admin__empty">No approved broadcasts</td></tr> : broadcastRequests.filter(r=>r.status==='approved').map((req)=>(<tr key={req.id}><td><div className="admin__user-cell"><div className="admin__user-avatar">{req.name.charAt(0).toUpperCase()}</div>{req.name}</div></td><td>{req.selectedPackage === '1hour' ? '1 Hour' : req.selectedPackage === '6hours' ? '6 Hours' : '24 Hours'}</td><td style={{fontWeight:600,color:'#22c55e'}}>{req.paid}</td><td style={{fontSize:'10px',color:'#64748b'}}>{req.time}</td></tr>))}</tbody></table></div></div></div>)}

      {/* ============================================= */}
      {/* FREEDOM WALL TAB */}
      {/* ============================================= */}
      {activeTab==='freedom-wall'&&(
        <div className="admin__grid">
          <div className="admin__panel">
            <div className="admin__panel-header">
              <h2><MessageSquare size={16}/>Freedom Wall Stats</h2>
              <a href={`${API_URL}/api/export/freedom-wall`} className="admin__export-btn"><Download size={14}/>Export CSV</a>
            </div>
            <div className="admin__health">
              <div className="admin__health-item"><span>Total Posts</span><strong style={{color:'#6366f1'}}>{data.totalFWPosts||0}</strong></div>
              <div className="admin__health-item"><span>Total Stories</span><strong style={{color:'#ec4899'}}>{data.totalFWStories||0}</strong></div>
              <div className="admin__health-item"><span>Total Comments</span><strong style={{color:'#06b6d4'}}>{data.totalFWComments||0}</strong></div>
              <div className="admin__health-item"><span>Active Posts</span><strong>{data.freedomWallPosts?.length||0}</strong></div>
            </div>
          </div>
          <div className="admin__panel">
            <div className="admin__panel-header"><h2><MessageSquare size={16}/>Recent Posts ({Math.min(20, data.freedomWallPosts?.length||0)})</h2></div>
            <div className="admin__table-wrapper" style={{maxHeight:'400px',overflowY:'auto'}}>
              <table className="admin__table">
                <thead><tr><th>User</th><th>Content</th><th>Media</th><th>Likes</th><th>Comments</th><th>Time</th></tr></thead>
                <tbody>
                  {(data.freedomWallPosts||[]).length===0?<tr><td colSpan="6" className="admin__empty">No posts yet</td></tr>:
                  (data.freedomWallPosts||[]).slice(0,20).map((p,i)=>(
                    <tr key={p.id||i}>
                      <td><div className="admin__user-cell"><div className="admin__user-avatar" style={{background:p.color||'#6366f1'}}>{p.username?.charAt(0).toUpperCase()}</div>{p.username}</div></td>
                      <td style={{maxWidth:'200px',overflow:'hidden',textOverflow:'ellipsis'}}>{p.message||'—'}</td>
                      <td>{p.images?`📷${p.images.length}`:p.audio?'🎤':'—'}</td>
                      <td>❤️{p.likes||0}</td>
                      <td>💬{p.commentCount||0}</td>
                      <td style={{fontSize:'10px',color:'#64748b'}}>{p.timestamp?new Date(p.timestamp).toLocaleDateString():'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Messages Tab */}
      {activeTab==='messages'&&(<div className="admin__panel"><div className="admin__panel-header"><h2><Eye size={16}/>Messages</h2><div style={{display:'flex',gap:'8px'}}><a href={`${API_URL}/api/export/messages`} className="admin__export-btn"><Download size={14}/>Export</a><button className="admin__export-btn" onClick={()=>setShowMessages(!showMessages)}>{showMessages?<EyeOff size={14}/>:<Eye size={14}/>}{showMessages?'Hide':'Show'}</button></div></div>{showMessages&&(<div className="admin__table-wrapper" style={{maxHeight:'400px',overflowY:'auto'}}><table className="admin__table"><thead><tr><th>Sender</th><th>Message</th><th>Type</th><th>Room</th><th>Time</th><th>IP</th></tr></thead><tbody>{data.messageLog?.length===0?<tr><td colSpan="6" className="admin__empty">No messages</td></tr>:[...(data.messageLog||[])].reverse().map(m=>(<tr key={m.id}><td>{m.sender}</td><td style={{maxWidth:'200px',overflow:'hidden',textOverflow:'ellipsis'}}>{m.text}</td><td>{m.type==='voice'?'🎤':'💬'}</td><td className="admin__socket-id">{m.room?.substring(0,10)}...</td><td>{m.time}</td><td className="admin__ip">{m.ip}</td></tr>))}</tbody></table></div>)}</div>)}

      {/* Reports Tab */}
      {activeTab==='reports'&&(<div className="admin__panel"><div className="admin__panel-header"><h2><AlertTriangle size={16}/>Reports ({data.reportedUsers?.length||0})</h2></div><div className="admin__table-wrapper"><table className="admin__table"><thead><tr><th>Reported By</th><th>User</th><th>Reason</th><th>Room</th><th>Time</th></tr></thead><tbody>{data.reportedUsers?.length===0?<tr><td colSpan="5" className="admin__empty">No reports</td></tr>:data.reportedUsers?.map((r,i)=>(<tr key={i}><td>{r.reportedBy}</td><td style={{color:'#ef4444'}}>{r.reportedUser}</td><td>{r.reason}</td><td className="admin__socket-id">{r.roomId?.substring(0,10)}...</td><td>{r.time}</td></tr>))}</tbody></table></div></div>)}

      {/* Clear Modal */}
      {showClearModal && (<div className="admin__modal-overlay" onClick={() => { setShowClearModal(false); setClearPassword(''); }}><div className="admin__modal" onClick={(e) => e.stopPropagation()}><div className="admin__modal-icon admin__modal-icon--danger"><AlertTriangle size={28} /></div><h2 className="admin__modal-title">Clear All Data?</h2><p className="admin__modal-text">This will delete all broadcast requests, message logs, reports, bans, mutes, and Freedom Wall data. This action cannot be undone.</p><div className="admin__form-group" style={{marginBottom:'16px',textAlign:'left'}}><label className="admin__form-label">Enter password to confirm</label><input type="password" value={clearPassword} onChange={(e) => setClearPassword(e.target.value)} placeholder="Enter admin password" className="admin__form-input" onKeyDown={(e) => e.key === 'Enter' && handleClearData()} /></div><div className="admin__modal-actions"><button className="admin__modal-btn admin__modal-btn--cancel" onClick={() => { setShowClearModal(false); setClearPassword(''); }}>Cancel</button><button className="admin__modal-btn admin__modal-btn--danger" onClick={handleClearData} disabled={clearing || !clearPassword}>{clearing ? 'Clearing...' : 'Clear All Data'}</button></div></div></div>)}
    </div>
  );
};

export default AdminPanel;