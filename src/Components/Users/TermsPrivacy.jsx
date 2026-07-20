import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ArrowRight } from 'lucide-react';
import './TermsPrivacy.scss';

const TermsPrivacy = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => { setIsScrolled(window.scrollY > 20); };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const allChecked = termsChecked && privacyChecked;
const goToChat = () => { if (allChecked) navigate('/create-profile'); };

  const termsSections = [
    { number: "1", title: "About Cremyxo", content: "Cremyxo is an anonymous online chat platform that allows users to communicate without creating an account. Our goal is to provide a simple, fast, and privacy-focused communication experience." },
    { number: "2", title: "User Eligibility", content: "By using Cremyxo, you confirm that you are at least 13 years old and will use the platform responsibly in accordance with applicable laws." },
    { number: "3", title: "Acceptable Use", content: "You agree not to harass, threaten, spam, share illegal content, distribute malware, hack, impersonate others, or engage in scams, phishing, or fraud. Failure to comply may result in restricted access." },
    { number: "4", title: "Personal Information", content: "Users may voluntarily share contact information at their own discretion. We strongly recommend not sharing passwords, OTPs, bank details, government IDs, or financial information. Cremyxo is not liable for information voluntarily shared between users." },
    { number: "5", title: "Service Availability", content: "We strive to provide reliable service but do not guarantee uninterrupted availability. Features may be modified, updated, or discontinued without prior notice." },
    { number: "6", title: "Limitation of Liability", content: "Cremyxo is provided on an \"as is\" basis. We shall not be liable for any damages resulting from the use or inability to use the platform." },
  ];

  const privacySections = [
    { number: "1", title: "Information We Collect", content: "We may collect limited information including IP address, browser type, device information, operating system, access timestamps, usage statistics, and technical logs. We do not require account registration." },
    { number: "2", title: "Messages & Conversations", content: "We do not intentionally monitor private conversations. Temporary message processing may occur for delivery purposes. Chat data is processed only as long as necessary." },
    { number: "3", title: "How We Use Information", content: "Information is used to operate and maintain the website, improve performance, detect abuse and fraud, protect users, diagnose technical issues, and comply with legal obligations." },
    { number: "4", title: "Cookies", content: "We may use cookies to remember preferences, improve performance, analyze usage, and enhance user experience. You can disable cookies through browser settings." },
    { number: "5", title: "Sharing of Information", content: "We do not sell or rent your personal information. Information may only be disclosed when required by law, to protect user safety, investigate abuse, or protect Cremyxo's rights." },
    { number: "6", title: "User Responsibility", content: "Users are responsible for information they choose to share. We strongly recommend not disclosing passwords, banking info, OTPs, government IDs, or confidential personal information." },
  ];

  return (
    <div className="terms-privacy">
      {/* Navigation */}
      <nav className={`terms-privacy__nav ${isScrolled ? 'terms-privacy__nav--scrolled' : ''}`}>
        <div className="terms-privacy__nav-inner">
          <a href="/" className="terms-privacy__back"><ArrowLeft size={16} />Back to Home</a>
          <span className="terms-privacy__logo-text">Cremyxo</span>
        </div>
      </nav>

      {/* Header */}
      <div className="terms-privacy__header">
        <span className="terms-privacy__eyebrow">Legal</span>
        <h1 className="terms-privacy__title">Terms & Privacy</h1>
        <p className="terms-privacy__date">Last Updated: July 19, 2026</p>
        <p className="terms-privacy__intro">Please review our Terms & Conditions and Privacy Policy before chatting.</p>
      </div>

      {/* Full Page Two Column */}
      <div className="terms-privacy__columns">
        {/* Terms - Left */}
        <div className="terms-privacy__side">
          <h2 className="terms-privacy__side-title">Terms & Conditions</h2>
          {termsSections.map((section, index) => (
            <div key={index} className="terms-privacy__block">
              <h3><span>{section.number}.</span> {section.title}</h3>
              <p>{section.content}</p>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="terms-privacy__divider" />

        {/* Privacy - Right */}
        <div className="terms-privacy__side">
          <h2 className="terms-privacy__side-title">Privacy Policy</h2>
          {privacySections.map((section, index) => (
            <div key={index} className="terms-privacy__block">
              <h3><span>{section.number}.</span> {section.title}</h3>
              <p>{section.content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="terms-privacy__bottom">
        <div className="terms-privacy__bottom-inner">
          <div className="terms-privacy__checkboxes">
            <label className={`terms-privacy__checkbox ${termsChecked ? 'terms-privacy__checkbox--checked' : ''}`} onClick={() => setTermsChecked(!termsChecked)}>
              <div className="terms-privacy__checkbox-box">{termsChecked && <Check size={14} />}</div>
              <span>I agree to <strong>Terms & Conditions</strong></span>
            </label>
            <label className={`terms-privacy__checkbox ${privacyChecked ? 'terms-privacy__checkbox--checked' : ''}`} onClick={() => setPrivacyChecked(!privacyChecked)}>
              <div className="terms-privacy__checkbox-box">{privacyChecked && <Check size={14} />}</div>
              <span>I agree to <strong>Privacy Policy</strong></span>
            </label>
          </div>
          <button onClick={goToChat} className={`terms-privacy__button ${allChecked ? 'terms-privacy__button--active' : ''}`} disabled={!allChecked}>
            Start Chatting <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsPrivacy;