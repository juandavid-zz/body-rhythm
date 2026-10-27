import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import HomeSections from '../components/HomeSections'
import '../css/index.css'

export default function Home() {
  return (
    <div className="home-fondo">
      <Navbar />
      <Hero />
      <HomeSections />
    </div>
  )
}
