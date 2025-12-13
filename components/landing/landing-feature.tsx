import { HeroSection } from "./hero-section"
import { AboutSection } from "./about-section"
import { FeaturesSection } from "./features-section"
import { ReviewsComponent } from "./reviews-component"
import { ComparativeComponent } from "./comparative-component"
import { RoadMapComponent } from "./roadmap-component"
import { ClosingSection } from "./closing-section"
import { FAQComponent } from "./faq-component"
import { Footer } from "./footer"

export function LandingFeature() {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <AboutSection />
      <FeaturesSection />
      <ReviewsComponent />
      <ComparativeComponent />
      <RoadMapComponent />
      <ClosingSection />
      <FAQComponent />
      <Footer />
    </div>
  )
}
