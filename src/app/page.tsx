import Hero from "@/components/landing/hero"
import Stats from "@/components/landing/stats"
import FeaturedTools from "@/components/landing/featured-tools"
import HowItWorks from "@/components/landing/how-it-works"
import ToolOperators from "@/components/landing/tool-operators"
import Testimonials from "@/components/landing/testimonials"
import TrustBadges from "@/components/landing/trust-badges"

export default function HomePage() {
  return (
    <>
      <Hero />
      <Stats />
      <FeaturedTools />
      <HowItWorks />
      <ToolOperators />
      <Testimonials />
      <TrustBadges />
    </>
  )
}
