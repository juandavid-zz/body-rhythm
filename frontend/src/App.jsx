import { Navigate } from "react-router-dom";
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import AuthPage from './pages/AuthPage'
import Ejercicios from "./pages/ejercicios/Ejercicios";
import EjercicioDetalle from "./pages/ejercicios/EjercicioDetalle";

function RutaProtegida({ children }) {
  const token = localStorage.getItem("token");

  return token ? children : <Navigate to="/auth?modo=login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/ejercicios"
          element={
            <RutaProtegida>
              <Ejercicios />
            </RutaProtegida>
          }
        />
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/ejercicios/:id"
          element={
            <RutaProtegida>
              <EjercicioDetalle />
            </RutaProtegida>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}