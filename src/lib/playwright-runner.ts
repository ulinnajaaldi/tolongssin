import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { spinner } from "@clack/prompts";
import { chromium } from "playwright";
import type { CapturePlan } from "./shots-options.js";
import { sectionFileName } from "./shots-options.js";

export interface CaptureResult {
  path: string;
  width: number;
  height: number;
}

export async function runCaptures(
  plan: CapturePlan,
  cwd: string,
  headed = false,
): Promise<CaptureResult[]> {
  const outDir = join(cwd, "marketing-kit", "screenshots");
  mkdirSync(outDir, { recursive: true });
  const s = spinner();
  s.start("Capturing screenshots...");
  const browser = await chromium.launch({ headless: !headed });
  const results: CaptureResult[] = [];
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    await page.goto(plan.url, { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForTimeout(500);

    if (plan.desktopFull) {
      const path = join(outDir, "desktop-full.png");
      await page.screenshot({ path, fullPage: true });
      const dims = await page.evaluate(() => ({
        w: window.innerWidth,
        h: window.innerHeight,
      }));
      results.push({ path, width: dims.w, height: dims.h });
    }

    if (plan.mobileTop) {
      const mobile = await browser.newPage({
        viewport: { width: 390, height: 844 },
      });
      await mobile.goto(plan.url, {
        waitUntil: "networkidle",
        timeout: 30_000,
      });
      await mobile.waitForTimeout(500);
      const path = join(outDir, "mobile-top.png");
      await mobile.screenshot({ path, fullPage: false });
      const dims = await mobile.evaluate(() => ({
        w: window.innerWidth,
        h: window.innerHeight,
      }));
      results.push({ path, width: dims.w, height: dims.h });
      await mobile.close();
    }

    for (const [i, sel] of plan.sections.entries()) {
      try {
        await page.locator(sel).scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
        const path = join(outDir, sectionFileName(i + 1));
        await page.screenshot({ path, fullPage: false });
        results.push({ path, width: 1440, height: 900 });
      } catch {
        console.warn(`Section selector "${sel}" not found — skipping`);
      }
    }
    s.stop("Screenshots captured.");
    return results;
  } catch (err) {
    s.stop("Capture failed.");
    throw err;
  } finally {
    await browser.close();
  }
}
