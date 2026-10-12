import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Boxes, LogOut, LayoutDashboard, Store, Zap } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "./ui/dropdown-menu";
import StepIndicator from "./StepIndicator";

export default function HeaderNav({ projectId, activeStep }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-[500] bg-[#09090b] border-b border-zinc-800" data-testid="header-nav">
      <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between gap-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 group shrink-0"
          data-testid="brand-home-btn"
        >
          <div className="w-8 h-8 border border-zinc-100 flex items-center justify-center group-hover:bg-zinc-100 transition-colors">
            <Boxes className="w-4 h-4 text-zinc-100 group-hover:text-black transition-colors" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-zinc-100">
            URBANIS<span className="text-zinc-500">AI</span>
          </span>
        </button>

        {projectId && activeStep ? (
          <div className="flex items-center gap-4">
            <StepIndicator projectId={projectId} activeStep={activeStep} />
            <button
              onClick={() => navigate(`/project/${projectId}/energy`)}
              className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono border transition-colors ${
                activeStep === "energy"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                  : "bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-zinc-200"
              }`}
              title="Green AI & Telemetry Audit"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Energy</span>
            </button>
          </div>
        ) : (
          <nav className="hidden md:flex items-center gap-1">
            <NavLink icon={LayoutDashboard} label="Dashboard" active={location.pathname === "/"} onClick={() => navigate("/")} testid="nav-dashboard" />
            <NavLink icon={Store} label="Sourcing" active={location.pathname === "/sourcing"} onClick={() => navigate("/sourcing")} testid="nav-sourcing" />
            <NavLink icon={Zap} label="Energy & Telemetry" active={location.pathname === "/energy"} onClick={() => navigate("/energy")} testid="nav-energy" />
          </nav>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 pl-1 pr-3 py-1 border border-zinc-800 hover:border-zinc-600 transition-colors shrink-0"
              data-testid="nav-auth-btn"
            >
              <div className="w-7 h-7 bg-zinc-100 text-black flex items-center justify-center font-bold text-xs font-display">
                {(user?.name || "U").slice(0, 1).toUpperCase()}
              </div>
              <span className="hidden sm:block text-xs font-mono text-zinc-300 max-w-[120px] truncate">{user?.name}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 bg-[#18181b] border-zinc-800 text-zinc-200 rounded-none">
            <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              {user?.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem onClick={() => navigate("/")} className="cursor-pointer" data-testid="menu-dashboard">
              <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/sourcing")} className="cursor-pointer" data-testid="menu-sourcing">
              <Store className="w-4 h-4 mr-2" /> Sourcing Directory
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(projectId ? `/project/${projectId}/energy` : "/energy")} className="cursor-pointer text-emerald-400 focus:text-emerald-400" data-testid="menu-energy">
              <Zap className="w-4 h-4 mr-2 text-emerald-400" /> Energy & Telemetry
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-400 focus:text-red-400" data-testid="menu-logout">
              <LogOut className="w-4 h-4 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function NavLink({ icon: Icon, label, active, onClick, testid }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
        active ? "text-zinc-100 border-b-2 border-zinc-100" : "text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent"
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}
