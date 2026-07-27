import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";

// Manuel interne : accessible à tout membre du personnel connecté, quel que
// soit son rôle. Lire une procédure n'accorde aucun droit — c'est
// requireRole sur chaque page métier qui protège les actions elles-mêmes.
// Volontairement hors du site public : ce document décrit le fonctionnement
// interne et les limites actuelles du système.

const NAV = [
  { href: "#connexion", label: "Se connecter" },
  { href: "#acces", label: "Qui voit quoi" },
  { href: "#comptes", label: "Mots de passe" },
  { href: "#automatique", label: "Traitements automatiques" },
  { href: "#admin", label: "Administrateur" },
  { href: "#superviseur", label: "Superviseur" },
  { href: "#technicien", label: "Technicien" },
  { href: "#support", label: "Support client" },
  { href: "#client", label: "Espace client" },
  { href: "#limites", label: "Limites actuelles" },
  { href: "#depannage", label: "Que faire si…" },
];

/** Élément d'écran (menu, bouton, statut) — tout ce sur quoi on clique. */
function Ui({ children }: { children: React.ReactNode }) {
  return (
    <span className="whitespace-nowrap rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[0.86em] text-slate-700">
      {children}
    </span>
  );
}

function Section({
  id,
  titre,
  chip,
  chipCouleur,
  children,
}: {
  id: string;
  titre: string;
  chip?: string;
  chipCouleur?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="flex items-center gap-3 pb-3 pt-8">
        {chip && (
          <span
            className="whitespace-nowrap rounded px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.11em] text-white"
            style={{ background: chipCouleur }}
          >
            {chip}
          </span>
        )}
        <h2 className="text-xl font-bold tracking-tight text-jedco-dark sm:text-2xl">{titre}</h2>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Carte({
  titre,
  chemin,
  children,
}: {
  titre?: string;
  chemin?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {titre && <h3 className="text-[17px] font-bold tracking-tight text-jedco-dark">{titre}</h3>}
      {chemin && <p className="font-mono text-xs text-slate-500">{chemin}</p>}
      {children}
    </div>
  );
}

const STYLES_NOTE = {
  info: { fond: "bg-jedco/5 border-jedco", texte: "text-jedco" },
  attention: { fond: "bg-amber-50 border-amber-600", texte: "text-amber-700" },
  bloque: { fond: "bg-red-50 border-red-600", texte: "text-red-700" },
  ok: { fond: "bg-emerald-50 border-emerald-600", texte: "text-emerald-700" },
} as const;

function Note({
  type,
  label,
  children,
}: {
  type: keyof typeof STYLES_NOTE;
  label: string;
  children: React.ReactNode;
}) {
  const s = STYLES_NOTE[type];
  return (
    <div className={`flex flex-col gap-1.5 rounded-lg border-l-[3px] px-4 py-3 ${s.fond}`}>
      <span className={`font-mono text-[10.5px] font-bold uppercase tracking-[0.13em] ${s.texte}`}>
        {label}
      </span>
      <div className="max-w-[66ch] text-[15px] text-slate-700">{children}</div>
    </div>
  );
}

function Etapes({ children }: { children: React.ReactNode }) {
  return (
    <ol className="flex list-none flex-col gap-2.5 p-0 [counter-reset:s]">{children}</ol>
  );
}

function Etape({ children }: { children: React.ReactNode }) {
  return (
    <li className="relative max-w-[68ch] pl-9 [counter-increment:s] before:absolute before:left-0 before:top-0.5 before:flex before:h-[22px] before:w-[22px] before:items-center before:justify-center before:rounded before:bg-jedco/10 before:font-mono before:text-[11.5px] before:font-bold before:text-jedco before:content-[counter(s)]">
      {children}
    </li>
  );
}

function Liste({ children }: { children: React.ReactNode }) {
  return <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-slate-300">{children}</ul>;
}

function Flux({ etats }: { etats: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {etats.map((e, i) => (
        <span key={e} className="flex items-center gap-2">
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700">
            {e}
          </span>
          {i < etats.length - 1 && <span className="text-slate-300">→</span>}
        </span>
      ))}
    </div>
  );
}

function Tableau({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-[620px] border-collapse text-sm">{children}</table>
    </div>
  );
}

const TH = "border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-left font-mono text-[10.5px] font-semibold uppercase tracking-[0.11em] text-slate-500";
const TD = "border-b border-slate-100 px-4 py-2.5 align-top text-slate-700";

export default async function ManuelPage() {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");

  return (
    <div className="max-w-4xl pb-16">
      <header className="border-b border-slate-200 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
          Manuel d&apos;utilisation · Usage interne
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-jedco-dark">
          Utiliser le système JEDCO
        </h1>
        <p className="mt-3 max-w-[62ch] text-slate-600">
          Comment travailler au quotidien selon votre rôle. Chaque procédure est décrite dans
          l&apos;ordre où vous la ferez réellement.
        </p>
      </header>

      <nav aria-label="Sommaire" className="flex flex-wrap gap-2 border-b border-slate-200 py-5">
        {NAV.map((n) => (
          <a
            key={n.href}
            href={n.href}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:border-jedco hover:text-jedco"
          >
            {n.label}
          </a>
        ))}
      </nav>

      {/* ─── Connexion ─────────────────────────────────────────────────── */}
      <Section id="connexion" titre="Se connecter">
        <Carte titre="Deux portes distinctes">
          <p className="max-w-[68ch] text-slate-600">
            Le personnel JEDCO et les clients n&apos;entrent pas par le même endroit et ne se
            connectent pas de la même façon.
          </p>
          <Tableau>
            <thead>
              <tr>
                <th className={TH}>Qui</th>
                <th className={TH}>Adresse</th>
                <th className={TH}>Méthode</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={TD}>
                  <strong>Personnel JEDCO</strong>
                  <br />
                  <span className="font-mono text-xs text-slate-500">
                    admin, superviseur, technicien, support
                  </span>
                </td>
                <td className={TD}>
                  <Ui>/admin/login</Ui>
                </td>
                <td className={TD}>E-mail + mot de passe</td>
              </tr>
              <tr>
                <td className={TD}>
                  <strong>Client</strong>
                </td>
                <td className={TD}>
                  <Ui>/espace-client</Ui>
                </td>
                <td className={TD}>E-mail + code à 6 chiffres reçu par e-mail</td>
              </tr>
            </tbody>
          </Tableau>
          <Note type="info" label="À savoir">
            <p>
              Après connexion, chacun arrive automatiquement sur l&apos;écran conçu pour son rôle.
              Un technicien atterrit sur <Ui>Terrain</Ui>, un agent support sur <Ui>Support</Ui>.
              Si vous tentez d&apos;ouvrir une page qui ne vous est pas destinée, le système vous
              ramène à votre écran.
            </p>
          </Note>
        </Carte>
      </Section>

      {/* ─── Accès ─────────────────────────────────────────────────────── */}
      <Section id="acces" titre="Qui voit quoi">
        <Carte>
          <p className="max-w-[68ch] text-slate-600">
            Chaque rôle ne voit que les menus qui le concernent. Ce tableau sert de référence
            quand vous créez un compte pour quelqu&apos;un.
          </p>
          <Tableau>
            <thead>
              <tr>
                <th className={TH}>Module</th>
                <th className={TH}>Admin</th>
                <th className={TH}>Superviseur</th>
                <th className={TH}>Technicien</th>
                <th className={TH}>Support</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Tableau de bord, chiffres financiers", "Oui", "Oui", "—", "—"],
                ["Clients, contrats, devis, factures", "Oui", "Oui", "—", "—"],
                ["Interventions, terrain", "Oui", "Oui", "Les siennes", "—"],
                ["Flotte, catalogue, galerie, témoignages", "Oui", "Oui", "—", "—"],
                ["Support client (conversations)", "Oui", "—", "—", "Oui"],
                ["Créer un technicien", "Oui", "—", "—", "—"],
                ["Créer un agent support", "Oui", "—", "—", "—"],
                ["Modifier le taux de change", "Oui", "Lecture", "—", "—"],
              ].map(([module, ...cellules]) => (
                <tr key={module}>
                  <td className={TD}>{module}</td>
                  {cellules.map((c, i) => (
                    <td
                      key={i}
                      className={`${TD} ${c === "Oui" ? "font-semibold text-emerald-700" : "text-slate-400"}`}
                    >
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Tableau>
        </Carte>
      </Section>

      {/* ─── Administrateur ────────────────────────────────────────────── */}
      {/* ─── Comptes et mots de passe ──────────────────────────────────── */}
      <Section id="comptes" titre="Mots de passe et comptes">
        <Carte titre="Changer son propre mot de passe">
          <p className="max-w-[68ch] text-slate-600">
            Valable pour <strong>tous les rôles</strong>. Cliquez sur votre nom, en bas du menu de
            gauche : cela ouvre <Ui>Mon profil</Ui>.
          </p>
          <Etapes>
            <Etape>Saisissez votre mot de passe actuel.</Etape>
            <Etape>Saisissez le nouveau, deux fois. Minimum 12 caractères.</Etape>
            <Etape>
              Validez. Vous restez connecté sur cet appareil ; vos sessions ouvertes ailleurs
              (téléphone, autre ordinateur) sont fermées.
            </Etape>
          </Etapes>
          <Note type="info" label="Première connexion">
            <p>
              Quand un administrateur vous crée un compte ou réinitialise votre mot de passe, il
              vous en communique un de vive voix. Changez-le ici dès votre première connexion :
              personne d&apos;autre ne doit connaître celui que vous utilisez.
            </p>
          </Note>
        </Carte>

        <Carte titre="Mot de passe oublié">
          <p className="max-w-[68ch] text-slate-600">
            Il n&apos;y a <strong>pas</strong> de récupération par e-mail. La seule voie est un
            administrateur, depuis <Ui>Utilisateurs</Ui> :
          </p>
          <Etapes>
            <Etape>
              Ouvrir <Ui>Utilisateurs</Ui>, trouver la personne, cliquer <Ui>Réinitialiser</Ui>.
            </Etape>
            <Etape>
              Le système propose un mot de passe solide. Vous pouvez le remplacer par le vôtre.
            </Etape>
            <Etape>
              Confirmer, puis <strong>noter le mot de passe affiché</strong> : il n&apos;est montré
              qu&apos;une fois et n&apos;est récupérable nulle part ensuite.
            </Etape>
            <Etape>Le communiquer à l&apos;intéressé, qui le changera depuis Mon profil.</Etape>
          </Etapes>
          <Note type="attention" label="Effet immédiat">
            <p>
              La personne est déconnectée de tous ses appareils. Ne réinitialisez pas le mot de
              passe de quelqu&apos;un en pleine saisie sans le prévenir.
            </p>
          </Note>
        </Carte>

        <Carte titre="Quelqu'un quitte l'entreprise">
          <p className="max-w-[68ch] text-slate-600">
            Dans <Ui>Utilisateurs</Ui>, cliquez <Ui>Désactiver</Ui>. L&apos;accès est coupé
            immédiatement, mais tout son historique — interventions, factures créées, journal
            d&apos;activité — reste intact. C&apos;est pour cette raison qu&apos;on désactive au
            lieu de supprimer. <Ui>Réactiver</Ui> rouvre l&apos;accès si la personne revient.
          </p>
          <Note type="info" label="Réservé à l'administrateur">
            <p>
              Le menu <Ui>Utilisateurs</Ui> n&apos;apparaît que pour un compte Administrateur. Un
              superviseur ne peut ni réinitialiser un mot de passe, ni fermer un accès.
            </p>
          </Note>
        </Carte>
      </Section>

      {/* ─── Traitements automatiques ──────────────────────────────────── */}
      <Section id="automatique" titre="Ce que le système fait tout seul">
        <Carte titre="Chaque nuit, sans intervention">
          <p className="max-w-[68ch] text-slate-600">
            Cinq opérations tournent automatiquement vers 1 h du matin :
          </p>
          <Liste>
            <li>
              <strong>Facturation des contrats.</strong> Chaque contrat mensuel, trimestriel ou
              annuel dont l&apos;échéance tombe ce mois-ci reçoit sa facture. Un contrat déjà
              facturé pour la période est ignoré — jamais de doublon.
            </li>
            <li>
              <strong>Factures en retard.</strong> Toute facture impayée dont la date
              d&apos;échéance est passée bascule en <Ui>En retard</Ui>. C&apos;est ce qui rend
              fiable le total <Ui>Impayé</Ui> de la page Facturation.
            </li>
            <li>
              <strong>Relances d&apos;impayés.</strong> Un client dont la facture est en retard
              depuis 7, 15 puis 30 jours reçoit un e-mail de rappel — un seul par palier, jamais
              plusieurs le même jour même si le lot a manqué des nuits.
            </li>
            <li>
              <strong>Alertes de renouvellement.</strong> Un contrat mensuel, trimestriel ou
              annuel encore actif dont l&apos;échéance approche (30, 15 puis 7 jours restants)
              déclenche un e-mail au client et à l&apos;équipe JEDCO. Visible aussi dans la cloche
              de notifications et en encadré sur la page <Ui>Contrats</Ui>.
            </li>
            <li>
              <strong>Contrats terminés.</strong> Un contrat qui atteint sa date de fin passe en{" "}
              <Ui>Expiré</Ui> et cesse d&apos;être facturé.
            </li>
          </Liste>
          <Note type="info" label="Vérifier que c'est bien passé">
            <p>
              <Ui>Paramètres</Ui> → <Ui>Traitements automatiques</Ui> affiche la date du dernier
              passage et ce que chaque opération a fait. Le bouton <Ui>Exécuter maintenant</Ui>{" "}
              (administrateur) rattrape une nuit manquée ; le relancer plusieurs fois est sans
              risque.
            </p>
          </Note>
        </Carte>
      </Section>

      <Section id="admin" titre="Le quotidien de l'administrateur" chip="Administrateur" chipCouleur="#0F2F52">
        <Carte titre="Traiter une demande venue du site public" chemin="Cloche de notification → Demandes">
          <p className="max-w-[68ch] text-slate-600">
            Quand un visiteur remplit le formulaire de contact du site, une pastille rouge
            apparaît sur la cloche en haut à droite. Le système vérifie les nouvelles demandes
            toutes les 45 secondes.
          </p>
          <Etapes>
            <Etape>Cliquez la cloche, puis la demande — vous arrivez dessus, mise en évidence.</Etape>
            <Etape>
              Cliquez <Ui>Créer un devis</Ui> : le prospect devient un vrai client et le formulaire
              de devis s&apos;ouvre pré-rempli.
            </Etape>
            <Etape>
              Si le client existait déjà (même téléphone), le système le réutilise au lieu
              d&apos;en créer un doublon.
            </Etape>
            <Etape>
              Une fois traitée, cliquez <Ui>Marquer traitée</Ui> pour la retirer du compteur.
            </Etape>
          </Etapes>
        </Carte>

        <Carte titre="Créer un client" chemin="Clients → + Nouveau client">
          <p className="max-w-[68ch] text-slate-600">
            Seuls le nom et le téléphone sont obligatoires. L&apos;adresse et l&apos;e-mail sont
            facultatifs — mais l&apos;e-mail conditionne deux fonctions importantes.
          </p>
          <Note type="attention" label="Sans e-mail sur la fiche">
            <p>
              Le client ne pourra pas se connecter à son espace client, et le bouton
              <span className="mx-1">
                <Ui>Envoyer par e-mail</Ui>
              </span>
              n&apos;apparaîtra pas sur ses factures et devis. Renseignez-le dès que vous
              l&apos;avez.
            </p>
          </Note>
        </Carte>

        <Carte titre="Établir un devis, puis le convertir" chemin="Devis → + Nouveau devis">
          <p className="max-w-[68ch] text-slate-600">
            Un devis suit un cycle de vie, et chaque étape ouvre les actions suivantes :
          </p>
          <Flux etats={["BROUILLON", "ENVOYÉ", "ACCEPTÉ", "CONVERTI"]} />
          <Liste>
            <li>
              Sur un brouillon, l&apos;icône <strong>avion en papier</strong> le marque envoyé.
            </li>
            <li>
              Sur un devis envoyé, la <strong>coche</strong> et la <strong>croix</strong>{" "}
              enregistrent la réponse du client.
            </li>
            <li>
              L&apos;icône <strong>double flèche</strong> convertit le devis en facture, avec les
              mêmes lignes et montants.
            </li>
            <li>
              Un devis ne peut être converti qu&apos;<strong>une seule fois</strong>.
            </li>
          </Liste>
          <p className="text-slate-600">Survolez n&apos;importe quelle icône : son rôle s&apos;affiche.</p>
        </Carte>

        <Carte titre="Émettre une facture" chemin="Facturation → + Nouvelle facture">
          <Etapes>
            <Etape>Choisissez le client.</Etape>
            <Etape>Saisissez les lignes : description, quantité, prix unitaire en gourdes.</Etape>
            <Etape>Indiquez le taux de taxe et la date d&apos;échéance (30 jours par défaut).</Etape>
            <Etape>
              Validez — la référence <Ui>FAC-2026-XXXX</Ui> est générée automatiquement.
            </Etape>
          </Etapes>
          <Note type="info" label="Catalogue">
            <p>
              Si vous avez rempli le <Ui>Catalogue</Ui>, taper dans le champ Description propose
              vos services enregistrés et pré-remplit le prix. Le prix reste modifiable ligne par
              ligne — le tarif catalogue n&apos;est qu&apos;indicatif.{" "}
              <strong>Tant que le catalogue est vide, aucune liste n&apos;apparaît.</strong>
            </p>
          </Note>
        </Carte>

        <Carte titre="Modifier une facture déjà émise" chemin="Facturation → icône crayon">
          <p className="max-w-[68ch] text-slate-600">
            Vous pouvez ajouter ou retirer des lignes, changer les quantités, les prix et la taxe.
            Le total se recalcule à partir des lignes.
          </p>
          <Note type="bloque" label="Dès qu'un paiement existe">
            <p>
              L&apos;icône crayon disparaît. Une facture partiellement ou totalement réglée ne se
              modifie plus — modifier un montant déjà encaissé fausserait la comptabilité.
            </p>
          </Note>
        </Carte>

        <Carte titre="Enregistrer un paiement, même partiel" chemin="Facturation → icône carte bancaire">
          <Etapes>
            <Etape>Saisissez le montant reçu — il peut être inférieur au total dû.</Etape>
            <Etape>
              Choisissez le mode : <Ui>Cash</Ui>, <Ui>Virement</Ui> ou <Ui>Chèque</Ui>.
            </Etape>
            <Etape>Enregistrez.</Etape>
          </Etapes>
          <p className="text-slate-600">Le statut de la facture s&apos;ajuste tout seul :</p>
          <Flux etats={["EN ATTENTE", "PARTIELLEMENT PAYÉE", "PAYÉE"]} />
          <p className="max-w-[68ch] text-slate-600">
            Vous pouvez enregistrer plusieurs versements successifs sur la même facture. La colonne{" "}
            <strong>Reste dû</strong> se met à jour à chaque fois.
          </p>
        </Carte>

        <Carte titre="Voir, imprimer, envoyer un document" chemin="Facturation ou Devis → icône œil">
          <p className="max-w-[68ch] text-slate-600">
            L&apos;aperçu ouvre le PDF réel — celui que le client recevra. Trois actions y sont
            disponibles :
          </p>
          <Liste>
            <li>
              <strong>Imprimante</strong> — lance l&apos;impression directement.
            </li>
            <li>
              <strong>Flèche descendante</strong> — télécharge le fichier.
            </li>
            <li>
              <strong>Enveloppe</strong> — envoie au client. N&apos;apparaît que si son e-mail est
              renseigné.
            </li>
          </Liste>
        </Carte>

        <Carte titre="Mettre à jour le taux de change" chemin="Paramètres → Taux de change HTG / USD">
          <p className="max-w-[68ch] text-slate-600">
            Le taux sert à afficher un équivalent indicatif en dollars sur les factures et devis.
            Vous seul pouvez le modifier — un superviseur ne peut que le consulter.
          </p>
          <Note type="ok" label="Le taux est figé à l'émission">
            <p>
              Chaque facture et chaque devis conserve le taux en vigueur au moment où il a été
              créé. Changer le taux aujourd&apos;hui ne modifie <strong>jamais</strong> un document
              déjà émis — seuls les prochains utiliseront la nouvelle valeur.
            </p>
          </Note>
          <p className="max-w-[68ch] text-slate-600">
            Si le nouveau taux s&apos;écarte de plus de 20 % de l&apos;actuel, une confirmation est
            demandée : c&apos;est presque toujours le signe d&apos;une faute de frappe. Le bouton{" "}
            <Ui>Ne plus afficher en USD</Ui> retire l&apos;équivalent dollar des prochains
            documents.
          </p>
        </Carte>

        <Carte titre="Ajouter un technicien" chemin="Techniciens → + Nouveau technicien">
          <p className="max-w-[68ch] text-slate-600">
            Vous créez en une fois son compte de connexion et sa fiche métier. Renseignez nom,
            prénom, e-mail, <strong>mot de passe</strong>, spécialités et zones. Communiquez-lui
            ensuite son e-mail et son mot de passe : il se connecte sur <Ui>/admin/login</Ui> comme
            tout le monde.
          </p>
        </Carte>

        <Carte titre="Ajouter un agent de support" chemin="Support → Agents support → + Ajouter un agent">
          <p className="max-w-[68ch] text-slate-600">
            Même principe, en plus simple : nom, prénom, e-mail, mot de passe (8 caractères
            minimum). Le compte n&apos;a accès qu&apos;aux conversations, jamais aux factures ni aux
            clients. Le badge <Ui>Actif</Ui> se clique pour désactiver un compte sans le supprimer.
          </p>
        </Carte>

        <Carte titre="Gérer la flotte" chemin="Flotte">
          <p className="max-w-[68ch] text-slate-600">
            Chaque véhicule est identifié par sa <strong>plaque d&apos;immatriculation</strong>, qui
            doit être unique. Vous suivez son statut, son kilométrage et son historique
            d&apos;entretien. Un véhicule <Ui>EN MAINTENANCE</Ui> ou <Ui>HORS SERVICE</Ui> ne peut
            plus être affecté à une intervention.
          </p>
          <p className="max-w-[68ch] text-slate-600">
            Les types de véhicule (camion aspirateur, camion de collecte, utilitaire, moto,
            voiture, pickup) se gèrent dans <Ui>Paramètres</Ui> — vous pouvez en créer
            d&apos;autres à tout moment.
          </p>
        </Carte>

        <Carte titre="Retrouver quelque chose">
          <p className="max-w-[68ch] text-slate-600">
            Les tableaux Clients, Factures, Devis et Interventions ont une recherche qui interroge{" "}
            <strong>toute la base</strong>, pas seulement la page affichée. Elle ignore les
            accents : taper <Ui>petionville</Ui> trouve « Pétion-Ville ». Tous les mots saisis
            doivent correspondre, ce qui permet d&apos;affiner en ajoutant un mot.
          </p>
          <p className="max-w-[68ch] text-slate-600">
            Les listes affichent 50 lignes par page ; les boutons <Ui>Précédent</Ui> et{" "}
            <Ui>Suivant</Ui> sont en bas.
          </p>
        </Carte>
      </Section>

      {/* ─── Superviseur ───────────────────────────────────────────────── */}
      <Section id="superviseur" titre="Superviseur" chip="Superviseur" chipCouleur="#1A4F8A">
        <Carte titre="Ce que vous faites comme l'administrateur">
          <p className="max-w-[68ch] text-slate-600">
            Clients, contrats, devis, factures, paiements, interventions, flotte, catalogue,
            galerie, témoignages : toutes les procédures de la section précédente s&apos;appliquent
            à vous à l&apos;identique.
          </p>
        </Carte>
        <Carte titre="Les quatre différences">
          <Liste>
            <li>
              Vous ne pouvez pas <strong>créer de technicien</strong>.
            </li>
            <li>
              Vous ne pouvez pas <strong>créer d&apos;agent de support</strong>.
            </li>
            <li>
              Vous <strong>consultez</strong> le taux de change sans pouvoir le modifier.
            </li>
            <li>
              Le module <strong>Support client</strong> ne vous est pas accessible.
            </li>
          </Liste>
          <p className="text-slate-600">
            Pour l&apos;une de ces opérations, adressez-vous à l&apos;administrateur.
          </p>
        </Carte>
      </Section>

      {/* ─── Technicien ────────────────────────────────────────────────── */}
      <Section id="technicien" titre="Technicien" chip="Technicien" chipCouleur="#2C6FB8">
        <Carte titre="Votre écran de travail" chemin="Terrain">
          <p className="max-w-[68ch] text-slate-600">
            Vous voyez uniquement les interventions qui vous sont assignées — jamais celles des
            autres techniciens ni les coordonnées des clients qui ne vous concernent pas. Les
            interventions sont triées par urgence : celles en cours d&apos;abord, puis les
            planifiées, puis celles en attente.
          </p>
          <Note type="info" label="Sur téléphone">
            <p>
              L&apos;écran Terrain est conçu pour être utilisé d&apos;une seule main sur un
              téléphone. Les boutons sont volontairement larges pour rester atteignables avec le
              pouce, gants ou pas.
            </p>
          </Note>
        </Carte>
        <Carte titre="Faire avancer une intervention">
          <p className="max-w-[68ch] text-slate-600">
            Les statuts se suivent dans l&apos;ordre, sans saut possible :
          </p>
          <Flux etats={["EN ATTENTE", "PLANIFIÉ", "EN COURS", "TERMINÉ"]} />
          <p className="max-w-[68ch] text-slate-600">
            Si vous tentez de passer directement d&apos;« en attente » à « terminé », le système
            refuse. C&apos;est volontaire : l&apos;historique doit refléter ce qui s&apos;est
            réellement passé sur le terrain.
          </p>
        </Carte>
      </Section>

      {/* ─── Support ───────────────────────────────────────────────────── */}
      <Section id="support" titre="Agent de support" chip="Support client" chipCouleur="#5B9BE0">
        <Carte titre="Comment une conversation arrive jusqu'à vous">
          <p className="max-w-[68ch] text-slate-600">
            Sur le site public, les visiteurs discutent d&apos;abord avec <strong>Tiffany</strong>,
            l&apos;assistante virtuelle. Dès qu&apos;elle ne peut plus répondre — panne technique,
            budget épuisé — la conversation bascule automatiquement vers vous, et le visiteur en
            est informé.
          </p>
          <p className="max-w-[68ch] text-slate-600">
            Avant d&apos;écrire, le visiteur laisse son nom et un moyen de le joindre — téléphone,
            e-mail, ou les deux. Vous les voyez donc dès la file d&apos;attente.
          </p>
        </Carte>
        <Carte titre="Répondre à un visiteur" chemin="Support">
          <Etapes>
            <Etape>
              Une nouvelle conversation déclenche un <strong>bip sonore</strong> et apparaît en
              jaune dans <Ui>En attente</Ui>.
            </Etape>
            <Etape>
              Cliquez dessus : tout l&apos;historique s&apos;affiche, y compris ce que Tiffany avait
              répondu.
            </Etape>
            <Etape>
              Écrivez votre réponse en bas et envoyez — la conversation passe automatiquement dans{" "}
              <Ui>Mes conversations</Ui>.
            </Etape>
            <Etape>
              Quand c&apos;est réglé, cliquez <Ui>Fermer</Ui>.
            </Etape>
          </Etapes>
          <Note type="info" label="Un client peut revenir">
            <p>
              Si le visiteur réécrit après la fermeture, le ticket se rouvre automatiquement et
              remonte dans la file d&apos;attente. Personne ne reste sans réponse.
            </p>
          </Note>
          <p className="max-w-[68ch] text-slate-600">
            L&apos;écran se rafraîchit tout seul toutes les 4 secondes : inutile de recharger la
            page.
          </p>
        </Carte>
      </Section>

      {/* ─── Espace client ─────────────────────────────────────────────── */}
      <Section id="client" titre="Ce que voit votre client" chip="Espace client" chipCouleur="#8AB4E8">
        <Carte titre="Sa connexion, sans mot de passe" chemin="Espace Client (menu du site public)">
          <Etapes>
            <Etape>Il saisit son e-mail — celui enregistré sur sa fiche client.</Etape>
            <Etape>
              Il reçoit un <strong>code à 6 chiffres</strong> par e-mail.
            </Etape>
            <Etape>Il saisit le code et accède à son espace.</Etape>
          </Etapes>
          <p className="max-w-[68ch] text-slate-600">
            Le code expire au bout de 10 minutes, tolère 5 essais, et il ne peut en demander
            qu&apos;un par minute.
          </p>
        </Carte>
        <Carte titre="Ce qu'il peut faire">
          <Liste>
            <li>Consulter toutes ses factures avec statut, échéance et montant.</li>
            <li>Consulter tous ses devis avec leur date de validité.</li>
            <li>Ouvrir un aperçu du PDF, l&apos;imprimer ou le télécharger.</li>
          </Liste>
          <p className="max-w-[68ch] text-slate-600">
            Il ne voit que ses propres documents. Aucun autre dossier client n&apos;est accessible,
            même en modifiant l&apos;adresse dans le navigateur.
          </p>
          <Note type="attention" label="Prérequis">
            <p>
              Sans e-mail sur sa fiche client, il ne pourra pas se connecter. Et si deux fiches
              partagent le même e-mail, le système refuse la connexion plutôt que de risquer
              d&apos;ouvrir le mauvais dossier — dans ce cas, corrigez le doublon.
            </p>
          </Note>
        </Carte>
      </Section>

      {/* ─── Limites ───────────────────────────────────────────────────── */}
      <Section id="limites" titre="Limites actuelles">
        <Carte>
          <p className="max-w-[68ch] text-slate-600">
            Trois fonctions sont construites et prêtes, mais en attente d&apos;un réglage extérieur
            au système. Il est important de le savoir pour ne pas croire à une panne.
          </p>
          <Note type="bloque" label="Envoi d'e-mails — inactif">
            <p>
              Le domaine d&apos;envoi n&apos;est pas encore configuré chez le prestataire. Tant que
              ce n&apos;est pas fait, aucun e-mail ne part réellement : ni les factures et devis
              envoyés depuis l&apos;aperçu, ni les codes de connexion à l&apos;espace client, ni les
              notifications internes de nouvelles demandes. Les boutons existent et afficheront un
              message d&apos;erreur clair.
            </p>
          </Note>
          <Note type="bloque" label="Tiffany — sans budget">
            <p>
              Le compte de l&apos;assistante virtuelle n&apos;a plus de crédit. Concrètement,
              Tiffany bascule donc <strong>systématiquement</strong> vers le support humain dès le
              premier message. Le système fonctionne comme prévu — c&apos;est exactement le
              scénario de secours pour lequel il a été conçu — mais toute la charge repose sur
              l&apos;agent de support.
            </p>
          </Note>
          <Note type="attention" label="Catalogue — à remplir">
            <p>
              Aucun service ni produit n&apos;y est encore enregistré. Tant qu&apos;il est vide,
              aucune liste déroulante n&apos;apparaît à la saisie des factures et devis : il faut
              tout taper à la main. Ajoutez vos prestations récurrentes depuis <Ui>Catalogue</Ui>.
            </p>
          </Note>
        </Carte>
      </Section>

      {/* ─── Dépannage ─────────────────────────────────────────────────── */}
      <Section id="depannage" titre="Que faire si…">
        <Carte>
          <Tableau>
            <thead>
              <tr>
                <th className={TH}>Situation</th>
                <th className={TH}>Explication et solution</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={TD}>
                  Le bouton <Ui>Envoyer par e-mail</Ui> n&apos;apparaît pas
                </td>
                <td className={TD}>
                  Le client n&apos;a pas d&apos;e-mail sur sa fiche. Ajoutez-le depuis{" "}
                  <Ui>Clients</Ui>, puis rouvrez l&apos;aperçu.
                </td>
              </tr>
              <tr>
                <td className={TD}>Aucune liste ne s&apos;affiche à la saisie d&apos;une ligne</td>
                <td className={TD}>
                  Le catalogue est vide. Ajoutez vos services depuis <Ui>Catalogue</Ui>.
                </td>
              </tr>
              <tr>
                <td className={TD}>L&apos;icône crayon a disparu sur une facture</td>
                <td className={TD}>
                  Un paiement a été enregistré. Une facture réglée, même partiellement, ne se
                  modifie plus.
                </td>
              </tr>
              <tr>
                <td className={TD}>Un client ne reçoit pas son code de connexion</td>
                <td className={TD}>
                  L&apos;envoi d&apos;e-mails n&apos;est pas encore actif — voir « Limites
                  actuelles ». Vérifiez aussi que son e-mail est bien sur sa fiche.
                </td>
              </tr>
              <tr>
                <td className={TD}>Un devis ne peut plus être converti</td>
                <td className={TD}>
                  Il l&apos;a déjà été une fois. Retrouvez la facture correspondante dans{" "}
                  <Ui>Facturation</Ui>.
                </td>
              </tr>
              <tr>
                <td className={TD}>Un véhicule n&apos;apparaît pas dans les affectations</td>
                <td className={TD}>
                  Son statut est <Ui>EN MAINTENANCE</Ui> ou <Ui>HORS SERVICE</Ui>. Changez-le dans{" "}
                  <Ui>Flotte</Ui>.
                </td>
              </tr>
              <tr>
                <td className={TD}>Un montant en dollars semble faux sur une facture</td>
                <td className={TD}>
                  Le taux affiché est celui figé au moment de l&apos;émission, pas le taux actuel.
                  Vérifiez la date du document.
                </td>
              </tr>
              <tr>
                <td className={TD}>Le technicien ne voit aucune intervention</td>
                <td className={TD}>
                  Aucune ne lui est assignée. Affectez-le depuis <Ui>Interventions</Ui>.
                </td>
              </tr>
            </tbody>
          </Tableau>
        </Carte>
      </Section>
    </div>
  );
}
