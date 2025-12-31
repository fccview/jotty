import { z } from "zod";

export const mfaVerifySchema = z.object({
    code: z.string().length(6, "Code must be 6 digits").regex(/^\d{6}$/, "Code must contain only numbers"),
});

export const mfaBackupCodeSchema = z.object({
    code: z.string().min(1, "Backup code is required"),
});

export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;
export type MfaBackupCodeInput = z.infer<typeof mfaBackupCodeSchema>;
