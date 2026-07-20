import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Send, MessageSquare, User, Trash2, Heart, Clock, Sparkles, MoreVertical, X, Mic, Play, Pause, Square, Camera, Plus, ChevronLeft, ChevronRight, Image, Eye, History, Hash, Calendar, MessageCircle } from 'lucide-react';
import { io } from 'socket.io-client';
import './FreedomWall.scss';

// =============================================
// FIXED: API CONFIGURATION - Works on both localhost and production
// =============================================
// =============================================
// API CONFIGURATION - Fixed for mobile
// =============================================
const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

let socket;
try {
  socket = io(API_URL, { 
    transports: ['websocket', 'polling'],
    path: '/socket.io/',
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });
} catch (err) { 
  console.warn('Socket connection failed, using HTTP only'); 
}

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
    /\b(fuck|shit|bitch|asshole|bastard|dick|pussy|cunt|whore|slut|putang|tangina|gago|bobo|tanga|tarantado|punyeta|lintik|ulol|leche|buwisit|hudas|siraulo|kingina|pakyu|hampaslupa)\b/gi,
    /(https?:\/\/[^\s]+)/gi,
    /(\b\d{10,}\b)/g,
  ];
  return spamPatterns.some(pattern => pattern.test(text));
};

const FreedomWall = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const username = location.state?.username || 'Anonymous';
  
  const [message, setMessage] = useState('');
  const [posts, setPosts] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [stories, setStories] = useState([]);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [storyImage, setStoryImage] = useState(null);
  const [storyPreview, setStoryPreview] = useState(null);
  const [storyCaption, setStoryCaption] = useState('');
  const [viewingStory, setViewingStory] = useState(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [viewedStories, setViewedStories] = useState(new Set());
  const [galleryPost, setGalleryPost] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [profileUser, setProfileUser] = useState(null);
  const [profilePosts, setProfilePosts] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [expandedComments, setExpandedComments] = useState(new Set());
  const [commentTexts, setCommentTexts] = useState({});
  const [comments, setComments] = useState({});
  const [showDeleteCommentModal, setShowDeleteCommentModal] = useState(null);
  
  // Security states
  const [submitCooldown, setSubmitCooldown] = useState(false);
  const lastPostTimeRef = useRef(0);
  const postCountRef = useRef(0);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const storyFileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(new Audio());
  const storyTimerRef = useRef(null);

  useEffect(() => {
    fetchPosts(); 
    fetchStories();
    
    if (socket) {
      socket.on('freedom-wall-init', (data) => { 
        setPosts(data.posts || []); 
        updateLikedFromServer(data.posts || []); 
        setIsLoading(false); 
      });
      socket.on('freedom-wall-new-post', (newPost) => { 
        setPosts(prev => { 
          if (prev.find(p => p.id === newPost.id)) return prev; 
          return [newPost, ...prev]; 
        }); 
      });
      socket.on('freedom-wall-post-updated', (data) => { 
        setPosts(prev => prev.map(post => 
          post.id === data.id ? { ...post, likes: data.likes, likedBy: data.likedBy } : post
        )); 
      });
      socket.on('freedom-wall-post-deleted', (data) => { 
        setPosts(prev => prev.filter(post => post.id !== data.id)); 
        setShowDeleteModal(null); 
      });
      socket.on('freedom-wall-cleared', () => setPosts([]));
      socket.on('freedom-wall-new-story', (newStory) => { 
        setStories(prev => [newStory, ...prev.filter(s => s.id !== newStory.id)]); 
      });
      socket.on('freedom-wall-story-deleted', (data) => { 
        setStories(prev => prev.filter(s => s.id !== data.id)); 
      });
      socket.on('freedom-wall-new-comment', ({ postId, comment }) => {
        setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), comment] }));
        setPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p
        ));
      });
      socket.on('freedom-wall-comment-deleted', ({ postId, commentId }) => {
        setComments(prev => ({ ...prev, [postId]: (prev[postId] || []).filter(c => c.id !== commentId) }));
        setPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, commentCount: Math.max(0, (p.commentCount || 0) - 1) } : p
        ));
      });
    }
    
    return () => {
      if (socket) { 
        socket.off('freedom-wall-init'); 
        socket.off('freedom-wall-new-post'); 
        socket.off('freedom-wall-post-updated'); 
        socket.off('freedom-wall-post-deleted'); 
        socket.off('freedom-wall-cleared'); 
        socket.off('freedom-wall-new-story'); 
        socket.off('freedom-wall-story-deleted'); 
        socket.off('freedom-wall-new-comment'); 
        socket.off('freedom-wall-comment-deleted'); 
      }
      if (audioRef.current) { 
        audioRef.current.pause(); 
        audioRef.current.src = ''; 
      }
      if (storyTimerRef.current) clearInterval(storyTimerRef.current);
    };
  }, []);

  const fetchStories = async () => { 
    try { 
      const res = await fetch(`${API_URL}/api/freedom-wall/stories`); 
      const data = await res.json(); 
      if (data.success) setStories(data.stories || []); 
    } catch (err) { 
      console.error('Error fetching stories:', err); 
    } 
  };
  
  const updateLikedFromServer = (serverPosts) => { 
    const liked = new Set(); 
    (serverPosts || []).forEach(post => { 
      if (post.likedBy && post.likedBy.includes(username)) liked.add(post.id); 
    }); 
    setLikedPosts(liked); 
  };
  
  const fetchPosts = async () => { 
    try { 
      const response = await fetch(`${API_URL}/api/freedom-wall/posts`); 
      const data = await response.json(); 
      if (data.success) { 
        setPosts(data.posts || []); 
        updateLikedFromServer(data.posts || []); 
      } 
    } catch (error) { 
      console.error('Error fetching posts:', error); 
    } finally { 
      setIsLoading(false); 
    } 
  };

  // =============================================
  // SECURITY: Rate Limiting
  // =============================================
  const checkPostRateLimit = () => {
    const now = Date.now();
    const timeSinceLastPost = now - lastPostTimeRef.current;
    if (timeSinceLastPost < 30000 && postCountRef.current >= 3) {
      setSubmitCooldown(true);
      setTimeout(() => { 
        setSubmitCooldown(false); 
        postCountRef.current = 0; 
      }, 30000);
      return false;
    }
    if (timeSinceLastPost >= 30000) postCountRef.current = 0;
    return true;
  };

  const toggleComments = async (postId) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(postId)) { 
      newExpanded.delete(postId); 
    } else { 
      newExpanded.add(postId); 
      try { 
        const res = await fetch(`${API_URL}/api/freedom-wall/comments/${postId}`); 
        const data = await res.json(); 
        if (data.success) setComments(prev => ({ ...prev, [postId]: data.comments })); 
      } catch (err) { 
        console.error(err); 
      } 
    }
    setExpandedComments(newExpanded);
  };

  const addComment = async (postId) => {
    const text = commentTexts[postId] || '';
    if (!text.trim()) return;
    const sanitized = sanitizeMessage(text);
    if (!sanitized || containsSpam(sanitized)) { 
      alert('⚠️ Comment contains prohibited content.'); 
      return; 
    }
    try {
      const res = await fetch(`${API_URL}/api/freedom-wall/comments/${postId}`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ username, text: sanitized }) 
      });
      const data = await res.json();
      if (data.success) setCommentTexts(prev => ({ ...prev, [postId]: '' }));
    } catch (err) { 
      console.error(err); 
    }
  };

  const deleteComment = async (postId, commentId) => {
    try { 
      await fetch(`${API_URL}/api/freedom-wall/comments/${postId}/${commentId}?username=${encodeURIComponent(username)}`, { 
        method: 'DELETE' 
      }); 
    } catch (err) { 
      console.error(err); 
    }
    setShowDeleteCommentModal(null);
  };

  const handleMultipleImages = (e) => {
    const files = Array.from(e.target.files);
    if (imagePreviews.length + files.length > 5) { 
      alert('Maximum 5 photos per post'); 
      return; 
    }
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) { 
        alert(`${file.name} is too large (max 5MB)`); 
        return; 
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new window.Image(); 
        img.src = reader.result;
        img.onload = () => {
          const canvas = document.createElement('canvas'); 
          let width = img.width, height = img.height; 
          const maxDim = 800;
          if (width > maxDim || height > maxDim) { 
            if (width > height) { 
              height = (height / width) * maxDim; 
              width = maxDim; 
            } else { 
              width = (width / height) * maxDim; 
              height = maxDim; 
            }
          }
          canvas.width = width; 
          canvas.height = height; 
          const ctx = canvas.getContext('2d'); 
          ctx.drawImage(img, 0, 0, width, height);
          setSelectedImages(prev => [...prev, file]); 
          setImagePreviews(prev => [...prev, canvas.toDataURL('image/jpeg', 0.7)]);
        };
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImageByIndex = (index) => { 
    setSelectedImages(prev => prev.filter((_, i) => i !== index)); 
    setImagePreviews(prev => prev.filter((_, i) => i !== index)); 
  };
  
  const clearAllImages = () => { 
    setSelectedImages([]); 
    setImagePreviews([]); 
    if (fileInputRef.current) fileInputRef.current.value = ''; 
  };

  const handleStoryImage = (e) => {
    const file = e.target.files[0]; 
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { 
      alert('Image must be less than 5MB'); 
      return; 
    }
    setStoryImage(file); 
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new window.Image(); 
      img.src = reader.result;
      img.onload = () => {
        const canvas = document.createElement('canvas'); 
        const targetWidth = 500, targetHeight = 800;
        canvas.width = targetWidth; 
        canvas.height = targetHeight; 
        const ctx = canvas.getContext('2d');
        const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
        const w = img.width * scale, h = img.height * scale;
        const x = (targetWidth - w) / 2, y = (targetHeight - h) / 2;
        ctx.fillStyle = '#000'; 
        ctx.fillRect(0, 0, targetWidth, targetHeight); 
        ctx.drawImage(img, x, y, w, h);
        setStoryPreview(canvas.toDataURL('image/jpeg', 0.8));
      };
    };
    reader.readAsDataURL(file);
  };

  const createStory = async () => {
    if (!storyPreview) return;
    const sanitizedCaption = sanitizeMessage(storyCaption);
    try { 
      const res = await fetch(`${API_URL}/api/freedom-wall/stories`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ username, image: storyPreview, caption: sanitizedCaption }) 
      }); 
      const data = await res.json(); 
      if (data.success) { 
        setShowStoryCreator(false); 
        setStoryImage(null); 
        setStoryPreview(null); 
        setStoryCaption(''); 
      } 
    } catch (err) { 
      console.error(err); 
    }
  };

  const viewStory = (storyIndex) => {
    setViewingStory(stories[storyIndex]); 
    setCurrentStoryIndex(storyIndex); 
    setViewedStories(prev => new Set([...prev, storyIndex]));
    if (storyTimerRef.current) clearInterval(storyTimerRef.current);
    storyTimerRef.current = setInterval(() => { 
      setCurrentStoryIndex(prev => { 
        if (prev + 1 < stories.length) { 
          setViewedStories(v => new Set([...v, prev + 1])); 
          setViewingStory(stories[prev + 1]); 
          return prev + 1; 
        } else { 
          closeStoryViewer(); 
          return prev; 
        } 
      }); 
    }, 5000);
  };

  const closeStoryViewer = () => { 
    setViewingStory(null); 
    setCurrentStoryIndex(0); 
    if (storyTimerRef.current) clearInterval(storyTimerRef.current); 
  };
  
  const prevStory = () => { 
    if (currentStoryIndex > 0) { 
      const newIdx = currentStoryIndex - 1; 
      setCurrentStoryIndex(newIdx); 
      setViewingStory(stories[newIdx]); 
      setViewedStories(prev => new Set([...prev, newIdx])); 
    } 
  };
  
  const nextStory = () => { 
    if (currentStoryIndex + 1 < stories.length) { 
      const newIdx = currentStoryIndex + 1; 
      setCurrentStoryIndex(newIdx); 
      setViewingStory(stories[newIdx]); 
      setViewedStories(prev => new Set([...prev, newIdx])); 
    } else { 
      closeStoryViewer(); 
    } 
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); 
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder; 
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = () => { 
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); 
        const reader = new FileReader(); 
        reader.onloadend = () => { 
          setAudioBlob(blob); 
          setAudioUrl(reader.result); 
        }; 
        reader.readAsDataURL(blob); 
        stream.getTracks().forEach(t => t.stop()); 
      };
      mediaRecorder.start(); 
      setIsRecording(true); 
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch (err) { 
      alert('Cannot access microphone'); 
    }
  };

  const stopRecording = () => { 
    if (mediaRecorderRef.current && isRecording) { 
      mediaRecorderRef.current.stop(); 
      setIsRecording(false); 
      clearInterval(recordingTimerRef.current); 
    } 
  };
  
  const cancelRecording = () => { 
    if (mediaRecorderRef.current && isRecording) { 
      mediaRecorderRef.current.stop(); 
      setIsRecording(false); 
      clearInterval(recordingTimerRef.current); 
      setAudioBlob(null); 
      setAudioUrl(null); 
    } 
  };
  
  const formatRecordingTime = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
  
  const togglePlayAudio = (id, src) => { 
    if (currentlyPlaying === id) { 
      audioRef.current.pause(); 
      setCurrentlyPlaying(null); 
    } else { 
      audioRef.current.src = src; 
      audioRef.current.play(); 
      setCurrentlyPlaying(id); 
      audioRef.current.onended = () => setCurrentlyPlaying(null); 
    } 
  };
  
  const removeAudio = () => { 
    setAudioBlob(null); 
    setAudioUrl(null); 
  };

  // =============================================
  // SECURITY: Updated handleSubmit
  // =============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() && imagePreviews.length === 0 && !audioBlob) return;
    
    if (submitCooldown) { 
      alert('⚠️ Too many posts. Please wait before posting again.'); 
      return; 
    }
    if (!checkPostRateLimit()) { 
      alert('⚠️ Too many posts. Please wait 30 seconds.'); 
      return; 
    }
    
    const sanitized = sanitizeMessage(message);
    if (!sanitized && imagePreviews.length === 0 && !audioBlob) { 
      alert('⚠️ Invalid content.'); 
      return; 
    }
    if (containsSpam(sanitized)) { 
      alert('⚠️ Message contains prohibited content (spam, URLs, or inappropriate words).'); 
      return; 
    }
    if (sanitized.length > 0 && sanitized.length < 2) { 
      alert('⚠️ Message too short.'); 
      return; 
    }
    if (audioBlob && recordingTime > 120) { 
      alert('⚠️ Voice message too long. Max 2 minutes.'); 
      return; 
    }
    
    try {
      const res = await fetch(`${API_URL}/api/freedom-wall/posts`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          username, 
          message: sanitized, 
          images: imagePreviews.length > 0 ? imagePreviews : null, 
          audio: audioUrl || null, 
          audioDuration: recordingTime 
        }) 
      });
      const data = await res.json();
      if (data.success) { 
        setMessage(''); 
        clearAllImages(); 
        setAudioBlob(null); 
        setAudioUrl(null); 
        setRecordingTime(0); 
        setIsFocused(false); 
        lastPostTimeRef.current = Date.now(); 
        postCountRef.current++; 
      }
    } catch (err) { 
      alert('Failed to post. Please check your connection.'); 
      console.error('Post error:', err); 
    }
  };

  const handleDelete = async (postId) => { 
    try { 
      await fetch(`${API_URL}/api/freedom-wall/posts/${postId}?username=${encodeURIComponent(username)}`, { 
        method: 'DELETE' 
      }); 
    } catch (err) { 
      console.error(err); 
    } 
    setShowDeleteModal(null); 
  };
  
  const handleLike = async (postId) => { 
    try { 
      const res = await fetch(`${API_URL}/api/freedom-wall/posts/${postId}/like`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ username }) 
      }); 
      const data = await res.json(); 
      if (data.success) { 
        setLikedPosts(prev => { 
          const n = new Set(prev); 
          n.has(postId) ? n.delete(postId) : n.add(postId); 
          return n; 
        }); 
      } 
    } catch (err) { 
      console.error(err); 
    } 
  };

  const formatTime = (ts) => { 
    const d = new Date(ts), now = new Date(); 
    const mins = Math.floor((now - d) / 60000); 
    if (mins < 1) return 'Just now'; 
    if (mins < 60) return `${mins}m ago`; 
    const hrs = Math.floor(mins / 60); 
    if (hrs < 24) return `${hrs}h ago`; 
    const days = Math.floor(hrs / 24); 
    if (days < 7) return `${days}d ago`; 
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); 
  };
  
  const handleKeyDown = (e) => { 
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      handleSubmit(e); 
    } 
  };
  
  const openGallery = (post, startIndex = 0) => { 
    setGalleryPost(post); 
    setCurrentImageIndex(startIndex); 
  };
  
  const openProfile = (user) => { 
    const userPosts = posts.filter(p => p.username === user); 
    setProfileUser(user); 
    setProfilePosts(userPosts); 
    setShowProfileModal(true); 
  };

  if (isLoading) return (
    <div className="freedom-wall">
      <div className="freedom-wall__empty">
        <div className="freedom-wall__empty-icon"><Sparkles size={40} /></div>
        <h3 className="freedom-wall__empty-title">Loading...</h3>
      </div>
    </div>
  );

  return (
    <div className="freedom-wall">
      <nav className="freedom-wall__nav">
        <div className="freedom-wall__nav-inner">
          <button onClick={() => navigate('/select-mode', { state: { username } })} className="freedom-wall__back">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="freedom-wall__nav-center">
            <Sparkles size={14} className="freedom-wall__nav-icon" />
            <span className="freedom-wall__logo-text">Freedom Wall</span>
          </div>
          <button className="freedom-wall__user-badge" onClick={() => openProfile(username)}>
            <User size={14} /><span>{username}</span>
          </button>
        </div>
      </nav>

      <div className="freedom-wall__stories-bar">
        <div className="freedom-wall__stories-scroll">
          <button className="freedom-wall__story-item freedom-wall__story-item--add" onClick={() => setShowStoryCreator(true)}>
            <div className="freedom-wall__story-avatar">
              <div className="freedom-wall__story-avatar-inner" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                {username.charAt(0).toUpperCase()}
              </div>
              <div className="freedom-wall__story-add-icon"><Plus size={12} /></div>
            </div>
            <span className="freedom-wall__story-name">Your Story</span>
          </button>
          {stories.map((story, idx) => (
            <button key={story.id} 
              className={`freedom-wall__story-item ${viewedStories.has(idx) ? 'freedom-wall__story-item--viewed' : 'freedom-wall__story-item--unseen'}`} 
              onClick={() => viewStory(idx)}>
              <div className="freedom-wall__story-avatar">
                <div className="freedom-wall__story-avatar-inner" style={{ background: story.color || '#6366f1' }}>
                  {story.image ? <img src={story.image} alt="" /> : story.username.charAt(0).toUpperCase()}
                </div>
              </div>
              <span className="freedom-wall__story-name">{story.username}</span>
              <span className="freedom-wall__story-time">{formatTime(story.timestamp)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="freedom-wall__header">
        <div className="freedom-wall__header-content">
          <div className="freedom-wall__header-decoration">
            <span>✨</span><span>💭</span><span>📝</span><span>🎨</span><span>💫</span>
          </div>
          <h1 className="freedom-wall__title">Express <span className="freedom-wall__title-gradient">Yourself</span></h1>
          <p className="freedom-wall__subtitle">Share your thoughts, photos, and voice messages</p>
          <div className="freedom-wall__stats">
            <div className="freedom-wall__stat"><MessageSquare size={14} /><span>{posts.length} posts</span></div>
            <div className="freedom-wall__stat"><Eye size={14} /><span>{stories.length} stories</span></div>
            <div className="freedom-wall__stat"><User size={14} /><span>Posting as {username}</span></div>
          </div>
        </div>
      </div>

      <div className="freedom-wall__input-area">
        <form onSubmit={handleSubmit} className={`freedom-wall__input-wrapper ${isFocused ? 'freedom-wall__input-wrapper--focused' : ''}`}>
          <div className="freedom-wall__input-avatar" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            {username.charAt(0).toUpperCase()}
          </div>
          <div className="freedom-wall__input-field">
            {imagePreviews.length > 0 && (
              <div className="freedom-wall__image-grid">
                {imagePreviews.map((preview, idx) => (
                  <div key={idx} className="freedom-wall__image-grid-item">
                    <img src={preview} alt="" />
                    <button type="button" onClick={() => removeImageByIndex(idx)} className="freedom-wall__media-remove"><X size={12} /></button>
                    {idx === 0 && imagePreviews.length > 1 && (
                      <span className="freedom-wall__image-badge"><Image size={10} /> {imagePreviews.length}</span>
                    )}
                  </div>
                ))}
                {imagePreviews.length < 5 && (
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="freedom-wall__image-add-more"><Plus size={20} /></button>
                )}
              </div>
            )}
            {isRecording && (
              <div className="freedom-wall__recording-indicator">
                <div className="freedom-wall__recording-dot"></div>
                <span className="freedom-wall__recording-time">{formatRecordingTime(recordingTime)}</span>
                <button type="button" onClick={stopRecording} className="freedom-wall__recording-stop"><Square size={14} /> Stop</button>
                <button type="button" onClick={cancelRecording} className="freedom-wall__recording-cancel">Cancel</button>
              </div>
            )}
            {audioUrl && !isRecording && (
              <div className="freedom-wall__audio-preview">
                <button type="button" onClick={() => togglePlayAudio('preview', audioUrl)} className="freedom-wall__audio-play-btn">
                  {currentlyPlaying === 'preview' ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <div className="freedom-wall__audio-wave">
                  {[...Array(20)].map((_, i) => <div key={i} className="freedom-wall__audio-bar" style={{ animationDelay: `${i*0.1}s` }}></div>)}
                </div>
                <button type="button" onClick={removeAudio} className="freedom-wall__audio-remove"><X size={14} /></button>
              </div>
            )}
            <div className="freedom-wall__input-row">
              <textarea 
                value={message} 
                onChange={e => setMessage(e.target.value)} 
                onFocus={() => setIsFocused(true)} 
                onBlur={() => setIsFocused(false)} 
                onKeyDown={handleKeyDown} 
                placeholder="What's on your mind?" 
                className="freedom-wall__input" 
                maxLength={500} 
                rows={1} 
              />
              <div className="freedom-wall__input-actions">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="freedom-wall__media-btn" title="Add photos">
                  <Camera size={18} />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleMultipleImages} style={{ display: 'none' }} />
                {!isRecording && <button type="button" onClick={startRecording} className="freedom-wall__media-btn" title="Record voice" disabled={!!audioBlob}>
                  <Mic size={18} />
                </button>}
                <span className="freedom-wall__char-count">{message.length}/500</span>
                <button type="submit" 
                  className={`freedom-wall__send-btn ${(message.trim() || imagePreviews.length > 0 || audioBlob) && !submitCooldown ? 'freedom-wall__send-btn--active' : ''}`} 
                  disabled={(!message.trim() && imagePreviews.length === 0 && !audioBlob) || submitCooldown}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Posts Feed */}
      <div className="freedom-wall__feed">
        {posts.length === 0 ? (
          <div className="freedom-wall__empty">
            <div className="freedom-wall__empty-icon"><MessageSquare size={40} /></div>
            <h3 className="freedom-wall__empty-title">No posts yet</h3>
            <p className="freedom-wall__empty-text">Be the first to share something!</p>
          </div>
        ) : (
          posts.map((post) => {
            const hasMedia = (post.images && post.images.length > 0) || post.audio;
            const msgLen = post.message ? post.message.length : 0;
            return (
              <div key={post.id} 
                className={`freedom-wall__post ${!hasMedia && post.message ? 'freedom-wall__post--text-only' : ''} ${hasMedia ? 'freedom-wall__post--has-media' : ''}`} 
                style={{ '--post-color': post.color }}>
                <div className="freedom-wall__post-header">
                  <div className="freedom-wall__post-user">
                    <div className="freedom-wall__post-avatar" style={{ background: post.color, cursor: 'pointer' }} onClick={() => openProfile(post.username)}>
                      {post.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="freedom-wall__post-user-info">
                      <span className="freedom-wall__post-username" style={{ cursor: 'pointer' }} onClick={() => openProfile(post.username)}>
                        {post.username}
                      </span>
                      <span className="freedom-wall__post-time"><Clock size={11} />{formatTime(post.timestamp)}</span>
                    </div>
                  </div>
                  {post.username === username && (
                    <button className="freedom-wall__post-menu" onClick={() => setShowDeleteModal(post.id)}>
                      <MoreVertical size={16} />
                    </button>
                  )}
                </div>
                {post.message && (
                  <p className={`freedom-wall__post-message ${msgLen > 150 ? 'freedom-wall__post-message--long' : ''} ${msgLen > 0 && msgLen <= 60 ? 'freedom-wall__post-message--short' : ''}`}>
                    {post.message}
                  </p>
                )}
                {post.images && post.images.length > 0 && (
                  <div className="freedom-wall__post-gallery">
                    {post.images.length === 1 ? (
                      <div className="freedom-wall__post-image" onClick={() => openGallery(post, 0)}>
                        <img src={post.images[0]} alt="" />
                      </div>
                    ) : (
                      <div className="freedom-wall__post-carousel">
                        <div className={`freedom-wall__carousel-track freedom-wall__carousel-track--count-${Math.min(post.images.length, 2)}`} onClick={() => openGallery(post, 0)}>
                          {post.images.slice(0, 2).map((img, idx) => (
                            <div key={idx} className={`freedom-wall__carousel-item ${idx === 1 && post.images.length > 2 ? 'freedom-wall__carousel-item--more' : ''}`}>
                              <img src={img} alt="" />
                              {idx === 1 && post.images.length > 2 && (
                                <div className="freedom-wall__carousel-overlay"><span>+{post.images.length - 2}</span></div>
                              )}
                            </div>
                          ))}
                        </div>
                        <span className="freedom-wall__carousel-count"><Image size={12} /> {post.images.length} photos</span>
                      </div>
                    )}
                  </div>
                )}
                {post.audio && (
                  <div className="freedom-wall__post-audio">
                    <button onClick={() => togglePlayAudio(post.id, post.audio)} className="freedom-wall__audio-play-btn">
                      {currentlyPlaying === post.id ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <div className="freedom-wall__audio-wave">
                      {[...Array(15)].map((_, i) => <div key={i} className="freedom-wall__audio-bar" style={{ animationDelay: `${i*0.1}s` }}></div>)}
                    </div>
                    <span className="freedom-wall__audio-label">Voice</span>
                  </div>
                )}
                <div className="freedom-wall__post-footer">
                  <button className={`freedom-wall__like-btn ${likedPosts.has(post.id) ? 'freedom-wall__like-btn--liked' : ''}`} onClick={() => handleLike(post.id)}>
                    <Heart size={14} fill={likedPosts.has(post.id) ? 'currentColor' : 'none'} />
                    <span>{post.likes}</span>
                  </button>
                  <button className="freedom-wall__comment-toggle" onClick={() => toggleComments(post.id)}>
                    <MessageCircle size={14} />
                    <span>{post.commentCount || comments[post.id]?.length || 0}</span>
                  </button>
                </div>
                {expandedComments.has(post.id) && (
                  <div className="freedom-wall__comments">
                    <div className="freedom-wall__comments-list">
                      {(comments[post.id] || []).length === 0 ? (
                        <p className="freedom-wall__comments-empty">No comments yet. Be the first!</p>
                      ) : (
                        (comments[post.id] || []).map(comment => (
                          <div key={comment.id} className="freedom-wall__comment">
                            <div className="freedom-wall__comment-avatar" style={{ background: '#6366f1' }}>
                              {comment.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="freedom-wall__comment-content">
                              <div className="freedom-wall__comment-header">
                                <span className="freedom-wall__comment-username">{comment.username}</span>
                                <span className="freedom-wall__comment-time">{formatTime(comment.timestamp)}</span>
                              </div>
                              <p className="freedom-wall__comment-text">{comment.text}</p>
                            </div>
                            {comment.username === username && (
                              <button className="freedom-wall__comment-delete" onClick={() => setShowDeleteCommentModal({ postId: post.id, commentId: comment.id })}>
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                    <div className="freedom-wall__comment-input">
                      <input type="text" 
                        value={commentTexts[post.id] || ''} 
                        onChange={e => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))} 
                        onKeyDown={e => { if (e.key === 'Enter') addComment(post.id); }} 
                        placeholder="Write a comment..." 
                        className="freedom-wall__comment-field" 
                      />
                      <button onClick={() => addComment(post.id)} className="freedom-wall__comment-submit" disabled={!commentTexts[post.id]?.trim()}>
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* All Modals */}
      {showProfileModal && profileUser && (
        <div className="freedom-wall__profile-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="freedom-wall__profile" onClick={e => e.stopPropagation()}>
            <button className="freedom-wall__profile-close" onClick={() => setShowProfileModal(false)}><X size={20} /></button>
            <div className="freedom-wall__profile-header">
              <div className="freedom-wall__profile-avatar" style={{ background: profilePosts[0]?.color || '#6366f1' }}>
                {profileUser.charAt(0).toUpperCase()}
              </div>
              <h2 className="freedom-wall__profile-name">{profileUser}</h2>
              <div className="freedom-wall__profile-stats">
                <div className="freedom-wall__profile-stat"><Hash size={16} /><span>{profilePosts.length} posts</span></div>
                <div className="freedom-wall__profile-stat"><Heart size={16} /><span>{profilePosts.reduce((sum, p) => sum + (p.likes || 0), 0)} likes</span></div>
                <div className="freedom-wall__profile-stat"><Calendar size={16} /><span>Since {profilePosts.length > 0 ? formatTime(profilePosts[profilePosts.length - 1].timestamp) : 'N/A'}</span></div>
              </div>
            </div>
            <div className="freedom-wall__profile-history">
              <h3 className="freedom-wall__profile-history-title"><History size={16} />Post History</h3>
              {profilePosts.length === 0 ? (
                <div className="freedom-wall__profile-empty"><MessageSquare size={32} /><p>No posts yet</p></div>
              ) : (
                <div className="freedom-wall__profile-posts">
                  {profilePosts.map((post) => (
                    <div key={post.id} className="freedom-wall__profile-post" style={{ borderLeftColor: post.color }}>
                      <div className="freedom-wall__profile-post-time"><Clock size={11} />{formatTime(post.timestamp)}</div>
                      {post.message && <p className="freedom-wall__profile-post-text">{post.message.length > 80 ? post.message.slice(0, 80) + '...' : post.message}</p>}
                      <div className="freedom-wall__profile-post-meta">
                        {post.images && post.images.length > 0 && <span><Image size={12} /> {post.images.length} photo{post.images.length > 1 ? 's' : ''}</span>}
                        {post.audio && <span><Mic size={12} /> Voice</span>}
                        <span><Heart size={12} /> {post.likes || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showStoryCreator && (
        <div className="freedom-wall__story-creator-overlay" onClick={() => setShowStoryCreator(false)}>
          <div className="freedom-wall__story-creator" onClick={e => e.stopPropagation()}>
            <button className="freedom-wall__story-creator-close" onClick={() => setShowStoryCreator(false)}><X size={20} /></button>
            <h2>Create Story</h2>
            {!storyPreview ? (
              <div className="freedom-wall__story-upload-zone" onClick={() => storyFileInputRef.current?.click()}>
                <Camera size={40} /><p>Tap to add photo</p>
              </div>
            ) : (
              <div className="freedom-wall__story-preview">
                <img src={storyPreview} alt="" />
                <input type="text" value={storyCaption} onChange={e => setStoryCaption(e.target.value)} placeholder="Add a caption..." className="freedom-wall__story-caption" maxLength={100} />
              </div>
            )}
            <input ref={storyFileInputRef} type="file" accept="image/*" onChange={handleStoryImage} style={{ display: 'none' }} />
            <div className="freedom-wall__story-actions">
              <button onClick={() => { setShowStoryCreator(false); setStoryPreview(null); setStoryCaption(''); }} className="freedom-wall__story-btn--cancel">Cancel</button>
              <button onClick={createStory} className="freedom-wall__story-btn--post" disabled={!storyPreview}>Share Story</button>
            </div>
          </div>
        </div>
      )}

      {viewingStory && (
        <div className="freedom-wall__story-viewer">
          <button className="freedom-wall__story-viewer-close" onClick={closeStoryViewer}><X size={24} /></button>
          {currentStoryIndex > 0 && <button className="freedom-wall__story-viewer-prev" onClick={prevStory}><ChevronLeft size={28} /></button>}
          <div className="freedom-wall__story-viewer-content">
            <img src={viewingStory.image} alt="" />
            {viewingStory.caption && <p className="freedom-wall__story-viewer-caption">{viewingStory.caption}</p>}
            <span className="freedom-wall__story-viewer-user">@{viewingStory.username}</span>
          </div>
          {currentStoryIndex < stories.length - 1 && <button className="freedom-wall__story-viewer-next" onClick={nextStory}><ChevronRight size={28} /></button>}
          <div className="freedom-wall__story-progress">
            {stories.map((_, idx) => (
              <div key={idx} className={`freedom-wall__story-progress-bar ${idx <= currentStoryIndex ? 'freedom-wall__story-progress-bar--active' : ''}`}></div>
            ))}
          </div>
        </div>
      )}

      {galleryPost && (
        <div className="freedom-wall__lightbox" onClick={() => setGalleryPost(null)}>
          <button className="freedom-wall__lightbox-close" onClick={() => setGalleryPost(null)}><X size={24} /></button>
          <div className="freedom-wall__lightbox-content" onClick={e => e.stopPropagation()}>
            <img src={galleryPost.images[currentImageIndex]} alt="" />
            {galleryPost.images.length > 1 && (
              <>
                <button className="freedom-wall__lightbox-prev" onClick={() => setCurrentImageIndex(p => p > 0 ? p - 1 : galleryPost.images.length - 1)}>
                  <ChevronLeft size={24} />
                </button>
                <button className="freedom-wall__lightbox-next" onClick={() => setCurrentImageIndex(p => p < galleryPost.images.length - 1 ? p + 1 : 0)}>
                  <ChevronRight size={24} />
                </button>
                <div className="freedom-wall__lightbox-dots">
                  {galleryPost.images.map((_, idx) => (
                    <button key={idx} className={`freedom-wall__lightbox-dot ${idx === currentImageIndex ? 'freedom-wall__lightbox-dot--active' : ''}`} onClick={() => setCurrentImageIndex(idx)}></button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showDeleteCommentModal && (
        <div className="freedom-wall__modal-overlay" onClick={() => setShowDeleteCommentModal(null)}>
          <div className="freedom-wall__modal" onClick={e => e.stopPropagation()}>
            <button className="freedom-wall__modal-close" onClick={() => setShowDeleteCommentModal(null)}><X size={18} /></button>
            <div className="freedom-wall__modal-icon"><Trash2 size={24} /></div>
            <h3 className="freedom-wall__modal-title">Delete Comment?</h3>
            <p className="freedom-wall__modal-text">This action cannot be undone.</p>
            <div className="freedom-wall__modal-actions">
              <button className="freedom-wall__modal-btn freedom-wall__modal-btn--cancel" onClick={() => setShowDeleteCommentModal(null)}>Cancel</button>
              <button className="freedom-wall__modal-btn freedom-wall__modal-btn--delete" onClick={() => deleteComment(showDeleteCommentModal.postId, showDeleteCommentModal.commentId)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="freedom-wall__modal-overlay" onClick={() => setShowDeleteModal(null)}>
          <div className="freedom-wall__modal" onClick={e => e.stopPropagation()}>
            <button className="freedom-wall__modal-close" onClick={() => setShowDeleteModal(null)}><X size={18} /></button>
            <div className="freedom-wall__modal-icon"><Trash2 size={24} /></div>
            <h3 className="freedom-wall__modal-title">Delete Post?</h3>
            <p className="freedom-wall__modal-text">This action cannot be undone.</p>
            <div className="freedom-wall__modal-actions">
              <button className="freedom-wall__modal-btn freedom-wall__modal-btn--cancel" onClick={() => setShowDeleteModal(null)}>Cancel</button>
              <button className="freedom-wall__modal-btn freedom-wall__modal-btn--delete" onClick={() => handleDelete(showDeleteModal)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FreedomWall;