// app/page.tsx
import Link from "next/link";
import "./inicio.css"; // CORRECCIÓN: Se cambió de ("./inicio.css") a una importación estándar.
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/efectos");
  return (
    <div className="page">
      <main className="main">
        {/* Este Link de Next.js te llevará a la página de efectos */}
        <Link href="/efectos" legacyBehavior>
          <a className="primary">Ir a Efectos</a>
        </Link>
      </main>
    </div>
  );
}