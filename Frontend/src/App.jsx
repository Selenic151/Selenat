import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import { MessageCacheProvider } from './context/MessageCacheContext.jsx';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ForgotPassword from './pages/ForgotPassword';
import ChatPage from './pages/ChatPage';
import ProtectedRoute from './components/Common/ProtectedRoute';
import PageTransition from './components/Common/PageTransition';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <MessageCacheProvider>
            <SocketProvider>
              <Routes>
                <Route path="/login" element={
                  <PageTransition>
                    <Login />
                  </PageTransition>
                } />
                <Route path="/register" element={
                  <PageTransition>
                    <Register />
                  </PageTransition>
                } />
                <Route path="/forgot-password" element={
                  <PageTransition>
                    <ForgotPassword />
                  </PageTransition>
                } />
                <Route
                  path="/chat"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <ChatPage />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route path="/" element={<Navigate to="/chat" replace />} />
              </Routes>
            </SocketProvider>
          </MessageCacheProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;