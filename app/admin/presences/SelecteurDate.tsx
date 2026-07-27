"use client";

import { useRouter } from "next/navigation";

export default function SelecteurDate({ date, max }: { date: string; max: string }) {
  const router = useRouter();

  return (
    <input
      type="date"
      defaultValue={date}
      max={max}
      onChange={(e) => router.push(`/admin/presences?date=${e.target.value}`)}
      className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
    />
  );
}
