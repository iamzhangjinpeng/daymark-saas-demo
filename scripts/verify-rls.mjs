import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const required = [
  "RLS_TEST_SUPABASE_URL",
  "RLS_TEST_SUPABASE_PUBLISHABLE_KEY",
  "RLS_TEST_USER_A_EMAIL",
  "RLS_TEST_USER_A_PASSWORD",
  "RLS_TEST_USER_B_EMAIL",
  "RLS_TEST_USER_B_PASSWORD",
];
const missing = required.filter((name) => !process.env[name]);

if (missing.length) {
  console.error(`Set these variables before running the RLS check: ${missing.join(", ")}`);
  process.exit(1);
}

const options = {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
};
const userAClient = createClient(
  process.env.RLS_TEST_SUPABASE_URL,
  process.env.RLS_TEST_SUPABASE_PUBLISHABLE_KEY,
  options,
);
const userBClient = createClient(
  process.env.RLS_TEST_SUPABASE_URL,
  process.env.RLS_TEST_SUPABASE_PUBLISHABLE_KEY,
  options,
);
const marker = `RLS verification ${randomUUID()}`;
const cleanupIds = [];

async function signIn(client, email, password) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Could not sign in a dedicated RLS test user: ${error.message}`);
  return data.user;
}

async function createTask(client, title) {
  const { data, error } = await client
    .from("tasks")
    .insert({ title, description: marker, priority: "normal" })
    .select("id, user_id")
    .single();
  if (error) throw new Error(`Could not create a tagged RLS test task: ${error.message}`);
  cleanupIds.push({ client, id: data.id });
  return data;
}

async function run() {
  const userA = await signIn(
    userAClient,
    process.env.RLS_TEST_USER_A_EMAIL,
    process.env.RLS_TEST_USER_A_PASSWORD,
  );
  const userB = await signIn(
    userBClient,
    process.env.RLS_TEST_USER_B_EMAIL,
    process.env.RLS_TEST_USER_B_PASSWORD,
  );
  assert.notEqual(userA.id, userB.id, "RLS check requires two different accounts");

  const taskA = await createTask(userAClient, `${marker} A`);
  const taskB = await createTask(userBClient, `${marker} B`);
  assert.equal(taskA.user_id, userA.id, "User A should own its inserted row");
  assert.equal(taskB.user_id, userB.id, "User B should own its inserted row");

  const { data: aOwns, error: ownError } = await userAClient
    .from("tasks")
    .select("id")
    .eq("id", taskA.id)
    .maybeSingle();
  if (ownError) throw ownError;
  assert.equal(aOwns?.id, taskA.id, "User A should read its own row");

  const { data: bOwns, error: bOwnError } = await userBClient
    .from("tasks")
    .select("id")
    .eq("id", taskB.id)
    .maybeSingle();
  if (bOwnError) throw bOwnError;
  assert.equal(bOwns?.id, taskB.id, "User B should read its own row");

  const { data: bCannotReadA, error: readError } = await userBClient
    .from("tasks")
    .select("id")
    .eq("id", taskA.id)
    .maybeSingle();
  if (readError) throw readError;
  assert.equal(bCannotReadA, null, "User B must not read User A's row");

  const { data: aCannotReadB, error: reverseReadError } = await userAClient
    .from("tasks")
    .select("id")
    .eq("id", taskB.id)
    .maybeSingle();
  if (reverseReadError) throw reverseReadError;
  assert.equal(aCannotReadB, null, "User A must not read User B's row");

  const { data: bCannotUpdateA, error: updateError } = await userBClient
    .from("tasks")
    .update({ title: `${marker} unauthorized update` })
    .eq("id", taskA.id)
    .select("id");
  if (updateError) throw updateError;
  assert.equal(bCannotUpdateA?.length, 0, "User B must not update User A's row");

  const { data: bCannotDeleteA, error: deleteError } = await userBClient
    .from("tasks")
    .delete()
    .eq("id", taskA.id)
    .select("id");
  if (deleteError) throw deleteError;
  assert.equal(bCannotDeleteA?.length, 0, "User B must not delete User A's row");

  const { data: bCannotInsertForA, error: insertError } = await userBClient
    .from("tasks")
    .insert({ user_id: userA.id, title: `${marker} unauthorized insert` })
    .select("id");
  if (bCannotInsertForA?.length) {
    cleanupIds.push(...bCannotInsertForA.map(({ id }) => ({ client: userAClient, id })));
  }
  assert.equal(insertError?.code, "42501", "RLS should reject User B creating a row owned by User A");

  console.log("RLS verification passed: each account owns its rows, and cross-account read, insert, update, and delete are blocked.");
}

try {
  await run();
} finally {
  let cleanupFailed = false;
  for (const { client, id } of cleanupIds) {
    const { error } = await client.from("tasks").delete().eq("id", id);
    if (error) {
      cleanupFailed = true;
      console.error(`Could not remove RLS test row ${id}: ${error.message}`);
    }
  }
  await Promise.all([userAClient.auth.signOut(), userBClient.auth.signOut()]);
  if (cleanupFailed) process.exitCode = 1;
}
