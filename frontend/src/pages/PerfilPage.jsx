import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/api";
import Navbar from "../components/Navbar";
import Avatar from "../components/social/Avatar";
import BotonSeguir from "../components/social/BotonSeguir";
import CompararModal from "../components/social/CompararModal";
import ListaUsuariosModal from "../components/social/ListaUsuariosModal";
import TarjetaEntrenamiento from "../components/social/TarjetaEntrenamiento";
import "../css/social.css";

export default function PerfilPage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [version, setVersion] = useState(0);
  const [datos, setDatos] = useState({ clave: null, perfil: null, entrenamientos: [], error: "" });
  const [lista, setLista] = useState(null); // 'seguidores' | 'seguidos' | null
  const [comparando, setComparando] = useState(false);

  const clave = `${username}:${version}`;

  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      try {
        const { data: perfil } = await api.get(`/social/perfiles/${username}/`);
        let entrenamientos = [];
        if (perfil.puede_ver) {
          const res = await api.get(`/social/perfiles/${username}/entrenamientos/`);
          entrenamientos = res.data.resultados;
        }
        if (activo) setDatos({ clave, perfil, entrenamientos, error: "" });
      } catch (error) {
        if (activo) {
          setDatos({
            clave,
            perfil: null,
            entrenamientos: [],
            error: error.response?.status === 404 ? "Este usuario no existe." : "No se pudo cargar el perfil.",
          });
        }
      }
    };

    cargar();
    return () => {
      activo = false;
    };
  }, [username, clave]);

  const recargar = () => setVersion((v) => v + 1);
  // Mientras llega otro perfil no se muestra el anterior; al recargar el mismo, sí
  const perfil = datos.clave?.split(":")[0] === username ? datos.perfil : null;
  const cargando = !perfil && datos.clave !== clave;

  const responderSolicitud = async (aceptar) => {
    const ruta = `/social/solicitudes/${perfil.solicitud_recibida_id}/`;
    if (aceptar) await api.post(ruta);
    else await api.delete(ruta);
    recargar();
  };

  const actualizarEntrenamiento = (registro) =>
    setDatos((previo) => ({
      ...previo,
      entrenamientos: previo.entrenamientos.map((r) => (r.id === registro.id ? registro : r)),
    }));

  return (
    <>
      <Navbar />
      <main className="social-page">
        <div className="social-contenedor">
          {cargando && <p className="social-vacio">Cargando…</p>}
          {!cargando && datos.error && <p className="social-vacio">{datos.error}</p>}

          {perfil && (
            <>
              <header className="social-perfil">
                <Avatar nombre={perfil.nombre} foto={perfil.foto} grande />
                <div className="social-perfil-datos">
                  <div className="social-perfil-titulo">
                    <div>
                      <h1>
                        {perfil.nombre}
                        {perfil.cuenta_privada && (
                          <span className="social-candado" title="Cuenta privada" aria-label="Cuenta privada"> 🔒</span>
                        )}
                      </h1>
                      <p>
                        @{perfil.username}
                        {perfil.te_sigue && <em className="social-te-sigue">Te sigue</em>}
                      </p>
                    </div>
                    {perfil.relacion === "yo" ? (
                      <button type="button" className="social-btn-secundario" onClick={() => navigate("/configuracion")}>
                        Editar perfil
                      </button>
                    ) : (
                      <div className="social-acciones">
                        {perfil.puede_ver && (
                          <button type="button" className="social-btn-secundario" onClick={() => setComparando(true)}>
                            Comparar
                          </button>
                        )}
                        <BotonSeguir usuario={perfil} onCambio={recargar} />
                      </div>
                    )}
                  </div>

                  <ul className="social-perfil-contadores">
                    <li>
                      <strong>{perfil.entrenamientos}</strong> entrenamientos
                    </li>
                    <li>
                      <button type="button" onClick={() => perfil.puede_ver && setLista("seguidores")} disabled={!perfil.puede_ver}>
                        <strong>{perfil.seguidores}</strong> seguidores
                      </button>
                    </li>
                    <li>
                      <button type="button" onClick={() => perfil.puede_ver && setLista("seguidos")} disabled={!perfil.puede_ver}>
                        <strong>{perfil.seguidos}</strong> seguidos
                      </button>
                    </li>
                  </ul>

                  {perfil.meta && <p className="social-perfil-meta">🎯 {perfil.meta}</p>}

                  {perfil.insignias?.length > 0 && (
                    <ul className="social-insignias" aria-label="Insignias">
                      {perfil.insignias.map((insignia) => (
                        <li key={insignia.id} title={insignia.descripcion}>
                          {insignia.titulo}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </header>

              {perfil.solicitud_recibida_id && (
                <div className="social-aviso">
                  <span>@{perfil.username} quiere seguirte.</span>
                  <div className="social-acciones">
                    <button type="button" className="social-btn-primario" onClick={() => responderSolicitud(true)}>
                      Aceptar
                    </button>
                    <button type="button" className="social-btn-secundario" onClick={() => responderSolicitud(false)}>
                      Rechazar
                    </button>
                  </div>
                </div>
              )}

              <section className="social-seccion">
                <h2 className="social-kicker">Entrenamientos</h2>

                {!perfil.puede_ver && (
                  <div className="social-vacio-grande">
                    <span>🔒</span>
                    <h3>Esta cuenta es privada</h3>
                    <p>
                      {perfil.relacion === "pendiente"
                        ? "Tu solicitud está pendiente. Cuando la acepten verás sus entrenamientos."
                        : `Sigue a @${perfil.username} para ver sus entrenamientos.`}
                    </p>
                  </div>
                )}

                {perfil.puede_ver && datos.entrenamientos.length === 0 && (
                  <p className="social-vacio">
                    {perfil.relacion === "yo"
                      ? "Cuando termines una rutina aparecerá aquí."
                      : "Todavía no ha compartido entrenamientos."}
                  </p>
                )}

                <div className="social-feed">
                  {datos.entrenamientos.map((registro) => (
                    <TarjetaEntrenamiento
                      key={registro.id}
                      registro={registro}
                      esPropio={perfil.relacion === "yo"}
                      onActualizar={actualizarEntrenamiento}
                    />
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      {comparando && perfil && <CompararModal username={perfil.username} onCerrar={() => setComparando(false)} />}

      {lista && perfil && (
        <ListaUsuariosModal
          username={perfil.username}
          tipo={lista}
          esPropio={perfil.relacion === "yo"}
          onCerrar={() => setLista(null)}
          onCambio={recargar}
        />
      )}
    </>
  );
}
