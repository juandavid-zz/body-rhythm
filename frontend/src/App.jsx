import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import Home from './pages/Home'
import AuthPage from './pages/AuthPage'
import Progreso from './pages/Progreso'

import Navbar from './components/Navbar'

function RutaProtegida({ children }) {
  const token = localStorage.getItem('token')

  return token ? children : <Navigate to="/auth?modo=login" replace />
}

function Layout({ children }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route path="/" element={<Home />} />

        <Route path="/auth" element={<AuthPage />} />

        <Route
          path="/progreso"
          element={
            <RutaProtegida>
              <Layout>
                <Progreso />
              </Layout>
            </RutaProtegida>
          }
        />

      </Routes>

    </BrowserRouter>
  )
}