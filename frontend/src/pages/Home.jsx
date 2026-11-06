import Navbar from '../components/Navbar'
import Landing from '../components/Landing'
// Estilos base de toda la app (también los de la campana de la barra)
import '../css/index.css'

export default function Home() {
  return (
    <>
      <Navbar />
      <Landing />
    </>
  )
}
