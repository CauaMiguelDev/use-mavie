// node --test app/painel/lock-logic.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { freshLock, registerFail, registerSuccess, lockedFor, attemptsLeft, hashPassword, MAX_FAILS } from "./lock-logic.ts";

const MIN = 60 * 1000;

test("trava após 5 erros e cada novo bloqueio dobra", () => {
  let s = freshLock();
  for (let i = 0; i < MAX_FAILS - 1; i++) s = registerFail(s, 0);
  assert.equal(attemptsLeft(s), 1);
  assert.equal(lockedFor(s, 0), 0);
  s = registerFail(s, 0);
  assert.equal(lockedFor(s, 0), 5 * MIN);
  // tentar durante o bloqueio não muda nada
  assert.deepEqual(registerFail(s, 1000), s);
  // depois do bloqueio, mais 5 erros => 10 min
  for (let i = 0; i < MAX_FAILS; i++) s = registerFail(s, 6 * MIN);
  assert.equal(lockedFor(s, 6 * MIN), 10 * MIN);
});

test("acerto zera os erros", () => {
  let s = registerFail(registerFail(freshLock(), 0), 0);
  s = registerSuccess(s);
  assert.equal(attemptsLeft(s), MAX_FAILS);
  assert.equal(lockedFor(s, 0), 0);
});

test("hash confere a mesma senha e recusa outra", async () => {
  const a = await hashPassword("divas2026");
  assert.equal((await hashPassword("divas2026", a.salt)).hash, a.hash);
  assert.notEqual((await hashPassword("divas2027", a.salt)).hash, a.hash);
  assert.notEqual((await hashPassword("divas2026")).salt, a.salt); // sal novo a cada senha criada
});
