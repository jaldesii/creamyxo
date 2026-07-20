import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Sparkles, ArrowRight, History, Check, X, Shield } from 'lucide-react';
import './CreateProfile.scss';

const CreateProfile = () => {
  const [name, setName] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [nameHistory, setNameHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const navigate = useNavigate();

  // Load name history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('cremyxo_name_history');
    if (saved) {
      try {
        const history = JSON.parse(saved);
        if (Array.isArray(history)) {
          setNameHistory(history.slice(0, 10));
        }
      } catch (err) { console.error('Error loading name history:', err); }
    }
  }, []);

  const saveNameToHistory = (username) => {
    const updated = [username, ...nameHistory.filter(n => n !== username)].slice(0, 10);
    setNameHistory(updated);
    localStorage.setItem('cremyxo_name_history', JSON.stringify(updated));
  };

  // Sanitize name - remove dangerous characters
  const sanitizeName = (input) => {
    return input
      .replace(/[<>{}]/g, '')           // Remove HTML/code injection chars
      .replace(/<script.*?>.*?<\/script>/gi, '') // Remove script tags
      .replace(/\s+/g, ' ')             // Collapse multiple spaces
      .trim();                           // Remove leading/trailing spaces
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const sanitized = sanitizeName(name);
    
    if (!sanitized) {
      alert('Please enter a valid display name.');
      return;
    }
    
    if (sanitized.length < 2) {
      alert('Display name must be at least 2 characters.');
      return;
    }
    
    // Check for reserved/admin names
    const reservedNames = ['admin', 'administrator', 'moderator', 'mod', 'system', 'cremyxo', 'owner', 'staff'];
    if (reservedNames.includes(sanitized.toLowerCase())) {
      alert('This name is reserved. Please choose another.');
      return;
    }
    
    saveNameToHistory(sanitized);
    navigate('/select-mode', { state: { username: sanitized } });
  };

  const selectHistoryName = (historyName) => {
    setName(historyName);
    setShowHistory(false);
  };

  const clearHistory = () => {
    setNameHistory([]);
    localStorage.removeItem('cremyxo_name_history');
    setShowHistory(false);
  };

  const randomNames = [
  // 🇵🇭 Pinoy Na Astig
  'JuanDirection', 'BoySunod', 'TitoVibes', 'KuyaBoss', 'BunsoWap', 'ManongChill', 'AteGirl', 'TatayMode',
  'LodiKita', 'PetmaluXo', 'WerpaKing', 'SakalamLord', 'AstigPare', 'SolidTol', 'LupetMo', 'PanaloYan',
  
  // 🔥 Geng Geng / Kalye
  'TropaMan', 'BarkadaGoals', 'KalyeKing', 'SkwaterBoi', 'TondoPride', 'RectoKid', 'QuiapoSoul', 'DivisoriaVibes',
  'KantoWanderer', 'SulitQueen', 'GengGengPare', 'PadyakBoi', 'TricycleKing', 'PUVmemes', 'TrapikLord', 'SardinasKid',
  
  // 😂 Funny / Meme
  'TusokTusok', 'IsawLord', 'KwekKwekKing', 'FishballQueen', 'TahoMaster', 'BalotWarrior', 'SiomaiRice', 'PaotsinGang',
  'LumpiaGod', 'TuronSlayer', 'HaloHaloPH', 'LechonSoul', 'AdoboKing', 'SinigangMaster', 'KaninAllDay', 'ExtraRicePlease',
  
  // 🎮 Pinoy Gamer
  'PogiGamer', 'TitoGamer', 'KuyaML', 'GalingMoNaman', 'PabiboKid', 'TryHardPinoy', 'PinoyAce', 'PHClutchGod',
  'LakasMoPre', 'TamangLaro', 'RampaKing', 'PanaloMaster', 'BidaMan', 'SikatNaBata', 'LegendaryPinoy', 'PinoyPrideGG',
  
  // 🌴 Island Vibes
  'BoracaySoul', 'SiargaoKid', 'PalawanDream', 'IslaParadise', 'BeachBumPH', 'SunsetBoy', 'CocoNutty', 'TropicalVibes',
  'BahalaNaSiBatman', 'SigeLang', 'KayaMoYan', 'LabanLang', 'PusoMo', 'TibayPinoy', 'WalangIwanan', 'BayanihanSpirit',
  
  // 💫 Short / Snappy Pinoy
  'Lodi', 'Petmalu', 'Werpa', 'Sakalam', 'Astig', 'Lupet', 'Panalo', 'Solid', 'Tiwala', 'Sipag', 'Galing', 'Bangis',
  'Lakas', 'Tibay', 'Puso', 'Ganda', 'Bait', 'Saya', 'Galing', 'Bangis', 'Husay', 'Tapang', 'Sulit', 'LevelUp',
  
  // 🏠 Bahay Vibes
  'TsinelasWarrior', 'SandoMaster', 'ShortKing', 'WalangPasok', 'TulogMuna', 'GisingNa', 'AlmusalTime', 'MeriendaQueen',
  'SiestaKing', 'TahoTime', 'TindahanRun', 'SariSariStore', 'KapitBahay', 'GateCrash', 'TambayMode', 'BarkadaNight',
  
  // 🎉 Pinoy Party
  'KaraokeGod', 'VideokeKing', 'InumanMaster', 'PulutanQueen', 'TagayNa', 'ShotPuno', 'RedHorseSoul', 'EmpeLights',
  'SanMigLight', 'TanduayIce', 'GinBulag', 'LambanogLord', 'TagayTayo', 'CheersPre', 'KampayTayo', 'BottomsUpPH'
];

const setRandomName = () => {
  const available = randomNames.filter(n => n !== name);
  const random = available[Math.floor(Math.random() * available.length)];
  setName(random);
};

  const handleNameChange = (e) => {
    // Allow only valid characters (letters, numbers, spaces, underscores, hyphens)
    const sanitized = e.target.value.replace(/[^a-zA-Z0-9 _-]/g, '');
    if (sanitized.length <= 24) {
      setName(sanitized);
    }
  };

  const handlePaste = (e) => {
    // Prevent pasting extremely long text (bots)
    const pastedText = e.clipboardData?.getData('text') || '';
    if (pastedText.length > 100) {
      e.preventDefault();
      alert('Pasted text is too long. Maximum 24 characters allowed.');
    }
  };

  return (
    <div className="profile">
      {/* Navigation */}
      <nav className="profile__nav">
        <div className="profile__nav-inner">
          <a href="/terms" className="profile__back">
            <ArrowLeft size={16} />
            Back
          </a>
          <span className="profile__logo-text">Cremyxo</span>
        </div>
      </nav>

      {/* Content */}
      <div className="profile__content">
        <div className="profile__icon">
          <User size={32} />
        </div>

        <span className="profile__eyebrow">
          <Sparkles size={14} />
          Almost There
        </span>

        <h1 className="profile__title">
          Choose Your{' '}
          <span className="profile__title-gradient">Display Name</span>
        </h1>

        <p className="profile__subtitle">
          Pick a name to show in the chat. You can change this anytime.
        </p>

        <form onSubmit={handleSubmit} className="profile__form">
          <div className={`profile__input-wrapper ${isFocused ? 'profile__input-wrapper--focused' : ''} ${name ? 'profile__input-wrapper--filled' : ''}`}>
            <div className="profile__input-icon">
              <User size={18} />
            </div>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              onFocus={() => { setIsFocused(true); setShowHistory(true); }}
              onBlur={() => setTimeout(() => { setIsFocused(false); setShowHistory(false); }, 200)}
              onPaste={handlePaste}
              placeholder="Enter your display name"
              className="profile__input"
              maxLength={24}
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
            {name && (
              <span className="profile__char-count">
                {name.length}/24
              </span>
            )}
          </div>

          {/* Name History Dropdown */}
          {showHistory && nameHistory.length > 0 && (
            <div className="profile__history">
              <div className="profile__history-header">
                <History size={14} />
                <span>Previously Used Names</span>
                <button type="button" onClick={clearHistory} className="profile__history-clear" title="Clear history">
                  <X size={12} />
                </button>
              </div>
              <div className="profile__history-list">
                {nameHistory.map((historyName, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`profile__history-item ${name === historyName ? 'profile__history-item--active' : ''}`}
                    onClick={() => selectHistoryName(historyName)}
                  >
                    <div className="profile__history-avatar">
                      {historyName.charAt(0).toUpperCase()}
                    </div>
                    <span className="profile__history-name">{historyName}</span>
                    {name === historyName && (
                      <span className="profile__history-check">
                        <Check size={14} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button 
            type="button" 
            onClick={setRandomName}
            className="profile__random-btn"
          >
            <Sparkles size={14} />
            Generate Random Name
          </button>

          <button 
            type="submit" 
            className={`profile__submit ${name.trim() ? 'profile__submit--active' : ''}`}
            disabled={!name.trim()}
          >
            Continue
            <ArrowRight size={18} />
          </button>
        </form>

        <p className="profile__hint">
          {!name.trim() 
            ? 'Enter a name or generate a random one to continue' 
            : `You'll join as "${name.trim()}"`
          }
        </p>
        
        <p className="profile__safe-hint">
          <Shield size={12} />
          Only letters, numbers, spaces, underscores, and hyphens allowed
        </p>
      </div>
    </div>
  );
};

export default CreateProfile;