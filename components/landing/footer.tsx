import Link from 'next/link'
import { Zap } from 'lucide-react'

const LINKS = {
  Product: ['Features', 'Pricing', 'Changelog', 'Roadmap'],
  Developers: ['Documentation', 'API Reference', 'Integrations', 'Examples'],
  Company: ['About', 'Blog', 'Careers', 'Contact'],
  Legal: ['Privacy Policy', 'Terms of Service', 'Security', 'Cookie Policy'],
}

export function Footer() {
  return (
    <footer className="border-t border-border/50 py-16">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4 group">
              <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
                <Zap className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="font-semibold text-foreground">FlowAI</span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-[160px]">
              AI-powered content automation for your channels.
            </p>
          </div>

          {/* Link groups */}
          {Object.entries(LINKS).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <Link
                      href="#"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-border/50 gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} FlowAI. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built with Next.js & ❤️
          </p>
        </div>
      </div>
    </footer>
  )
}
