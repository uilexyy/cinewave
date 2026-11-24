import assert from "node:assert/strict";
import { POST as registerHandler } from "../app/api/v1/auth/register/route";
import { POST as loginHandler } from "../app/api/v1/auth/login/route";
import { GET as meHandler } from "../app/api/v1/auth/me/route";
import { POST as logoutHandler } from "../app/api/v1/auth/logout/route";
import { NextRequest } from "next/server";
import { prisma } from "../lib/db";

async function runTests() {
  console.log("Starting Auth Tests...");

  // 1. Clean test user if exists
  await prisma.user.deleteMany({
    where: { email: { in: ["tester@cinewave.app"] } },
  });

  // 2. Test Register
  const registerReq = new NextRequest("http://localhost:3000/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Tester",
      email: "tester@cinewave.app",
      password: "password123",
    }),
  });

  const regRes = await registerHandler(registerReq);
  const regJson = await regRes.json();
  assert.equal(regRes.status, 201, "Register should return 201");
  assert.equal(regJson.success, true, "Register should be successful");
  assert.equal(regJson.data.user.email, "tester@cinewave.app");
  assert.ok(regJson.data.token, "Register should return a session token");
  console.log("PASS: Register new user");

  // 3. Test Duplicate Register
  const duplicateReq = new NextRequest("http://localhost:3000/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Tester 2",
      email: "tester@cinewave.app",
      password: "password123",
    }),
  });
  const dupRes = await registerHandler(duplicateReq);
  assert.equal(dupRes.status, 409, "Duplicate register should return 409");
  console.log("PASS: Duplicate registration rejected");

  // 4. Test Login
  const loginReq = new NextRequest("http://localhost:3000/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "tester@cinewave.app",
      password: "password123",
    }),
  });
  const loginRes = await loginHandler(loginReq);
  const loginJson = await loginRes.json();
  assert.equal(loginRes.status, 200, "Login should return 200");
  assert.equal(loginJson.success, true, "Login should be successful");
  const token = loginJson.data.token;
  assert.ok(token, "Login should return token");
  console.log("PASS: Login with valid credentials");

  // 5. Test Invalid Password Login
  const badLoginReq = new NextRequest("http://localhost:3000/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "tester@cinewave.app",
      password: "wrongpassword",
    }),
  });
  const badLoginRes = await loginHandler(badLoginReq);
  assert.equal(badLoginRes.status, 401, "Bad login should return 401");
  console.log("PASS: Login with invalid password rejected");

  // 6. Test Auth Me
  const meReq = new NextRequest("http://localhost:3000/api/v1/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const meRes = await meHandler(meReq);
  const meJson = await meRes.json();
  assert.equal(meRes.status, 200, "Auth me should return 200");
  assert.equal(meJson.data.user.email, "tester@cinewave.app");
  console.log("PASS: Auth Me returns profile");

  // 7. Test Logout
  const logoutReq = new NextRequest("http://localhost:3000/api/v1/auth/logout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const logoutRes = await logoutHandler(logoutReq);
  assert.equal(logoutRes.status, 200, "Logout should return 200");
  console.log("PASS: Logout successful");

  // 8. Test Auth Me After Logout
  const postLogoutMeReq = new NextRequest("http://localhost:3000/api/v1/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const postLogoutMeRes = await meHandler(postLogoutMeReq);
  assert.equal(postLogoutMeRes.status, 401, "Auth me should return 401 after logout");
  console.log("PASS: Session invalidated after logout");

  console.log("All Auth Tests Passed Successfully!");
}

runTests()
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
