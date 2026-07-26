import Header from "./components/Header";
import Hero from "./components/Hero";
import Services from "./components/Services";
import Stats from "./components/Stats";
import Coverage from "./components/Coverage";
import Gallery from "./components/Gallery";
import Testimonials from "./components/Testimonials";
import ContactForm from "./components/ContactForm";
import Footer from "./components/Footer";

// Gallery et Testimonials lisent la base à chaque rendu (Phase 4, vitrine
// dynamique) — sans ceci, Next.js prérend "/" une seule fois au build et une
// photo ou un témoignage ajouté depuis l'admin n'apparaîtrait qu'au prochain
// déploiement. 60s : assez court pour que les changements de l'admin soient
// visibles rapidement, assez long pour ne pas requêter la base à chaque visite.
export const revalidate = 60;

export default function Home() {
  return (
    <>
      <Header />
      <Hero />
      <Services />
      <Stats />
      <Coverage />
      <Gallery />
      <Testimonials />
      <ContactForm />
      <Footer />
    </>
  );
}
