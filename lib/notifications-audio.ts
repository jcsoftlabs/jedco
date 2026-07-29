// Bip généré par synthèse (oscillateur Web Audio) plutôt qu'un fichier audio
// externe — pas de fichier statique à héberger, et fonctionne partout sans
// dépendance réseau. Partagé entre SupportDashboard (nouvelle conversation
// en attente) et les notifications toast du backoffice (NotificationsCloche).
export function jouerBip() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Certains navigateurs bloquent AudioContext avant toute interaction —
    // tant pis pour le son, la liste visuelle reste à jour de toute façon.
  }
}
