import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import Home from './pages/Home'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import ChatbotRutina from './pages/ChatbotRutina'
import Progreso from './pages/Progreso'

import Ejercicios from './pages/ejercicios/Ejercicios'
import EjercicioDetalle from './pages/ejercicios/EjercicioDetalle'

import Navbar from './components/Navbar'


function RutaProtegida({ children }) {

  const token = localStorage.getItem('token')

  return token 
    ? children 
    : <Navigate to="/auth?modo=login" replace />

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


        {/* Inicio */}

        <Route 
          path="/" 
          element={<Home />} 
        />



        {/* Login Registro */}

        <Route 
          path="/auth" 
          element={<AuthPage />} 
        />




        {/* Dashboard */}

        <Route

          path="/dashboard"

          element={

            <RutaProtegida>

              <Layout>

                <Dashboard />

              </Layout>

            </RutaProtegida>

          }

        />





        {/* Progreso */}

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





        {/* Chatbot */}

        <Route

          path="/chatbot"

          element={

            <RutaProtegida>

              <Layout>

                <ChatbotRutina />

              </Layout>

            </RutaProtegida>

          }

        />





        {/* Ejercicios */}

        <Route

          path="/ejercicios"

          element={

            <RutaProtegida>

              <Layout>

                <Ejercicios />

              </Layout>

            </RutaProtegida>

          }

        />





        {/* Detalle ejercicio */}

        <Route

          path="/ejercicios/:id"

          element={

            <RutaProtegida>

              <Layout>

                <EjercicioDetalle />

              </Layout>

            </RutaProtegida>

          }

        />





        {/* Ruta inexistente */}

        <Route

          path="*"

          element={<Navigate to="/" replace />}

        />


      </Routes>


    </BrowserRouter>

  )

}