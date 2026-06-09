import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.VISUAL_CHECK_URL ?? "http://127.0.0.1:5173";
const outputDir = path.resolve("test-results");

const viewports = [
  { name: "desktop", width: 1440, height: 980 },
  { name: "mobile", width: 390, height: 844 }
];

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.waitForSelector(".app-shell", { state: "visible", timeout: 10000 });
    await page.waitForSelector(".toolbar-band", { state: "visible", timeout: 10000 });

    const layout = await page.evaluate(() => {
      const shell = document.querySelector(".app-shell")?.getBoundingClientRect();
      const toolbar = document.querySelector(".toolbar-band")?.getBoundingClientRect();
      const topbar = document.querySelector(".topbar")?.getBoundingClientRect();
      const overflowX = document.documentElement.scrollWidth > window.innerWidth + 1;
      return {
        shell: shell ? { width: shell.width, height: shell.height } : null,
        toolbar: toolbar ? { width: toolbar.width, height: toolbar.height } : null,
        topbar: topbar ? { width: topbar.width, height: topbar.height } : null,
        overflowX
      };
    });

    if (!layout.shell || !layout.toolbar || !layout.topbar || layout.overflowX) {
      throw new Error(`Layout check failed for ${viewport.name}: ${JSON.stringify(layout)}`);
    }

    await page.screenshot({ path: path.join(outputDir, `app-${viewport.name}.png`), fullPage: true });
    await page.close();
    console.log(`${viewport.name}: app layout ok`);
  }
} finally {
  await browser.close();
}
