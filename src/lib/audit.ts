import { prisma } from "./prisma";

export type AuditAction =
  | "ADMIN_LOGIN"
  | "ADMIN_LOGOUT"
  | "CREATE_ROUND"
  | "START_SPIN"
  | "RESET_TEST_ROUND"
  | "EXPORT_ROUNDS_CSV"
  | "VERIFY_RESULT"
  | "SETUP_2FA";

export async function createAuditLog(params: {
  action: AuditAction | string;
  adminId?: string | null;
  adminEmail?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        action: params.action,
        adminId: params.adminId || null,
        adminEmail: params.adminEmail || null,
        detailsJson: params.details ? JSON.stringify(params.details) : null,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
    return null;
  }
}
