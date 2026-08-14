import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import ChatbotRutina from "./pages/ChatbotRutina";
import Progreso from "./pages/Progreso";
import Ejercicios from "./pages/ejercicios/Ejercicios";
import EjercicioDetalle from "./pages/ejercicios/EjercicioDetalle";
import Planes from "./pages/Planes"; 
import FormularioPago from "./pages/FormularioPago";
import PagoExitoso from "./pages/PagoExitoso";
function RutaProtegida({ children }) {
  const token = localStorage.getItem("token");

  return token
    ? children
    : <Navigate to="/auth?modo=login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route path="/" element={<Home />} />

        <Route path="/auth" element={<AuthPage />} />

        <Route
          path="/dashboard"
          element={
            <RutaProtegida>
              <Dashboard />
            </RutaProtegida>
          }
        />

        <Route
          path="/progreso"
          element={
            <RutaProtegida>
              <Progreso />
            </RutaProtegida>
          }
        />

        <Route
          path="/chatbot"
          element={
            <RutaProtegida>
              <ChatbotRutina />
            </RutaProtegida>
          }
        />

        <Route
          path="/ejercicios"
          element={
            <RutaProtegida>
              <Ejercicios />
            </RutaProtegida>
          }
        />

        <Route
          path="/ejercicios/:id"
          element={
            <RutaProtegida>
              <EjercicioDetalle />
            </RutaProtegida>
          }
        />

<Route path="/planes" element={<Planes />} />
<Route
  path="/pago"
  element={
    <RutaProtegida>
      <FormularioPago />
    </RutaProtegida>
  }
/>

<Route
  path="/pago-exitoso"
  element={
    <RutaProtegida>
      <PagoExitoso />
    </RutaProtegida>
  }
/>
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>

    </BrowserRouter>
  );
}