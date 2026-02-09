import { Link, useLocation } from "react-router-dom";
import { Search, Upload, User, LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

const Navbar = () => {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, signOut } = useAuth();

  const isPlayer = location.pathname.startsWith("/watch/");
  if (isPlayer) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-gradient-to-b from-background/95 to-transparent backdrop-blur-sm">
      <div className="flex items-center gap-8">
        <Link to="/" className="font-display text-3xl tracking-wider text-primary">
          BOOKFLIX
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm text-foreground/80 hover:text-foreground transition-colors">
            Home
          </Link>
          <Link to="/upload" className="text-sm text-foreground/80 hover:text-foreground transition-colors">
            Upload
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {searchOpen ? (
          <div className="flex items-center gap-2 animate-fade-in">
            <Input
              placeholder="Search titles..."
              className="w-48 md:w-64 h-8 bg-secondary border-muted text-sm"
              autoFocus
              onBlur={() => setSearchOpen(false)}
            />
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 text-foreground/70 hover:text-foreground transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        )}

        <Link to="/upload">
          <Button size="sm" className="hidden md:flex gap-2">
            <Upload className="w-4 h-4" />
            Upload Book
          </Button>
        </Link>

        {user ? (
          <button
            onClick={() => signOut()}
            className="p-2 text-foreground/70 hover:text-foreground transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        ) : (
          <Link to="/auth">
            <button className="p-2 text-foreground/70 hover:text-foreground transition-colors">
              <User className="w-5 h-5" />
            </button>
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
