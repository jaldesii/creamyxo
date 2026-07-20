import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle, Sparkles, ArrowLeft } from 'lucide-react';
import socket from '../../socket';
import './Loading.scss';

const Loading = () => {
  const [dots, setDots] = useState('');
  const [messageText, setMessageText] = useState('Connecting to server...');
  const navigate = useNavigate();
  const location = useLocation();
  const username = location.state?.username || 'Anonymous';
  const hasEmitted = useRef(false);
  const hasLeft = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    console.log('🟡 Loading mounted - User:', username);
    
    // Reset emitted flag for new matching attempt
    hasEmitted.current = false;
    hasLeft.current = false;

    // Ensure clean connection
    if (!socket.connected) {
      console.log('🔌 Connecting socket...');
      socket.connect();
    } else {
      // If already connected, emit immediately
      console.log('✅ Already connected:', socket.id);
      if (!hasEmitted.current) {
        hasEmitted.current = true;
        setMessageText('Looking for a chat partner...');
        socket.emit('find-partner', { name: username });
        console.log('📤 Emitted find-partner:', username);
      }
    }

    const onConnect = () => {
      console.log('✅ Socket connected:', socket.id);
      setMessageText('Looking for a chat partner...');
      if (!hasEmitted.current) {
        hasEmitted.current = true;
        socket.emit('find-partner', { name: username });
        console.log('📤 Emitted find-partner:', username);
      }
    };

    const onWaiting = () => {
      console.log('⏳ Waiting for partner...');
      setMessageText('Waiting for someone to join...');
    };

    const onChatStart = (data) => {
      console.log('🎉 Partner found!', data);
      setMessageText('Partner found! Starting chat...');
      setTimeout(() => {
        navigate('/chat', {
          state: {
            username: data.you.name,
            roomId: data.roomId,
            partner: data.partner
          }
        });
      }, 500);
    };

    const onConnectError = (error) => {
      console.error('❌ Connection error:', error.message);
      setMessageText('Connection error. Retrying...');
      setTimeout(() => {
        if (!socket.connected) socket.connect();
      }, 2000);
    };

    const onDisconnect = (reason) => {
      console.log('❌ Disconnected:', reason);
      if (reason === 'io server disconnect' || reason === 'transport close') {
        setMessageText('Connection lost. Reconnecting...');
        setTimeout(() => socket.connect(), 1000);
      }
    };

    socket.on('connect', onConnect);
    socket.on('waiting', onWaiting);
    socket.on('chat-start', onChatStart);
    socket.on('connect_error', onConnectError);
    socket.on('disconnect', onDisconnect);

    return () => {
      console.log('🟡 Loading unmounting - cleaning listeners');
      socket.off('connect', onConnect);
      socket.off('waiting', onWaiting);
      socket.off('chat-start', onChatStart);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);
    };
  }, [navigate, username]);

  const handleBack = () => {
    console.log('⬅️ Going back to profile');
    hasEmitted.current = false;
    // Disconnect and reconnect para fresh start
    socket.disconnect();
    navigate('/create-profile');
  };

  return (
    <div className="loading">
      <nav className="loading__nav">
        <div className="loading__nav-inner">
          <button className="loading__back" onClick={handleBack}>
            <ArrowLeft size={16} />
            Change Name
          </button>
        </div>
      </nav>
      <div className="loading__blob loading__blob--1" />
      <div className="loading__blob loading__blob--2" />
      <div className="loading__blob loading__blob--3" />
      <div className="loading__content">
        <h1 className="loading__brand">Cremyxo</h1>
        <div className="loading__spinner">
          <div className="loading__ring" />
          <div className="loading__ring loading__ring--inner" />
          <div className="loading__center-icon">
            <MessageCircle size={24} />
          </div>
        </div>
        <div className="loading__status">
          <Sparkles size={14} />
          <span>{messageText}{dots}</span>
        </div>
        <div className="loading__dots">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
};

export default Loading;