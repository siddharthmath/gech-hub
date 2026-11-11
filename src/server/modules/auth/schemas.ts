import { z } from "zod";

export const adminLoginSchema = z.object({
  email_id: z.string().trim().toLowerCase().email(),
  otp: z.string().min(1),
});

export const userLoginSchema = adminLoginSchema;
