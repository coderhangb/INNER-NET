import { useEffect, useState } from "react";
import AppHeader from "../components/AppHeader.jsx";
import { axiosInstance } from "../libs/axios.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { Link } from "react-router";

const rarities = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

const statuses = {
  available: "Available",
  trade_locked: "In Trade",
  export_locked: "Export Locked",
  exported: "Exported",
};

const colors = {
  common: "#64748b",
  uncommon: "#16a34a",
  rare: "#0284c7",
  epic: "#9333ea",
  legendary: "#d97706",
};

function CollectionContent() {
  const [rarity, setRarity] = useState("");
  const [status, setStatus] = useState("");
  const [cursor, setCursor] = useState(null);
  const [previous, setPrevious] = useState([]);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState({
    items: [],
    total: 0,
    nextCursor: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    function onRewardGranted() {
      setLoading(true);
      setError("");
      setSelected(null);

      // Reset to first page to avoid using stale cursor from previous state
      setCursor(null);
      setPrevious([]);

      // Trigger reload even when on first page
      setReload((value) => value + 1);
    }

    window.addEventListener("innernet:reward-granted", onRewardGranted);

    return () => {
      window.removeEventListener("innernet:reward-granted", onRewardGranted);
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
          params: {
            limit: 6,
            ...(rarity ? { rarity } : {}),
            ...(status ? { status } : {}),
            ...(cursor ? { cursor } : {}),
          },
          signal: controller.signal,
        });
        if (active) setResult(data);
      } catch (e) {
        if (active)
          setError(
            e.response?.data?.message ||
              "Failed to load collection. Please try again.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [rarity, status, cursor, reload]);

  function filter(setter, value) {
    setter(value);
    setCursor(null);
    setPrevious([]);
    setSelected(null);
    setLoading(true);
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 text-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Your Collection</h1>

          <Link
            to="/trades"
            className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-sky-700 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            Trade Cards
          </Link>
        </div>
        <p className="mt-2 text-slate-500">
          Each item is a unique card instance with a distinct ID.
        </p>

        <div className="my-6 flex flex-wrap items-center gap-3">
          <label>
            Rarity{" "}
            <select
              className="rounded-lg border p-2"
              value={rarity}
              onChange={(e) => filter(setRarity, e.target.value)}
            >
              <option value="">All</option>
              {Object.entries(rarities).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Status{" "}
            <select
              className="rounded-lg border p-2"
              value={status}
              onChange={(e) => filter(setStatus, e.target.value)}
            >
              <option value="">All</option>
              {Object.entries(statuses).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <button
            className="rounded-lg bg-sky-100 px-4 py-2"
            onClick={() => {
              setLoading(true);
              setSelected(null);
              setCursor(null);
              setPrevious([]);
              setReload((n) => n + 1);
            }}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p role="status">Loading collection…</p>
        ) : error ? (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        ) : (
          <>
            <p className="mb-4">
              Total matching items: <strong>{result.total}</strong>
            </p>

            {result.items.length === 0 ? (
              <p>
                No matching cards found. Try adjusting your filters or check
                sample data.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {result.items.map((card) => (
                  <button
                    key={card._id}
                    onClick={() => setSelected(card)}
                    className="rounded-2xl border-2 bg-white p-5 text-left shadow-sm transition hover:shadow-md"
                    style={{
                      borderColor: colors[card.metadataSnapshot.rarity],
                    }}
                  >
                    <div
                      className="mb-4 grid h-28 place-items-center rounded-xl bg-slate-50 text-6xl"
                      aria-hidden="true"
                    >
                      {card.metadataSnapshot.symbol}
                    </div>
                    <h2 className="text-xl font-bold">
                      {card.metadataSnapshot.name}
                    </h2>
                    <p style={{ color: colors[card.metadataSnapshot.rarity] }}>
                      {rarities[card.metadataSnapshot.rarity]}
                    </p>
                    <p className="mt-2">{statuses[card.status]}</p>
                    <p className="mt-3 break-all text-xs text-slate-500">
                      ID: {card._id}
                    </p>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-6 flex items-center gap-4">
              <button
                disabled={!previous.length}
                className="rounded-lg border px-4 py-2 disabled:opacity-40"
                onClick={() => {
                  setLoading(true);
                  setSelected(null);
                  setCursor(previous.at(-1));
                  setPrevious((p) => p.slice(0, -1));
                }}
              >
                Previous
              </button>

              <span>Page {previous.length + 1}</span>

              <button
                disabled={!result.nextCursor}
                className="rounded-lg border px-4 py-2 disabled:opacity-40"
                onClick={() => {
                  setLoading(true);
                  setSelected(null);
                  setPrevious((p) => [...p, cursor]);
                  setCursor(result.nextCursor);
                }}
              >
                Next
              </button>
            </div>
          </>
        )}

        {selected && (
          <section
            className="mt-6 rounded-2xl border bg-sky-50 p-5"
            aria-label="Card details"
          >
            <h2 className="text-xl font-bold">
              {selected.metadataSnapshot.name}
            </h2>
            <p className="mt-1">{selected.metadataSnapshot.description}</p>
            <p className="mt-2 break-all">Card Instance ID: {selected._id}</p>
            <p>Template Version: {selected.templateVersion}</p>
            <p>Status: {statuses[selected.status]}</p>
            <p>
              Acquired Date:{" "}
              {new Date(selected.createdAt).toLocaleString("en-US")}
            </p>
            <button
              className="mt-3 font-medium underline hover:text-sky-800"
              onClick={() => setSelected(null)}
            >
              Close Details
            </button>
          </section>
        )}
      </main>
    </>
  );
}

export default function CollectionPage() {
  const userId = useAuthStore((state) => state.authUser?._id);
  // Remount on account change; old data and in-flight responses cannot enter the new account view.
  return userId ? <CollectionContent key={userId} /> : null;
}
