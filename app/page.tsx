import Header from "./components/Header";
import Hero from "./components/Hero";
import Services from "./components/Services";
import Stats from "./components/Stats";
import Coverage from "./components/Coverage";
import Gallery from "./components/Gallery";
import Testimonials from "./components/Testimonials";
import ContactForm from "./components/ContactForm";
import Footer from "./components/Footer";
import { listerTypesService } from "@/lib/services/types-reference";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";

// Gallery et Testimonials lisent la base à chaque rendu (Phase 4, vitrine
// dynamique) — sans ceci, Next.js prérend "/" une seule fois au build et une
// photo ou un témoignage ajouté depuis l'admin n'apparaîtrait qu'au prochain
// déploiement. 60s : assez court pour que les changements de l'admin soient
// visibles rapidement, assez long pour ne pas requêter la base à chaque visite.
export const revalidate = 60;

// Balisage LocalBusiness — aide les moteurs à afficher téléphone/adresse
// directement dans les résultats, sans dépendre du HTML visible (déjà dans
// Footer.tsx, dupliqué ici volontairement : le JSON-LD doit rester correct
// même si le pied de page change de mise en forme).
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  image: `${SITE_URL}/jedco-logo.png`,
  telephone: ["+509 2942-1109", "+509 2942-1110"],
  address: {
    "@type": "PostalAddress",
    streetAddress: "14 Rue Pélican, Route de l'Aéroport",
    addressLocality: "Port-au-Prince",
    addressCountry: "HT",
  },
  areaServed: "HT",
  foundingDate: "1994",
};

export default async function Home() {
  const services = await listerTypesService(true);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <Hero />
      <Services />
      <Stats />
      <Coverage />
      <Gallery />
      <Testimonials />
      <ContactForm services={services} />
      <Footer />
    </>
  );
}
