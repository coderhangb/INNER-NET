require("dotenv").config();

const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("node:crypto");

const BASE_URL = "http://localhost:3000";

function validId(value) {
  return (
    typeof value === "string" &&
    /^[a-fA-F0-9]{24}$/.test(value)
  );
}

async function main() {
  if (
    !["development", "test"].includes(process.env.NODE_ENV) ||
    process.env.MONGO_DB_NAME !== "inner-net-card-dev"
  ) {
    throw new Error(
      "Run with NODE_ENV=development/test and " +
      "MONGO_DB_NAME=inner-net-card-dev",
    );
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("Missing JWT_SECRET");
  }

  const [studentId] = process.argv.slice(2);

  if (!validId(studentId)) {
    throw new Error("Provide an existing student user ID");
  }

  const token = jwt.sign(
    { id: studentId },
    process.env.JWT_SECRET,
    { expiresIn: "5m" },
  );

  const origin = process.env.CLIENT_URL || "http://localhost:5173";

  async function call(
    path,
    {
      method = "GET",
      body,
      auth = true,
      csrf = true,
    } = {},
  ) {
    const headers = { Origin: origin };

    if (auth) {
      headers.Cookie = `jwt=${token}`;
    }

    if (method === "POST") {
      headers["Content-Type"] = "application/json";

      if (csrf) {
        headers["X-CSRF-Protection"] = "1";
      }
    }

    let response;

    try {
      response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body === undefined
          ? undefined
          : JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
    } catch (error) {
      const cause = error.cause?.code || error.name;

      throw new Error(
        `${method} ${path}: connection failed (${cause}). ` +
        "Check the backend terminal.",
      );
    }

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `${method} ${path}: expected JSON, got HTTP ` +
        `${response.status}: ${text.slice(0, 150)}`,
      );
    }

    return {
      status: response.status,
      data,
    };
  }

  async function expectStatus(path, options, expected) {
    const result = await call(path, options);

    assert.equal(
      result.status,
      expected,
      `${options?.method || "GET"} ${path}: ` +
      JSON.stringify(result.data),
    );

    return result.data;
  }

  // Check that the backend is reachable before the test sequence.
  await expectStatus("/api/health", { auth: false }, 200);

  console.log("PASS: backend is reachable");

  const fakeOfferId = "000000000000000000000001";

  const protectedEndpoints = [
    {
      path: "/api/trades",
      method: "GET",
    },
    {
      path: "/api/trades/partners/0123456789ABCDEF",
      method: "GET",
    },
    {
      path: "/api/trades/profile",
      method: "POST",
      body: {},
    },
    {
      path: "/api/trades",
      method: "POST",
      body: {},
    },
    ...["accept", "decline", "cancel"].map(action => ({
      path: `/api/trades/${fakeOfferId}/${action}`,
      method: "POST",
      body: {},
    })),
  ];

  for (const endpoint of protectedEndpoints) {
    await expectStatus(
      endpoint.path,
      {
        method: endpoint.method,
        body: endpoint.body,
        auth: false,
      },
      401,
    );
  }

  console.log("PASS: every trade endpoint requires authentication");

  // Valid read: also verifies that the provided user is an eligible student.
  const list = await expectStatus("/api/trades", {}, 200);

  assert.ok(Array.isArray(list.items));
  assert.ok(Object.hasOwn(list, "nextCursor"));

  for (const offer of list.items) {
    assert.ok(
      String(offer.proposerId) === studentId ||
      String(offer.recipientId) === studentId,
      "List returned another user's offer",
    );
  }

  console.log("PASS: list returns offers involving the current user");

  for (const endpoint of protectedEndpoints) {
    if (endpoint.method !== "POST") continue;

    await expectStatus(
      endpoint.path,
      {
        method: "POST",
        body: endpoint.body,
        csrf: false,
      },
      403,
    );
  }

  console.log("PASS: every trade POST rejects missing CSRF header");

  const invalidReads = [
    "/api/trades?cursor=not-an-id",
    "/api/trades?ownerId=anything",
    "/api/trades/partners/INVALID",
    "/api/trades/partners/0123456789ABCDEF?cursor=invalid",
  ];

  for (const path of invalidReads) {
    await expectStatus(path, {}, 400);
  }

  console.log("PASS: invalid query and partner code rejected");

  await expectStatus(
    "/api/trades/profile",
    {
      method: "POST",
      body: { role: "student" },
    },
    400,
  );

  const baseBody = {
    recipientCode: "0123456789ABCDEF",
    offeredCardId: "000000000000000000000002",
    requestedCardId: "000000000000000000000003",
    requestKey: randomUUID(),
  };

  const invalidBodies = [
    {},
    [],
    { ...baseBody, offeredCardId: "invalid" },
    { ...baseBody, requestedCardId: { $ne: null } },
    { ...baseBody, recipientCode: ["0123456789ABCDEF"] },
    { ...baseBody, requestKey: "invalid" },
    { ...baseBody, role: "student" },
    { ...baseBody, proposerId: studentId },
    { ...baseBody, status: "accepted" },
    { ...baseBody, expiresAt: "2099-01-01" },
  ];

  for (const body of invalidBodies) {
    await expectStatus(
      "/api/trades",
      { method: "POST", body },
      400,
    );
  }

  console.log("PASS: forged fields and invalid creation bodies rejected");

  for (const action of ["accept", "decline", "cancel"]) {
    await expectStatus(
      `/api/trades/not-an-id/${action}`,
      { method: "POST", body: {} },
      400,
    );

    await expectStatus(
      `/api/trades/${fakeOfferId}/${action}`,
      {
        method: "POST",
        body: { actorId: studentId },
      },
      400,
    );
  }

  console.log("PASS: invalid action IDs and forged actors rejected");

  console.log(
    "DONE: no valid trade creation/accept/decline/cancel requested.",
  );

  console.log(
    "NOTE: GET /api/trades may clean up existing expired offers.",
  );
}

main().catch(error => {
  console.error("FAIL:", error.message);
  process.exitCode = 1;
});