import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import AuthPage from './pages/AuthPage'
import RutinasPage from './pages/RutinasPage'
import ActiveWorkoutPage from './pages/ActiveWorkoutPage'
import AdminPage from './pages/AdminPage'
import NutricionPage from './pages/NutricionPage'
import VerificarPage from './pages/VerificarPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/rutinas" element={<RutinasPage />} />
        <Route path="/rutinas/entrenamiento" element={<ActiveWorkoutPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/nutricion" element={<NutricionPage />} />
        <Route path="/verificar/:token" element={<VerificarPage />} />
      </Routes>
    </BrowserRouter>
  )
}