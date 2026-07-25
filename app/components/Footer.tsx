import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-jedco-dark text-white py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Image
            src="/jedco-logo.png"
            alt="JEDCO"
            width={40}
            height={40}
            className="h-10 w-auto self-center sm:self-start rounded bg-white p-1"
          />
          <div>
            <p className="font-bold">JEDCO Services S.A.</p>
            <p className="text-sm text-blue-200">L&apos;assainissement au service de la santé publique haïtienne.</p>
          </div>
        </div>
        <div className="mt-8 grid gap-4 text-sm text-blue-200 sm:grid-cols-2">
          <p><span className="font-semibold text-white">Téléphones</span> — 2942-1109 / 2942-1110</p>
          <p><span className="font-semibold text-white">Adresse</span> — 14 Rue Pélican, Route de l&apos;Aéroport, Port-au-Prince</p>
        </div>
      </div>
    </footer>
  );
}
