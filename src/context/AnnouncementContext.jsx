// src/context/AnnouncementContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import socket from '../socket';

const AnnouncementContext = createContext();

export const useAnnouncement = () => useContext(AnnouncementContext);

export const AnnouncementProvider = ({ children }) => {
  const [announcement, setAnnouncement] = useState(null);
  const [announceCountdown, setAnnounceCountdown] = useState(null);
  const countdownRef = useRef(null);
  const dismissTimerRef = useRef(null);

  useEffect(() => {
    socket.on('announcement', (data) => {
      // Clear previous timers
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);

      const announcementData = {
        id: data.id,
        message: data.message,
        type: data.type || 'info',
        from: data.from || 'Cremyxo Admin', // ← ADDED
        time: data.time,
        duration: data.duration || 300,
      };

      setAnnouncement(announcementData);

      const remainingDuration = data.remaining || data.duration;

      if (remainingDuration > 0) {
        setAnnounceCountdown(remainingDuration);
        
        // Countdown timer
        countdownRef.current = setInterval(() => {
          setAnnounceCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownRef.current);
              return null;
            }
            return prev - 1;
          });
        }, 1000);

        // Dismiss timer
        dismissTimerRef.current = setTimeout(() => {
          setAnnouncement(null);
          setAnnounceCountdown(null);
        }, remainingDuration * 1000);
      } else if (remainingDuration === 0) {
        // Permanent
        setAnnounceCountdown(null);
      }
    });

    socket.on('announcement-dismiss', (data) => {
      // If clear-all, dismiss everything
      if (data.id === 'clear-all') {
        setAnnouncement(null);
        setAnnounceCountdown(null);
        if (countdownRef.current) clearInterval(countdownRef.current);
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        return;
      }
      
      setAnnouncement(prev => prev?.id === data.id ? null : prev);
      setAnnounceCountdown(null);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    });

    return () => {
      socket.off('announcement');
      socket.off('announcement-dismiss');
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  const hideAnnouncement = () => {
    setAnnouncement(null);
    setAnnounceCountdown(null);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
  };

  const value = {
    announcement,
    announceCountdown,
    hideAnnouncement,
  };

  return (
    <AnnouncementContext.Provider value={value}>
      {children}
    </AnnouncementContext.Provider>
  );
};