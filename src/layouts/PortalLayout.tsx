import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, User, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PortalLayoutProps {
  children: ReactNode;
  portalName: string;
  userName: string;
  onLogout?: () => void;
}

export default function PortalLayout({ children, portalName, userName, onLogout }: PortalLayoutProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate('/portal/login'); // Fallback login page
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-4 sm:gap-8">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg gradient-bg flex items-center justify-center text-white font-bold">
                A
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold leading-none">AxisInova</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{portalName}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-sm font-medium">{userName}</span>
              <span className="text-[10px] text-muted-foreground">Portal Externo</span>
            </div>
            
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 border-2 border-background" />
            </Button>

            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-destructive">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container py-6 px-4 sm:px-8 max-w-7xl mx-auto">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-background py-6 px-4">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-14 md:flex-row max-w-7xl mx-auto">
          <p className="text-center text-xs leading-loose text-muted-foreground md:text-left">
            &copy; 2026 AxisInova - Gestão Inteligente para Laboratórios.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-xs text-muted-foreground hover:underline">Suporte</a>
            <a href="#" className="text-xs text-muted-foreground hover:underline">Privacidade</a>
          </div>
        </div>
      </footer>
    </div>
  );
}