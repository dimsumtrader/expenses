/**
 * @vitest-environment jsdom
 */

import { describe, test, expect, vi } from "vitest";
import { haptic } from "@/lib/haptics";

describe("Phase 5: PWA & Polish", () => {
  // -------------------------------------------------------
  // 1. Haptic Feedback
  // -------------------------------------------------------
  describe("Haptic Feedback", () => {
    test("haptic calls navigator.vibrate with correct duration", () => {
      const vibrateMock = vi.fn();
      vi.stubGlobal("navigator", { vibrate: vibrateMock });

      haptic(10);
      expect(vibrateMock).toHaveBeenCalledWith(10);
      vi.unstubAllGlobals();
    });

    test("haptic uses default 10ms duration", () => {
      const vibrateMock = vi.fn();
      vi.stubGlobal("navigator", { vibrate: vibrateMock });

      haptic();
      expect(vibrateMock).toHaveBeenCalledWith(10);
      vi.unstubAllGlobals();
    });

    test("haptic does not throw when vibrate is undefined", () => {
      vi.stubGlobal("navigator", {});

      expect(() => haptic()).not.toThrow();
      vi.unstubAllGlobals();
    });
  });

  // -------------------------------------------------------
  // 2. Manifest Structure
  // -------------------------------------------------------
  describe("Manifest", () => {
    test("manifest exports correct structure", async () => {
      const { default: manifest } = await import("@/app/manifest");
      const m = manifest();

      expect(m.name).toBe("Easy Split");
      expect(m.short_name).toBe("Easy Split");
      expect(m.display).toBe("standalone");
      expect(m.theme_color).toBe("#FF4F00");
      expect(m.background_color).toBe("#FFFFFF");
      expect(m.start_url).toBe("/");
      expect(m.icons).toHaveLength(2);
      expect(m.icons![0].sizes).toBe("192x192");
      expect(m.icons![1].sizes).toBe("512x512");
    });
  });

  // -------------------------------------------------------
  // 3. Service Worker File
  // -------------------------------------------------------
  describe("Service Worker", () => {
    test("sw.js exists in public directory", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const swPath = path.resolve("public", "sw.js");
      const exists = fs.existsSync(swPath);
      expect(exists).toBe(true);
    });

    test("sw.js contains install and fetch handlers", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const swPath = path.resolve("public", "sw.js");
      const content = fs.readFileSync(swPath, "utf-8");

      expect(content).toContain("install");
      expect(content).toContain("fetch");
      expect(content).toContain("caches");
    });
  });

  // -------------------------------------------------------
  // 4. Icon Files
  // -------------------------------------------------------
  describe("PWA Icons", () => {
    test("icon SVGs exist in public directory", async () => {
      const fs = await import("fs");
      const path = await import("path");

      const icon192 = path.resolve("public", "icon-192.svg");
      const icon512 = path.resolve("public", "icon-512.svg");

      expect(fs.existsSync(icon192)).toBe(true);
      expect(fs.existsSync(icon512)).toBe(true);
    });
  });
});
