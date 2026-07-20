import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import IntroSplash from './Components/Users/IntroSplash';
import Hero from './Components/Users/Hero';
import TermsPrivacy from './Components/Users/TermsPrivacy';
import CreateProfile from './Components/Users/CreateProfile';
import SelectMode from './Components/Users/SelectMode';
import FreedomWall from './Components/Users/FreedomWall';
import Loading from './Components/Users/Loading';
import ChatPage from './Components/Users/ChatPage';
import BroadcastPage from './Components/Users/BroadcastPage';
import CommunityPage from './Components/Users/CommunityPage';
import AdminPanel from './Components/Admin/AdminPanel';
import { AnnouncementProvider } from './context/AnnouncementContext';

const ADMIN_PATH = '/cremyxo-control-2024-x7k9';

const App = () => {
  return (
    <Router>
      <AnnouncementProvider>
        <Routes>
          <Route path="/" element={<IntroSplash />} />
          <Route path="/home" element={<Hero />} />
          <Route path="/terms" element={<TermsPrivacy />} />
          <Route path="/create-profile" element={<CreateProfile />} />
          <Route path="/select-mode" element={<SelectMode />} />
          <Route path="/freedom-wall" element={<FreedomWall />} />
          <Route path="/loading" element={<Loading />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/broadcast" element={<BroadcastPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path={ADMIN_PATH} element={<AdminPanel />} />
          <Route path="/admin" element={<Hero />} />
        </Routes>
      </AnnouncementProvider>
    </Router>
  );
};

export default App;