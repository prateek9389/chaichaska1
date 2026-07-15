import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import ChaiShowcase from "@/components/ChaiShowcase";
import FarmCTA from "@/components/FarmCTA";
import Subscription from "@/components/Subscription";
import ProductCarousel from "@/components/ProductCarousel";
import Craftsmanship from "@/components/Craftsmanship";
import Reviews from "@/components/Reviews";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <div className="hero-frame">
        <Navbar />
        <Hero />
        <Marquee />
        <ChaiShowcase />
        <FarmCTA />
        <Subscription />
        <ProductCarousel />
        <Craftsmanship />
        <Reviews />
        <FAQ />
        <Footer />
      </div>
    </>
  );
}
