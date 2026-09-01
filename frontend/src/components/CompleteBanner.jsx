import { CheckCircle2, RotateCcw } from "lucide-react";

function CompleteBanner({ isOpen, onClose, onStartNewChat }) {
  if (!isOpen) return null;

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pt-3">
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-[#A7F3D0] bg-[#ECFDF5] p-4 text-[#065F46] shadow-sm sm:flex-row">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#D1FAE5] text-[#059669]">
            <CheckCircle2 className="size-6" />
          </div>

          <div>
            <h4 className="text-sm font-bold text-[#065F46]">
              Great job! You solved this problem! 🎉
            </h4>

            <p className="text-xs text-[#047857]">
              Ready to challenge yourself with something new?
            </p>
          </div>
        </div>

        <div className="flex w-full shrink-0 gap-2 sm:w-auto">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-[#A7F3D0] bg-white px-3 py-2 text-xs font-semibold text-[#047857] transition hover:bg-[#F0FDF4] sm:flex-none"
          >
            Review chat
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onStartNewChat();
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#059669] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#047857] sm:flex-none"
          >
            <RotateCcw className="size-3.5" />
            New problem
          </button>
        </div>
      </div>
    </div>
  );
}

export default CompleteBanner;
