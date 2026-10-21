import { iniciales } from "../../utils/formato";

export default function Avatar({ nombre, grande = false }) {
  return (
    <span className={`social-avatar ${grande ? "grande" : ""}`} aria-hidden="true">
      {iniciales(nombre)}
    </span>
  );
}
