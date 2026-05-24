import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.QA_BASE_URL || "http://127.0.0.1:3001";
const ADMIN_USERNAME = process.env.QA_ADMIN_USERNAME || "superadmin";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "ChangeMe123!";
const OUTPUT_DIR = path.resolve("qa", "viewport-sweep");

const viewports = [
  { width: 320, height: 740, label: "320x740" },
  { width: 360, height: 800, label: "360x800" },
  { width: 390, height: 844, label: "390x844" },
  { width: 768, height: 1024, label: "768x1024" },
  { width: 1024, height: 768, label: "1024x768" },
  { width: 1440, height: 900, label: "1440x900" }
];

const publicRoutes = ["/login", "/remote-clock"];

const adminRoutes = [
  "/admin/dashboard",
  "/admin/employees",
  "/admin/attendance/today",
  "/admin/attendance/timelog",
  "/admin/attendance/manual",
  "/admin/attendance/schedules",
  "/admin/leaves/requests",
  "/admin/payroll/runs",
  "/admin/accounts/cash-advances",
  "/admin/users",
  "/admin/stores"
];

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function routeToSlug(route) {
  const value = route.replace(/^\//, "").replace(/\//g, "__");
  return value || "home";
}

async function loginAsAdmin(context, page) {
  const response = await context.request.post(`${BASE_URL}/api/v1/auth/login`, {
    data: {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD
    }
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Admin login failed (${response.status()}): ${body}`);
  }

  await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForURL("**/admin/dashboard", { timeout: 25000 });
  await page.waitForTimeout(800);
}

async function collectOverflow(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const doc = document.documentElement;
    const body = document.body;
    const pageScrollWidth = Math.max(doc.scrollWidth, body ? body.scrollWidth : 0);

    function selectorFor(element) {
      if (!(element instanceof HTMLElement)) return "unknown";
      if (element.id) return `#${element.id}`;
      const bits = [element.tagName.toLowerCase()];
      if (element.classList.length) {
        bits.push(
          ...Array.from(element.classList)
            .slice(0, 2)
            .map((name) => `.${name}`)
        );
      }
      return bits.join("");
    }

    const offenders = [];
    for (const element of Array.from(document.querySelectorAll("*"))) {
      if (!(element instanceof HTMLElement)) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;

      if (rect.right > vw + 1 || rect.left < -1) {
        offenders.push({
          selector: selectorFor(element),
          left: Number(rect.left.toFixed(2)),
          right: Number(rect.right.toFixed(2)),
          width: Number(rect.width.toFixed(2))
        });
      }

      if (offenders.length >= 20) break;
    }

    return {
      viewportWidth: vw,
      scrollWidth: pageScrollWidth,
      overflowX: Number((pageScrollWidth - vw).toFixed(2)),
      offenders
    };
  });
}

async function scanRoute(page, route, screenshotDir) {
  const url = `${BASE_URL}${route}`;
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);

  const metrics = await collectOverflow(page);
  const file = path.join(screenshotDir, `${routeToSlug(route)}.png`);
  await page.screenshot({ path: file, fullPage: true });

  return { route, url, screenshot: file, metrics };
}

async function run() {
  await ensureDir(OUTPUT_DIR);
  const browser = await chromium.launch({ headless: true });
  const report = {
    baseUrl: BASE_URL,
    generatedAt: new Date().toISOString(),
    viewports: []
  };

  try {
    for (const viewport of viewports) {
      const bucketDir = path.join(OUTPUT_DIR, viewport.label);
      await ensureDir(bucketDir);

      const viewportResult = {
        viewport,
        publicRoutes: [],
        adminRoutes: []
      };

      const publicContext = await browser.newContext({ viewport });
      try {
        const publicPage = await publicContext.newPage();
        for (const route of publicRoutes) {
          const result = await scanRoute(publicPage, route, bucketDir);
          viewportResult.publicRoutes.push(result);
        }
      } finally {
        await publicContext.close();
      }

      const adminContext = await browser.newContext({ viewport });
      try {
        const adminPage = await adminContext.newPage();
        await loginAsAdmin(adminContext, adminPage);
        for (const route of adminRoutes) {
          const result = await scanRoute(adminPage, route, bucketDir);
          viewportResult.adminRoutes.push(result);
        }
      } finally {
        await adminContext.close();
      }

      report.viewports.push(viewportResult);
    }
  } finally {
    await browser.close();
  }

  const reportPath = path.join(OUTPUT_DIR, "report.json");
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(reportPath);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
