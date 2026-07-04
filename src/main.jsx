import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { RouterProvider } from 'react-router-dom'
import routers from './routes/Routes.jsx'
import { SocketProvider } from './hooks/socket.io/socketContext.jsx'
import { AuthProvider } from './dashboard/auth/AuthContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <SocketProvider>
        <RouterProvider router={routers} />
      </SocketProvider>
    </AuthProvider>
  </StrictMode>,
)