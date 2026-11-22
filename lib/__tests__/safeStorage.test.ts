import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { safeStorage } from "../safeStorage";

describe("safeStorage", () => {
  const originalLocalStorage = window.localStorage;

  afterEach(() => {
    Object.defineProperty(window, "localStorage", {
      value: originalLocalStorage,
      configurable: true,
      writable: true,
    });
  });

  it("returns null when window.localStorage throws on getItem", () => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("SecurityError: Access is denied");
      },
      configurable: true,
    });

    expect(safeStorage.getItem("any_key")).toBeNull();
  });

  it("does not throw when window.localStorage throws on setItem", () => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("QuotaExceededError");
      },
      configurable: true,
    });

    expect(() => safeStorage.setItem("key", "val")).not.toThrow();
  });

  it("stores and retrieves values normally when localStorage is available", () => {
    safeStorage.setItem("test_key", "test_value");
    expect(safeStorage.getItem("test_key")).toBe("test_value");
  });
});
