import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { env } from "../config/env.js";
import { authService } from "./auth.service.js";
import {
  GoogleOAuthRequestStore,
  oauthStateMatches,
  pkceS256Challenge
} from "./google-oauth-request.js";

test("Google OAuth request store atomically consumes state and verifier once", async () => {
  const store = new GoogleOAuthRequestStore(() => null);
  const request = await store.create();

  assert.equal(oauthStateMatches(request.state, request.state), true);
  assert.equal(oauthStateMatches(request.state, "mismatched-state"), false);

  const results = await Promise.all(
    Array.from({ length: 20 }, () => store.consume(request.state, request.state))
  );
  const successfulConsumes = results.filter((value): value is string => value !== null);

  assert.equal(successfulConsumes.length, 1);
  assert.equal(pkceS256Challenge(successfulConsumes[0]), request.codeChallenge);
  assert.equal(await store.consume(request.state, request.state), null);
});

test("Google OAuth callback binding rejects missing, mismatched, and reused state and sends PKCE verifier", async () => {
  const previousGoogle = { ...env.google };
  env.google.clientId = "test-google-client";
  env.google.clientSecret = "test-google-secret";
  env.google.callbackUrl = "http://localhost:3001/api/auth/google/callback";

  let tokenExchangeCalls = 0;
  let exchangedVerifier: string | null = null;
  const fetchMock = mock.method(globalThis, "fetch", async (
    _input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1]
  ) => {
    tokenExchangeCalls += 1;
    const body = new URLSearchParams(String(init?.body));
    exchangedVerifier = body.get("code_verifier");
    return new Response(JSON.stringify({ error: "invalid_grant" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  });

  try {
    const authorizationRequest = await authService.createGoogleAuthorizationRequest();
    const authorizationUrl = new URL(authorizationRequest.url);
    const state = authorizationUrl.searchParams.get("state");
    const codeChallenge = authorizationUrl.searchParams.get("code_challenge");

    assert.equal(state, authorizationRequest.state);
    assert.equal(authorizationUrl.searchParams.get("code_challenge_method"), "S256");
    assert.ok(codeChallenge);

    await assert.rejects(
      authService.loginWithGoogle("authorization-code", undefined, authorizationRequest.state, {}),
      /Invalid or expired Google OAuth request/
    );
    await assert.rejects(
      authService.loginWithGoogle("authorization-code", authorizationRequest.state, undefined, {}),
      /Invalid or expired Google OAuth request/
    );
    await assert.rejects(
      authService.loginWithGoogle("authorization-code", "mismatched-state", authorizationRequest.state, {}),
      /Invalid or expired Google OAuth request/
    );
    assert.equal(tokenExchangeCalls, 0);

    await assert.rejects(
      authService.loginWithGoogle(
        "authorization-code",
        authorizationRequest.state,
        authorizationRequest.state,
        {}
      ),
      /invalid_grant/
    );
    assert.equal(tokenExchangeCalls, 1);
    assert.ok(exchangedVerifier);
    assert.equal(pkceS256Challenge(exchangedVerifier), codeChallenge);

    await assert.rejects(
      authService.loginWithGoogle(
        "authorization-code",
        authorizationRequest.state,
        authorizationRequest.state,
        {}
      ),
      /Invalid or expired Google OAuth request/
    );
    assert.equal(tokenExchangeCalls, 1);
  } finally {
    fetchMock.mock.restore();
    Object.assign(env.google, previousGoogle);
  }
});
