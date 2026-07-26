// Icônes d'action partagées (Factures, Devis) — traits fins cohérents avec
// le reste du backoffice (voir AdminShell.tsx). Toujours utilisées avec un
// `title`/`aria-label` sur le bouton parent : une icône seule sans texte
// perd son sens pour un lecteur d'écran ou au survol tactile.
function Base({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 shrink-0 ${className}`}
    >
      {children}
    </svg>
  );
}

export function IconeOeil(props: { className?: string }) {
  return (
    <Base {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </Base>
  );
}

export function IconePaiement(props: { className?: string }) {
  return (
    <Base {...props}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </Base>
  );
}

export function IconeImprimante(props: { className?: string }) {
  return (
    <Base {...props}>
      <path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2" />
      <rect x="6" y="14" width="12" height="7" />
    </Base>
  );
}

export function IconeTelecharger(props: { className?: string }) {
  return (
    <Base {...props}>
      <path d="M12 3v12m0 0-4-4m4 4 4-4" />
      <path d="M4 19h16" />
    </Base>
  );
}

export function IconeEnveloppe(props: { className?: string }) {
  return (
    <Base {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </Base>
  );
}

export function IconeFermer(props: { className?: string }) {
  return (
    <Base {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Base>
  );
}

export function IconeCheck(props: { className?: string }) {
  return (
    <Base {...props}>
      <path d="M20 6 9 17l-5-5" />
    </Base>
  );
}

export function IconeX(props: { className?: string }) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9.5 9.5 5 5m0-5-5 5" />
    </Base>
  );
}

export function IconeEnvoyer(props: { className?: string }) {
  return (
    <Base {...props}>
      <path d="m3 11 18-8-8 18-2-8-8-2Z" />
    </Base>
  );
}

export function IconeConvertir(props: { className?: string }) {
  return (
    <Base {...props}>
      <path d="M7 7h11l-3-3m3 3-3 3M17 17H6l3 3m-3-3 3-3" />
    </Base>
  );
}

export function IconeCrayon(props: { className?: string }) {
  return (
    <Base {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Base>
  );
}
