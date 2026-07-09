import { describe, expect, it } from "vitest";
import { normalizeProductKeyword, matchesProductKeyword } from "../lib/product-search";

describe("product search helpers", () => {
  it("normalizes Turkish product keywords", () => {
    expect(normalizeProductKeyword("Akıllı Saat modelleriniz neler?")).toBe("akilli saat");
    expect(normalizeProductKeyword("Spor Ayakkabı arıyorum")).toBe("spor ayakkabi");
  });

  it("matches related product categories", () => {
    expect(matchesProductKeyword("akıllı saat", "Akıllı Saat - GPS Destekli")).toBe(true);
    expect(matchesProductKeyword("saat", "Akıllı Saat - GPS Destekli")).toBe(true);
    expect(matchesProductKeyword("ayakkabı", "Spor Ayakkabı - Siyah/Beyaz")).toBe(true);
    expect(matchesProductKeyword("mont", "Kışlık Mont - Su Geçirmez")).toBe(true);
  });
});
