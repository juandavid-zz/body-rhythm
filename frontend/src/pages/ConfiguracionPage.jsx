import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import api from "../api/api";
import Navbar from "../components/Navbar";
import { cumpleMinimoBackend } from "../components/Auth/passwordUtils";
import { normalizarUsername, useDisponibilidadUsername } from "../components/Auth/usernameUtils";
import "../css/configuracion.css";

const METAS = [
  { value: "perder_peso", label: "Perder peso" },
  { value: "ganar_musculo", label: "Ganar músculo" },
  { value: "mantenerse", label: "Mantenerse" },
  { value: "mejorar_resistencia", label: "Mejorar resistencia" },
];

const GENEROS = [
  { value: "masculino", label: "Masculino" },
  { value: "femenino", label: "Femenino" },
  { value: "otro", label: "Otro" },
];

const CAMPOS_PERFIL = ["nombre", "username", "meta", "peso", "altura", "fecha_nacimiento", "genero"];

const SWAL_BASE = { confirmButtonColor: "#50118c", cancelButtonColor: "#6b7280" };

// Lo que llega de la API → valores del formulario (los inputs no aceptan null)
const aFormulario = (cuenta) =>
  Object.fromEntries(CAMPOS_PERFIL.map((campo) => [campo, cuenta[campo] ?? ""]));

// Primer mensaje de error de una respuesta de DRF
const primerError = (data, porDefecto) => {
  if (!data) return porDefecto;
  if (data.error) return data.error;
  const primero = Object.values(data)[0];
  return Array.isArray(primero) ? primero[0] : porDefecto;
};

function Interruptor({ id, activo, onCambio, titulo, descripcion, deshabilitado }) {
  return (
    <div className="cfg-fila">
      <label htmlFor={id} className="cfg-fila-texto">
        <strong>{titulo}</strong>
        <span>{descripcion}</span>
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={activo}
        aria-label={titulo}
        className={`cfg-switch ${activo ? "activo" : ""}`}
        onClick={() => onCambio(!activo)}
        disabled={deshabilitado}
      >
        <span />
      </button>
    </div>
  );
}

// ── Perfil ──
function SeccionPerfil({ cuenta, onGuardado }) {
  const [form, setForm] = useState(() => aFormulario(cuenta));
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
  const [guardando, setGuardando] = useState(false);

  const disponibilidad = useDisponibilidadUsername(form.username);
  const usernameEsElMio = normalizarUsername(form.username) === cuenta.username;
  const usernameValido = usernameEsElMio || ["libre", "desconocido"].includes(disponibilidad.estado);

  const original = aFormulario(cuenta);
  const cambiado = CAMPOS_PERFIL.some((campo) => String(form[campo]) !== String(original[campo]));

  const cambiar = (evento) => {
    const { name, value } = evento.target;
    setForm({ ...form, [name]: name === "username" ? normalizarUsername(value) : value });
    setMensaje({ tipo: "", texto: "" });
  };

  const guardar = async (evento) => {
    evento.preventDefault();
    if (!usernameValido) return;
    setGuardando(true);
    try {
      // Los campos vacíos se mandan como null para poder borrarlos
      const datos = Object.fromEntries(
        CAMPOS_PERFIL.map((campo) => [campo, form[campo] === "" ? null : form[campo]])
      );
      const res = await api.patch("/usuarios/me/", datos);
      localStorage.setItem("nombre", res.data.nombre);
      localStorage.setItem("username", res.data.username);
      onGuardado(res.data);
      setForm(aFormulario(res.data));
      setMensaje({ tipo: "exito", texto: "Cambios guardados." });
    } catch (error) {
      setMensaje({ tipo: "error", texto: primerError(error.response?.data, "No se pudieron guardar los cambios.") });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form className="cfg-panel" onSubmit={guardar}>
      <h2>Perfil</h2>

      <div className="cfg-campos">
        <label className="cfg-campo">
          <span>Nombre</span>
          <input name="nombre" value={form.nombre} onChange={cambiar} maxLength={100} required />
        </label>

        <label className="cfg-campo">
          <span>Nombre de usuario</span>
          <div className="cfg-prefijo">
            <em>@</em>
            <input name="username" value={form.username} onChange={cambiar} maxLength={30}
              autoCapitalize="none" spellCheck="false" required />
          </div>
          {!usernameEsElMio && disponibilidad.estado === "comprobando" && <small>Comprobando…</small>}
          {!usernameEsElMio && disponibilidad.estado === "libre" && <small className="ok">Disponible</small>}
          {!usernameEsElMio && ["invalido", "ocupado"].includes(disponibilidad.estado) && (
            <small className="mal">{disponibilidad.mensaje}</small>
          )}
        </label>

        <label className="cfg-campo">
          <span>Correo</span>
          <input value={cuenta.email} disabled />
          <small>El correo no se puede cambiar.</small>
        </label>

        <label className="cfg-campo">
          <span>Meta</span>
          <select name="meta" value={form.meta} onChange={cambiar}>
            <option value="">Sin definir</option>
            {METAS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>

        <label className="cfg-campo">
          <span>Peso (kg)</span>
          <input name="peso" type="number" step="0.1" min="20" max="400" value={form.peso} onChange={cambiar} />
        </label>

        <label className="cfg-campo">
          <span>Altura (m)</span>
          <input name="altura" type="number" step="0.01" min="1" max="2.6" value={form.altura} onChange={cambiar} />
        </label>

        <label className="cfg-campo">
          <span>Fecha de nacimiento</span>
          <input name="fecha_nacimiento" type="date" value={form.fecha_nacimiento} onChange={cambiar} />
        </label>

        <label className="cfg-campo">
          <span>Género</span>
          <select name="genero" value={form.genero} onChange={cambiar}>
            <option value="">Prefiero no decirlo</option>
            {GENEROS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </label>
      </div>

      <p className="cfg-nota">El peso, la altura y la meta se usan para calcular tu IMC y generar tus rutinas.</p>

      <div className="cfg-pie">
        {mensaje.texto && <p className={`cfg-mensaje ${mensaje.tipo}`}>{mensaje.texto}</p>}
        <button type="submit" className="cfg-btn primario" disabled={!cambiado || !usernameValido || guardando}>
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}

// ── Privacidad: se guarda al tocar cada interruptor ──
function SeccionPrivacidad({ cuenta, onGuardado }) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const cambiar = async (campo, valor) => {
    if (campo === "cuenta_privada" && !valor) {
      const { isConfirmed } = await Swal.fire({
        ...SWAL_BASE,
        title: "¿Hacer pública tu cuenta?",
        text: "Cualquiera podrá ver tus entrenamientos compartidos y seguirte sin pedir permiso. Las solicitudes pendientes se aceptarán.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Hacer pública",
        cancelButtonText: "Cancelar",
      });
      if (!isConfirmed) return;
    }

    setGuardando(true);
    setError("");
    onGuardado({ ...cuenta, [campo]: valor }); // se ve al instante
    try {
      const res = await api.patch("/usuarios/me/", { [campo]: valor });
      onGuardado(res.data);
    } catch {
      onGuardado(cuenta);
      setError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="cfg-panel">
      <h2>Privacidad</h2>
      <div className="cfg-lista">
        <Interruptor
          id="cuenta-privada"
          titulo="Cuenta privada"
          descripcion={
            cuenta.cuenta_privada
              ? "Solo tus seguidores aprobados ven tus entrenamientos. Quien quiera seguirte te enviará una solicitud."
              : "Cualquiera puede seguirte al instante y ver tus entrenamientos compartidos."
          }
          activo={cuenta.cuenta_privada}
          onCambio={(valor) => cambiar("cuenta_privada", valor)}
          deshabilitado={guardando}
        />
        <Interruptor
          id="compartir-defecto"
          titulo="Compartir mis entrenamientos"
          descripcion="Cada entrenamiento que termines se publica en tu perfil y en el feed de tus seguidores. Puedes ocultar uno en concreto desde su tarjeta."
          activo={cuenta.compartir_por_defecto}
          onCambio={(valor) => cambiar("compartir_por_defecto", valor)}
          deshabilitado={guardando}
        />
      </div>
      {error && <p className="cfg-mensaje error">{error}</p>}
    </section>
  );
}

// ── Seguridad ──
function SeccionSeguridad() {
  const VACIO = { actual: "", nueva: "", confirmar: "" };
  const [form, setForm] = useState(VACIO);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
  const [guardando, setGuardando] = useState(false);

  const coinciden = form.nueva === form.confirmar;
  const valido = form.actual && cumpleMinimoBackend(form.nueva) && coinciden;

  const cambiar = (evento) => {
    setForm({ ...form, [evento.target.name]: evento.target.value });
    setMensaje({ tipo: "", texto: "" });
  };

  const guardar = async (evento) => {
    evento.preventDefault();
    setGuardando(true);
    try {
      await api.post("/usuarios/me/password/", { actual: form.actual, nueva: form.nueva });
      setForm(VACIO);
      setMensaje({ tipo: "exito", texto: "Contraseña actualizada." });
    } catch (error) {
      setMensaje({ tipo: "error", texto: primerError(error.response?.data, "No se pudo cambiar la contraseña.") });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form className="cfg-panel" onSubmit={guardar}>
      <h2>Contraseña</h2>
      <div className="cfg-campos">
        <label className="cfg-campo completo">
          <span>Contraseña actual</span>
          <input name="actual" type="password" value={form.actual} onChange={cambiar} autoComplete="current-password" />
        </label>
        <label className="cfg-campo">
          <span>Nueva contraseña</span>
          <input name="nueva" type="password" value={form.nueva} onChange={cambiar} autoComplete="new-password" />
          {form.nueva && !cumpleMinimoBackend(form.nueva) && <small className="mal">Mínimo 8 caracteres.</small>}
        </label>
        <label className="cfg-campo">
          <span>Repite la nueva contraseña</span>
          <input name="confirmar" type="password" value={form.confirmar} onChange={cambiar} autoComplete="new-password" />
          {form.confirmar && !coinciden && <small className="mal">No coinciden.</small>}
        </label>
      </div>
      <div className="cfg-pie">
        {mensaje.texto && <p className={`cfg-mensaje ${mensaje.tipo}`}>{mensaje.texto}</p>}
        <button type="submit" className="cfg-btn primario" disabled={!valido || guardando}>
          {guardando ? "Cambiando…" : "Cambiar contraseña"}
        </button>
      </div>
    </form>
  );
}

// ── Cuenta: cerrar sesión y eliminar ──
function SeccionCuenta() {
  const navigate = useNavigate();

  const salir = () => {
    ["token", "refresh", "nombre", "username"].forEach((clave) => localStorage.removeItem(clave));
    navigate("/");
    window.location.reload();
  };

  const eliminar = async () => {
    const { value: password } = await Swal.fire({
      ...SWAL_BASE,
      title: "Eliminar tu cuenta",
      html: "Se borrarán tu perfil, tus rutinas, tus entrenamientos y tus seguidores. <b>No se puede deshacer.</b><br><br>Escribe tu contraseña para confirmar:",
      input: "password",
      inputAttributes: { autocomplete: "current-password" },
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Eliminar definitivamente",
      cancelButtonText: "Cancelar",
      inputValidator: (valor) => (!valor ? "Escribe tu contraseña" : undefined),
    });
    if (!password) return;

    try {
      await api.delete("/usuarios/me/", { data: { password } });
      await Swal.fire({ ...SWAL_BASE, title: "Cuenta eliminada", icon: "success" });
      salir();
    } catch (error) {
      Swal.fire({ ...SWAL_BASE, title: "No se eliminó", text: primerError(error.response?.data, "Intenta de nuevo."), icon: "error" });
    }
  };

  return (
    <section className="cfg-panel">
      <h2>Cuenta</h2>
      <div className="cfg-lista">
        <div className="cfg-fila">
          <div className="cfg-fila-texto">
            <strong>Cerrar sesión</strong>
            <span>Sal de tu cuenta en este navegador.</span>
          </div>
          <button type="button" className="cfg-btn" onClick={salir}>Cerrar sesión</button>
        </div>
        <div className="cfg-fila">
          <div className="cfg-fila-texto">
            <strong>Eliminar cuenta</strong>
            <span>Borra tu cuenta y todos tus datos para siempre.</span>
          </div>
          <button type="button" className="cfg-btn peligro" onClick={eliminar}>Eliminar</button>
        </div>
      </div>
    </section>
  );
}

export default function ConfiguracionPage() {
  const [cuenta, setCuenta] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    api
      .get("/usuarios/me/")
      .then((res) => activo && setCuenta(res.data))
      .catch(() => activo && setError("No se pudo cargar tu cuenta."));
    return () => {
      activo = false;
    };
  }, []);

  return (
    <>
      <Navbar />
      <main className="cfg-page">
        <div className="cfg-contenedor">
          <h1>Configuración</h1>
          {error && <p className="cfg-mensaje error">{error}</p>}
          {!cuenta && !error && <p className="cfg-nota">Cargando…</p>}
          {cuenta && (
            <>
              <SeccionPerfil cuenta={cuenta} onGuardado={setCuenta} />
              <SeccionPrivacidad cuenta={cuenta} onGuardado={setCuenta} />
              <SeccionSeguridad />
              <SeccionCuenta />
            </>
          )}
        </div>
      </main>
    </>
  );
}
