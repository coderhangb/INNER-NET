import {
  ArrowRight,
  Brain,
  Heart,
  Lightbulb,
  MessageCircle,
  PencilLine,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import AppHeader from "../components/AppHeader";
import { useAuthStore } from "../store/useAuthStore";

const starters = [
  {
    title: "Bring a problem",
    description: "Share the question you are working on.",
    prompt: "I have a problem I would like help with.",
    icon: PencilLine,
    color: "bg-[#FCE7F3] text-[#DB2777]",
  },
  {
    title: "Share your thinking",
    description: "Tell INNER-NET what you have tried so far.",
    prompt: "I tried solving something, but I am not sure about my thinking.",
    icon: Brain,
    color: "bg-[#E0F2FE] text-[#0284C7]",
  },
  {
    title: "Get a small hint",
    description: "Move forward one friendly step at a time.",
    prompt: "I am stuck and would like one small hint.",
    icon: Lightbulb,
    color: "bg-[#FEF3C7] text-[#D97706]",
  },
];

function HomePage() {
  const navigate = useNavigate();
  const authUser = useAuthStore((state) => state.authUser);
  const firstName = authUser?.fullName?.trim()?.split(/\s+/)[0] || "learner";

  const openStarter = (prompt) => {
    navigate("/chat", { state: { starterPrompt: prompt } });
  };

  return (
    <div className="app-surface min-h-screen text-[#334155]">
      <AppHeader />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <section className="relative overflow-hidden rounded-[2rem] border border-white bg-linear-to-br from-[#FFF1F7] via-white to-[#E0F2FE] p-6 shadow-[0_20px_60px_rgba(51,65,85,0.10)] sm:p-9 lg:grid lg:grid-cols-[1.15fr_0.85fr] lg:gap-10 lg:p-12">
          <div className="relative z-10 flex flex-col items-start justify-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#FBCFE8] bg-white/80 px-3 py-1.5 text-sm font-semibold text-[#BE185D]">
              <Sparkles className="size-4" aria-hidden="true" />
              Hi, {firstName}! Ready to think together?
            </div>

            <h1 className="max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-[#334155] sm:text-5xl lg:text-6xl">
              Big ideas begin with a
              <span className="text-[#0284C7]"> small question.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#64748B] sm:text-lg">
              INNER-NET listens to your ideas, helps you spot the next step, and lets you discover the answer yourself.
            </p>

            <Link
              to="/chat"
              className="mt-7 inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-[#F472B6] px-6 text-base font-semibold text-white shadow-[0_5px_0_#DB2777] transition hover:-translate-y-0.5 hover:bg-[#EC4899] active:translate-y-0.5 active:shadow-[0_2px_0_#DB2777]"
            >
              Start learning
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
          </div>

          <div className="relative mt-10 lg:mt-0">
            <div className="absolute -right-20 -top-24 size-64 rounded-full bg-[#BAE6FD]/70 blur-3xl" />
            <div className="absolute -bottom-24 -left-20 size-60 rounded-full bg-[#FBCFE8]/80 blur-3xl" />
            <div className="relative rounded-[1.75rem] border border-white bg-white/75 p-5 shadow-[0_18px_45px_rgba(14,165,233,0.12)] backdrop-blur sm:p-6">
              <div className="flex items-center gap-3 border-b border-[#E2E8F0] pb-4">
                <div className="grid size-11 place-items-center rounded-2xl bg-[#E0F2FE] text-[#0284C7]">
                  <MessageCircle className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold text-[#334155]">A coach that thinks with you</p>
                  <p className="text-sm text-[#94A3B8]">One helpful step at a time</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {[
                  ["1", "Show what you have tried"],
                  ["2", "Get one useful hint"],
                  ["3", "Explain what you discovered"],
                ].map(([number, text]) => (
                  <div key={number} className="flex items-center gap-3 rounded-2xl bg-[#F8FAFC] p-3.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-white text-sm font-bold text-[#0284C7] shadow-sm">
                      {number}
                    </span>
                    <span className="text-sm font-medium text-[#475569] sm:text-base">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-10 sm:py-12" aria-labelledby="begin-heading">
          <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#F472B6]">Your learning space</p>
              <h2 id="begin-heading" className="mt-2 text-2xl font-bold text-[#334155] sm:text-3xl">
                How would you like to begin?
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-[#64748B] sm:text-right">
              There is no wrong place to start. Pick what feels closest to what you need.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {starters.map(({ title, description, prompt, icon: Icon, color }) => (
              <button
                key={title}
                type="button"
                onClick={() => openStarter(prompt)}
                className="group flex min-h-52 flex-col items-start rounded-[1.5rem] border border-[#E2E8F0] bg-white p-5 text-left shadow-[0_10px_30px_rgba(51,65,85,0.06)] transition hover:-translate-y-1 hover:border-[#F9A8D4] hover:shadow-[0_16px_35px_rgba(244,114,182,0.14)] sm:p-6"
              >
                <span className={`grid size-12 place-items-center rounded-2xl ${color}`}>
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-xl font-bold text-[#334155]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#64748B]">{description}</p>
                <span className="mt-auto flex items-center gap-1.5 pt-5 text-sm font-semibold text-[#0284C7]">
                  Let&apos;s go
                  <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="grid overflow-hidden rounded-[1.75rem] border border-[#E2E8F0] bg-white sm:grid-cols-3">
          {[
            [Heart, "Your ideas matter", "Start with what you really think."],
            [Lightbulb, "Mistakes help", "Every try gives us a useful clue."],
            [Brain, "You stay in control", "You do the thinking; we guide the next step."],
          ].map(([Icon, title, text], index) => (
            <div
              key={title}
              className={`flex gap-3 p-5 sm:p-6 ${index ? "border-t border-[#E2E8F0] sm:border-l sm:border-t-0" : ""}`}
            >
              <Icon className="mt-0.5 size-5 shrink-0 text-[#F472B6]" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-[#334155]">{title}</h3>
                <p className="mt-1 text-sm leading-5 text-[#64748B]">{text}</p>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

export default HomePage;
