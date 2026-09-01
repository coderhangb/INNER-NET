import { Heart, Sparkles } from "lucide-react";

function AppFooter() {
  return (
    <footer className="border-t border-[#E2E8F0] bg-white">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-[#F472B6] text-white shadow-[0_4px_0_#DB2777]">
            <Sparkles className="size-4" aria-hidden="true" />
          </div>

          <div>
            <p className="font-bold leading-none text-[#334155]">INNER-NET</p>
            <p className="mt-1 text-xs text-[#94A3B8]">
              Think together. Discover for yourself.
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-1.5 text-sm text-[#94A3B8] sm:flex">
          Made with
          <Heart
            className="size-4 fill-[#F472B6] text-[#F472B6]"
            aria-hidden="true"
          />
          for curious minds
        </div>

        <p className="text-xs text-[#94A3B8]">
          © {new Date().getFullYear()} INNER-NET
        </p>
      </div>
    </footer>
  );
}

export default AppFooter;
