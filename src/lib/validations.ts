import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  totpCode: z
    .string()
    .length(6, "2FA code must be exactly 6 digits")
    .regex(/^\d{6}$/, "2FA code must only contain digits"),
});

export const createRoundSchema = z
  .object({
    name: z.string().min(2, "Round name must be at least 2 characters").max(100),
    rangeStart: z.coerce.number().int().min(1, "Range start must be at least 1"),
    rangeEnd: z.coerce.number().int().min(1, "Range end must be at least 1"),
    exclusions: z
      .array(z.coerce.number().int())
      .optional()
      .default([]),
    winnersCount: z.coerce.number().int().min(1, "Must draw at least 1 winner").default(1),
    isTestRound: z.boolean().optional().default(false),
    targetWinner: z.preprocess((val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    }, z.number().int().optional()),
  })
  .refine((data) => data.rangeStart <= data.rangeEnd, {
    message: "Range start must be less than or equal to range end",
    path: ["rangeStart"],
  })
  .refine(
    (data) => {
      const { rangeStart, rangeEnd, exclusions } = data;
      return exclusions.every((n) => n >= rangeStart && n <= rangeEnd);
    },
    {
      message: "Excluded numbers must fall within the range",
      path: ["exclusions"],
    }
  )
  .refine(
    (data) => {
      const { rangeStart, rangeEnd, exclusions, winnersCount } = data;
      const uniqueExclusions = new Set(exclusions);
      const eligibleCount = rangeEnd - rangeStart + 1 - uniqueExclusions.size;
      return winnersCount <= eligibleCount;
    },
    {
      message: "Winners count cannot exceed eligible numbers remaining",
      path: ["winnersCount"],
    }
  );

export const spinRoundSchema = z.object({
  roundId: z.string().min(1, "Round ID is required"),
});

export const verifyResultSchema = z.object({
  roundId: z.string().min(1, "Round ID is required"),
  seed: z.string().optional(),
});
