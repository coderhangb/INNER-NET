import { useEffect, useState } from 'react';
import { axiosInstance } from '../libs/axios.js';
import { useAuthStore } from '../store/useAuthStore.js';
const reasons = {
  inactive: 'Tạm dừng khi ẩn trang hoặc không tương tác.',
  daily_cap: 'Đã đạt giới hạn thưởng hôm nay.',
  reward_unavailable: 'Bộ mẫu tạm chưa sẵn sàng. Tiến độ được giữ lại.',
};
function Tracker({ userId }) {
  const [progress, setProgress] = useState(null);
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [message, setMessage] = useState('Đang tải tiến độ…');
  useEffect(() => {
    let disposed = false, busy = false, sessionId = null, sequence = 0;
    let rules = null, pending = null, due = 0, lastInteraction = Date.now();
    let mustPause = false, highestMilestone = null;
    let acknowledgedAt = 0, animate = false, wasActive = true;
    const monotonic = () => performance.now();
    function isActive() {
      return !document.hidden && navigator.onLine &&
        monotonic() - lastInteraction < (rules?.idleSeconds || 120) * 1000;
    }
    function paint() {
      if (!rules || disposed) return;
      const elapsed = animate && isActive()
        ? Math.min(Math.max(0, (monotonic() - acknowledgedAt) / 1000), rules.heartbeatSeconds)
        : 0;
      setDisplaySeconds(Math.min(rules.remainderSeconds + elapsed, rules.intervalSeconds));
    }
    lastInteraction = monotonic();
    const controller = new AbortController();
    function apply(data) {
      if (disposed) return;
      rules = data; acknowledgedAt = monotonic(); setProgress(data); paint();
      const newest = data.recentGrants?.[0]?.milestone || 0;
      if (highestMilestone !== null && newest > highestMilestone) window.dispatchEvent(new Event('innernet:reward-granted'));
      highestMilestone = Math.max(highestMilestone || 0, newest);
    }
    const request = { signal: controller.signal, timeout: 15000 };
    const write = { ...request, headers: { 'X-CSRF-Protection': '1' } };
    function interact() {
      const resume = !isActive();
      lastInteraction = monotonic();
      if (resume) { due = 0; void tick(); }
    }
    function visibility() { animate = false; mustPause = true; if (!document.hidden) lastInteraction = monotonic(); paint(); due = 0; void tick(); }
    function offline() { animate = false; mustPause = true; paint(); setMessage('Mất mạng. Tạm dừng ghi nhận thời gian.'); }
    async function tick() {
      if (disposed) return;
      const currentActive = isActive();
      if (!currentActive && wasActive) {
        mustPause = true; animate = false; due = 0;
        setMessage(navigator.onLine ? reasons.inactive : 'Mất mạng. Tạm dừng ghi nhận thời gian.');
      }
      wasActive = currentActive;
      paint();
      if (busy || Date.now() < due || !navigator.onLine) return;
      busy = true;
      try {
        if (!rules) {
          const { data } = await axiosInstance.get('/api/rewards/progress', request);
          if (disposed) return;
          apply(data);
        }
        if (disposed) return;
        const active = isActive();
        if (!active) mustPause = true;
        // Retry an uncertain write with the SAME payload/sequence before sending a new one.
        if (!pending && sessionId && mustPause) {
          pending = { sessionId, sequence: ++sequence, visible: false, active: false };
        }
        if (!pending && !active) { setMessage(reasons.inactive); due = Date.now() + 1000; return; }
        if (!pending && !sessionId) {
          const { data } = await axiosInstance.post('/api/activity/sessions', {}, write);
          if (disposed) return;
          apply(data); sessionId = data.sessionId; sequence = 0;
          if (!sessionId) { animate = false; paint(); setMessage('Một tab hoặc thiết bị khác đang ghi nhận thời gian.'); due = Date.now() + rules.heartbeatSeconds * 1000; return; }
          mustPause = false;
        }
        if (!pending) pending = { sessionId, sequence: ++sequence, visible: true, active: true };
        const sent = pending;
        const { data } = await axiosInstance.post('/api/activity/heartbeat', sent, write);
        if (disposed) return;
        animate = sent.active && !data.pauseReason && data.dailyCount < data.dailyCap;
        apply(data); pending = null;
        if (!sent.active) { sessionId = null; mustPause = false; due = 0; setMessage(reasons.inactive); }
        else { due = Date.now() + rules.heartbeatSeconds * 1000; setMessage(reasons[data.pauseReason] || 'Đang ghi nhận thời gian hoạt động.'); }
      } catch (e) {
        if (disposed) return;
        animate = false; paint();
        const code = e.response?.data?.code;
        if (code === 'SESSION_EXPIRED') { sessionId = null; pending = null; sequence = 0; setMessage('Đang lấy lại phiên hoạt động…'); due = Date.now() + 1000; }
        else {
          setMessage(e.response?.data?.message || 'Mất kết nối. Sẽ tự thử lại; không cộng bù thời gian offline.');
          due = Date.now() + 5000;
          if ([401, 403].includes(e.response?.status) || code === 'PROFILE_MISMATCH') due = Infinity;
        }
      } finally { busy = false; }
    }
    const events = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(name => window.addEventListener(name, interact, { passive: true, capture: true }));
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('offline', offline);
    window.addEventListener('online', visibility);
    const timer = window.setInterval(() => { void tick(); }, 1000);
    void tick();
    return () => {
      disposed = true; controller.abort(); window.clearInterval(timer);
      events.forEach(name => window.removeEventListener(name, interact, true));
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('offline', offline); window.removeEventListener('online', visibility);
      // Do not send a fire-and-forget release: it could race a new tracker. Lease expires safely.
    };
  }, [userId]);
  return <section className="mx-auto my-3 max-w-6xl rounded-xl border border-sky-200 bg-sky-50 p-4 text-slate-700" aria-label="Tiến độ nhận card">
    <div className="flex flex-wrap items-center gap-3">
      <strong>Tiến độ nhận card</strong>
      {progress?.profile === 'quick' && <span className="rounded bg-amber-200 px-2 py-1 text-sm">THỬ NHANH · 60 giây/card</span>}
    </div>
    {progress && <>
      <p className="mt-2">{Math.floor(displaySeconds)} / {progress.intervalSeconds} giây · Hôm nay: {progress.dailyCount}/{progress.dailyCap} card thưởng</p>
      <p className="mt-1 text-xs">Đã được server xác nhận: {Math.floor(progress.remainderSeconds)} giây. Bộ đếm phía trên là ước tính giữa các lần đồng bộ.</p>
      <progress className="mt-2 w-full" value={displaySeconds} max={progress.intervalSeconds} />
    </>}
    <p className="mt-2 text-sm" role="status">{message}</p>
    {progress?.recentGrants?.length > 0 && <details className="mt-2 text-sm">
      <summary>Card thưởng gần đây</summary>
      <ul className="mt-2 space-y-1">{progress.recentGrants.slice(0, 6).map(g => <li key={g._id}>{g.symbol} {g.name} · Mốc {g.milestone} · <span className="break-all">{g.cardInstanceId}</span></li>)}</ul>
    </details>}
  </section>;
}
export default function ActivityTracker() {
  const user = useAuthStore(state => state.authUser);
  return user?.role === 'student' ? <Tracker key={user._id} userId={user._id} /> : null;
}
