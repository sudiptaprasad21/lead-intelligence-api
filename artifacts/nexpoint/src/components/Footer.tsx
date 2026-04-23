import { Mail, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-muted/30 py-12 border-t mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Nexpoint</h3>
            <p className="text-sm text-muted-foreground">
              An AI-Powered Single Point Solution for All Digital Marketing Needs.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Features</li>
              <li>Pricing</li>
              <li>Integrations</li>
              <li>Changelog</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>About Us</li>
              <li>Careers</li>
              <li>Events</li>
              <li>Contact</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
              <li>Cookie Policy</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Nexpoint AI. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="mailto:hello@nexpoint.ai" className="hover:text-primary transition-colors flex items-center gap-2">
              <Mail className="h-4 w-4" /> hello@nexpoint.ai
            </a>
            <span className="flex items-center gap-2">
              <Phone className="h-4 w-4" /> +1 (800) NEX-POINT
            </span>
            <a href="/leads" className="hover:text-primary transition-colors opacity-40 hover:opacity-100 text-xs tracking-wide">
              Admin · Leads
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}