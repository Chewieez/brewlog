import { describe, it, expect, vi } from "vitest";
import { createBrewlogClient, SupabaseClient } from "./index";

describe("createBrewlogClient", () => {
  it("initializes supabase client with custom storage and detectSessionInUrl option", () => {
    const mockStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    const client = createBrewlogClient("https://example.supabase.co", "test-anon-key", {
      storage: mockStorage,
      detectSessionInUrl: false,
    });

    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it("supports legacy direct storage parameter for backwards compatibility", () => {
    const mockStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    const client = createBrewlogClient("https://example.supabase.co", "test-anon-key", mockStorage);

    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it("initializes supabase client with empty options object ({})", () => {
    const client = createBrewlogClient("https://example.supabase.co", "test-anon-key", {});

    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it("exports SupabaseClient class from package index", () => {
    expect(SupabaseClient).toBeDefined();
  });
});
