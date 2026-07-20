import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Shield, Zap, Users, ArrowRight } from 'lucide-react';
import Hero from './Hero';
import './IntroSplash.scss';

const SLIDE_DURATION = 3200;

const slides = [
  {
    eyebrow: 'STEP 01 / WELCOME',
    title: 'Cremyxo',
    subtitle: 'Anonymous chat, reloaded',
    description: 'Talk to strangers instantly \u2014 no account, no history, no trace left behind.',
    accent: 'blue',
    icon: MessageCircle,
  },
  {
    eyebrow: 'STEP 02 / PRIVACY',
    title: 'Zero Logs',
    subtitle: 'Your business stays yours',
    description: 'Nothing is stored. Nothing is tracked. Every chat disappears the second it ends.',
    accent: 'acid',
    icon: Shield,
  },
  {
    eyebrow: 'STEP 03 / SPEED',
    title: 'Instant. Always.',
    subtitle: 'Zero waiting, zero setup',
    description: 'No signups, no passwords, no email. Pick a name, hit start, you\u2019re in.',
    accent: 'orange',
    icon: Zap,
  },
  {
    eyebrow: 'STEP 04 / PEOPLE',
    title: 'Meet Anyone',
    subtitle: 'The whole world is online',
    description: 'Real people, real conversations, from every corner of the planet.',
    accent: 'pink',
    icon: Users,
  },
];

const IntroSplash = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();
  const timerRef = useRef(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => {
        if (prev >= slides.length - 1) {
          clearInterval(timerRef.current);
          handleFinish();
          return prev;
        }
        return prev + 1;
      });
    }, SLIDE_DURATION);

    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  const handleFinish = () => {
    setIsExiting(true);
    setTimeout(() => {
      navigate('/home');
    }, 700);
  };

  const handleSkip = () => {
    clearInterval(timerRef.current);
    handleFinish();
  };

  const goToSlide = (index) => {
    clearInterval(timerRef.current);
    setCurrentSlide(index);
  };

  const active = slides[currentSlide];

  return (
    <div className={`intro ${isVisible ? 'intro--visible' : ''} ${isExiting ? 'intro--exit' : ''}`}>
      <div className="intro__background">
        <Hero />
      </div>
      <div className="intro__overlay" />

      <div className="intro__modal" data-accent={active.accent}>
        <div className="intro__ghost" key={`ghost-${currentSlide}`}>
          {String(currentSlide + 1).padStart(2, '0')}
        </div>

        <div className="intro__topbar">
          <span className="intro__eyebrow">{active.eyebrow}</span>
          <button className="intro__skip" onClick={handleSkip}>
            SKIP
          </button>
        </div>

        <div className="intro__progress">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`intro__progress-segment ${
                index <= currentSlide ? 'intro__progress-segment--filled' : ''
              }`}
            />
          ))}
        </div>

        <div className="intro__slides">
          {slides.map((slide, index) => {
            const Icon = slide.icon;
            return (
              <div
                key={index}
                className={`intro__slide ${index === currentSlide ? 'intro__slide--active' : ''} ${
                  index < currentSlide ? 'intro__slide--past' : ''
                }`}
              >
                <div className="intro__slide-inner">
                  <div className="intro__icon-block">
                    <Icon size={30} strokeWidth={2.25} />
                  </div>
                  <h2 className="intro__title">{slide.title}</h2>
                  <p className="intro__subtitle">{slide.subtitle}</p>
                  <p className="intro__desc">{slide.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="intro__footer">
          <div className="intro__steps">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`intro__step ${index === currentSlide ? 'intro__step--active' : ''}`}
                onClick={() => goToSlide(index)}
              >
                {String(index + 1).padStart(2, '0')}
              </button>
            ))}
          </div>

          <button className="intro__cta" onClick={handleSkip}>
            Start Chatting
            <ArrowRight size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntroSplash;