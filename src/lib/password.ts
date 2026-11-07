import { compare, hash } from "bcryptjs";

export function hashOtp(otp: string): Promise<string> {
  return hash(otp, 12);
}

export function verifyOtp(otp: string, otpHash: string): Promise<boolean> {
  return compare(otp, otpHash);
}
