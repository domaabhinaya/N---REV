import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Activity, Apple, LayoutDashboard, LineChart, FileText, Menu, X, Bot } from "lucide-react";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Reset mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/recovery-plan", label: "Recovery Plan", icon: FileText },
    { href: "/tracking", label: "Daily Tracking", icon: Apple },
    { href: "/suggestions", label: "Suggestions", icon: Activity },
    { href: "/ai-assistant", label: "AI Assistant", icon: Bot },
    { href: "/labs", label: "Lab Results", icon: LineChart },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="font-serif text-xl font-medium text-primary">N-REV</div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-foreground" aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        ${isMobileMenuOpen ? "block" : "hidden"} 
        md:block w-full md:w-64 bg-card border-r border-border md:min-h-[100dvh] flex-shrink-0
      `}>
        <div className="hidden md:flex items-center p-6 border-b border-border">
          <div className="font-serif text-2xl font-medium text-primary">N-REV</div>
        </div>
        
        <nav className="p-4 space-y-1" role="navigation" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                  ${isActive 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"}
                `}
              >
                <Icon size={20} className={isActive ? "text-primary" : ""} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background/50">
        <div className="max-w-5xl mx-auto p-4 md:p-8">
          {children}
        </div>
        
        <footer className="py-6 px-4 md:px-8 text-center md:text-left text-xs text-muted-foreground mt-12 border-t border-border">
          N-REV is a food-based nutritional recovery support tool and does not replace professional medical advice, diagnosis, or treatment.
        </footer>
      </main>
    </div>
  );
}
