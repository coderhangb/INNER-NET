import { Home, LogOut, MessageCircle, Sparkles } from "lucide-react";
import { NavLink } from "react-router";
import { useAuthStore } from "../store/useAuthStore";

function AppHeader() {
  const { authUser, logout } = useAuthStore();

  const firstLetter = authUser?.fullName?.trim()?.charAt(0)?.toUpperCase() || "I";

  const navClass = ({ isActive }) =>
    `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition sm:px-4 ${
      isActive
        ? "bg-[#E0F2FE] text-[#0369A1]"
        : "text-[#64748B] hover:bg-white hover:text-[#334155]"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-white/80 bg-[#FFF9F6]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-18 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <NavLink to="/" className="flex items-center gap-2.5" aria-label="INNER-NET home">
          <span className="grid size-10 place-items-center rounded-2xl bg-[#F472B6] text-white shadow-[0_4px_0_#DB2777]">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-bold tracking-tight text-[#334155] sm:text-xl">
            INNER<span className="text-[#0284C7]">-NET</span>
          </span>
        </NavLink>

        <nav className="flex items-center gap-1 rounded-2xl bg-[#F8FAFC] p-1" aria-label="Main navigation">
          <NavLink to="/" end className={navClass}>
            <Home className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Home</span>
          </NavLink>
          <NavLink to="/chat" className={navClass}>
            <MessageCircle className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Learn</span>
          </NavLink>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden text-right md:block">
            <p className="max-w-36 truncate text-sm font-semibold text-[#334155]">
              {authUser?.fullName || "INNER-NET learner"}
            </p>
            <p className="text-xs capitalize text-[#94A3B8]">{authUser?.role || "student"}</p>
          </div>
          <div className="grid size-9 place-items-center rounded-full bg-[#CFFAFE] text-sm font-bold text-[#0E7490]">
            {firstLetter}
          </div>
          <button
            type="button"
            onClick={logout}
            className="grid size-9 place-items-center rounded-xl text-[#94A3B8] transition hover:bg-[#FCE7F3] hover:text-[#DB2777]"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="size-4.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
