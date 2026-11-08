export type Role = "admin" | "student" | "faculty" | "office_staff";

export interface Profile {
  role: Role;
  name: string;
  email_id: string;
  phone_number: string | null;
  dept?: string;
  designation?: string;
  usn?: string;
}

export interface AdminProfile {
  role: "admin";
  team_id: string;
  institution_name: string;
  name: string;
  email_id: string;
  phone_number?: string;
}

export type ManagedRole = Exclude<Role, "admin">;

export interface AdminUser {
  role: ManagedRole;
  team_id: string;
  name: string;
  email_id: string;
  phone_number?: string;
  dept?: string;
  designation?: string;
  usn?: string;
  created_at?: string;
  updated_at?: string;
  otp?: string;
  created_by?: string;
}

export interface FoundPost {
  post_id: string;
  title: string;
  description: string;
  location_found: string;
  found_on: string;
  images: { image_id: string; url: string; content_type: string }[];
  status: "active" | "archived";
  resolved: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  resolution?: {
    claim_id: string;
    claimant_email: string;
    note?: string;
    resolved_by: string;
    resolved_at: string;
  };
}

export interface Claim {
  claim_id: string;
  post_id: string;
  claimant_email: string;
  claimant_name: string;
  claimant_role: Role;
  claimant_phone_number?: string;
  message: string;
  status: "active" | "archived";
  decision: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
}

export interface LostRequest {
  request_id: string;
  title: string;
  description?: string;
  location_lost?: string;
  lost_on?: string;
  status: "active" | "archived";
  created_by: string;
  created_by_name: string;
  created_by_role: Role;
  created_by_phone_number?: string;
  created_at: string;
  updated_at: string;
}

export interface Paged<T> {
  items: T[];
  count: number;
  next_cursor: string | null;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
  request_id?: string;
}
