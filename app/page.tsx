import { AboutSection } from '@/components/landing/about-section'
import { ClosingSection } from '@/components/landing/closing-section'
import ClubScrollSectionLazy from '@/components/landing/club-scroll-section-lazy'
import { EcosystemSection } from '@/components/landing/ecosystem-section'
import { FAQComponent } from '@/components/landing/faq-component'
import { Footer } from '@/components/landing/footer'
import { HeroSection } from '@/components/landing/hero-section'
import { ParallaxBackground } from '@/components/landing/parallax-background'
import { RoadMapComponent } from '@/components/landing/roadmap-component'

export default function Page() {
  return (
    <ParallaxBackground>
      <div className="min-h-screen">
        <HeroSection />
        <AboutSection />
        <ClubScrollSectionLazy />
        <EcosystemSection />
        <RoadMapComponent />
        <ClosingSection />
        <FAQComponent />
        <Footer />
      </div>
    </ParallaxBackground>
  )
}
