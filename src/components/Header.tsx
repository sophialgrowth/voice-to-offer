import { useUser } from '@/hooks/useUser';
import { Button } from '@/components/ui/button';
import { Zap, LogOut, History, Settings } from 'lucide-react';

interface HeaderProps {
  onHistoryClick?: () => void;
}

const Header = ({ onHistoryClick }: HeaderProps) => {
  const { user, logout } = useUser();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-display tracking-tight">
                <span className="text-gradient">Nexad</span>
                <span className="text-foreground"> ProposalAI</span>
              </h1>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {onHistoryClick && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onHistoryClick}
                className="text-muted-foreground hover:text-foreground"
              >
                <History className="w-4 h-4 mr-2" />
                历史记录
              </Button>
            )}

            {user && (
              <div className="flex items-center gap-3 pl-3 border-l border-border/50">
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{user.name}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
