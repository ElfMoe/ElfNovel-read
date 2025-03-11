import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { UserProvider } from './contexts/UserContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Search from './pages/Search';
import NovelDetail from './pages/NovelDetail';
import NovelPage from './pages/NovelPage';
import ChapterList from './pages/ChapterList';
import EmailVerification from './pages/EmailVerification';
import Verify from './pages/Verify';
import Favorites from './pages/reader/Favorites';
import History from './pages/reader/History';
import Dashboard from './pages/author/Dashboard';
import Novels from './pages/author/Novels';
import CreateNovel from './pages/author/CreateNovel';
import EditNovel from './pages/author/EditNovel';
import ManageChapters from './pages/author/ManageChapters';
import CreateChapter from './pages/author/CreateChapter';
import EditChapter from './pages/author/EditChapter';
import NotFound from './pages/NotFound';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Profile from './pages/Profile';
import UserHome from './pages/UserHome';
import NovelLibrary from './pages/NovelLibrary';

function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<EmailVerification />} />
              <Route path="/verify" element={<Verify />} />
              <Route path="/search" element={<Search />} />
              <Route path="/novels" element={<NovelLibrary />} />
              <Route path="/novel/:id" element={<NovelDetail />} />
              <Route path="/novel/:id/read" element={<NovelPage />} />
              <Route path="/novel/:id/read/:chapterId" element={<NovelPage />} />
              <Route path="/novel/:id/chapters" element={<ChapterList />} />
              <Route path="/reader/favorites" element={<Favorites />} />
              <Route path="/reader/history" element={<History />} />
              <Route path="/author/dashboard" element={<Dashboard />} />
              <Route path="/author/novels" element={<Novels />} />
              <Route path="/author/novels/create" element={<CreateNovel />} />
              <Route path="/author/novels/:novelId" element={<EditNovel />} />
              <Route path="/author/novels/:novelId/chapters" element={<ManageChapters />} />
              <Route path="/author/novels/:novelId/chapters/create" element={<CreateChapter />} />
              <Route path="/author/novels/:novelId/chapters/:chapterId/edit" element={<EditChapter />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/user-home" element={<UserHome />} />
              <Route path="/user/:userId" element={<UserHome />} />
              <Route path="/author/novels/edit/:id" element={<EditNovel />} />
              <Route path="/author/novels/:id/chapters" element={<ManageChapters />} />
              <Route path="/novels/:novelId/chapters/:chapterId" element={<NovelPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </Router>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;
