import Link from "next/link"
import { Sprout, Phone, Mail, MapPin, ExternalLink, Play, MessageCircle } from "lucide-react"

const footerLinks = {
  Products: {
    links: [
      { label: "Carbon Fiber Poles", href: "/tools?category=carbon-fiber-poles" },
      { label: "Sprayers", href: "/tools?category=sprayers" },
      { label: "Tillers", href: "/tools?category=tillers" },
      { label: "All Tools", href: "/tools" },
    ],
  },
  Services: {
    links: [
      { label: "How It Works", href: "/how-it-works" },
      { label: "Delivery Zones", href: "/delivery-zones" },
      { label: "Damage Policy", href: "/damage-policy" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  Company: {
    links: [
      { label: "About Us", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms & Conditions", href: "/terms" },
    ],
  },
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-primary-dark text-white">
      <div className="container py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <Sprout className="h-6 w-6 text-accent" />
              </div>
              <div>
                <span className="text-lg font-bold text-white">Payaswini</span>
                <span className="text-lg font-bold text-accent"> O Bele</span>
              </div>
            </Link>
            <p className="mb-4 text-sm text-white/70">
              Affordable farm tool rentals for farmers in Dakshina Karnataka. No upfront purchase needed.
            </p>
            <div className="flex gap-3">
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-accent transition-colors">
                <ExternalLink className="h-4 w-4" />
              </a>
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-accent transition-colors">
                <Play className="h-4 w-4" />
              </a>
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-accent transition-colors">
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          {Object.entries(footerLinks).map(([title, section]) => (
            <div key={title}>
              <h3 className="mb-4 text-sm font-semibold text-accent">{title}</h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/70 hover:text-accent transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-xs text-white/50">
            &copy; {new Date().getFullYear()} Payaswini O Bele. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-white/50">
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" /> +91 98765 43210
            </span>
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" /> hello@payaswini.com
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
