import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Send, ChevronLeft, Shield, MessageCircle, PhoneOff, AlertTriangle, Mic, MicOff, Trash2, Play, Pause, Megaphone, X, Timer } from 'lucide-react';
import socket from '../../socket';
import { useAnnouncement } from '../../context/AnnouncementContext';
import './ChatPage.scss';

// =============================================
// SECURITY: Content Sanitization Functions
// =============================================
const sanitizeMessage = (text) => {
  return text
    .replace(/<script.*?>.*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>{}]/g, '')
    .trim();
};

const containsSpam = (text) => {
  const spamPatterns = [
    /\b(buy now|click here|free money|casino|viagra|cialis|loan|lottery|winner|congratulations|cash prize|earn money|work from home|get rich|bitcoin free|double your|act now|limited offer|exclusive deal|guaranteed|risk free|order now|call now|text now)\b/gi,
    /(https?:\/\/[^\s]+)/gi,
    /(\b\d{10,}\b)/g,
  ];
  return spamPatterns.some(pattern => pattern.test(text));
};

const ChatPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username || 'Anonymous';
  const roomId = location.state?.roomId;
  const partnerName = location.state?.partner?.name || 'Unknown';
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [partnerOnline, setPartnerOnline] = useState(true);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showPartnerLeftModal, setShowPartnerLeftModal] = useState(false);
  const [leaveAction, setLeaveAction] = useState(null);
  const hasLeft = useRef(false);
  const { announcement, announceCountdown, hideAnnouncement } = useAnnouncement();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(new Audio());

  // =============================================
  // SECURITY: Rate Limiting
  // =============================================
  const messageCountRef = useRef(0);
  const lastMessageTimeRef = useRef(0);
  const [spamCooldown, setSpamCooldown] = useState(false);

  const checkSpamLimit = () => {
    const now = Date.now();
    const timeSinceLast = now - lastMessageTimeRef.current;
    
    if (timeSinceLast >= 10000) {
      messageCountRef.current = 0;
      setSpamCooldown(false);
    }
    
    if (messageCountRef.current >= 5 && timeSinceLast < 10000) {
      setSpamCooldown(true);
      setTimeout(() => { setSpamCooldown(false); messageCountRef.current = 0; }, 10000);
      return false;
    }
    
    if (timeSinceLast < 800 && messageCountRef.current > 0) {
      return false;
    }
    
    return true;
  };

  useEffect(() => {
    if (!roomId) return;
    for (let i = 0; i < 3; i++) window.history.pushState({ chatRoom: roomId }, '', window.location.pathname);
    const hps = (e) => { if (hasLeft.current) return; window.history.pushState({ chatRoom: roomId }, '', window.location.pathname); setLeaveAction('browser-back'); setShowLeaveModal(true); };
    const hbu = (e) => { if (hasLeft.current) return; e.preventDefault(); e.returnValue = ''; return ''; };
    window.addEventListener('popstate', hps); window.addEventListener('beforeunload', hbu);

    socket.on('receive-message', (data) => {
      let aUrl = null;
      if (data.type === 'voice' && data.audioUrl?.startsWith('data:')) { try { const bd = data.audioUrl.split(',')[1]; const bs = atob(bd); const bytes = new Uint8Array(bs.length); for (let i=0;i<bs.length;i++) bytes[i]=bs.charCodeAt(i); aUrl=URL.createObjectURL(new Blob([bytes],{type:'audio/webm'})); } catch(e){} }
      setMessages(p => [...p, { id: Date.now(), user: data.sender, text: data.text, time: data.time, isMine: false, type: data.type||'text', audioUrl: aUrl, duration: data.duration||0 }]);
    });
    socket.on('system-message', (d) => setMessages(p => [...p, { id: Date.now(), user: 'System', text: d.text, time: 'Just now', isSystem: true }]));
    socket.on('partner-typing', (d) => setPartnerTyping(d.isTyping));
    socket.on('partner-status', (d) => setPartnerOnline(d.online));
    socket.on('partner-left', () => { setPartnerOnline(false); setShowPartnerLeftModal(true); });
    socket.on('kicked', () => { alert('Kicked by admin.'); navigate('/'); });
    socket.on('banned', () => { alert('Banned.'); navigate('/'); });
    socket.on('muted', (d) => { alert(d.message); });

    return () => {
      window.removeEventListener('popstate', hps); window.removeEventListener('beforeunload', hbu);
      socket.off('receive-message'); socket.off('system-message');
      socket.off('partner-typing'); socket.off('partner-status'); socket.off('partner-left');
      socket.off('kicked'); socket.off('banned'); socket.off('muted');
      if (timerRef.current) clearInterval(timerRef.current);
      audioRef.current.pause();
    };
  }, [roomId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const startRecording = async () => { try { const s=await navigator.mediaDevices.getUserMedia({audio:true}); const mr=new MediaRecorder(s,{mimeType:'audio/webm;codecs=opus'}); mediaRecorderRef.current=mr; chunksRef.current=[]; mr.ondataavailable=e=>{if(e.data.size>0)chunksRef.current.push(e.data)}; mr.onstop=()=>{const b=new Blob(chunksRef.current,{type:'audio/webm'}); setAudioBlob(b); setAudioUrl(URL.createObjectURL(b)); s.getTracks().forEach(t=>t.stop())}; mr.start(); setIsRecording(true); setRecordingTime(0); timerRef.current=setInterval(()=>setRecordingTime(p=>p>=120?p:p+1),1000); } catch(e){alert('Please allow microphone.');} };
  const stopRecording = () => { if(mediaRecorderRef.current?.state==='recording'){mediaRecorderRef.current.stop(); setIsRecording(false); if(timerRef.current)clearInterval(timerRef.current);} };
  const cancelRecording = () => { if(timerRef.current)clearInterval(timerRef.current); if(mediaRecorderRef.current?.state==='recording'){mediaRecorderRef.current.stream.getTracks().forEach(t=>t.stop());mediaRecorderRef.current.stop();} setIsRecording(false); if(audioUrl)URL.revokeObjectURL(audioUrl); setAudioBlob(null);setAudioUrl(null); };
  const sendVoiceMessage = () => { if(!audioBlob)return; const r=new FileReader(); r.onloadend=()=>{const b64=r.result; const t=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); setMessages(p=>[...p,{id:Date.now(),user:username,text:'🎤 Voice',time:t,isMine:true,type:'voice',audioUrl:b64,duration:recordingTime}]); socket.emit('send-message',{roomId,message:{text:'🎤 Voice',time:t,sender:username,type:'voice',audioUrl:b64,duration:recordingTime}}); if(audioUrl)URL.revokeObjectURL(audioUrl); setAudioBlob(null);setAudioUrl(null);}; r.readAsDataURL(audioBlob); };
  const deleteVoiceDraft = () => { if(audioUrl)URL.revokeObjectURL(audioUrl); setAudioBlob(null);setAudioUrl(null); };
  const playAudio = (src,id) => { if(playingId===id){audioRef.current.pause();audioRef.current.currentTime=0;setPlayingId(null);return;} audioRef.current.pause();audioRef.current.currentTime=0;audioRef.current.src=src;audioRef.current.play().catch(e=>{}); setPlayingId(id); audioRef.current.onended=()=>setPlayingId(null); audioRef.current.onerror=()=>setPlayingId(null); };
  const formatTime = (s) => { const m=Math.floor(s/60), sec=s%60; return `${m}:${sec.toString().padStart(2,'0')}`; };
  const formatDurationLabel = (s) => { if(s===0)return'∞';if(s<60)return`${s}s`;if(s<3600)return`${Math.floor(s/60)}m`;return`${Math.floor(s/3600)}h`; };

  // =============================================
  // SECURITY: Updated handleSend with protections
  // =============================================
  const handleSend = (e) => { 
    e.preventDefault(); 
    if (!message.trim()) return;
    
    if (!checkSpamLimit()) {
      if (spamCooldown) alert('⚠️ Sending too fast. Please wait a few seconds.');
      return;
    }
    
    const sanitized = sanitizeMessage(message);
    if (!sanitized) { setMessage(''); return; }
    if (sanitized.length > 500) { alert('⚠️ Message too long. Max 500 characters.'); setMessage(''); return; }
    
    // Block links for anti-phishing
    if (containsSpam(sanitized) && sanitized.match(/(https?:\/\/[^\s]+)/gi)) {
      alert('⚠️ Links are not allowed for safety reasons.');
      setMessage('');
      return;
    }
    
    const t = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); 
    setMessages(p => [...p, { id: Date.now(), user: username, text: sanitized, time: t, isMine: true, type: 'text' }]); 
    socket.emit('send-message', { roomId, message: { text: sanitized, time: t, sender: username, type: 'text' } }); 
    setMessage(''); 
    inputRef.current?.focus();
    messageCountRef.current++;
    lastMessageTimeRef.current = Date.now();
  };

  const handleKeyDown = (e) => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend(e);} };
  
  const handleTyping = (e) => { 
    const val = e.target.value;
    if (val.length > 500) { setMessage(val.slice(0, 500)); return; }
    setMessage(val); 
    socket.emit('typing', { roomId, isTyping: val.length > 0 }); 
  };

  const handlePaste = (e) => {
    const pastedText = e.clipboardData?.getData('text') || '';
    if (pastedText.length > 500) {
      e.preventDefault();
      setMessage(pastedText.slice(0, 500));
    }
  };

  const confirmLeave = () => { hasLeft.current=true; setShowLeaveModal(false);setShowEndModal(false); socket.emit('leave-chat',{roomId}); audioRef.current.pause(); if(leaveAction==='back'||leaveAction==='browser-back')navigate('/create-profile',{replace:true}); else navigate('/loading',{state:{username},replace:true}); };
  const cancelLeave = () => { setShowLeaveModal(false);setShowEndModal(false);setLeaveAction(null); };
  const handleBackClick = () => { setLeaveAction('back');setShowLeaveModal(true); };
  const handleEndClick = () => { setLeaveAction('end');setShowEndModal(true); };
  const handlePartnerLeftOk = () => { hasLeft.current=true;setShowPartnerLeftModal(false);socket.emit('leave-chat',{roomId});audioRef.current.pause();navigate('/loading',{state:{username},replace:true}); };
  const getInitials = (n) => n.charAt(0).toUpperCase();

  return (
    <div className="chatpage">
      {/* Header */}
      <header className="chatpage__header">
        <div className="chatpage__header-left">
          <button className="chatpage__back" onClick={handleBackClick}><ChevronLeft size={20}/></button>
        </div>
        <span className="chatpage__logo-text">Cremyxo</span>
        <button className="chatpage__end-btn" onClick={handleEndClick}><PhoneOff size={16}/><span>Leave</span></button>
      </header>

      {/* Announcement Banner */}
      {announcement && (
        <div className={`chatpage__announcement chatpage__announcement--${announcement.type}`}>
          <div className="chatpage__announcement-left">
            <div className="chatpage__announcement-icon-wrapper">
              <Megaphone size={18} />
            </div>
            <div className="chatpage__announcement-content">
              <span className="chatpage__announcement-title">
                {announcement.from || 'Cremyxo Admin'}
              </span>
              <p className="chatpage__announcement-text">{announcement.message}</p>
            </div>
          </div>
          <div className="chatpage__announcement-right">
            {announceCountdown && (
              <span className="chatpage__announcement-timer">
                <Timer size={12} /> {formatDurationLabel(announceCountdown)}
              </span>
            )}
            <button className="chatpage__announcement-close" onClick={hideAnnouncement}>
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Partner Bar */}
      <div className="chatpage__partner-bar">
        <div className="chatpage__partner-avatar">
          {getInitials(partnerName)}
          {partnerOnline && <span className="chatpage__partner-dot"/>}
        </div>
        <div className="chatpage__partner-info">
          <h1 className="chatpage__partner-name">{partnerName}</h1>
          <span className="chatpage__partner-status">
            {!partnerOnline ? <span className="chatpage__partner-offline">Offline</span> :
             partnerTyping ? <span className="chatpage__partner-typing">typing...</span> :
             <><span className="chatpage__status-dot"/>Online</>}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="chatpage__messages">
        <div className="chatpage__connected-notice">
          <MessageCircle size={16}/>
          <span>You are now chatting with <strong>{partnerName}</strong></span>
        </div>
        <div className="chatpage__encryption-notice">
          <Shield size={12}/>
          <span>End-to-end encrypted • Messages are not stored</span>
        </div>
        {messages.map(m=>(
          <div key={m.id} className={`chatpage__message-wrapper ${m.isMine?'chatpage__message-wrapper--mine':''} ${m.isSystem?'chatpage__message-wrapper--system':''}`}>
            {m.isSystem ? (
              <div className="chatpage__system-msg"><MessageCircle size={14}/><p>{m.text}</p></div>
            ) : (
              <div className={`chatpage__message ${m.isMine?'chatpage__message--mine':''}`}>
                {!m.isMine && <div className="chatpage__avatar">{getInitials(m.user)}</div>}
                <div className="chatpage__message-content">
                  {m.type==='voice' ? (
                    <div className={`chatpage__voice-bubble ${m.isMine?'chatpage__voice-bubble--mine':''}`}>
                      <button className="chatpage__voice-play" onClick={()=>playAudio(m.audioUrl,m.id)}>
                        {playingId===m.id ? <Pause size={16}/> : <Play size={16}/>}
                      </button>
                      <div className="chatpage__voice-wave">
                        {[...Array(7)].map((_,i)=><span key={i} className={playingId===m.id?'chatpage__voice-bar--active':''}/>)}
                      </div>
                      <span className="chatpage__voice-time">{m.duration?formatTime(m.duration):'0:00'}</span>
                    </div>
                  ) : (
                    <div className="chatpage__bubble"><p>{m.text}</p></div>
                  )}
                  <span className="chatpage__time">{m.time}</span>
                </div>
              </div>
            )}
          </div>
        ))}
        {partnerTyping && (
          <div className="chatpage__typing">
            <div className="chatpage__avatar chatpage__avatar--small">{getInitials(partnerName)}</div>
            <div className="chatpage__typing-bubble">
              <div className="chatpage__typing-dots"><span/><span/><span/></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef}/>
      </div>

      {/* Input Area */}
      {audioBlob ? (
        <div className="chatpage__voice-preview">
          <button className="chatpage__voice-delete" onClick={deleteVoiceDraft}><Trash2 size={18}/></button>
          <div className="chatpage__voice-preview-info">
            <button className="chatpage__voice-play" onClick={()=>playAudio(audioUrl,'draft')}>
              {playingId==='draft' ? <Pause size={16}/> : <Play size={16}/>}
            </button>
            <div className="chatpage__voice-wave">{[...Array(7)].map((_,i)=><span key={i}/>)}</div>
            <span className="chatpage__voice-time">{formatTime(recordingTime)}</span>
          </div>
          <button className="chatpage__voice-send" onClick={sendVoiceMessage}><Send size={18}/></button>
        </div>
      ) : isRecording ? (
        <div className="chatpage__voice-recording">
          <button className="chatpage__voice-cancel" onClick={cancelRecording}><Trash2 size={18}/></button>
          <div className="chatpage__voice-recording-info">
            <div className="chatpage__voice-dot"/>
            <span className="chatpage__voice-recording-time">{formatTime(recordingTime)}</span>
            <div className="chatpage__voice-wave">
              {[...Array(7)].map((_,i)=><span key={i} className="chatpage__voice-bar--live"/>)}
            </div>
          </div>
          <button className="chatpage__voice-stop" onClick={stopRecording}><MicOff size={18}/></button>
        </div>
      ) : (
        <form className="chatpage__input-area" onSubmit={handleSend}>
          <button type="button" className="chatpage__mic-btn" onClick={startRecording}><Mic size={20}/></button>
          <div className="chatpage__input-wrapper">
            <input 
              ref={inputRef} 
              type="text" 
              value={message} 
              onChange={handleTyping} 
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Type your message..." 
              className="chatpage__input" 
              autoFocus 
              disabled={!partnerOnline}
              maxLength={500}
              autoComplete="off"
            />
          </div>
          <button 
            type="submit" 
            className={`chatpage__send-btn ${message.trim() && !spamCooldown ? 'chatpage__send-btn--active' : ''}`} 
            disabled={!message.trim() || !partnerOnline || spamCooldown}
          >
            <Send size={18}/>
          </button>
        </form>
      )}

      {/* Leave Modal */}
      {showLeaveModal && (
        <div className="chatpage__modal-overlay">
          <div className="chatpage__modal">
            <div className="chatpage__modal-icon chatpage__modal-icon--warning"><AlertTriangle size={28}/></div>
            <h2 className="chatpage__modal-title">Leave Chat?</h2>
            <p className="chatpage__modal-text">Going back will end your conversation.</p>
            <div className="chatpage__modal-actions">
              <button className="chatpage__modal-btn chatpage__modal-btn--cancel" onClick={cancelLeave}>Stay Here</button>
              <button className="chatpage__modal-btn chatpage__modal-btn--confirm" onClick={confirmLeave}>Leave</button>
            </div>
          </div>
        </div>
      )}

      {/* End Chat Modal */}
      {showEndModal && (
        <div className="chatpage__modal-overlay">
          <div className="chatpage__modal">
            <div className="chatpage__modal-icon chatpage__modal-icon--danger"><PhoneOff size={28}/></div>
            <h2 className="chatpage__modal-title">End Chat?</h2>
            <p className="chatpage__modal-text">You'll be matched with someone new.</p>
            <div className="chatpage__modal-actions">
              <button className="chatpage__modal-btn chatpage__modal-btn--cancel" onClick={cancelLeave}>Cancel</button>
              <button className="chatpage__modal-btn chatpage__modal-btn--danger" onClick={confirmLeave}>Find New</button>
            </div>
          </div>
        </div>
      )}

      {/* Partner Left Modal */}
      {showPartnerLeftModal && (
        <div className="chatpage__modal-overlay">
          <div className="chatpage__modal">
            <div className="chatpage__modal-icon chatpage__modal-icon--info"><MessageCircle size={28}/></div>
            <h2 className="chatpage__modal-title">Partner Left</h2>
            <p className="chatpage__modal-text">Find someone new!</p>
            <div className="chatpage__modal-actions">
              <button className="chatpage__modal-btn chatpage__modal-btn--confirm" onClick={handlePartnerLeftOk}>Find New Partner</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;