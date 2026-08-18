import { describe, expect, it } from "vitest";
import {
  buildCapturePlan,
  DEFAULT_PORT,
  resolveTargetUrl,
  sectionFileName,
} from "../src/lib/shots-options.js";

describe("buildCapturePlan", () => {
  it("skips non-web projects", () => {
    const { plan, skipReason } = buildCapturePlan(
      {},
      false,
      undefined,
      null,
      undefined,
    );
    expect(skipReason).toContain("does not look like a web app");
    expect(plan.desktopFull).toBe(false);
  });

  it("uses localhost for a web app with a dev script", () => {
    const { plan } = buildCapturePlan({}, true, undefined, "dev", undefined);
    expect(plan.url).toBe("http://localhost:5173");
    expect(plan.serverCommand).toBe("dev");
    expect(plan.desktopFull).toBe(true);
    expect(plan.mobileTop).toBe(true);
  });

  it("prefers the configured url", () => {
    const { plan } = buildCapturePlan(
      {},
      true,
      "https://example.com",
      "dev",
      undefined,
    );
    expect(plan.url).toBe("https://example.com");
  });

  it("maps configured sections", () => {
    const { plan } = buildCapturePlan({}, true, undefined, null, [
      "#hero",
      "#features",
    ]);
    expect(plan.sections).toHaveLength(2);
    expect(sectionFileName(1)).toBe("section-1.png");
  });
});

describe("resolveTargetUrl", () => {
  it("returns the config url when set", () => {
    expect(resolveTargetUrl("https://example.com", "dev", 5173)).toBe(
      "https://example.com",
    );
  });

  it("falls back to localhost for a dev script", () => {
    expect(resolveTargetUrl(undefined, "dev", 5173)).toBe(
      "http://localhost:5173",
    );
  });

  it("returns empty string when neither is set", () => {
    expect(resolveTargetUrl(undefined, null, 5173)).toBe("");
  });
});

describe("constants", () => {
  it("defaults to port 5173", () => {
    expect(DEFAULT_PORT).toBe(5173);
  });
});
