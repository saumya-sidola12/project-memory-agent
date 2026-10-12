import { describe, it, expect } from "vitest";
import { normalizeRepo } from "@/lib/memory.functions";
describe("normalizeRepo", () => {
  it("accepts full github URLs", () => {
    expect(normalizeRepo("https://github.com/sundram6452/Real-Time-Credit-Card-Fraud-Detection")).toBe("sundram6452/Real-Time-Credit-Card-Fraud-Detection");
  });
  it("accepts owner/repo and strips extras", () => {
    expect(normalizeRepo("a/b")).toBe("a/b");
    expect(normalizeRepo("github.com/a/b.git")).toBe("a/b");
    expect(normalizeRepo("https://github.com/a/b/tree/main")).toBe("a/b");
  });
  it("rejects garbage", () => { expect(normalizeRepo("hello")).toBeNull(); });
});
