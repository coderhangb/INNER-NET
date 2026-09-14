import { useEffect, useRef, useState } from "react";
import AppHeader from "../components/AppHeader.jsx";
import { axiosInstance } from "../libs/axios.js";
import { useAuthStore } from "../store/useAuthStore.js";

const labels = {
  pending: "Đang chờ",
  accepted: "Đã trao đổi",
  declined: "Đã từ chối",
  cancelled: "Đã hủy",
  expired: "Đã hết hạn",
  invalid: "Card không còn phù hợp",
};

const writeOptions = {
  headers: { "X-CSRF-Protection": "1" },
  timeout: 20000,
};

function errorText(error) {
  return (
    error.response?.data?.message ||
    "Chưa nhận được phản hồi. Hãy thử lại."
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

  const [offers, setOffers] = useState({
    items: [],
    nextCursor: null,
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const requestRef = useRef(null);
  const alive = useRef(true);

  async function loadMine(cursor = null) {
    const { data } = await axiosInstance.get("/api/cards/me", {
      params: {
        limit: 6,
        status: "available",
        ...(cursor ? { cursor } : {}),
      },
      timeout: 20000,
    });

    if (!alive.current) return;

    setMine(data);
    setOfferedId("");
  }

  async function loadOffers(cursor = null) {
    const { data } = await axiosInstance.get("/api/trades", {
      params: cursor ? { cursor } : {},
      timeout: 20000,
    });

    if (alive.current) setOffers(data);
  }

  async function loadPartner(code, cursor = null) {
    const { data } = await axiosInstance.get(
      `/api/trades/partners/${encodeURIComponent(code)}`,
      {
        params: cursor ? { cursor } : {},
        timeout: 20000,
      },
    );

    if (!alive.current) return;

    setPartner(data.partner);
    setTheirs(data);
    setRequestedId("");
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
      setBusy(true);

      try {
        const { data } = await axiosInstance.post(
          "/api/trades/profile",
          {},
          writeOptions,
        );

        if (cancelled) return;

        setMyCode(data.code);

        await loadOffers();
        if (cancelled) return;

        await loadMine();
      } catch (error) {
        if (!cancelled) setError(errorText(error));
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    void initialize();

    return () => {
      cancelled = true;
      alive.current = false;
    };
  }, [userId]);

  async function refresh() {
    await loadOffers();
    await loadMine();

    if (partner) {
      await loadPartner(partner.code);
    }
  }

  async function submitOffer() {
    const payload = {
      recipientCode: partner.code,
      offeredCardId: offeredId,
      requestedCardId: requestedId,
    };

    const signature = JSON.stringify(payload);

    // Retry the same form with the same request key after a timeout.
    if (requestRef.current?.signature !== signature) {
      requestRef.current = {
        signature,
        key: crypto.randomUUID(),
      };
    }

    const { data } = await axiosInstance.post(
      "/api/trades",
      {
        ...payload,
        requestKey: requestRef.current.key,
      },
      writeOptions,
    );

    if (!alive.current) return;

    requestRef.current = null;

    await refresh();

    if (alive.current) {
      setNotice(
        `Đề nghị ${data._id}: ${labels[data.status]}.`,
      );
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
      setNotice(`Kết quả: ${labels[data.status]}.`);
    }
  }

  const button =
    "rounded-lg border px-3 py-2 disabled:opacity-40";

  function cardOptions(items) {
    return items.map(card => (
      <option key={card._id} value={card._id}>
        {card.metadataSnapshot.symbol}{" "}
        {card.metadataSnapshot.name} ·{" "}
        {card._id.slice(-6)}
      </option>
    ));
  }

  return (
    <>
      <AppHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 text-slate-700">
        <h1 className="text-3xl font-bold">Trao đổi card</h1>

        <p className="mt-3">
          Mã trao đổi của bạn:{" "}
          <strong className="break-all">{myCode || "…"}</strong>
        </p>

        <p className="mt-2 text-sm">
          Gửi mã này cho người bạn muốn trao đổi.
          Mỗi đề nghị có hiệu lực 24 giờ.
        </p>

        {error && (
          <p role="alert" className="mt-4 text-red-700">
            {error}
          </p>
        )}

        {notice && (
          <p role="status" className="mt-4 text-green-700">
            {notice}
          </p>
        )}

        {busy && (
          <p role="status" className="mt-3">
            Đang xử lý…
          </p>
        )}

        <section className="mt-6 rounded-xl border p-4">
          <h2 className="text-xl font-bold">Tạo đề nghị</h2>

          <form
            className="mt-4 flex flex-wrap gap-3"
            onSubmit={event => {
              event.preventDefault();

              void run(async () => {
                setPartner(null);
                setTheirs({ items: [], nextCursor: null });
                setRequestedId("");

                await loadPartner(
                  codeInput.trim().toUpperCase(),
                );
              });
            }}
          >
            <input
              className="rounded-lg border p-2"
              aria-label="Mã trao đổi của người nhận"
              placeholder="Mã trao đổi người nhận"
              value={codeInput}
              maxLength={16}
              disabled={busy}
              onChange={event => setCodeInput(event.target.value)}
            />

            <button
              className={button}
              disabled={busy || !codeInput.trim()}
            >
              Tìm người nhận
            </button>
          </form>

          {partner && (
            <p className="mt-3">
              Người nhận: <strong>{partner.fullName}</strong>
              {" · "}{partner.code}
            </p>
          )}

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <label className="block font-semibold">
                Card bạn đưa ra
              </label>

              <select
                className="mt-2 w-full rounded-lg border p-2"
                value={offeredId}
                disabled={busy}
                onChange={event => setOfferedId(event.target.value)}
              >
                <option value="">Chọn card của bạn</option>
                {cardOptions(mine.items)}
              </select>

              <div className="mt-2 flex gap-2">
                <button
                  className={button}
                  disabled={busy}
                  onClick={() => void run(() => loadMine())}
                >
                  Trang đầu
                </button>

                <button
                  className={button}
                  disabled={busy || !mine.nextCursor}
                  onClick={() =>
                    void run(() => loadMine(mine.nextCursor))
                  }
                >
                  Trang sau
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold">
                Card bạn muốn nhận
              </label>

              <select
                className="mt-2 w-full rounded-lg border p-2"
                value={requestedId}
                disabled={busy || !partner}
                onChange={event =>
                  setRequestedId(event.target.value)
                }
              >
                <option value="">Chọn card của người nhận</option>
                {cardOptions(theirs.items)}
              </select>

              <div className="mt-2 flex gap-2">
                <button
                  className={button}
                  disabled={busy || !partner}
                  onClick={() =>
                    void run(() => loadPartner(partner.code))
                  }
                >
                  Trang đầu
                </button>

                <button
                  className={button}
                  disabled={
                    busy || !partner || !theirs.nextCursor
                  }
                  onClick={() =>
                    void run(() =>
                      loadPartner(partner.code, theirs.nextCursor),
                    )
                  }
                >
                  Trang sau
                </button>
              </div>
            </div>
          </div>

          <p className="mt-4 text-sm">
            Khi gửi, card bạn đưa ra sẽ bị khóa đến khi đề nghị
            được xử lý hoặc hết hạn.
          </p>

          <button
            className="mt-4 rounded-lg bg-sky-100 px-4 py-2 disabled:opacity-40"
            disabled={
              busy || !partner || !offeredId || !requestedId
            }
            onClick={() => void run(submitOffer)}
          >
            Gửi đề nghị
          </button>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-xl font-bold">
              Đề nghị và lịch sử
            </h2>

            <button
              className={button}
              disabled={busy}
              onClick={() => void run(refresh)}
            >
              Làm mới
            </button>
          </div>

          {offers.items.length === 0 && (
            <p className="mt-4">Chưa có đề nghị nào.</p>
          )}

          <div className="mt-4 space-y-4">
            {offers.items.map(offer => {
              const sent =
                String(offer.proposerId) === String(userId);

              return (
                <article
                  key={offer._id}
                  className="rounded-xl border bg-white p-4"
                >
                  <p className="font-bold">
                    {sent ? "Bạn đã gửi" : "Bạn nhận được"}
                    {" · "}{labels[offer.status]}
                  </p>

                  <p className="mt-2">
                    Card đưa ra: {offer.offeredName}
                  </p>

                  <p>Card muốn nhận: {offer.requestedName}</p>

                  <p className="mt-2 break-all text-xs">
                    Mã card đưa ra: {offer.offeredCardId}
                  </p>

                  <p className="break-all text-xs">
                    Mã card muốn nhận: {offer.requestedCardId}
                  </p>

                  <p className="mt-2 text-sm">
                    Hết hạn:{" "}
                    {new Date(offer.expiresAt).toLocaleString("vi-VN")}
                  </p>

                  <p className="break-all text-xs">
                    Mã đề nghị: {offer._id}
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
                          Hủy đề nghị
                        </button>
                      ) : (
                        <>
                          <button
                            className={button}
                            disabled={busy}
                            onClick={() =>
                              void run(() =>
                                act(offer._id, "accept"),
                              )
                            }
                          >
                            Chấp nhận
                          </button>

                          <button
                            className={button}
                            disabled={busy}
                            onClick={() =>
                              void run(() =>
                                act(offer._id, "decline"),
                              )
                            }
                          >
                            Từ chối
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <div className="mt-4 flex gap-3">
            <button
              className={button}
              disabled={busy}
              onClick={() => void run(() => loadOffers())}
            >
              Mới nhất
            </button>

            <button
              className={button}
              disabled={busy || !offers.nextCursor}
              onClick={() =>
                void run(() => loadOffers(offers.nextCursor))
              }
            >
              Cũ hơn
            </button>
          </div>
        </section>
      </main>
    </>
  );
}

export default function TradePage() {
  const user = useAuthStore(state => state.authUser);

  if (!user) {
    return <p className="p-6">Hãy đăng nhập để trao đổi card.</p>;
  }

  if (user.role !== "student") {
    return (
      <p className="p-6">
        Tính năng trao đổi hiện dành cho tài khoản học sinh.
      </p>
    );
  }

  return <TradeContent key={user._id} userId={user._id} />;
}