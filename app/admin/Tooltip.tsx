// Info-bulle CSS pure (group-hover) au lieu du `title` natif du navigateur :
// ce dernier a un délai d'apparition variable selon le navigateur/OS et
// n'est pas fiable à vérifier visuellement. Les boutons gardent leur
// title/aria-label en plus, pour les lecteurs d'écran et comme repli.
export default function Tooltip({ texte, children }: { texte: string; children: React.ReactNode }) {
  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity delay-150 duration-150 group-hover/tooltip:opacity-100"
      >
        {texte}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
      </span>
    </span>
  );
}
