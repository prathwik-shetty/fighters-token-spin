import crypto from "crypto";

/**
 * Builds the array of eligible numbers from rangeStart to rangeEnd,
 * excluding any numbers provided in the exclusions list.
 */
export function buildEligibleNumbers(
  rangeStart: number,
  rangeEnd: number,
  exclusions: number[] = []
): number[] {
  if (rangeStart > rangeEnd) {
    throw new Error("rangeStart must be less than or equal to rangeEnd");
  }

  const exclusionSet = new Set(exclusions);
  const eligible: number[] = [];

  for (let i = rangeStart; i <= rangeEnd; i++) {
    if (!exclusionSet.has(i)) {
      eligible.push(i);
    }
  }

  return eligible;
}

/**
 * Selects `count` unique winners from the eligible pool without replacement
 * using Node.js crypto.randomInt (CSPRNG) by default, or an optional custom PRNG for testing.
 */
export function selectWinners(
  eligible: number[],
  count: number = 1,
  randomIntFn: (min: number, max: number) => number = crypto.randomInt
): number[] {
  if (count <= 0) {
    throw new Error("Winners count must be at least 1");
  }
  if (count > eligible.length) {
    throw new Error(
      `Cannot draw ${count} winners from an eligible pool of ${eligible.length} numbers`
    );
  }

  // Clone pool to select without replacement (Fisher-Yates style sampling)
  const pool = [...eligible];
  const winners: number[] = [];

  for (let i = 0; i < count; i++) {
    // Pick a random index from 0 to pool.length - 1
    const selectedIdx = randomIntFn(0, pool.length);
    const winner = pool[selectedIdx];
    winners.push(winner);

    // Swap with the last element and pop for O(1) removal without shift
    pool[selectedIdx] = pool[pool.length - 1];
    pool.pop();
  }

  return winners;
}

/**
 * Generates a high-entropy cryptographically secure random seed.
 */
export function generateSeed(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Computes a deterministic SHA-256 commit hash from roundId, seed, and winners.
 * Format: sha256(roundId + ":" + seed + ":" + winners.join(","))
 */
export function computeCommitHash(
  roundId: string,
  seed: string,
  winners: number[]
): string {
  const payload = `${roundId}:${seed}:${winners.join(",")}`;
  return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
}

/**
 * Verifies if the provided seed and winners match the stored commit hash for the round.
 */
export function verifyCommitHash(
  roundId: string,
  seed: string,
  winners: number[],
  expectedHash: string
): boolean {
  if (!roundId || !seed || !expectedHash || !Array.isArray(winners)) {
    return false;
  }
  const actualHash = computeCommitHash(roundId, seed, winners);
  return actualHash.toLowerCase() === expectedHash.toLowerCase();
}

/**
 * Validates round creation parameters.
 */
export function validateRoundRange(
  rangeStart: number,
  rangeEnd: number,
  exclusions: number[] = [],
  winnersCount: number = 1
): { valid: boolean; error?: string } {
  if (!Number.isInteger(rangeStart) || !Number.isInteger(rangeEnd)) {
    return { valid: false, error: "Range start and end must be integers" };
  }
  if (rangeStart > rangeEnd) {
    return { valid: false, error: "Range start must be less than or equal to range end" };
  }
  if (rangeEnd - rangeStart + 1 > 10000) {
    return { valid: false, error: "Maximum range size allowed is 10,000 numbers" };
  }
  if (winnersCount < 1) {
    return { valid: false, error: "Winners count must be at least 1" };
  }

  for (const ex of exclusions) {
    if (!Number.isInteger(ex)) {
      return { valid: false, error: `Invalid exclusion: ${ex} is not an integer` };
    }
    if (ex < rangeStart || ex > rangeEnd) {
      return {
        valid: false,
        error: `Exclusion ${ex} is outside the range [${rangeStart}, ${rangeEnd}]`,
      };
    }
  }

  const uniqueExclusions = new Set(exclusions);
  const totalRangeCount = rangeEnd - rangeStart + 1;
  const eligibleCount = totalRangeCount - uniqueExclusions.size;

  if (eligibleCount <= 0) {
    return { valid: false, error: "All numbers in range have been excluded. No numbers left to draw." };
  }

  if (winnersCount > eligibleCount) {
    return {
      valid: false,
      error: `Requested ${winnersCount} winners, but only ${eligibleCount} eligible numbers remain`,
    };
  }

  return { valid: true };
}
