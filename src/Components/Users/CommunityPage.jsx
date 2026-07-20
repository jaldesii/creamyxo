import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, MessageCircle, Users, Sparkles, Heart, Trash2, Clock, Shield, Zap, Megaphone, Check } from 'lucide-react';
import socket from '../../socket';
import './CommunityPage.scss';

const CommunityPage = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  
  const [username, setUsername] = useState(() => {
    const savedName = localStorage.getItem('cremyxo_username');
    if (savedName) return savedName;
    const randomNames = ['CoolCat', 'StarDust', 'NightOwl', 'PixelFox', 'LunarWave', 'ZenMaster', 'BluePhoenix', 'SilverWolf', 'CrystalBear', 'ThunderBird', 'NeonTiger', 'CyberPanda'];
    const randomName = randomNames[Math.floor(Math.random() * randomNames.length)] + Math.floor(Math.random() * 100);
    localStorage.setItem('cremyxo_username', randomName);
    return randomName;
  });

  const [likedPosts, setLikedPosts] = useState(() => {
    const saved = localStorage.getItem('cremyxo_liked_posts');
    return saved ? JSON.parse(saved) : [];
  });
  const postsEndRef = useRef(null);

  useEffect(() => {
    fetch('http://localhost:3001/api/community-posts')
      .then(res => res.json())
      .then(data => setPosts(data))
      .catch(err => console.error('Failed to fetch posts:', err));

    socket.on('new-community-post', (post) => {
      setPosts(prev => [post, ...prev]);
    });

    socket.on('community-post-deleted', (data) => {
      setPosts(prev => prev.filter(p => p.id !== data.id));
    });

    return () => {
      socket.off('new-community-post');
      socket.off('community-post-deleted');
    };
  }, []);

  useEffect(() => {
    postsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [posts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPost.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:3001/api/community-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, content: newPost.trim() })
      });
      const data = await response.json();
      if (data.success) {
        setNewPost('');
      }
    } catch (error) {
      console.error('Post error:', error);
    }
    setIsSubmitting(false);
  };

  const handleLike = (postId) => {
    let updatedLikes;
    if (likedPosts.includes(postId)) {
      updatedLikes = likedPosts.filter(id => id !== postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: Math.max(0, (p.likes || 0) - 1) } : p));
    } else {
      updatedLikes = [...likedPosts, postId];
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p));
    }
    setLikedPosts(updatedLikes);
    localStorage.setItem('cremyxo_liked_posts', JSON.stringify(updatedLikes));
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await fetch(`http://localhost:3001/api/community-posts/${postId}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const saveUsername = () => {
    const finalName = tempName.trim() || username;
    setUsername(finalName);
    localStorage.setItem('cremyxo_username', finalName);
    setIsEditingName(false);
  };

  const getInitials = (name) => name.charAt(0).toUpperCase();

  return (
    <div className="community-page">
      <div className="community-page__bg-blob community-page__bg-blob--top" />
      <div className="community-page__bg-blob community-page__bg-blob--bottom" />

      <div className="community-page__container">
        {/* Header */}
        <div className="community-page__header">
          <button onClick={() => navigate('/home')} className="community-page__back">
            <ArrowLeft size={20} />
          </button>
          <div className="community-page__logo">
            <div className="community-page__logo-icon">C</div>
            <span>Cremyxo Community</span>
          </div>
        </div>

        {/* Hero */}
        <div className="community-page__hero">
          <div className="community-page__hero-icon">
            <Users size={28} />
          </div>
          <span className="community-page__eyebrow">
            <Sparkles size={14} /> Community Wall
          </span>
          <h1 className="community-page__title">Share Your Thoughts</h1>
          <p className="community-page__subtitle">
            Post messages, share experiences, and connect with the Cremyxo community. Be respectful and have fun!
          </p>
        </div>

        {/* Post Input */}
        <div className="community-page__post-box">
          <div className="community-page__post-box-header">
            <div className="community-page__post-avatar">{getInitials(username)}</div>
            <div className="community-page__post-user-info">
              <span className="community-page__post-label">Posting as</span>
              {isEditingName ? (
                <div className="community-page__name-edit">
                  <input 
                    type="text" 
                    value={tempName} 
                    onChange={(e) => setTempName(e.target.value)}
                    maxLength={15}
                    className="community-page__name-input"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveUsername();
                    }}
                    placeholder="Your nickname"
                  />
                  <button className="community-page__name-save" onClick={saveUsername}>
                    <Check size={14} />
                  </button>
                </div>
              ) : (
                <span 
                  className="community-page__username-display"
                  onClick={() => { setTempName(username); setIsEditingName(true); }}
                >
                  {username} <span className="community-page__edit-icon">✎</span>
                </span>
              )}
            </div>
          </div>
          <form onSubmit={handleSubmit} className="community-page__post-form">
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="What's on your mind? Share something with the community..."
              className="community-page__post-input"
              rows={3}
              maxLength={500}
            />
            <div className="community-page__post-actions">
              <span className="community-page__post-count">{newPost.length}/500</span>
              <button type="submit" className="community-page__post-btn" disabled={!newPost.trim() || isSubmitting}>
                <Send size={16} />
                {isSubmitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        </div>

        {/* Posts Feed */}
        <div className="community-page__feed">
          <h2 className="community-page__feed-title">
            <MessageCircle size={18} />
            Community Posts ({posts.length})
          </h2>

          {posts.length === 0 ? (
            <div className="community-page__empty">
              <MessageCircle size={40} />
              <h3>No posts yet</h3>
              <p>Be the first one to share something!</p>
            </div>
          ) : (
            <div className="community-page__posts">
              {posts.map((post) => (
                <div key={post.id} className="community-page__post-card">
                  <div className="community-page__post-card-header">
                    <div className="community-page__post-card-user">
                      <div className="community-page__post-card-avatar">{getInitials(post.username)}</div>
                      <div>
                        <span className="community-page__post-card-name">{post.username}</span>
                        <span className="community-page__post-card-time">
                          <Clock size={10} />
                          {post.timestamp}
                        </span>
                      </div>
                    </div>
                    <button
                      className="community-page__post-delete"
                      onClick={() => handleDelete(post.id)}
                      title="Delete post"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="community-page__post-card-content">{post.content}</p>
                  <div className="community-page__post-card-footer">
                    <button
                      className={`community-page__like-btn ${likedPosts.includes(post.id) ? 'community-page__like-btn--active' : ''}`}
                      onClick={() => handleLike(post.id)}
                    >
                      <Heart size={14} fill={likedPosts.includes(post.id) ? '#ff2d55' : 'none'} />
                      <span>{post.likes || 0}</span>
                    </button>
                  </div>
                </div>
              ))}
              <div ref={postsEndRef} />
            </div>
          )}
        </div>

        {/* Features */}
        <div className="community-page__features">
          <div className="community-page__feature">
            <Shield size={18} />
            <span>Moderated</span>
          </div>
          <div className="community-page__feature">
            <Zap size={18} />
            <span>Real-time</span>
          </div>
          <div className="community-page__feature">
            <Users size={18} />
            <span>Community</span>
          </div>
          <div className="community-page__feature">
            <Megaphone size={18} />
            <span>Free Speech</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityPage;