import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MessageCircle, StickyNote, Phone, Clock, Sparkles, Zap } from 'lucide-react';
import './SelectMode.scss';

const SelectMode = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const username = location.state?.username || 'User';

  const handleModeSelect = (mode) => {
    if (mode === '1v1') {
      navigate('/loading', { state: { username } });
    } else if (mode === 'freedom-wall') {
      navigate('/freedom-wall', { state: { username } });
    }
  };

  // Back button goes to CreateProfile
  const handleBack = () => {
    navigate('/create-profile', { state: { username } });
  };

  return (
    <div className="select-mode">
      {/* Navigation */}
      <nav className="select-mode__nav">
        <div className="select-mode__nav-inner">
          <button onClick={handleBack} className="select-mode__back">
            <ArrowLeft size={16} />
            Back
          </button>
          <span className="select-mode__logo-text">Cremyxo</span>
        </div>
      </nav>

      {/* Content */}
      <div className="select-mode__content">
        <div className="select-mode__greeting">
          <Sparkles size={18} />
          <span>Welcome, <strong>{username}</strong></span>
        </div>

        <h1 className="select-mode__title">
          Choose Your{' '}
          <span className="select-mode__title-gradient">Mode</span>
        </h1>

        <p className="select-mode__subtitle">
          Select how you want to connect with others
        </p>

        {/* Mode Cards */}
        <div className="select-mode__cards">
          {/* 1v1 Chat Card */}
          <button 
            onClick={() => handleModeSelect('1v1')}
            className="select-mode__card select-mode__card--chat"
          >
            <div className="select-mode__card-glow"></div>
            <div className="select-mode__card-icon">
              <MessageCircle size={28} />
            </div>
            <div className="select-mode__card-content">
              <h2 className="select-mode__card-title">
                1v1 Chat
                <Zap size={16} className="select-mode__card-badge" />
              </h2>
              <p className="select-mode__card-desc">
                Private one-on-one conversations with random people
              </p>
            </div>
            <div className="select-mode__card-arrow">→</div>
          </button>

          {/* Freedom Wall Card */}
          <button 
            onClick={() => handleModeSelect('freedom-wall')}
            className="select-mode__card select-mode__card--wall"
          >
            <div className="select-mode__card-glow"></div>
            <div className="select-mode__card-icon">
              <StickyNote size={28} />
            </div>
            <div className="select-mode__card-content">
              <h2 className="select-mode__card-title">
                Freedom Wall
                <Zap size={16} className="select-mode__card-badge" />
              </h2>
              <p className="select-mode__card-desc">
                Share thoughts, photos, and voice messages on the community board
              </p>
            </div>
            <div className="select-mode__card-arrow">→</div>
          </button>

          {/* 1v1 Call - Coming Soon */}
          <div className="select-mode__card select-mode__card--call select-mode__card--disabled">
            <div className="select-mode__card-glow"></div>
            <div className="select-mode__card-icon">
              <Phone size={28} />
            </div>
            <div className="select-mode__card-content">
              <h2 className="select-mode__card-title">
                1v1 Call
                <span className="select-mode__card-coming-soon">
                  <Clock size={14} />
                  Coming Soon
                </span>
              </h2>
              <p className="select-mode__card-desc">
                Real-time voice calls with random people
              </p>
            </div>
            <div className="select-mode__card-arrow select-mode__card-arrow--locked">🔒</div>
          </div>
        </div>

        <p className="select-mode__hint">
          You can switch modes anytime by going back
        </p>
      </div>
    </div>
  );
};

export default SelectMode;