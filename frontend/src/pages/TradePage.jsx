import { useEffect, useRef, useState } from "react";
import AppHeader from "../components/AppHeader.jsx";
import AppFooter from "../components/AppFooter";
import PageLoader from "../components/PageLoader.jsx";
import { axiosInstance } from "../libs/axios.js";
import { useAuthStore } from "../store/useAuthStore.js";

const labels = {
  pending: "Pending",
  accepted: "Traded",
  declined: "Declined",
  cancelled: "Cancelled",
  expired: "Expired",
  invalid: "Card no longer eligible",
};

const writeOptions = {
  headers: { "X-CSRF-Protection": "1" },
  timeout: 20000,
};

function errorText(error) {
  return (
    error.response?.data?.message || "No response received. Please try again."
  );
}

function TradeContent({ userId }) {
  const [myCode, setMyCode] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [partner, setPartner] = useState(null);

  const [mine, setMine] = useState({
    items: [],
    nextCursor: null,
  });

  const [theirs, setTheirs] = useState({
    items: [],
    nextCursor: null,
  });

  const [offeredId, setOfferedId] = useState("");
  const [requestedId, setRequestedId] = useState("");

  const [openMineDropdown, setOpenMineDropdown] = useState(false);
  const [openTheirsDropdown, setOpenTheirsDropdown] = useState(false);

  const [offers, setOffers] = useState({
    items: [],
    nextCursor: null,
  });

  const [busy, setBusy] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMineMore, setLoadingMineMore] = useState(false);
  const [loadingTheirsMore, setLoadingTheirsMore] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const requestRef = useRef(null);
  const alive = useRef(true);

  async function loadMine() {
    const { data } = await axiosInstance.get("/api/cards/me", {
      params: { limit: 12, status: "available" },
      timeout: 20000,
    });
    if (!alive.current) return;
    setMine(data);
  }

  async function loadMoreMine() {
    if (!mine.nextCursor || loadingMineMore) return;
    setLoadingMineMore(true);

    try {
      const { data } = await axiosInstance.get("/api/cards/me", {
        params: { limit: 12, status: "available", cursor: mine.nextCursor },
        timeout: 20000,
      });
      if (!alive.current) return;
      setMine((prev) => ({
        items: [...prev.items, ...data.items],
        nextCursor: data.nextCursor,
      }));
    } catch (err) {
      console.warn("Failed to load more mine cards:", err);
    } finally {
      if (alive.current) setLoadingMineMore(false);
    }
  }

  async function loadOffers() {
    const { data } = await axiosInstance.get("/api/trades", { timeout: 20000 });
    if (alive.current) setOffers(data);
  }

  async function loadPartner(code) {
    const { data } = await axiosInstance.get(
      `/api/trades/partners/${encodeURIComponent(code)}`,
      { params: { limit: 12 }, timeout: 20000 },
    );

    if (!alive.current) return;
    setPartner(data.partner);
    setTheirs(data);
    setRequestedId("");
  }

  async function loadMoreTheirs() {
    if (!partner || !theirs.nextCursor || loadingTheirsMore) return;
    setLoadingTheirsMore(true);

    try {
      const { data } = await axiosInstance.get(
        `/api/trades/partners/${encodeURIComponent(partner.code)}`,
        { params: { limit: 12, cursor: theirs.nextCursor }, timeout: 20000 },
      );
      if (!alive.current) return;
      setTheirs((prev) => ({
        partner: data.partner,
        items: [...prev.items, ...data.items],
        nextCursor: data.nextCursor,
      }));
    } catch (err) {
      console.warn("Failed to load more recipient cards:", err);
    } finally {
      if (alive.current) setLoadingTheirsMore(false);
    }
  }

  async function run(work) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");

    try {
      await work();
    } catch (error) {
      if (alive.current) setError(errorText(error));
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  useEffect(() => {
    alive.current = true;
    let cancelled = false;

    async function initialize() {
      setInitialLoading(true);
      try {
        const { data } = await axiosInstance.post(
          "/api/trades/profile",
          {},
          writeOptions,
        );
        if (cancelled) return;
        setMyCode(data.code);

        await Promise.all([loadOffers(), loadMine()]);
      } catch (error) {
        if (!cancelled) setError(errorText(error));
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }

    void initialize();

    return () => {
      cancelled = true;
      alive.current = false;
    };
  }, [userId]);

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    setError("");

    try {
      const promises = [loadOffers(), loadMine()];
      if (partner) {
        promises.push(loadPartner(partner.code));
      }
      await Promise.all(promises);
    } catch (error) {
      if (alive.current) setError(errorText(error));
    } finally {
      if (alive.current) setRefreshing(false);
    }
  }

  async function submitOffer() {
    const payload = {
      recipientCode: partner.code,
      offeredCardId: offeredId,
      requestedCardId: requestedId,
    };

    const signature = JSON.stringify(payload);
    if (requestRef.current?.signature !== signature) {
      requestRef.current = { signature, key: crypto.randomUUID() };
    }

    const { data } = await axiosInstance.post(
      "/api/trades",
      { ...payload, requestKey: requestRef.current.key },
      writeOptions,
    );

    if (!alive.current) return;
    requestRef.current = null;
    setOfferedId("");
    setRequestedId("");

    await refresh();

    if (alive.current) {
      setNotice(`Offer ${data._id}: ${labels[data.status]}.`);
    }
  }

  async function act(id, action) {
    const { data } = await axiosInstance.post(
      `/api/trades/${id}/${action}`,
      {},
      writeOptions,
    );
    if (!alive.current) return;
    await refresh();
    if (alive.current) {
      setNotice(`Result: ${labels[data.status]}.`);
    }
  }

  const handleDropdownScroll = (event, isMine) => {
    const { scrollTop, scrollHeight, clientHeight } = event.target;
    if (scrollHeight - scrollTop <= clientHeight + 15) {
      if (isMine) void loadMoreMine();
      else void loadMoreTheirs();
    }
  };

  const button =
    "rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer transition-colors inline-flex items-center gap-2";

  if (initialLoading) {
    return (
      <div className="flex flex-col">
        <AppHeader />
        <main className="flex min-h-[105vh] items-center justify-center">
          <PageLoader />
        </main>
        <AppFooter />
      </div>
    );
  }

  const selectedOfferedCard = mine.items.find((c) => c._id === offeredId);
  const selectedRequestedCard = theirs.items.find((c) => c._id === requestedId);

  return (
    <div className="flex flex-col">
      <AppHeader />

      {busy && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900/90 px-4 py-2.5 text-sm font-medium text-white shadow-2xl backdrop-blur-xs transition-all animate-in fade-in slide-in-from-bottom-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <span>Processing...</span>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl min-h-[105vh] px-4 py-8 text-slate-700">
        <h1 className="text-3xl font-bold text-slate-900">Card Trading</h1>

        <p className="mt-3">
          Your Trade Code:{" "}
          <strong className="break-all text-sky-600 font-mono">
            {myCode || "…"}
          </strong>
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Share this code with anyone you wish to trade with. Each offer remains
          valid for 24 hours.
        </p>

        <div className="mt-3 min-h-6">
          {error && (
            <p role="alert" className="text-red-700 font-medium">
              {error}
            </p>
          )}

          {notice && (
            <p role="status" className="text-green-700 font-medium">
              {notice}
            </p>
          )}
        </div>

        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-xl font-bold text-slate-800">
            Create Trade Offer
          </h2>

          <form
            className="mt-4 flex flex-wrap gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                setPartner(null);
                setTheirs({ items: [], nextCursor: null });
                setRequestedId("");

                await loadPartner(codeInput.trim().toUpperCase());
              });
            }}
          >
            <input
              className="rounded-lg border border-slate-300 p-2 text-slate-800 font-mono tracking-wider uppercase"
              aria-label="Recipient Trade Code"
              placeholder="Recipient Trade Code"
              value={codeInput}
              maxLength={16}
              disabled={busy}
              onChange={(event) => setCodeInput(event.target.value)}
            />

            <button className={button} disabled={busy || !codeInput.trim()}>
              Find Partner
            </button>
          </form>

          {partner && (
            <p className="mt-3 text-slate-800">
              Recipient: <strong>{partner.fullName}</strong>
              {" · "}
              <span className="font-mono text-slate-500">{partner.code}</span>
            </p>
          )}

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="relative">
              <label className="block font-semibold text-slate-700 mb-2">
                Card You Offer
              </label>

              <button
                type="button"
                className="w-full flex justify-between items-center rounded-lg border border-slate-300 p-2.5 bg-white text-left text-slate-800 cursor-pointer disabled:opacity-50"
                disabled={busy}
                onClick={() => {
                  setOpenMineDropdown(!openMineDropdown);
                  setOpenTheirsDropdown(false);
                }}
              >
                <span className="truncate">
                  {selectedOfferedCard
                    ? `${selectedOfferedCard.metadataSnapshot.symbol} ${selectedOfferedCard.metadataSnapshot.name} · #${selectedOfferedCard._id.slice(-6)}`
                    : "Select your card"}
                </span>
                <span className="text-xs text-slate-400 ml-2">▼</span>
              </button>

              {openMineDropdown && (
                <div
                  className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg text-slate-800"
                  onScroll={(e) => handleDropdownScroll(e, true)}
                >
                  <div
                    className="p-2 hover:bg-slate-100 cursor-pointer border-b border-slate-100 text-slate-400 text-sm"
                    onClick={() => {
                      setOfferedId("");
                      setOpenMineDropdown(false);
                    }}
                  >
                    -- Clear Selection --
                  </div>
                  {mine.items.map((card) => (
                    <div
                      key={card._id}
                      className={`p-2.5 hover:bg-sky-50 cursor-pointer border-b border-slate-100 flex items-center justify-between text-sm ${
                        offeredId === card._id
                          ? "bg-sky-100 font-semibold text-sky-900"
                          : ""
                      }`}
                      onClick={() => {
                        setOfferedId(card._id);
                        setOpenMineDropdown(false);
                      }}
                    >
                      <span>
                        {card.metadataSnapshot.symbol}{" "}
                        {card.metadataSnapshot.name}
                      </span>
                      <span className="font-mono text-xs text-slate-400">
                        #{card._id.slice(-6)}
                      </span>
                    </div>
                  ))}

                  {loadingMineMore && (
                    <div className="p-2 text-center text-xs text-sky-600 font-medium">
                      Loading more...
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <label className="block font-semibold text-slate-700 mb-2">
                Card You Request
              </label>

              <button
                type="button"
                className="w-full flex justify-between items-center rounded-lg border border-slate-300 p-2.5 bg-white text-left text-slate-800 cursor-pointer disabled:opacity-50"
                disabled={busy || !partner}
                onClick={() => {
                  setOpenTheirsDropdown(!openTheirsDropdown);
                  setOpenMineDropdown(false);
                }}
              >
                <span className="truncate">
                  {partner
                    ? selectedRequestedCard
                      ? `${selectedRequestedCard.metadataSnapshot.symbol} ${selectedRequestedCard.metadataSnapshot.name} · #${selectedRequestedCard._id.slice(-6)}`
                      : "Select recipient's card"
                    : "Enter recipient code first"}
                </span>
                <span className="text-xs text-slate-400 ml-2">▼</span>
              </button>

              {openTheirsDropdown && partner && (
                <div
                  className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg text-slate-800"
                  onScroll={(e) => handleDropdownScroll(e, false)}
                >
                  <div
                    className="p-2 hover:bg-slate-100 cursor-pointer border-b border-slate-100 text-slate-400 text-sm"
                    onClick={() => {
                      setRequestedId("");
                      setOpenTheirsDropdown(false);
                    }}
                  >
                    -- Clear Selection --
                  </div>
                  {theirs.items.map((card) => (
                    <div
                      key={card._id}
                      className={`p-2.5 hover:bg-sky-50 cursor-pointer border-b border-slate-100 flex items-center justify-between text-sm ${
                        requestedId === card._id
                          ? "bg-sky-100 font-semibold text-sky-900"
                          : ""
                      }`}
                      onClick={() => {
                        setRequestedId(card._id);
                        setOpenTheirsDropdown(false);
                      }}
                    >
                      <span>
                        {card.metadataSnapshot.symbol}{" "}
                        {card.metadataSnapshot.name}
                      </span>
                      <span className="font-mono text-xs text-slate-400">
                        #{card._id.slice(-6)}
                      </span>
                    </div>
                  ))}

                  {loadingTheirsMore && (
                    <div className="p-2 text-center text-xs text-sky-600 font-medium">
                      Loading more...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Upon submitting, your offered card will be locked until the offer is
            accepted, declined, cancelled, or expires.
          </p>

          <button
            className="mt-4 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium px-4 py-2 disabled:opacity-40 cursor-pointer transition-colors"
            disabled={busy || !partner || !offeredId || !requestedId}
            onClick={() => void run(submitOffer)}
          >
            Send Trade Offer
          </button>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800">
              Trade Offers & History
            </h2>

            <button
              className={button}
              disabled={busy || refreshing}
              onClick={() => void refresh()}
            >
              {refreshing && (
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
              )}
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {offers.items.length === 0 && (
            <p className="mt-4 text-slate-500">No trade offers found.</p>
          )}

          <div className="mt-4 space-y-4">
            {offers.items.map((offer) => {
              const sent = String(offer.proposerId) === String(userId);

              return (
                <article
                  key={offer._id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
                >
                  <p className="font-bold text-slate-800">
                    {sent ? "Sent" : "Received"}
                    {" · "}
                    {labels[offer.status]}
                  </p>

                  <p className="mt-2 text-slate-700">
                    Offered Card: {offer.offeredName}
                  </p>

                  <p className="text-slate-700">
                    Requested Card: {offer.requestedName}
                  </p>

                  <p className="mt-2 break-all text-xs font-mono text-slate-500">
                    Offered Card ID: {offer.offeredCardId}
                  </p>

                  <p className="break-all text-xs font-mono text-slate-500">
                    Requested Card ID: {offer.requestedCardId}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    Expires: {new Date(offer.expiresAt).toLocaleString("en-US")}
                  </p>

                  <p className="break-all text-xs font-mono text-slate-400">
                    Offer ID: {offer._id}
                  </p>

                  {offer.status === "pending" && (
                    <div className="mt-3 flex gap-3">
                      {sent ? (
                        <button
                          className={button}
                          disabled={busy}
                          onClick={() =>
                            void run(() => act(offer._id, "cancel"))
                          }
                        >
                          Cancel Offer
                        </button>
                      ) : (
                        <>
                          <button
                            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-2 disabled:opacity-40 cursor-pointer transition-colors"
                            disabled={busy}
                            onClick={() =>
                              void run(() => act(offer._id, "accept"))
                            }
                          >
                            Accept
                          </button>

                          <button
                            className="rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-medium px-3 py-2 disabled:opacity-40 cursor-pointer transition-colors"
                            disabled={busy}
                            onClick={() =>
                              void run(() => act(offer._id, "decline"))
                            }
                          >
                            Decline
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

export default function TradePage() {
  const user = useAuthStore((state) => state.authUser);

  if (!user) {
    return <p className="p-6 text-slate-600">Please log in to trade cards.</p>;
  }

  if (user.role !== "student") {
    return (
      <p className="p-6 text-slate-600">
        Trading features are currently available for student accounts only.
      </p>
    );
  }

  return <TradeContent key={user._id} userId={user._id} />;
}
