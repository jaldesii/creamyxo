import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Users, Zap, Shield, ArrowRight, Sparkles, Megaphone, Radio, Timer, Mic, Send, ArrowUpRight, StickyNote, Camera, Heart, MessageSquare, Image, Phone, Download } from 'lucide-react';
import './Hero.scss';

const Hero = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();

  // PWA Install states
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handleScroll = () => { setIsScrolled(window.scrollY > 20); };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // PWA Install listener
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstall(false);
      setDeferredPrompt(null);
    }
  };

  const goToTerms = () => { navigate('/terms'); };
  const goToBroadcast = () => { navigate('/broadcast'); };
  const goToCreateProfile = () => { navigate('/create-profile'); };

  const scrollToHowItWorks = () => {
    const section = document.getElementById('how-it-works');
    if (section) section.scrollIntoView({ behavior: 'smooth' });
  };

  const features = [
    { icon: <Zap size={20} />, title: "Instant Chat", description: "No registration needed. Start chatting immediately with just a click." },
    { icon: <Shield size={20} />, title: "Private & Secure", description: "Your conversations are encrypted. No data stored on our servers." },
    { icon: <MessageCircle size={20} />, title: "Real-time Messaging", description: "Lightning-fast message delivery with typing indicators." },
    { icon: <Megaphone size={20} />, title: "Paid Broadcasts", description: "Promote your brand or message to all users. Get your announcement featured!" },
    { icon: <StickyNote size={20} />, title: "Freedom Wall", description: "Post your thoughts, photos, and voice messages. Like a community bulletin board!" },
    { icon: <Camera size={20} />, title: "Photo Sharing", description: "Share up to 5 photos per post. Your memories, your wall." },
    { icon: <Heart size={20} />, title: "Like & Comment", description: "Interact with posts! Like and comment on community content." },
    { icon: <MessageSquare size={20} />, title: "Stories Feature", description: "Share 24-hour stories with photos and captions. Like social media, but simpler!" },
  ];

  const announcementFeatures = [
    { icon: <Timer size={18} />, title: "Custom Duration", desc: "Set announcements from 1 minute to permanent. Full control over how long they stay visible." },
    { icon: <Send size={18} />, title: "Instant Broadcast", desc: "Messages reach all users instantly. No delays, no queues — everyone sees it at the same time." },
    { icon: <Megaphone size={18} />, title: "Multiple Types", desc: "Info, Warning, Success, and Alert types with distinct colors so users know the priority." }
  ];

  const freedomWallFeatures = [
    { icon: <StickyNote size={20} />, title: "Freedom Wall", desc: "A community bulletin board where you can share thoughts, photos, and voice messages with everyone." },
    { icon: <Image size={20} />, title: "Photo Gallery", desc: "Upload up to 5 photos per post. View them in full-screen gallery mode." },
    { icon: <Mic size={20} />, title: "Voice Messages", desc: "Record and share voice messages up to 2 minutes. More personal than text!" },
    { icon: <Heart size={20} />, title: "Likes & Comments", desc: "Interact with the community! Like posts and leave comments to keep conversations going." },
    { icon: <Camera size={20} />, title: "24hr Stories", desc: "Share temporary stories with photos and captions. Disappears after 24 hours." },
    { icon: <Users size={20} />, title: "User Profiles", desc: "Click any username to view their profile, post history, and stats." }
  ];

  const comingSoonFeatures = [
    { icon: <Phone size={24} />, title: "1v1 Voice Calls", desc: "Real-time voice conversations with your chat partner. More personal than text!" },
    { icon: <Users size={24} />, title: "Group Chats", desc: "Create rooms and chat with multiple people at once. Coming to Freedom Wall soon!" },
    { icon: <Send size={24} />, title: "File Sharing", desc: "Send images, documents, and files directly in your 1-on-1 conversations." },
    { icon: <Shield size={24} />, title: "Verified Badges", desc: "Get verified and stand out in the community with a special badge on your profile." },
  ];

  const steps = [
    { step: "STEP 1", title: "Agree to Terms", desc: "Read and accept our Terms & Conditions to ensure a safe and respectful experience for everyone." },
    { step: "STEP 2", title: "Choose Your Name", desc: "Pick any display name you like. Use our random generator or select from your name history." },
    { step: "STEP 3", title: "Select Your Mode", desc: "Choose 1v1 Chat for private conversations or Freedom Wall to post, share photos, and interact with the community." },
    { step: "STEP 4", title: "Start Connecting", desc: "Chat 1-on-1 instantly, post on the Freedom Wall, share stories, like and comment — all in one place!" },
  ];

  const values = [
    { title: "Privacy First", desc: "We don't store messages, require emails, or track your activity. Your conversations are yours alone." },
    { title: "Zero Friction", desc: "Why should chatting require signup? We removed every barrier between you and your conversation." },
    { title: "Always Free", desc: "Cremyxo is and will always be free. No premium tiers, no paywalls — just open communication." }
  ];

  const stats = [
    { value: "0s", label: "Setup Time" },
    { value: "100%", label: "Anonymous" },
    { value: "2", label: "Chat Modes" },
    { value: "∞", label: "Free Forever" },
  ];

  const facebookPageUrl = "https://www.facebook.com/profile.php?id=61591957418044";

  return (
    <div className="hero">
      {/* NAVIGATION */}
      <nav className={`hero__nav ${isScrolled ? 'hero__nav--scrolled' : ''}`}>
        <div className="hero__nav-inner">
          <div className="hero__logo">
            <div className="hero__logo-icon" />
            <span className="hero__logo-text">Cremyxo</span>
            <span className="hero__beta-badge">BETA</span>
          </div>
          <ul className="hero__nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#freedom-wall">Freedom Wall</a></li>
            <li><a href="#announcements">Broadcast</a></li>
            <li><a href="#how-it-works">How It Works</a></li>
          </ul>
          <button onClick={goToTerms} className="hero__cta">
            Start Chatting
            <ArrowRight size={16} />
          </button>
        </div>
      </nav>

      {/* HERO CONTENT */}
      <div className="hero__content">
        <div className="hero__dev-notice">
          <Sparkles size={14} />
          <span>We're in active development! New features coming soon.</span>
        </div>
        
        <span className="hero__eyebrow">
          <Sparkles size={16} />
          No Signup Required
        </span>
        <h1 className="hero__title">
          Chat Freely,{' '}
          <span className="hero__title-gradient">No Strings Attached</span>
        </h1>
        <p className="hero__subtitle">
          Jump into conversations instantly without creating an account. 
          Your privacy matters — no logs, no tracking, just pure conversation.
        </p>
        <div className="hero__actions">
          <button onClick={goToTerms} className="hero__button-primary">
            Start Anonymous Chat
          </button>
          <button onClick={scrollToHowItWorks} className="hero__button-secondary">
            How It Works
          </button>
          <button onClick={goToCreateProfile} className="hero__button-community">
            <StickyNote size={16} />
            Freedom Wall
            <ArrowRight size={14} />
          </button>
          {showInstall && (
            <button onClick={handleInstall} className="hero__install-btn">
              <Download size={16} />
              Install App
            </button>
          )}
        </div>
      </div>

      {/* FEATURES GRID */}
      <section id="features" className="features">
        <div className="features__inner">
          <span className="features__eyebrow">Why Cremyxo</span>
          <h2 className="features__title">Everything You Need to Chat & Share</h2>
          <p className="features__subtitle">Simple, fast, and private messaging plus a Freedom Wall to express yourself.</p>
          <div className="features__grid">
            {features.map((feature, index) => (
              <div key={index} className={`features__card`}>
                <div className="features__card-icon">{feature.icon}</div>
                <h3 className="features__card-title">{feature.title}</h3>
                <p className="features__card-desc">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FREEDOM WALL SECTION */}
      <section id="freedom-wall" className="freedom-wall-feature">
        <div className="freedom-wall-feature__inner">
          <div className="freedom-wall-feature__header">
            <span className="freedom-wall-feature__eyebrow">
              <StickyNote size={14} />
              Community Feature
            </span>
            <h2 className="freedom-wall-feature__title">
              Express Yourself on the{' '}
              <span className="freedom-wall-feature__title-gradient">Freedom Wall</span>
            </h2>
            <p className="freedom-wall-feature__subtitle">
              A community bulletin board where you can share your thoughts, photos, and voice messages. 
              Like, comment, and connect with everyone!
            </p>
          </div>
          <div className="freedom-wall-feature__preview">
            <div className="freedom-wall-feature__preview-badge">
              <Sparkles size={12} />
              <span>Live Feature</span>
            </div>
            <div className="freedom-wall-feature__preview-grid">
              <div className="freedom-wall-feature__preview-note freedom-wall-feature__preview-note--1">
                <div className="freedom-wall-feature__preview-pin">📌</div>
                <div className="freedom-wall-feature__preview-user">
                  <div className="freedom-wall-feature__preview-avatar">J</div>
                  <span>justin</span>
                </div>
                <p>Ang ganda ng Freedom Wall! Pwede mag-post ng photos at voice messages! 🔥</p>
                <div className="freedom-wall-feature__preview-actions">
                  <span>❤️ 24</span>
                  <span>💬 8</span>
                </div>
              </div>
              <div className="freedom-wall-feature__preview-note freedom-wall-feature__preview-note--2">
                <div className="freedom-wall-feature__preview-pin">📌</div>
                <div className="freedom-wall-feature__preview-user">
                  <div className="freedom-wall-feature__preview-avatar">M</div>
                  <span>miguel</span>
                </div>
                <div className="freedom-wall-feature__preview-images">
                  <div className="freedom-wall-feature__preview-img"></div>
                  <div className="freedom-wall-feature__preview-img freedom-wall-feature__preview-img--more">+2</div>
                </div>
                <p>My travel photos! 🗺️</p>
                <div className="freedom-wall-feature__preview-actions">
                  <span>❤️ 56</span>
                  <span>💬 12</span>
                </div>
              </div>
              <div className="freedom-wall-feature__preview-note freedom-wall-feature__preview-note--3">
                <div className="freedom-wall-feature__preview-pin">📌</div>
                <div className="freedom-wall-feature__preview-user">
                  <div className="freedom-wall-feature__preview-avatar">A</div>
                  <span>ateGirl</span>
                </div>
                <div className="freedom-wall-feature__preview-audio">
                  <span>🎤</span><span>Voice Message</span><span>0:42</span>
                </div>
                <div className="freedom-wall-feature__preview-actions">
                  <span>❤️ 18</span><span>💬 3</span>
                </div>
              </div>
            </div>
          </div>
          <div className="freedom-wall-feature__grid">
            {freedomWallFeatures.map((item, index) => (
              <div key={index} className="freedom-wall-feature__card">
                <div className="freedom-wall-feature__card-icon">{item.icon}</div>
                <h3 className="freedom-wall-feature__card-title">{item.title}</h3>
                <p className="freedom-wall-feature__card-desc">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="freedom-wall-feature__cta">
            <button onClick={goToCreateProfile} className="freedom-wall-feature__cta-button">
              <StickyNote size={18} />Visit Freedom Wall<ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* COMING SOON */}
      <section className="coming-soon">
        <div className="coming-soon__inner">
          <span className="coming-soon__eyebrow"><Timer size={14} />In Development</span>
          <h2 className="coming-soon__title">More Features <span className="coming-soon__title-gradient">Coming Soon</span></h2>
          <p className="coming-soon__subtitle">We're working hard to bring you even more ways to connect! Stay tuned.</p>
          <div className="coming-soon__grid">
            {comingSoonFeatures.map((item, index) => (
              <div key={index} className="coming-soon__card">
                <div className="coming-soon__card-icon">{item.icon}</div>
                <h3 className="coming-soon__card-title">{item.title}</h3>
                <p className="coming-soon__card-desc">{item.desc}</p>
                <span className="coming-soon__badge">Coming Soon</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SUPPORT */}
      <section className="support">
        <div className="support__inner">
          <div className="support__card">
            <div className="support__icon">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </div>
            <h2 className="support__title">Support Cremyxo on Facebook</h2>
            <p className="support__desc">Like and follow our Facebook page for updates, new features, and community highlights! Your support keeps us going. 🚀</p>
            <div className="support__actions">
              <a href={facebookPageUrl} target="_blank" rel="noopener noreferrer" className="support__btn support__btn--primary">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Follow on Facebook
              </a>
              <a href={facebookPageUrl} target="_blank" rel="noopener noreferrer" className="support__btn support__btn--secondary">Share with Friends</a>
            </div>
            <p className="support__hint">Every like and share helps us grow! ❤️</p>
          </div>
        </div>
      </section>

      {/* ANNOUNCEMENT */}
      <section id="announcements" className="announce-feature">
        <div className="announce-feature__inner">
          <div className="announce-feature__header">
            <span className="announce-feature__eyebrow"><Megaphone size={14} />Premium Feature</span>
            <h2 className="announce-feature__title">Promote Your <span className="announce-feature__title-gradient">Brand</span></h2>
            <p className="announce-feature__subtitle">Get your message seen by all Cremyxo users. Choose your duration, pay via GCash, and your brand gets featured on every chat screen!</p>
          </div>
          <div className="announce-feature__preview">
            <div className="announce-feature__preview-badge"><Radio size={12} /><span>Live Demo</span></div>
            <div className="announce-feature__preview-card">
              <div className="announce-feature__preview-left">
                <div className="announce-feature__preview-icon"><Megaphone size={18} /></div>
                <div className="announce-feature__preview-content">
                  <span className="announce-feature__preview-label">Your Brand Name</span>
                  <p className="announce-feature__preview-text">🚀 Your custom message appears here! Promote your business, event, or announcement to all users.</p>
                </div>
              </div>
              <div className="announce-feature__preview-right"><span className="announce-feature__preview-timer"><Timer size={12} />Duration</span></div>
            </div>
          </div>
          <div className="announce-feature__grid">
            {announcementFeatures.map((item, index) => (
              <div key={index} className="announce-feature__card"><div className="announce-feature__card-icon">{item.icon}</div><h3 className="announce-feature__card-title">{item.title}</h3><p className="announce-feature__card-desc">{item.desc}</p></div>
            ))}
          </div>
          <div className="announce-feature__cta">
            <div className="announce-feature__cta-card">
              <div className="announce-feature__cta-content">
                <div className="announce-feature__cta-icon"><Megaphone size={24} /></div>
                <div className="announce-feature__cta-text">
                  <h3 className="announce-feature__cta-title">Want Your Brand Featured Here?</h3>
                  <p className="announce-feature__cta-desc">Your name and message will appear on every user's chat screen. Starting at just ₱25!</p>
                </div>
              </div>
              <div className="announce-feature__cta-details">
                <div className="announce-feature__cta-features">
                  <span><Timer size={14} />1-24 Hours</span><span><Users size={14} />All Users</span><span><Zap size={14} />Instant</span>
                </div>
                <button onClick={goToBroadcast} className="announce-feature__cta-button">Get Your Broadcast<ArrowUpRight size={16} /></button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="process">
        <div className="process__inner">
          <span className="process__eyebrow">How It Works</span>
          <h2 className="process__title">Start in Seconds, Chat & Share Freely</h2>
          <div className="process__steps">
            {steps.map((item, index) => (
              <div key={index} className="process__step"><span className="process__step-number">{item.step}</span><h3 className="process__step-title">{item.title}</h3><p className="process__step-desc">{item.desc}</p></div>
            ))}
          </div>
          <div className="process__stats">
            {stats.map((stat, index) => (
              <div key={index} className="process__stat"><span className="process__stat-value">{stat.value}</span><span className="process__stat-label">{stat.label}</span></div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="about">
        <div className="about__inner">
          <div>
            <span className="about__eyebrow">Our Mission</span>
            <h2 className="about__title">Making Communication <span className="about__title-gradient">Effortless</span></h2>
            <p className="about__desc">We believe chatting should be instant and private. No barriers, no data collection, just seamless conversations. Cremyxo was built for those who value their privacy and time.</p>
          </div>
          <div className="about__values">
            {values.map((value, index) => (
              <div key={index} className="about__value"><h3 className="about__value-title">{value.title}</h3><p className="about__value-desc">{value.desc}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="cta__glow" />
        <div className="cta__inner">
          <h2 className="cta__title">Ready to Start Chatting?</h2>
          <p className="cta__subtitle">No signup. No verification. No waiting. Just click and start talking to people from around the world.</p>
          <button onClick={goToTerms} className="cta__button">Launch Chat Now</button>
          <div className="cta__teaser">
            <div className="cta__teaser-header"><Megaphone size={20} /><span>Promote Your Brand</span></div>
            <h3 className="cta__teaser-title">Get Your Broadcast Featured</h3>
            <p className="cta__teaser-desc">Your brand name and message on every chat screen. Starting at ₱25!</p>
          </div>
          <div className="cta__beta-footer">
            <Sparkles size={12} />
            <span>Cremyxo v1.0 Beta — Active Development • More Features Coming Soon</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Hero;