import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }, maxHttpBufferSize: Infinity, transports: ['websocket', 'polling'] });

// ============================================= FILE PATHS =============================================
const DATA_DIR = path.join(process.cwd(), 'data');
const FILES = {
  broadcastRequests: path.join(DATA_DIR, 'broadcast-requests.json'),
  bannedIPs: path.join(DATA_DIR, 'banned-ips.json'),
  mutedUsers: path.join(DATA_DIR, 'muted-users.json'),
  messageLog: path.join(DATA_DIR, 'message-log.json'),
  reportedUsers: path.join(DATA_DIR, 'reported-users.json'),
  announcements: path.join(DATA_DIR, 'announcements.json'),
  stats: path.join(DATA_DIR, 'stats.json'),
  freedomWallPosts: path.join(DATA_DIR, 'freedom-wall-posts.json'),
  freedomWallColors: path.join(DATA_DIR, 'freedom-wall-colors.json'),
  freedomWallStories: path.join(DATA_DIR, 'freedom-wall-stories.json'),
  freedomWallComments: path.join(DATA_DIR, 'freedom-wall-comments.json')
};

if (!fs.existsSync(DATA_DIR)) { fs.mkdirSync(DATA_DIR, { recursive: true }); console.log('📁 Created data directory'); }

function loadJSON(filePath, defaultValue) { try { if (fs.existsSync(filePath)) { const data = fs.readFileSync(filePath, 'utf8'); return JSON.parse(data); } } catch (err) { console.error(`Error loading ${filePath}:`, err.message); } return defaultValue; }
function saveJSON(filePath, data) { try { fs.writeFileSync(filePath, JSON.stringify(data, null, 2)); } catch (err) { console.error(`Error saving ${filePath}:`, err.message); } }

// ============================================= SERVER-SIDE RATE LIMITING =============================================
const rateLimits = new Map();

function checkServerRateLimit(ip, action, maxCount = 10, windowMs = 10000) {
  const key = `${ip}:${action}`;
  const now = Date.now();
  if (!rateLimits.has(key)) { rateLimits.set(key, { count: 1, resetTime: now + windowMs }); return true; }
  const limit = rateLimits.get(key);
  if (now > limit.resetTime) { rateLimits.set(key, { count: 1, resetTime: now + windowMs }); return true; }
  if (limit.count >= maxCount) return false;
  limit.count++;
  return true;
}

setInterval(() => { const now = Date.now(); rateLimits.forEach((v, k) => { if (now > v.resetTime) rateLimits.delete(k); }); }, 60000);

// ============================================= SPAM DETECTION =============================================
const spamPattern = /(https?:\/\/[^\s]+|buy now|click here|free money|casino|viagra|cialis|loan|lottery|winner|congratulations|cash prize|earn money|work from home|get rich|bitcoin free|double your|act now|limited offer|exclusive deal|guaranteed|risk free|order now|call now|text now)/gi;
const reservedNames = ['admin', 'administrator', 'moderator', 'mod', 'system', 'cremyxo', 'owner', 'staff', 'root', 'support', 'help', 'info'];

// ============================================= DATA =============================================
const waitingUsers = [];
const activeRooms = new Map();
const allUsers = new Map();
const messageLog = loadJSON(FILES.messageLog, []);
const reportedUsers = loadJSON(FILES.reportedUsers, []);
const bannedIPs = new Set(loadJSON(FILES.bannedIPs, []));
const mutedUsers = new Set(loadJSON(FILES.mutedUsers, []));
const broadcastRequests = loadJSON(FILES.broadcastRequests, []);
const activeAnnouncements = new Map();

const messageColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#06b6d4', '#ef4444', '#f59e0b'];
let freedomWallPosts = loadJSON(FILES.freedomWallPosts, []);
let userColors = loadJSON(FILES.freedomWallColors, {});
let freedomWallStories = loadJSON(FILES.freedomWallStories, []);
let freedomWallComments = loadJSON(FILES.freedomWallComments, {});

function getUserColor(username) {
  if (userColors[username]) return userColors[username];
  let hash = 0;
  for (let i = 0; i < username.length; i++) { hash = ((hash << 5) - hash) + username.charCodeAt(i); hash = hash & hash; }
  const color = messageColors[Math.abs(hash) % messageColors.length];
  userColors[username] = color; saveJSON(FILES.freedomWallColors, userColors); return color;
}

setInterval(() => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const before = freedomWallStories.length;
  freedomWallStories = freedomWallStories.filter(s => s.timestamp > cutoff);
  if (freedomWallStories.length < before) { 
    totalFWStories = freedomWallStories.length;
    saveJSON(FILES.freedomWallStories, freedomWallStories); 
    io.emit('freedom-wall-stories-cleaned'); 
    broadcastAdminUpdate();
    console.log(`🧹 Cleaned ${before - freedomWallStories.length} expired stories`); 
  }
}, 10 * 60 * 1000);

const savedAnnouncements = loadJSON(FILES.announcements, []);
savedAnnouncements.forEach(a => { activeAnnouncements.set(a.id, a); });

const savedStats = loadJSON(FILES.stats, { totalMessages: 0, totalVoiceMessages: 0, totalVoiceDuration: 0, totalUniqueUsers: 0 });
let totalMessages = savedStats.totalMessages || 0;
let totalVoiceMessages = savedStats.totalVoiceMessages || 0;
let totalVoiceDuration = savedStats.totalVoiceDuration || 0;
let totalUniqueUsers = savedStats.totalUniqueUsers || 0;
let totalFWPosts = freedomWallPosts.length;
let totalFWStories = freedomWallStories.length;
let totalFWComments = Object.values(freedomWallComments).reduce((sum, c) => sum + (Array.isArray(c) ? c.length : 0), 0);
const serverStartTime = Date.now();

console.log('✅ Data loaded from files');
console.log(`   📨 Broadcast Requests: ${broadcastRequests.length}`);
console.log(`   🚫 Banned IPs: ${bannedIPs.size}`);
console.log(`   🔇 Muted Users: ${mutedUsers.size}`);
console.log(`   💬 Messages: ${messageLog.length}`);
console.log(`   🚩 Reports: ${reportedUsers.length}`);
console.log(`   📢 Announcements: ${activeAnnouncements.size}`);
console.log(`   📝 Freedom Wall Posts: ${totalFWPosts}`);
console.log(`   📖 Freedom Wall Stories: ${totalFWStories}`);
console.log(`   💭 Freedom Wall Comments: ${totalFWComments}`);
console.log(`   👥 Total Unique Users: ${totalUniqueUsers}`);
console.log(`   🎨 User Colors: ${Object.keys(userColors).length}`);

function saveAll() {
  saveJSON(FILES.broadcastRequests, broadcastRequests);
  saveJSON(FILES.bannedIPs, [...bannedIPs]);
  saveJSON(FILES.mutedUsers, [...mutedUsers]);
  saveJSON(FILES.messageLog, messageLog.slice(-500));
  saveJSON(FILES.reportedUsers, reportedUsers.slice(-100));
  saveJSON(FILES.announcements, [...activeAnnouncements.values()]);
  saveJSON(FILES.stats, { totalMessages, totalVoiceMessages, totalVoiceDuration, totalFWPosts, totalFWStories, totalFWComments, totalUniqueUsers });
  saveJSON(FILES.freedomWallPosts, freedomWallPosts);
  saveJSON(FILES.freedomWallColors, userColors);
  saveJSON(FILES.freedomWallStories, freedomWallStories);
  saveJSON(FILES.freedomWallComments, freedomWallComments);
}

setInterval(() => { saveAll(); console.log('💾 Auto-saved all data'); }, 5 * 60 * 1000);
process.on('SIGINT', () => { saveAll(); console.log('💾 Data saved. Server shutting down...'); process.exit(0); });
process.on('SIGTERM', () => { saveAll(); console.log('💾 Data saved. Server shutting down...'); process.exit(0); });

function broadcastAdminUpdate() {
  try {
    const userMap = new Map();
    allUsers.forEach((v) => {
      const existing = userMap.get(v.ip);
      if (!existing || (v.name !== 'Anonymous' && existing.name === 'Anonymous') || (v.status === 'online' && existing.status !== 'online')) {
        userMap.set(v.ip, { socketId: v.socketId, ip: v.ip, name: v.name, status: v.status, connectedAt: v.connectedAt, room: v.room, isAdmin: v.isAdmin });
      }
    });
    const users = [...userMap.values()];
    const rooms = []; 
    activeRooms.forEach((r, id) => rooms.push({ id, users: r.users.map(u => ({ name: u.name, id: u.id })), createdAt: new Date(r.createdAt).toLocaleTimeString(), messageCount: r.messageCount || 0, duration: Math.floor((Date.now() - r.createdAt) / 1000) }));
    const onlineCount = users.filter(u => u.status === 'online' && !u.isAdmin).length;
    io.emit('admin-update', { users, rooms, waitingCount: waitingUsers.length, totalOnline: onlineCount, totalUsers: totalUniqueUsers, messageLog: messageLog.slice(-50), serverUptime: Math.floor((Date.now() - serverStartTime) / 1000), totalMessages, totalVoiceMessages, totalVoiceDuration, reportedUsers, totalFWPosts, totalFWStories, totalFWComments, freedomWallPosts: freedomWallPosts.slice(0, 20) });
  } catch (err) { console.error('Admin update error:', err); }
}

// ============================================= SOCKET CONNECTION =============================================
io.on('connection', (socket) => {
  const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address || socket.request?.connection?.remoteAddress || 'Unknown';
  if (bannedIPs.has(ip)) { socket.emit('banned', { message: 'Banned from Cremyxo.' }); socket.disconnect(); return; }
  console.log(`User connected: ${socket.id} | IP: ${ip}`);
  allUsers.set(socket.id, { socketId: socket.id, ip, name: 'Anonymous', status: 'online', connectedAt: new Date().toLocaleTimeString(), room: null, isAdmin: false });
  broadcastAdminUpdate();

  const now = Date.now();
  activeAnnouncements.forEach((announcement, id) => {
    const elapsed = Math.floor((now - announcement.timestamp) / 1000);
    const remaining = announcement.duration - elapsed;
    if (announcement.duration === 0 || remaining > 0) { socket.emit('announcement', { id: announcement.id, message: announcement.message, type: announcement.type, from: announcement.from || 'Cremyxo Admin', time: announcement.time, duration: announcement.duration, remaining: announcement.duration > 0 ? remaining : null }); }
  });

  socket.emit('freedom-wall-init', { posts: freedomWallPosts, stories: freedomWallStories });

  socket.on('set-name', (data) => { 
    const u = allUsers.get(socket.id); 
    if (u) { 
      u.name = data.name; 
      if (data.name === 'ADMIN') { u.isAdmin = true; } 
      else { 
        const existingNonAdminIP = [...allUsers.values()].find(user => user.ip === u.ip && !user.isAdmin && user.socketId !== socket.id);
        if (!existingNonAdminIP) { totalUniqueUsers++; } 
      }
      broadcastAdminUpdate(); 
    } 
  });

  socket.on('admin-kick', (data) => { const ts = io.sockets.sockets.get(data.socketId); if (ts) { ts.emit('kicked', { message: data.reason || 'Kicked.' }); ts.disconnect(); } });
  socket.on('admin-ban', (data) => { const u = allUsers.get(data.socketId); if (u) { bannedIPs.add(u.ip); saveJSON(FILES.bannedIPs, [...bannedIPs]); const ts = io.sockets.sockets.get(data.socketId); if (ts) { ts.emit('banned', { message: 'Banned.' }); ts.disconnect(); } } });
  socket.on('admin-mute', (data) => { mutedUsers.add(data.socketId); saveJSON(FILES.mutedUsers, [...mutedUsers]); const ts = io.sockets.sockets.get(data.socketId); if (ts) ts.emit('muted', { message: 'Muted.' }); broadcastAdminUpdate(); });
  socket.on('admin-unmute', (data) => { mutedUsers.delete(data.socketId); saveJSON(FILES.mutedUsers, [...mutedUsers]); broadcastAdminUpdate(); });
  socket.on('admin-close-room', (data) => { if (activeRooms.has(data.roomId)) { io.to(data.roomId).emit('system-message', { text: 'Room closed by admin.' }); io.to(data.roomId).emit('partner-left'); const r = activeRooms.get(data.roomId); r.users.forEach(u => { const uu = allUsers.get(u.id); if (uu) uu.room = null; }); activeRooms.delete(data.roomId); broadcastAdminUpdate(); } });
  socket.on('admin-announce', (data) => {
    const announcementId = Date.now().toString();
    const announcement = { id: announcementId, title: '📢 Announcement', message: data.message, type: data.type || 'info', duration: data.duration || 300, from: data.from || 'Cremyxo Admin', time: new Date().toLocaleTimeString(), timestamp: Date.now() };
    activeAnnouncements.set(announcementId, announcement); saveJSON(FILES.announcements, [...activeAnnouncements.values()]);
    io.emit('announcement', { id: announcementId, message: announcement.message, type: announcement.type, from: announcement.from, time: announcement.time, duration: announcement.duration });
    if (data.duration && data.duration > 0) { setTimeout(() => { activeAnnouncements.delete(announcementId); saveJSON(FILES.announcements, [...activeAnnouncements.values()]); io.emit('announcement-dismiss', { id: announcementId }); }, data.duration * 1000); }
    console.log(`📢 Announcement from ${announcement.from}: ${data.message}`);
  });

  socket.on('find-partner', (userData) => {
    const u = allUsers.get(socket.id); if (u) { u.name = userData.name; broadcastAdminUpdate(); }
    if (waitingUsers.find(w => w.id === socket.id)) return;
    for (const [rid, r] of activeRooms.entries()) { if (r.users.some(u => u.id === socket.id)) return; }
    const userObj = { id: socket.id, name: userData.name, socket };
    if (waitingUsers.length > 0) {
      const pi = waitingUsers.findIndex(w => w.id !== socket.id);
      if (pi === -1) { waitingUsers.push(userObj); socket.emit('waiting'); return; }
      const partner = waitingUsers.splice(pi, 1)[0]; const roomId = `room_${partner.id}_${socket.id}`;
      socket.join(roomId); partner.socket.join(roomId);
      activeRooms.set(roomId, { users: [{ id: partner.id, name: partner.name }, { id: socket.id, name: userObj.name }], createdAt: Date.now(), messageCount: 0 });
      const pu = allUsers.get(partner.id), cu = allUsers.get(socket.id); if (pu) pu.room = roomId; if (cu) cu.room = roomId;
      partner.socket.emit('chat-start', { roomId, partner: { name: userObj.name }, you: { name: partner.name } });
      socket.emit('chat-start', { roomId, partner: { name: partner.name }, you: { name: userObj.name } });
      io.to(roomId).emit('system-message', { text: 'Connected! Chat anonymously and be respectful. 🔒' });
      io.to(roomId).emit('partner-status', { online: true }); broadcastAdminUpdate();
    } else { waitingUsers.push(userObj); socket.emit('waiting'); }
  });

  // ============================================= SECURE send-message =============================================
  socket.on('send-message', (data) => {
    if (mutedUsers.has(socket.id)) { socket.emit('system-message', { text: 'You are muted.' }); return; }
    
    const u = allUsers.get(socket.id);
    const userIp = u?.ip || 'unknown';
    
    // Server-side rate limiting - 5 messages per 10 seconds
    if (!checkServerRateLimit(userIp, 'chat-msg', 5, 10000)) {
      socket.emit('system-message', { text: '⚠️ Sending too fast. Please slow down.' });
      return;
    }
    
    // Verify sender matches socket
    if (u && data.message.sender !== u.name) {
      console.log(`⚠️ Spoofed sender: ${socket.id} claimed to be ${data.message.sender}`);
      socket.emit('system-message', { text: '⚠️ Invalid sender identity.' });
      return;
    }
    
    // Validate message length
    if (data.message.text && data.message.text.length > 500) {
      socket.emit('system-message', { text: '⚠️ Message too long. Max 500 characters.' });
      return;
    }
    
    // Server-side spam check
    if (data.message.text && spamPattern.test(data.message.text)) {
      socket.emit('system-message', { text: '⚠️ Message contains prohibited content.' });
      return;
    }
    
    totalMessages++; 
    if (data.message.type === 'voice') { totalVoiceMessages++; totalVoiceDuration += data.message.duration || 0; }
    messageLog.push({ id: Date.now(), sender: data.message.sender, text: data.message.text, type: data.message.type || 'text', room: data.roomId, time: data.message.time, ip: userIp, socketId: socket.id });
    if (messageLog.length > 500) messageLog.shift();
    if (activeRooms.has(data.roomId)) activeRooms.get(data.roomId).messageCount = (activeRooms.get(data.roomId).messageCount || 0) + 1;
    socket.to(data.roomId).emit('receive-message', { text: data.message.text, time: data.message.time, sender: data.message.sender, type: data.message.type || 'text', audioUrl: data.message.audioUrl || null, duration: data.message.duration || 0 });
    broadcastAdminUpdate();
  });

  socket.on('report-user', (data) => { reportedUsers.push({ reportedBy: data.reportedBy, reportedUser: data.reportedUser, reason: data.reason, time: new Date().toLocaleTimeString(), roomId: data.roomId }); if (reportedUsers.length > 100) reportedUsers.shift(); saveJSON(FILES.reportedUsers, reportedUsers); broadcastAdminUpdate(); });
  socket.on('typing', (data) => { socket.to(data.roomId).emit('partner-typing', { isTyping: data.isTyping }); });
  socket.on('leave-chat', (data) => {
    socket.to(data.roomId).emit('partner-left'); socket.leave(data.roomId);
    if (activeRooms.has(data.roomId)) { const r = activeRooms.get(data.roomId); const p = r.users.find(u => u.id !== socket.id); if (p) { io.to(p.id).emit('system-message', { text: 'Partner left.' }); io.to(p.id).emit('partner-status', { online: false }); const pu = allUsers.get(p.id); if (pu) pu.room = null; } activeRooms.delete(data.roomId); }
    const cu = allUsers.get(socket.id); if (cu) cu.room = null; broadcastAdminUpdate();
  });

  socket.on('disconnect', () => {
    const u = allUsers.get(socket.id); if (u) u.status = 'offline';
    const idx = waitingUsers.findIndex(w => w.id === socket.id); if (idx !== -1) waitingUsers.splice(idx, 1);
    for (const [rid, r] of activeRooms.entries()) { if (r.users.some(u => u.id === socket.id)) { const p = r.users.find(u => u.id !== socket.id); if (p) { io.to(p.id).emit('partner-left'); io.to(p.id).emit('system-message', { text: 'Partner disconnected.' }); const pu = allUsers.get(p.id); if (pu) pu.room = null; } activeRooms.delete(rid); } }
    broadcastAdminUpdate(); 
    setTimeout(() => { allUsers.delete(socket.id); broadcastAdminUpdate(); }, 1000);
  });
});

// ============================================= BROADCAST REQUEST API =============================================
app.post('/api/broadcast-request', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
  if (!checkServerRateLimit(ip, 'broadcast-req', 3, 60000)) return res.status(429).json({ success: false, message: 'Too many requests. Wait a minute.' });
  
  const { name, message, duration, type, contact, selectedPackage } = req.body;
  if (!name || !message) return res.status(400).json({ success: false, message: 'Name and message required' });
  if (name.length > 50 || message.length > 500) return res.status(400).json({ success: false, message: 'Content too long' });
  if (spamPattern.test(name + ' ' + message)) return res.status(400).json({ success: false, message: 'Prohibited content detected' });
  
  const packagePrices = { '1hour': '₱25', '6hours': '₱99', '24hours': '₱199' };
  const request = { id: Date.now(), name, message, duration: parseInt(duration), type, contact, selectedPackage, status: 'pending', paid: packagePrices[selectedPackage] || '₱0', proof: 'Pending verification', time: new Date().toLocaleTimeString(), timestamp: Date.now() };
  broadcastRequests.push(request); saveJSON(FILES.broadcastRequests, broadcastRequests); io.emit('new-broadcast-request', request);
  console.log(`📨 New broadcast request from ${name}`); res.json({ success: true, message: 'Broadcast request submitted!' });
});
app.get('/api/broadcast-requests', (req, res) => { res.json(broadcastRequests); });
app.put('/api/broadcast-request/:id', (req, res) => {
  const { id } = req.params; const { status } = req.body;
  const request = broadcastRequests.find(r => r.id === parseInt(id));
  if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
  request.status = status;
  if (status === 'approved') {
    const announcementId = Date.now().toString();
    const announcement = { id: announcementId, message: request.message, type: request.type, duration: request.duration, from: request.name, time: new Date().toLocaleTimeString(), timestamp: Date.now() };
    activeAnnouncements.set(announcementId, announcement); saveJSON(FILES.announcements, [...activeAnnouncements.values()]);
    io.emit('announcement', { id: announcementId, message: announcement.message, type: announcement.type, from: announcement.from, time: announcement.time, duration: announcement.duration });
    if (request.duration > 0) { setTimeout(() => { activeAnnouncements.delete(announcementId); saveJSON(FILES.announcements, [...activeAnnouncements.values()]); io.emit('announcement-dismiss', { id: announcementId }); }, request.duration * 1000); }
  }
  saveJSON(FILES.broadcastRequests, broadcastRequests); io.emit('broadcast-request-updated', request); res.json({ success: true, request });
});

// ============================================= FREEDOM WALL APIs =============================================
app.get('/api/freedom-wall/posts', (req, res) => { res.json({ success: true, posts: freedomWallPosts }); });

app.post('/api/freedom-wall/posts', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
  if (!checkServerRateLimit(ip, 'fw-post', 3, 30000)) return res.status(429).json({ success: false, message: 'Too many posts. Please wait 30 seconds.' });
  
  const { username, message, images, audio, audioDuration } = req.body;
  if (!username) return res.status(400).json({ success: false, message: 'Username is required' });
  if (username.length > 24) return res.status(400).json({ success: false, message: 'Name too long' });
  if (reservedNames.includes(username.toLowerCase())) return res.status(400).json({ success: false, message: 'Name is reserved' });
  if (!message && (!images || images.length === 0) && !audio) return res.status(400).json({ success: false, message: 'Message, images, or audio is required' });
  if (message && message.length > 500) return res.status(400).json({ success: false, message: 'Message too long' });
  if (images && images.length > 5) return res.status(400).json({ success: false, message: 'Maximum 5 images per post' });
  if (audioDuration && audioDuration > 120) return res.status(400).json({ success: false, message: 'Audio too long. Max 2 minutes.' });
  if (message && spamPattern.test(message)) return res.status(400).json({ success: false, message: 'Message contains prohibited content' });
  
  const color = getUserColor(username);
  const newPost = { id: Date.now().toString(), username, message: message || '', timestamp: new Date().toISOString(), color, likes: 0, likedBy: [], images: images || null, audio: audio || null, audioDuration: audioDuration || 0, commentCount: 0 };
  freedomWallPosts.unshift(newPost); if (freedomWallPosts.length > 500) freedomWallPosts = freedomWallPosts.slice(0, 500); totalFWPosts++;
  saveJSON(FILES.freedomWallPosts, freedomWallPosts); io.emit('freedom-wall-new-post', newPost);
  console.log(`📝 New Freedom Wall post from ${username}${images ? ` (${images.length} photos)` : ''}`); broadcastAdminUpdate();
  res.json({ success: true, post: newPost });
});

app.put('/api/freedom-wall/posts/:id/like', (req, res) => {
  const { id } = req.params; const { username } = req.body;
  const post = freedomWallPosts.find(p => p.id === id);
  if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
  if (!post.likedBy) post.likedBy = [];
  const userIndex = post.likedBy.indexOf(username);
  if (userIndex === -1) { post.likedBy.push(username); post.likes = post.likedBy.length; }
  else { post.likedBy.splice(userIndex, 1); post.likes = post.likedBy.length; }
  saveJSON(FILES.freedomWallPosts, freedomWallPosts); io.emit('freedom-wall-post-updated', { id, likes: post.likes, likedBy: post.likedBy });
  res.json({ success: true, likes: post.likes, likedBy: post.likedBy });
});

app.delete('/api/freedom-wall/posts/:id', (req, res) => {
  const { id } = req.params; const { username } = req.query;
  const postIndex = freedomWallPosts.findIndex(p => p.id === id);
  if (postIndex === -1) return res.status(404).json({ success: false, message: 'Post not found' });
  if (freedomWallPosts[postIndex].username !== username) return res.status(403).json({ success: false, message: 'Not authorized to delete this post' });
  freedomWallPosts.splice(postIndex, 1); totalFWPosts = Math.max(0, totalFWPosts - 1);
  if (freedomWallComments[id]) { totalFWComments -= freedomWallComments[id].length; delete freedomWallComments[id]; }
  saveJSON(FILES.freedomWallPosts, freedomWallPosts); saveJSON(FILES.freedomWallComments, freedomWallComments);
  io.emit('freedom-wall-post-deleted', { id });
  console.log(`🗑️ Freedom Wall post deleted by ${username}`); broadcastAdminUpdate();
  res.json({ success: true, message: 'Post deleted' });
});

// ============================================= FREEDOM WALL COMMENTS APIs =============================================
app.get('/api/freedom-wall/comments/:postId', (req, res) => {
  const { postId } = req.params; const comments = freedomWallComments[postId] || [];
  res.json({ success: true, comments });
});

app.post('/api/freedom-wall/comments/:postId', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
  if (!checkServerRateLimit(ip, 'fw-comment', 5, 15000)) return res.status(429).json({ success: false, message: 'Too many comments. Slow down.' });
  
  const { postId } = req.params; const { username, text } = req.body;
  if (!username || !text || !text.trim()) return res.status(400).json({ success: false, message: 'Username and text required' });
  if (text.length > 500) return res.status(400).json({ success: false, message: 'Comment too long' });
  if (spamPattern.test(text)) return res.status(400).json({ success: false, message: 'Comment contains prohibited content' });
  
  if (!freedomWallComments[postId]) freedomWallComments[postId] = [];
  const comment = { id: Date.now().toString(), username, text: text.trim(), timestamp: new Date().toISOString() };
  freedomWallComments[postId].push(comment);
  if (freedomWallComments[postId].length > 200) freedomWallComments[postId] = freedomWallComments[postId].slice(-200);
  totalFWComments++;
  const post = freedomWallPosts.find(p => p.id === postId);
  if (post) { post.commentCount = (post.commentCount || 0) + 1; saveJSON(FILES.freedomWallPosts, freedomWallPosts); }
  saveJSON(FILES.freedomWallComments, freedomWallComments);
  io.emit('freedom-wall-new-comment', { postId, comment });
  res.json({ success: true, comment });
});

app.delete('/api/freedom-wall/comments/:postId/:commentId', (req, res) => {
  const { postId, commentId } = req.params; const { username } = req.query;
  if (!freedomWallComments[postId]) return res.status(404).json({ success: false, message: 'Post not found' });
  const commentIndex = freedomWallComments[postId].findIndex(c => c.id === commentId);
  if (commentIndex === -1) return res.status(404).json({ success: false, message: 'Comment not found' });
  if (freedomWallComments[postId][commentIndex].username !== username) return res.status(403).json({ success: false, message: 'Not authorized' });
  freedomWallComments[postId].splice(commentIndex, 1);
  totalFWComments = Math.max(0, totalFWComments - 1);
  const post = freedomWallPosts.find(p => p.id === postId);
  if (post) { post.commentCount = Math.max(0, (post.commentCount || 0) - 1); saveJSON(FILES.freedomWallPosts, freedomWallPosts); }
  saveJSON(FILES.freedomWallComments, freedomWallComments);
  io.emit('freedom-wall-comment-deleted', { postId, commentId });
  res.json({ success: true, message: 'Comment deleted' });
});

// ============================================= FREEDOM WALL STORIES APIs =============================================
app.get('/api/freedom-wall/stories', (req, res) => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  res.json({ success: true, stories: freedomWallStories.filter(s => s.timestamp > cutoff) });
});

app.post('/api/freedom-wall/stories', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
  if (!checkServerRateLimit(ip, 'fw-story', 3, 60000)) return res.status(429).json({ success: false, message: 'Too many stories. Wait a minute.' });
  
  const { username, image, caption } = req.body;
  if (!username || !image) return res.status(400).json({ success: false, message: 'Username and image required' });
  if (username.length > 24) return res.status(400).json({ success: false, message: 'Name too long' });
  if (caption && caption.length > 100) return res.status(400).json({ success: false, message: 'Caption too long' });
  if (caption && spamPattern.test(caption)) return res.status(400).json({ success: false, message: 'Caption contains prohibited content' });
  
  const color = getUserColor(username);
  const newStory = { id: Date.now().toString(), username, image, caption: caption || '', timestamp: Date.now(), color };
  freedomWallStories = freedomWallStories.filter(s => s.username !== username);
  freedomWallStories.unshift(newStory); if (freedomWallStories.length > 100) freedomWallStories = freedomWallStories.slice(0, 100); totalFWStories++;
  saveJSON(FILES.freedomWallStories, freedomWallStories); io.emit('freedom-wall-new-story', newStory);
  broadcastAdminUpdate(); res.json({ success: true, story: newStory });
});

app.delete('/api/freedom-wall/stories/:id', (req, res) => {
  const { id } = req.params; const { username } = req.query;
  const story = freedomWallStories.find(s => s.id === id);
  if (!story) return res.status(404).json({ success: false, message: 'Story not found' });
  if (story.username !== username) return res.status(403).json({ success: false, message: 'Not authorized' });
  freedomWallStories = freedomWallStories.filter(s => s.id !== id); totalFWStories = Math.max(0, totalFWStories - 1);
  saveJSON(FILES.freedomWallStories, freedomWallStories); io.emit('freedom-wall-story-deleted', { id });
  res.json({ success: true, message: 'Story deleted' });
});

// ============================================= CLEAR DATA API =============================================
app.post('/api/clear-data', (req, res) => {
  const { password } = req.body;
  if (password !== 'admin123') return res.status(403).json({ success: false, message: 'Invalid password' });
  broadcastRequests.length = 0; messageLog.length = 0; reportedUsers.length = 0; bannedIPs.clear(); mutedUsers.clear(); activeAnnouncements.clear();
  freedomWallPosts = []; freedomWallStories = []; freedomWallComments = {}; totalFWPosts = 0; totalFWStories = 0; totalFWComments = 0; totalUniqueUsers = 0;
  io.emit('announcement-dismiss', { id: 'clear-all' }); io.emit('freedom-wall-cleared');
  totalMessages = 0; totalVoiceMessages = 0; totalVoiceDuration = 0; saveAll();
  console.log('🗑️ All data cleared by admin!'); res.json({ success: true, message: 'All data cleared successfully' });
});

// ============================================= EXPORT APIs =============================================
app.get('/api/export/users', (req, res) => {
  const users = []; allUsers.forEach(v => users.push({ Name: v.name, IP: v.ip, SocketID: v.socketId, Status: v.status, ConnectedAt: v.connectedAt, Room: v.room || 'None' }));
  res.setHeader('Content-Type', 'text/csv'); res.setHeader('Content-Disposition', 'attachment; filename=cremyxo-users.csv');
  res.send(['Name,IP,SocketID,Status,ConnectedAt,Room', ...users.map(u => `${u.Name},${u.IP},${u.SocketID},${u.Status},${u.ConnectedAt},${u.Room}`)].join('\n'));
});
app.get('/api/export/messages', (req, res) => {
  res.setHeader('Content-Type', 'text/csv'); res.setHeader('Content-Disposition', 'attachment; filename=cremyxo-messages.csv');
  res.send(['Sender,Message,Type,Room,Time,IP', ...messageLog.map(m => `${m.sender},"${m.text.replace(/"/g,'""')}",${m.type},${m.room},${m.time},${m.ip}`)].join('\n'));
});
app.get('/api/export/freedom-wall', (req, res) => {
  res.setHeader('Content-Type', 'text/csv'); res.setHeader('Content-Disposition', 'attachment; filename=cremyxo-freedom-wall.csv');
  res.send(['Username,Message,Images,Audio,Likes,Comments,Time', ...freedomWallPosts.map(p => `${p.username},"${(p.message || '').replace(/"/g,'""')}",${p.images ? p.images.length : 0},${p.audio ? 'Yes' : 'No'},${p.likes},${p.commentCount || 0},${p.timestamp}`)].join('\n'));
});

// Since nasa server/ folder ka, kailangan umakyat ng isang level
app.use(express.static(path.join(__dirname, '..', 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// ============================================= START SERVER =============================================
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => { console.log(`🚀 Cremyxo server running on port ${PORT}`); console.log(`📁 Data directory: ${DATA_DIR}`); });

