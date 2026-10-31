import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Inicio y login se cargan de una; el resto de páginas se descarga al visitarlas
// para que la primera carga no traiga todo el JS (gráficas, chat, etc.)
import Home from "./pages/Home";
import AuthPage from "./pages/AuthPage";
const RutinasPage = lazy(() => import("./pages/RutinasPage"));
const ActiveWorkoutPage = lazy(() => import("./pages/ActiveWorkoutPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const NutricionPage = lazy(() => import("./pages/NutricionPage"));
const VerificarPage = lazy(() => import("./pages/VerificarPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ChatbotRutina = lazy(() => import("./pages/ChatbotRutina"));
const Progreso = lazy(() => import("./pages/Progreso"));
const Ejercicios = lazy(() => import("./pages/ejercicios/ejercicios"));
const EjercicioDetalle = lazy(() => import("./pages/ejercicios/ejercicioDetalle"));
const Planes = lazy(() => import("./pages/Planes"));
const FormularioPago = lazy(() => import("./pages/FormularioPago"));
const PagoExitoso = lazy(() => import("./pages/PagoExitoso"));
const EsperandoVerificacion = lazy(() => import("./pages/EsperandoVerificacion"));
const ComunidadPage = lazy(() => import("./pages/ComunidadPage"));
const PerfilPage = lazy(() => import("./pages/PerfilPage"));
const MiPerfil = lazy(() => import("./pages/MiPerfil"));
const ConfiguracionPage = lazy(() => import("./pages/ConfiguracionPage"));

// Mientras llega una página: fondo oscuro, sin parpadeo blanco
const Cargando = () => <div style={{ minHeight: "100vh", background: "#07060d" }} aria-busy="true" />;

function RutaProtegida({ children }) {
  const token = localStorage.getItem("token");

  return token
    ? children
    : <Navigate to="/auth?modo=login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Cargando />}>
      <Routes>

        <Route path="/" element={<Home />} />

        <Route path="/auth" element={<AuthPage />} />
        <Route path="/verificar/:token" element={<VerificarPage />} />
<Route path="/verificacion-pendiente" element={<EsperandoVerificacion />} />

        <Route
          path="/rutinas"
          element={
            <RutaProtegida>
              <RutinasPage />
            </RutaProtegida>
          }
        />

        <Route
          path="/rutinas/entrenamiento"
          element={
            <RutaProtegida>
              <ActiveWorkoutPage />
            </RutaProtegida>
          }
        />

        <Route
          path="/admin"
          element={
            <RutaProtegida>
              <AdminPage />
            </RutaProtegida>
          }
        />
        <Route
          path="/nutricion"
          element={
            <RutaProtegida>
              <NutricionPage />
            </RutaProtegida>
          }
        />

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

        <Route
          path="/comunidad"
          element={
            <RutaProtegida>
              <ComunidadPage />
            </RutaProtegida>
          }
        />

        <Route
          path="/perfil"
          element={
            <RutaProtegida>
              <MiPerfil />
            </RutaProtegida>
          }
        />

        <Route
          path="/perfil/:username"
          element={
            <RutaProtegida>
              <PerfilPage />
            </RutaProtegida>
          }
        />

        <Route
          path="/configuracion"
          element={
            <RutaProtegida>
              <ConfiguracionPage />
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
      </Suspense>
    </BrowserRouter>
  );
}
