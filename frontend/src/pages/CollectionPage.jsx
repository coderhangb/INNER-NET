import { useEffect, useState } from "react";
import AppHeader from "../components/AppHeader.jsx";
import { axiosInstance } from "../libs/axios.js";
import { useAuthStore } from "../store/useAuthStore.js";
const rarities = { common: "Thường", uncommon: "Ít gặp", rare: "Hiếm", epic: "Sử thi", legendary: "Huyền thoại" };
const statuses = { available: "Sẵn sàng", trade_locked: "Đang trao đổi", export_locked: "Đang khóa để xuất", exported: "Đã xuất" };
const colors = { common: "#64748b", uncommon: "#16a34a", rare: "#0284c7", epic: "#9333ea", legendary: "#d97706" };
function CollectionContent() {
  const [rarity, setRarity] = useState("");
  const [status, setStatus] = useState("");
  const [cursor, setCursor] = useState(null);
  const [previous, setPrevious] = useState([]);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState({ items: [], total: 0, nextCursor: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
  function onRewardGranted() {
    setLoading(true);
    setError("");
    setSelected(null);

    // Quay về trang đầu để tránh dùng cursor của danh sách cũ.
    setCursor(null);
    setPrevious([]);

    // Tải lại kể cả khi đang ở trang đầu.
    setReload(value => value + 1);
  }

  window.addEventListener(
    "innernet:reward-granted",
    onRewardGranted
  );

  return () => {
    window.removeEventListener(
      "innernet:reward-granted",
      onRewardGranted
    );
  };
}, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data } = await axiosInstance.get("/api/cards/me", {
          params: { limit: 6, ...(rarity ? { rarity } : {}), ...(status ? { status } : {}), ...(cursor ? { cursor } : {}) },
          signal: controller.signal,
        });
        if (active) setResult(data);
      } catch (e) {
        if (active) setError(e.response?.data?.message || "Không tải được kho card. Hãy thử lại.");
      } finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; controller.abort(); };
  }, [rarity, status, cursor, reload]);
  function filter(setter, value) {
    setter(value); setCursor(null); setPrevious([]); setSelected(null); setLoading(true);
  }
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 text-slate-700">
        <h1 className="text-3xl font-bold">Bộ sưu tập của bạn</h1>
        <p className="mt-2 text-slate-500">Mỗi ô là một bản card riêng, có mã riêng.</p>
        <div className="my-6 flex flex-wrap items-center gap-3">
          <label>Độ hiếm{" "}<select className="rounded-lg border p-2" value={rarity} onChange={e => filter(setRarity, e.target.value)}>
            <option value="">Tất cả</option>
            {Object.entries(rarities).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label>Trạng thái{" "}<select className="rounded-lg border p-2" value={status} onChange={e => filter(setStatus, e.target.value)}>
            <option value="">Tất cả</option>
            {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <button className="rounded-lg bg-sky-100 px-4 py-2" onClick={() => { setLoading(true); setSelected(null); setCursor(null); setPrevious([]); setReload(n => n + 1); }}>Làm mới</button>
        </div>
        {loading ? <p role="status">Đang tải kho card…</p> : error ? <p role="alert" className="text-red-700">{error}</p> : <>
          <p className="mb-4">Tổng số bản phù hợp: <strong>{result.total}</strong></p>
          {result.items.length === 0 ? <p>Không có card phù hợp. Thử bỏ bộ lọc hoặc kiểm tra dữ liệu mẫu.</p> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map(card => <button key={card._id} onClick={() => setSelected(card)} className="rounded-2xl border-2 bg-white p-5 text-left shadow-sm" style={{ borderColor: colors[card.metadataSnapshot.rarity] }}>
              <div className="mb-4 grid h-28 place-items-center rounded-xl bg-slate-50 text-6xl" aria-hidden="true">{card.metadataSnapshot.symbol}</div>
              <h2 className="text-xl font-bold">{card.metadataSnapshot.name}</h2>
              <p style={{ color: colors[card.metadataSnapshot.rarity] }}>{rarities[card.metadataSnapshot.rarity]}</p>
              <p className="mt-2">{statuses[card.status]}</p>
              <p className="mt-3 break-all text-xs text-slate-500">Mã: {card._id}</p>
            </button>)}
          </div>}
          <div className="mt-6 flex items-center gap-4">
            <button disabled={!previous.length} className="rounded-lg border px-4 py-2 disabled:opacity-40" onClick={() => { setLoading(true); setSelected(null); setCursor(previous.at(-1)); setPrevious(p => p.slice(0, -1)); }}>Trang trước</button>
            <span>Trang {previous.length + 1}</span>
            <button disabled={!result.nextCursor} className="rounded-lg border px-4 py-2 disabled:opacity-40" onClick={() => { setLoading(true); setSelected(null); setPrevious(p => [...p, cursor]); setCursor(result.nextCursor); }}>Trang sau</button>
          </div>
        </>}
        {selected && <section className="mt-6 rounded-2xl border bg-sky-50 p-5" aria-label="Chi tiết card">
          <h2 className="text-xl font-bold">{selected.metadataSnapshot.name}</h2>
          <p>{selected.metadataSnapshot.description}</p>
          <p className="break-all">Mã bản card: {selected._id}</p>
          <p>Phiên bản mẫu: {selected.templateVersion}</p>
          <p>Trạng thái: {statuses[selected.status]}</p>
          <p>Ngày tạo bản: {new Date(selected.createdAt).toLocaleString("vi-VN")}</p>
          <button className="mt-3 underline" onClick={() => setSelected(null)}>Đóng chi tiết</button>
        </section>}
      </main>
    </>
  );
}
export default function CollectionPage() {
  const userId = useAuthStore(state => state.authUser?._id);
  // Remount on account change; old data and in-flight responses cannot enter the new account view.
  return userId ? <CollectionContent key={userId} /> : null;
}
