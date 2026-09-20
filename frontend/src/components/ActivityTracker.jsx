import { useEffect, useState } from "react";
import { axiosInstance } from "../libs/axios.js";
import { useAuthStore } from "../store/useAuthStore.js";

const reasons = {
  inactive: "Paused due to inactivity.",
  daily_cap: "Daily reward limit reached.",
  reward_unavailable: "Card set unavailable. Progress saved.",
};

function Tracker({ userId }) {
  const [progress, setProgress] = useState(null);
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [message, setMessage] = useState("Loading...");
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    let disposed = false,
      busy = false,
      sessionId = null,
      sequence = 0;
    let rules = null,
      pending = null,
      due = 0,
      lastInteraction = Date.now();
    let mustPause = false,
      highestMilestone = null;
    let acknowledgedAt = 0,
      animate = false,
      wasActive = true;

    const monotonic = () => performance.now();

    function isActive() {
      return (
        !document.hidden &&
        navigator.onLine &&
        monotonic() - lastInteraction < (rules?.idleSeconds || 120) * 1000
      );
    }

    function paint() {
      if (!rules || disposed) return;
      const elapsed =
        animate && isActive()
          ? Math.min(
              Math.max(0, (monotonic() - acknowledgedAt) / 1000),
              rules.heartbeatSeconds,
            )
          : 0;
      setDisplaySeconds(
        Math.min(rules.remainderSeconds + elapsed, rules.intervalSeconds),
      );
    }

    lastInteraction = monotonic();
    const controller = new AbortController();

    function apply(data) {
      if (disposed) return;
      rules = data;
      acknowledgedAt = monotonic();
      setProgress(data);
      paint();
      const newest = data.recentGrants?.[0]?.milestone || 0;
      if (highestMilestone !== null && newest > highestMilestone)
        window.dispatchEvent(new Event("innernet:reward-granted"));
      highestMilestone = Math.max(highestMilestone || 0, newest);
    }

    const request = { signal: controller.signal, timeout: 15000 };
    const write = { ...request, headers: { "X-CSRF-Protection": "1" } };

    function interact() {
      const resume = !isActive();
      lastInteraction = monotonic();
      if (resume) {
        due = 0;
        void tick();
      }
    }

    function visibility() {
      animate = false;
      mustPause = true;
      if (!document.hidden) lastInteraction = monotonic();
      paint();
      due = 0;
      void tick();
    }

    function offline() {
      animate = false;
      mustPause = true;
      paint();
      setMessage("Offline. Tracking paused.");
    }

    async function tick() {
      if (disposed) return;
      const currentActive = isActive();
      if (!currentActive && wasActive) {
        mustPause = true;
        animate = false;
        due = 0;
        setMessage(
          navigator.onLine ? reasons.inactive : "Offline. Tracking paused.",
        );
      }
      wasActive = currentActive;
      paint();
      if (busy || Date.now() < due || !navigator.onLine) return;
      busy = true;

      try {
        if (!rules) {
          const { data } = await axiosInstance.get(
            "/api/rewards/progress",
            request,
          );
          if (disposed) return;
          apply(data);
        }

        if (disposed) return;
        const active = isActive();
        if (!active) mustPause = true;

        if (!pending && sessionId && mustPause) {
          pending = {
            sessionId,
            sequence: ++sequence,
            visible: false,
            active: false,
          };
        }

        if (!pending && !active) {
          setMessage(reasons.inactive);
          due = Date.now() + 1000;
          return;
        }

        if (!pending && !sessionId) {
          const { data } = await axiosInstance.post(
            "/api/activity/sessions",
            {},
            write,
          );
          if (disposed) return;
          apply(data);
          sessionId = data.sessionId;
          sequence = 0;
          if (!sessionId) {
            animate = false;
            paint();
            setMessage("Active in another tab.");
            due = Date.now() + rules.heartbeatSeconds * 1000;
            return;
          }
          mustPause = false;
        }

        if (!pending)
          pending = {
            sessionId,
            sequence: ++sequence,
            visible: true,
            active: true,
          };

        const sent = pending;
        const { data } = await axiosInstance.post(
          "/api/activity/heartbeat",
          sent,
          write,
        );
        if (disposed) return;
        animate =
          sent.active && !data.pauseReason && data.dailyCount < data.dailyCap;
        apply(data);
        pending = null;

        if (!sent.active) {
          sessionId = null;
          mustPause = false;
          due = 0;
          setMessage(reasons.inactive);
        } else {
          due = Date.now() + rules.heartbeatSeconds * 1000;
          setMessage(reasons[data.pauseReason] || "Recording activity...");
        }
      } catch (e) {
        if (disposed) return;
        animate = false;
        paint();
        const code = e.response?.data?.code;
        if (code === "SESSION_EXPIRED") {
          sessionId = null;
          pending = null;
          sequence = 0;
          setMessage("Re-establishing...");
          due = Date.now() + 1000;
        } else {
          setMessage(e.response?.data?.message || "Connection lost.");
          due = Date.now() + 5000;
          if (
            [401, 403].includes(e.response?.status) ||
            code === "PROFILE_MISMATCH"
          )
            due = Infinity;
        }
      } finally {
        busy = false;
      }
    }

    const events = [
      "pointerdown",
      "pointermove",
      "keydown",
      "scroll",
      "touchstart",
    ];
    events.forEach((name) =>
      window.addEventListener(name, interact, { passive: true, capture: true }),
    );
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("offline", offline);
    window.addEventListener("online", visibility);

    const timer = window.setInterval(() => {
      void tick();
    }, 1000);

    void tick();

    return () => {
      disposed = true;
      controller.abort();
      window.clearInterval(timer);
      events.forEach((name) =>
        window.removeEventListener(name, interact, true),
      );
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", visibility);
    };
  }, [userId]);

  const maxSec = progress?.intervalSeconds || 60;
  const percentage = Math.min(
    100,
    Math.max(0, (displaySeconds / maxSec) * 100),
  );

  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  if (isCollapsed) {
    return (
      <div className="fixed bottom-5 right-5 z-50">
        <button
          onClick={() => setIsCollapsed(false)}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-xl transition-transform hover:scale-105 active:scale-95"
          title="Expand Activity Tracker"
        >
          <svg className="absolute h-14 w-14 -rotate-90 transform">
            <circle
              cx="28"
              cy="28"
              r={radius}
              className="stroke-slate-200"
              strokeWidth="3.5"
              fill="transparent"
            />
            <circle
              cx="28"
              cy="28"
              r={radius}
              className="stroke-sky-500 transition-all duration-300 ease-out"
              strokeWidth="3.5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <span className="text-xl">🎁</span>
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white shadow">
            {progress?.dailyCount || 0}
          </span>
        </button>
      </div>
    );
  }

  return (
    <aside
      className="fixed bottom-5 right-5 z-50 w-80 rounded-2xl border border-sky-100 bg-white/95 p-4 text-slate-700 shadow-2xl backdrop-blur-md transition-all"
      aria-label="Card reward progress"
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-base">🎁</span>
          <strong className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Reward Progress
          </strong>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:bg-slate-200 transition-colors"
          title="Minimize"
        >
          ✕
        </button>
      </div>

      {progress && (
        <div className="mt-3">
          <div className="flex justify-between text-xs font-semibold text-slate-600">
            <span>
              {Math.floor(displaySeconds)}s / {progress.intervalSeconds}s
            </span>
            <span>
              Today: {progress.dailyCount}/{progress.dailyCap}
            </span>
          </div>

          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-linear-to-r from-sky-400 to-sky-600 transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <p className="mt-1 text-[10px] text-slate-400">
            Server sync: {Math.floor(progress.remainderSeconds)}s
          </p>
        </div>
      )}

      <p className="mt-2 text-xs font-medium text-sky-600" role="status">
        {message}
      </p>

      {progress?.recentGrants?.length > 0 && (
        <details className="mt-2 text-xs text-slate-500">
          <summary className="cursor-pointer font-medium hover:text-slate-800">
            Recent Rewards ({progress.recentGrants.length})
          </summary>
          <ul className="mt-2 max-h-24 overflow-y-auto space-y-1 rounded-lg bg-slate-50 p-2">
            {progress.recentGrants.slice(0, 4).map((g) => (
              <li
                key={g._id}
                className="flex items-center justify-between text-[11px]"
              >
                <span>
                  {g.symbol} {g.name}
                </span>
                <span className="font-mono text-slate-400">
                  #M{g.milestone}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </aside>
  );
}

export default function ActivityTracker() {
  const user = useAuthStore((state) => state.authUser);
  return user?.role === "student" ? (
    <Tracker key={user._id} userId={user._id} />
  ) : null;
}
