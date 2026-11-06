import { describe, it, expect } from "vitest";
import {
  buildEligibleNumbers,
  selectWinners,
  computeCommitHash,
  verifyCommitHash,
  validateRoundRange,
  generateSeed,
} from "../src/lib/spin-engine";

describe("Spin Engine Unit Tests", () => {
  describe("1. Eligible List Builder", () => {
    it("should build a sequential list from rangeStart to rangeEnd", () => {
      const eligible = buildEligibleNumbers(1, 10, []);
      expect(eligible).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(eligible.length).toBe(10);
    });

    it("should correctly exclude specified numbers", () => {
      const exclusions = [3, 7, 9];
      const eligible = buildEligibleNumbers(1, 10, exclusions);
      expect(eligible).toEqual([1, 2, 4, 5, 6, 8, 10]);
      expect(eligible).not.toContain(3);
      expect(eligible).not.toContain(7);
      expect(eligible).not.toContain(9);
      expect(eligible.length).toBe(7);
    });

    it("should ignore exclusions outside the range", () => {
      const exclusions = [0, 5, 11, 99];
      const eligible = buildEligibleNumbers(1, 5, exclusions);
      expect(eligible).toEqual([1, 2, 3, 4]);
    });

    it("should handle single number range", () => {
      expect(buildEligibleNumbers(42, 42, [])).toEqual([42]);
      expect(buildEligibleNumbers(42, 42, [42])).toEqual([]);
    });

    it("should throw error if rangeStart > rangeEnd", () => {
      expect(() => buildEligibleNumbers(50, 10, [])).toThrow(
        "rangeStart must be less than or equal to rangeEnd"
      );
    });
  });

  describe("2. No-repeat Winner Selection", () => {
    it("should select the requested number of winners without any duplicates", () => {
      const pool = Array.from({ length: 80 }, (_, i) => i + 1);
      const winners = selectWinners(pool, 5);

      expect(winners.length).toBe(5);
      // Ensure all selected winners are from pool
      winners.forEach((w) => expect(pool).toContain(w));
      // Ensure no duplicates
      const uniqueWinners = new Set(winners);
      expect(uniqueWinners.size).toBe(5);
    });

    it("should handle drawing all eligible numbers without repeats", () => {
      const pool = [10, 20, 30];
      const winners = selectWinners(pool, 3);
      expect(winners.length).toBe(3);
      expect(new Set(winners).size).toBe(3);
      expect(winners.sort((a, b) => a - b)).toEqual([10, 20, 30]);
    });

    it("should throw error if winners count exceeds eligible count", () => {
      const pool = [1, 2];
      expect(() => selectWinners(pool, 3)).toThrow(
        "Cannot draw 3 winners from an eligible pool of 2 numbers"
      );
    });

    it("should throw error if winners count is zero or negative", () => {
      const pool = [1, 2, 3];
      expect(() => selectWinners(pool, 0)).toThrow("Winners count must be at least 1");
      expect(() => selectWinners(pool, -1)).toThrow("Winners count must be at least 1");
    });
  });

  describe("3. Commit-Hash Verification and Tamper Proofing", () => {
    it("should generate a consistent SHA-256 hash for identical parameters", () => {
      const roundId = "round_abc123";
      const seed = "test_random_seed_998877";
      const winners = [24, 77];

      const hash1 = computeCommitHash(roundId, seed, winners);
      const hash2 = computeCommitHash(roundId, seed, winners);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex string length
    });

    it("should verify successfully with valid hash", () => {
      const roundId = "round_xyz789";
      const seed = generateSeed();
      const winners = [15];

      const commitHash = computeCommitHash(roundId, seed, winners);
      const isValid = verifyCommitHash(roundId, seed, winners, commitHash);

      expect(isValid).toBe(true);
    });

    it("should fail verification if roundId, seed, or winners are tampered with", () => {
      const roundId = "round_tamper_test";
      const seed = "original_seed";
      const winners = [42];

      const commitHash = computeCommitHash(roundId, seed, winners);

      // Tampered winners
      expect(verifyCommitHash(roundId, seed, [43], commitHash)).toBe(false);

      // Tampered seed
      expect(verifyCommitHash(roundId, "tampered_seed", winners, commitHash)).toBe(false);

      // Tampered roundId
      expect(verifyCommitHash("another_round", seed, winners, commitHash)).toBe(false);
    });
  });

  describe("4. Range and Input Validation", () => {
    it("should pass for valid range and exclusion configuration", () => {
      const result = validateRoundRange(1, 80, [5, 12, 50], 3);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should fail if rangeStart > rangeEnd", () => {
      const result = validateRoundRange(100, 50);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Range start must be less than or equal to range end");
    });

    it("should fail if exclusions are outside range", () => {
      const result = validateRoundRange(1, 80, [0, 5]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Exclusion 0 is outside the range [1, 80]");

      const resultHigh = validateRoundRange(1, 80, [81]);
      expect(resultHigh.valid).toBe(false);
      expect(resultHigh.error).toContain("Exclusion 81 is outside the range [1, 80]");
    });

    it("should fail if winners requested exceeds eligible count after exclusions", () => {
      // Range 1 to 5 has 5 numbers. Exclude 3 numbers -> 2 left. Ask for 3 winners -> Fail.
      const result = validateRoundRange(1, 5, [1, 2, 3], 3);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Requested 3 winners, but only 2 eligible numbers remain");
    });

    it("should fail if all numbers are excluded", () => {
      const result = validateRoundRange(1, 2, [1, 2], 1);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("All numbers in range have been excluded");
    });
  });
});
