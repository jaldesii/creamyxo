import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Megaphone, Timer, Users, Zap, Check, Send, Shield, MessageSquare, AlertTriangle, Info, AlertOctagon, CheckCircle, ExternalLink, Sparkles, Lock, MessageCircle } from 'lucide-react';
import gcashQR from '../../assets/gcash.jpg';
import './BroadcastPage.scss';

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001'
  : `http://${window.location.hostname}:3001`;

const BroadcastPage = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', message: '', duration: '3600', type: 'info', selectedPackage: '1hour' });
  
  const [honeypot, setHoneypot] = useState('');
  const [formLoadTime] = useState(Date.now());
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState({ num1: 0, num2: 0, operator: '+' });
  const [showCaptcha, setShowCaptcha] = useState(false);
  const submitAttemptsRef = useRef(0);
  const lastSubmitTimeRef = useRef(0);

  const facebookPageUrl = "https://www.facebook.com/profile.php?id=61591957418044";
  const gcashNumber = "09813346482";
  const gcashName = "Justin Miguel Alde";

  useEffect(() => { generateCaptcha(); }, []);

  const generateCaptcha = () => {
    const operators = ['+', '-', '*'];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    let num1, num2;
    if (operator === '*') { num1 = Math.floor(Math.random() * 10) + 1; num2 = Math.floor(Math.random() * 5) + 1; }
    else if (operator === '-') { num1 = Math.floor(Math.random() * 20) + 10; num2 = Math.floor(Math.random() * 10) + 1; }
    else { num1 = Math.floor(Math.random() * 20) + 1; num2 = Math.floor(Math.random() * 20) + 1; }
    setCaptchaQuestion({ num1, num2, operator });
    setCaptchaAnswer('');
  };

  const getCaptchaResult = () => {
    const { num1, num2, operator } = captchaQuestion;
    switch (operator) {
      case '+': return num1 + num2;
      case '-': return num1 - num2;
      case '*': return num1 * num2;
      default: return num1 + num2;
    }
  };

  const checkRateLimit = () => {
    const now = Date.now();
    const timeSinceLastSubmit = now - lastSubmitTimeRef.current;
    if (submitAttemptsRef.current >= 3 && timeSinceLastSubmit < 60000) {
      setIsBlocked(true);
      setTimeout(() => { setIsBlocked(false); submitAttemptsRef.current = 0; }, 120000);
      return false;
    }
    const timeToFill = now - formLoadTime;
    if (timeToFill < 3000 && submitAttemptsRef.current === 0) { setShowCaptcha(true); return false; }
    return true;
  };

  const packages = [
    { id: '1hour', duration: "1 Hour", value: 3600, price: "₱25", features: ["Custom message", "Info/Warning/Success/Alert types", "1 hour visibility", "All users reach"] },
    { id: '6hours', duration: "6 Hours", value: 21600, price: "₱99", popular: true, features: ["Custom message", "All announcement types", "6 hours visibility", "All users reach", "Priority placement"] },
    { id: '24hours', duration: "24 Hours", value: 86400, price: "₱199", features: ["Custom message", "All announcement types", "24 hours visibility", "All users reach", "Priority placement", "Dedicated support"] }
  ];

  const announcementTypes = [
    { value: 'info', label: 'Info', icon: <Info size={16} />, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
    { value: 'warning', label: 'Warning', icon: <AlertTriangle size={16} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { value: 'success', label: 'Success', icon: <CheckCircle size={16} />, color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    { value: 'error', label: 'Alert', icon: <AlertOctagon size={16} />, color: '#ff2d55', bg: 'rgba(255,45,85,0.1)' },
  ];

  const handleInputChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
  const handlePackageSelect = (pkg) => { setFormData(prev => ({ ...prev, duration: pkg.value.toString(), selectedPackage: pkg.id })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (honeypot) { console.log('Bot detected via honeypot'); return; }
    if (!checkRateLimit()) {
      if (isBlocked) { alert('🚫 Too many attempts. Please wait 2 minutes.'); return; }
      if (showCaptcha) { alert('⚠️ Please solve the math captcha.'); return; }
    }
    if (showCaptcha) {
      if (parseInt(captchaAnswer) !== getCaptchaResult()) {
        setFailedAttempts(prev => prev + 1);
        generateCaptcha();
        if (failedAttempts >= 2) {
          setIsBlocked(true);
          setTimeout(() => { setIsBlocked(false); setFailedAttempts(0); setShowCaptcha(false); }, 300000);
          alert('🚫 Blocked for 5 minutes.');
          return;
        }
        alert('❌ Incorrect answer.');
        return;
      }
    }
    const spamPatterns = [/http[s]?:\/\//gi, /<script/gi, /\b(buy now|click here|free money|casino|viagra|cialis|loan|lottery|winner)\b/gi, /[<>{}]/g];
    const hasSpam = spamPatterns.some(pattern => pattern.test(formData.name + ' ' + formData.message));
    if (hasSpam) { alert('⚠️ Prohibited content detected.'); return; }
    if (formData.message.length < 10) { alert('⚠️ Message must be at least 10 characters.'); return; }
    if (formData.name.length < 2) { alert('⚠️ Name must be at least 2 characters.'); return; }
    
    submitAttemptsRef.current++;
    lastSubmitTimeRef.current = Date.now();
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/broadcast-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, contact: 'Facebook Page', securityToken: Date.now().toString(36), userAgent: navigator.userAgent.substring(0, 100) })
      });
      const data = await response.json();
      if (data.success) { setSubmitted(true); setShowCaptcha(false); setFailedAttempts(0); }
      else { alert('Failed to submit. Please try again.'); }
    } catch (error) { console.error('Submit error:', error); alert('Error submitting request.'); }
    setIsSubmitting(false);
  };

  const selectedPkg = packages.find(p => p.value === parseInt(formData.duration));
  const selectedType = announcementTypes.find(t => t.value === formData.type);

  if (isBlocked) {
    return (
      <div className="broadcast-page">
        <div className="broadcast-page__container" style={{ textAlign: 'center', paddingTop: '100px' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚫</div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#ff2d55', marginBottom: '12px' }}>Access Temporarily Blocked</h1>
          <p style={{ color: '#94a3b8', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>Too many suspicious activities detected. Please wait a few minutes before trying again.</p>
          <button onClick={() => navigate('/home')} className="broadcast-page__back" style={{ justifyContent: 'center', padding: '12px 24px' }}><ArrowLeft size={20} /> Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="broadcast-page">
      <div className="broadcast-page__bg-blob broadcast-page__bg-blob--top" />
      <div className="broadcast-page__bg-blob broadcast-page__bg-blob--bottom" />
      <div className="broadcast-page__container">
        <div className="broadcast-page__header">
          <button onClick={() => navigate('/home')} className="broadcast-page__back"><ArrowLeft size={20} /></button>
          <div className="broadcast-page__logo"><div className="broadcast-page__logo-icon">C</div><span>Cremyxo Broadcast</span></div>
        </div>
        
        <div className="broadcast-page__security-badge"><Shield size={14} /><span>Secured by Cremyxo Anti-Spam Protection</span></div>
        
        <div className="broadcast-page__hero">
          <div className="broadcast-page__hero-icon"><Megaphone size={28} /></div>
          <span className="broadcast-page__eyebrow"><Sparkles size={14} /> Premium Feature</span>
          <h1 className="broadcast-page__title">Broadcast Your Message</h1>
          <p className="broadcast-page__subtitle">Reach all Cremyxo users instantly! Submit your request and message us on Facebook to get approved.</p>
        </div>

        <div className="broadcast-page__form-section">
          <h2 className="broadcast-page__section-title"><MessageSquare size={20} />Submit Your Broadcast Request</h2>
          
          {submitted ? (
            <div className="broadcast-page__success-card">
              <div className="broadcast-page__success-icon"><CheckCircle size={48} /></div>
              <h3>Request Submitted! 🎉</h3>
              <p>Complete your payment and send proof to our Facebook page to get approved!</p>
              
              <div className="broadcast-page__post-submit">
                <div className="broadcast-page__post-step">
                  <div className="broadcast-page__post-step-num">1</div>
                  <div className="broadcast-page__post-step-body">
                    <h4>Message us on Facebook</h4>
                    <p>Send us a message with your <strong>Brand Name</strong> and chosen <strong>Package ({selectedPkg?.price})</strong></p>
                    <a href={facebookPageUrl} target="_blank" rel="noopener noreferrer" className="broadcast-page__fb-btn">
                      <MessageCircle size={18} /> Message on Facebook <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
                <div className="broadcast-page__post-step">
                  <div className="broadcast-page__post-step-num">2</div>
                  <div className="broadcast-page__post-step-body">
                    <h4>Complete Payment via GCash</h4>
                    <p>Scan the QR code or send <strong>{selectedPkg?.price}</strong> to:</p>
                    <div className="broadcast-page__gcash-section">
                      <div className="broadcast-page__gcash-qr">
                        <img src={gcashQR} alt="GCash QR Code" />
                      </div>
                      <div className="broadcast-page__gcash-details">
                        <div className="broadcast-page__gcash-row"><span>Number:</span><strong>{gcashNumber}</strong></div>
                        <div className="broadcast-page__gcash-row"><span>Name:</span><strong>{gcashName}</strong></div>
                        <p className="broadcast-page__gcash-note">Send screenshot of payment to our Facebook page for verification.</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="broadcast-page__post-step">
                  <div className="broadcast-page__post-step-num">3</div>
                  <div className="broadcast-page__post-step-body">
                    <h4>Go Live! 🚀</h4>
                    <p>Once verified, your announcement will be broadcast to all Cremyxo users!</p>
                  </div>
                </div>
              </div>
              
              <button onClick={() => { setSubmitted(false); setFormData({ name: '', message: '', duration: '3600', type: 'info', selectedPackage: '1hour' }); generateCaptcha(); }} className="broadcast-page__submit-btn">Submit Another Request</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="broadcast-page__form">
              <div style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }} aria-hidden="true">
                <input type="text" name="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
              </div>
              
              <div className="broadcast-page__form-group">
                <label className="broadcast-page__form-label">Your Name / Brand</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g. Juan's Store, TechGear PH" className="broadcast-page__form-input" required maxLength={50} minLength={2} />
              </div>
              <div className="broadcast-page__form-group">
                <label className="broadcast-page__form-label">Broadcast Message <span className="broadcast-page__form-count">{formData.message.length}/500</span></label>
                <textarea name="message" value={formData.message} onChange={handleInputChange} placeholder="Type your announcement message here..." className="broadcast-page__form-textarea" rows={4} maxLength={500} required minLength={10} />
              </div>
              <div className="broadcast-page__form-group">
                <label className="broadcast-page__form-label">Select Package</label>
                <div className="broadcast-page__package-select">
                  {packages.map((pkg) => (
                    <div key={pkg.id} className={`broadcast-page__package-option ${formData.selectedPackage === pkg.id ? 'broadcast-page__package-option--active' : ''} ${pkg.popular ? 'broadcast-page__package-option--popular' : ''}`} onClick={() => handlePackageSelect(pkg)}>
                      {pkg.popular && <span className="broadcast-page__package-option-badge">Best Value</span>}
                      <div className="broadcast-page__package-option-duration">{pkg.duration}</div>
                      <div className="broadcast-page__package-option-price">{pkg.price}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="broadcast-page__form-group">
                <label className="broadcast-page__form-label">Announcement Type</label>
                <div className="broadcast-page__type-select">
                  {announcementTypes.map((type) => (
                    <button key={type.value} type="button" className={`broadcast-page__type-option ${formData.type === type.value ? 'broadcast-page__type-option--active' : ''}`} onClick={() => setFormData(prev => ({ ...prev, type: type.value }))} style={formData.type === type.value ? { background: type.bg, borderColor: type.color, color: type.color } : {}}>{type.icon} {type.label}</button>
                  ))}
                </div>
              </div>
              
              {showCaptcha && (
                <div className="broadcast-page__captcha">
                  <div className="broadcast-page__captcha-header"><Lock size={16} /><span>Verify you are human</span></div>
                  <div className="broadcast-page__captcha-body">
                    <span className="broadcast-page__captcha-question">What is {captchaQuestion.num1} {captchaQuestion.operator === '*' ? '×' : captchaQuestion.operator} {captchaQuestion.num2}?</span>
                    <input type="number" value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value)} placeholder="Enter answer" className="broadcast-page__captcha-input" required />
                    <button type="button" onClick={generateCaptcha} className="broadcast-page__captcha-refresh">↻ New question</button>
                  </div>
                </div>
              )}
              
              {formData.message && (
                <div className="broadcast-page__preview">
                  <span className="broadcast-page__preview-label">Preview</span>
                  <div className="broadcast-page__preview-card" style={{ borderColor: selectedType?.color || '#6366f1' }}>
                    <div className="broadcast-page__preview-card-left">
                      <div className="broadcast-page__preview-card-icon" style={{ background: selectedType?.color || '#6366f1' }}><Megaphone size={14} color="#fff" /></div>
                      <div>
                        <span className="broadcast-page__preview-card-type" style={{ color: selectedType?.color || '#6366f1' }}>{formData.name || 'Your Brand'}</span>
                        <p className="broadcast-page__preview-card-text">{formData.message}</p>
                      </div>
                    </div>
                    <div className="broadcast-page__preview-card-timer"><Timer size={12} />{selectedPkg?.duration || '?'}</div>
                  </div>
                </div>
              )}
              <button type="submit" className="broadcast-page__submit-btn" disabled={isSubmitting || isBlocked}>
                <Send size={16} />{isSubmitting ? 'Submitting...' : 'Submit Broadcast Request'}
              </button>
            </form>
          )}
        </div>

        <div className="broadcast-page__packages">
          <h2 className="broadcast-page__section-title">Package Details</h2>
          <div className="broadcast-page__packages-grid">
            {packages.map((pkg, index) => (
              <div key={index} className={`broadcast-page__package ${pkg.popular ? 'broadcast-page__package--popular' : ''}`}>
                {pkg.popular && <span className="broadcast-page__package-badge">Most Popular</span>}
                <h3 className="broadcast-page__package-duration">{pkg.duration}</h3>
                <div className="broadcast-page__package-price">{pkg.price}</div>
                <ul className="broadcast-page__package-features">{pkg.features.map((f, i) => (<li key={i}><Check size={14} /> {f}</li>))}</ul>
              </div>
            ))}
          </div>
        </div>
        
        <div className="broadcast-page__features">
          {[{icon:<Timer size={20}/>,label:'Custom Duration'},{icon:<Users size={20}/>,label:'All Users Reach'},{icon:<Zap size={20}/>,label:'Instant Delivery'},{icon:<Shield size={20}/>,label:'Secure Payment'}].map((f,i)=>(<div key={i} className="broadcast-page__feature">{f.icon}<span>{f.label}</span></div>))}
        </div>
      </div>
    </div>
  );
};

export default BroadcastPage;