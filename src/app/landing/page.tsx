import { Navbar } from './components/Navbar'
import { HeroSection } from './components/HeroSection'
import { TrustSection } from './components/TrustSection'
import { ContractsSection } from './components/ContractsSection'
import { FeaturesSection } from './components/FeaturesSection'
import { TestimonialsSection } from './components/TestimonialsSection'
import { PricingSection } from './components/PricingSection'
import { CTASection } from './components/CTASection'
import { Footer } from './components/Footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <TrustSection />
      <ContractsSection />
      <FeaturesSection />
      <TestimonialsSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  )
}