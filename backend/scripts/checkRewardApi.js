require("dotenv").config();
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("node:crypto");
async function main() {
  if (
    !["development", "test"].includes(process.env.NODE_ENV) ||
    process.env.MONGO_DB_NAME !== "inner-net-card-dev"
  )
    throw new Error("Use inner-net-card-dev and development/test");
  const [id] = process.argv.slice(2);
  if (!/^[a-fA-F0-9]{24}$/.test(id || ""))
    throw new Error("Provide an existing student user ID");
  const cookie =
    "jwt=" + jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "5m" });
  async function call(
    path,
    { method = "GET", body, auth = true, csrf = true } = {},
  ) {
    const headers = { Origin: "http://localhost:5173" };
    if (auth) headers.Cookie = cookie;
    if (method === "POST") {
      headers["Content-Type"] = "application/json";
      if (csrf) headers["X-CSRF-Protection"] = "1";
    }
    const r = await fetch("http://localhost:3000" + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const data = await r.json();
    return { status: r.status, data };
  }
  assert.equal(
    (await call("/api/rewards/progress", { auth: false })).status,
    401,
  );
  const before = await call("/api/rewards/progress");
  assert.equal(before.status, 200, JSON.stringify(before.data));
  console.log("PASS: reward progress requires authentication");
  assert.equal(
    (
      await call("/api/activity/sessions", {
        method: "POST",
        body: {},
        csrf: false,
      })
    ).status,
    403,
  );
  console.log("PASS: missing CSRF protection blocked");
  const valid = {
    sessionId: randomUUID(),
    sequence: 1,
    visible: true,
    active: true,
  };
  for (const body of [
    { ...valid, elapsed: 999999 },
    { ...valid, rarity: "legendary" },
    { ...valid, complete: true },
    { ...valid, role: "student" },
    { ...valid, sequence: -1 },
    { ...valid, active: "true" },
    { ...valid, sessionId: [valid.sessionId] },
  ]) {
    assert.equal(
      (await call("/api/activity/heartbeat", { method: "POST", body })).status,
      400,
    );
  }
  assert.equal(
    (
      await call("/api/activity/sessions", {
        method: "POST",
        body: { userId: id },
      })
    ).status,
    400,
  );
  assert.equal(
    (await call("/api/activity/heartbeat", { method: "POST", body: valid }))
      .status,
    409,
  );
  console.log(
    "PASS: forged time/rarity/role, invalid input and unknown session blocked",
  );
  console.log(
    "PASS: read-only/invalid-write checks completed; no valid reward write requested",
  );
}
main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exitCode = 1;
});
