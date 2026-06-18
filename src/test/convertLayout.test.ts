import { describe, expect, it } from "vitest";
import { convertLayout } from "../lib/convertLayout";
import { detectDirection } from "../lib/detectDirection";

describe("convertLayout", () => {
  it("converts uppercase English input to Ukrainian", () => {
    expect(convertLayout("Ghbdsn")).toBe("Привіт");
  });

  it("converts lowercase English input to Ukrainian", () => {
    expect(convertLayout("ghbdsn")).toBe("привіт");
  });

  it("returns an empty string for empty input", () => {
    expect(convertLayout("")).toBe("");
  });

  it("preserves numbers and punctuation outside the keyboard map", () => {
    expect(convertLayout("123 !? —", "en-to-ua")).toBe("123 !? —");
  });

  it("handles mixed text without throwing", () => {
    expect(() => convertLayout("Hello, світ 🌍")).not.toThrow();
  });

  it("converts Ukrainian text back to English", () => {
    expect(convertLayout("Привіт")).toBe("Ghbdsn");
    expect(convertLayout("привіт")).toBe("ghbdsn");
  });

  it("uses the supplied t to е keyboard mapping", () => {
    expect(convertLayout("Ghbdtn")).toBe("Привет");
  });

  it("preserves emoji and unknown symbols", () => {
    expect(convertLayout("🙂 © ∑", "en-to-ua")).toBe("🙂 © ∑");
  });

  it("defaults unclear direction to English to Ukrainian", () => {
    expect(detectDirection("123🙂")).toBe("en-to-ua");
    expect(detectDirection("aі")).toBe("en-to-ua");
  });
});
