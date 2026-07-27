"use client";

import { useRouter, useSearchParams } from "next/navigation";

function versParamISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function SelecteurDate({ date }: { date: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function allerA(nouvelleDate: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", nouvelleDate);
    router.push(`/admin/interventions/calendrier?${params.toString()}`);
  }

  function decaler(jours: number) {
    const courante = new Date(`${date}T12:00:00Z`);
    courante.setUTCDate(courante.getUTCDate() + jours);
    allerA(versParamISO(courante));
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => decaler(-1)}
        aria-label="Jour précédent"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
      >
        ←
      </button>
      <input
        type="date"
        value={date}
        onChange={(e) => e.target.value && allerA(e.target.value)}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
      />
      <button
        onClick={() => allerA(versParamISO(new Date()))}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
      >
        Aujourd&apos;hui
      </button>
      <button
        onClick={() => decaler(1)}
        aria-label="Jour suivant"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
      >
        →
      </button>
    </div>
  );
}
