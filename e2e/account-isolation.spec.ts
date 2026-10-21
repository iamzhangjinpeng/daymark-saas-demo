import { expect, test, type Route } from "@playwright/test";

const password = "daymark-e2e-password";
const users = {
  "demo-a@example.test": {
    id: "11111111-1111-4111-8111-111111111111",
    aud: "authenticated",
    role: "authenticated",
    email: "demo-a@example.test",
    email_confirmed_at: "2026-01-01T00:00:00.000Z",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00.000Z",
  },
  "demo-b@example.test": {
    id: "22222222-2222-4222-8222-222222222222",
    aud: "authenticated",
    role: "authenticated",
    email: "demo-b@example.test",
    email_confirmed_at: "2026-01-01T00:00:00.000Z",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00.000Z",
  },
} as const;

type DemoUser = (typeof users)[keyof typeof users];
type DemoTask = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: "open" | "completed";
  priority: "low" | "normal" | "high";
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

function task(user: DemoUser, title: string): DemoTask {
  return {
    id: `task-${user.id}`,
    user_id: user.id,
    title,
    description: "Private to this account",
    status: "open",
    priority: "normal",
    due_date: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

test("keeps task lists separate when switching accounts across tabs", async ({ page, context }) => {
  const demoUsers = Object.values(users);
  const tasks: DemoTask[] = [
    task(users["demo-a@example.test"], "A private task"),
    task(users["demo-b@example.test"], "B private task"),
  ];

  await context.route("http://127.0.0.1:54321/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const authorization = request.headers().authorization ?? "";
    const activeUser = demoUsers.find((user) => authorization === `Bearer access-${user.id}`);

    if (url.pathname === "/auth/v1/token") {
      const body = request.postDataJSON() as { email?: string; password?: string };
      const user = body.email ? users[body.email as keyof typeof users] : undefined;
      if (!user || body.password !== password) {
        await json(route, { message: "Invalid login credentials" }, 400);
        return;
      }
      await json(route, {
        access_token: `access-${user.id}`,
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: `refresh-${user.id}`,
        user,
      });
      return;
    }

    if (url.pathname === "/auth/v1/user") {
      if (!activeUser) {
        await json(route, { message: "Invalid token" }, 401);
        return;
      }
      await json(route, activeUser);
      return;
    }

    if (url.pathname === "/auth/v1/logout") {
      await route.fulfill({ status: 204, body: "" });
      return;
    }

    if (url.pathname === "/rest/v1/tasks") {
      if (!activeUser) {
        await json(route, { message: "Authentication required" }, 401);
        return;
      }
      if (request.method() === "GET") {
        if (url.searchParams.get("user_id") !== `eq.${activeUser.id}`) {
          await json(route, { message: "The task query must be scoped to the signed-in user" }, 400);
          return;
        }
        await json(route, tasks.filter((row) => row.user_id === activeUser.id));
        return;
      }
      if (request.method() === "POST") {
        const inserted = request.postDataJSON() as Omit<DemoTask, "id" | "status" | "created_at" | "updated_at"> & { user_id?: string };
        if (inserted.user_id !== activeUser.id) {
          await json(route, { message: "Row-level security rejected this task" }, 403);
          return;
        }
        const created: DemoTask = {
          ...inserted,
          id: `created-${tasks.length + 1}`,
          status: "open",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          description: inserted.description ?? "",
          due_date: inserted.due_date ?? null,
          priority: inserted.priority ?? "normal",
        };
        tasks.push(created);
        await json(route, created, 201);
        return;
      }
    }

    await route.continue();
  });

  await page.goto("/login/");
  await page.getByLabel("Email address").fill("demo-a@example.test");
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("demo-a@example.test", { exact: true })).toBeVisible();
  await expect(page.getByText("A private task", { exact: true })).toBeVisible();
  await expect(page.getByText("B private task", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "New task" }).click();
  await page.getByLabel("Task name").fill("A's new task");
  await page.getByRole("button", { name: "Add to my list" }).click();
  await expect(page.getByText("A's new task", { exact: true })).toBeVisible();

  const secondTab = await context.newPage();
  await secondTab.goto("/dashboard/");
  await expect(secondTab.getByText("A private task", { exact: true })).toBeVisible();
  await secondTab.getByRole("button", { name: "Sign out" }).click();
  await expect(secondTab.getByRole("heading", { name: "Sign in to Daymark" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sign in to Daymark" })).toBeVisible();
  await expect(page.getByText("A private task", { exact: true })).toHaveCount(0);

  await secondTab.getByLabel("Email address").fill("demo-b@example.test");
  await secondTab.locator("#password").fill(password);
  await secondTab.getByRole("button", { name: "Sign in" }).click();
  await expect(secondTab.getByText("demo-b@example.test", { exact: true })).toBeVisible();
  await expect(secondTab.getByText("B private task", { exact: true })).toBeVisible();
  await expect(secondTab.getByText("A private task", { exact: true })).toHaveCount(0);
  await expect(secondTab.getByText("A's new task", { exact: true })).toHaveCount(0);

  await page.goto("/dashboard/");
  await expect(page.getByText("demo-b@example.test", { exact: true })).toBeVisible();
  await expect(page.getByText("B private task", { exact: true })).toBeVisible();
  await expect(page.getByText("A private task", { exact: true })).toHaveCount(0);
  await expect(page.getByText("A's new task", { exact: true })).toHaveCount(0);
});

test("keeps sign-in readable without horizontal overflow on tablet and phone widths", async ({ page }) => {
  for (const width of [600, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login/");

    const metrics = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      emailFontSize: Number.parseFloat(getComputedStyle(document.querySelector("#email")!).fontSize),
    }));

    expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
    expect(metrics.emailFontSize).toBeGreaterThanOrEqual(14);
  }
});
