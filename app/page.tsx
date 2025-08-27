import Link from "next/link";
("./inicio.css"); // Asegúrate que la ruta a tu CSS module es correcta

export default function Home() {
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
