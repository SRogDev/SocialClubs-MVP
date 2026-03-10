import dynamic from 'next/dynamic'
import { HeroSection } from '@/components/landing/hero-section'
import { AboutSection } from '@/components/landing/about-section'
import { EcosystemSection } from '@/components/landing/ecosystem-section'
import { TestimonialsSection } from '@/components/landing/testimonials-section'
import { RoadMapComponent } from '@/components/landing/roadmap-component'
import { ClosingSection } from '@/components/landing/closing-section'
import { FAQComponent } from '@/components/landing/faq-component'
import { Footer } from '@/components/landing/footer'
import { ParallaxBackground } from '@/components/landing/parallax-background'

// Lazy-load the heavy Three.js section — keeps this page as SSG
// The R3F canvas only renders on the client after hydration
const ClubScrollSection = dynamic(
  () => import('@/components/landing/club-3d-scroll').then(m => ({ default: m.ClubScrollSection })),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[60vh] flex items-center justify-center bg-gradient-to-b from-transparent to-muted/20"
        aria-hidden
      />
    ),
  }
)

export default function Page() {
  return (
    <ParallaxBackground>
      <div className="min-h-screen">
        <HeroSection />
        <AboutSection />
        <ClubScrollSection />
        <EcosystemSection />
        <TestimonialsSection />
        <RoadMapComponent />
        <ClosingSection />
        <FAQComponent />
        <Footer />
      </div>
    </ParallaxBackground>
  )
}
