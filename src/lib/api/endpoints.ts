import { apiBlob, apiCall } from "./client";
import type { AdminProfile, AdminUser, Claim, ManagedRole, Paged, Profile, FoundPost, LostRequest, Notice, NoticeStatus, Doubt } from "./types";

export function listDoubtsRequest(noticeId: string, answered: boolean | null, cursor?: string) {
  const params = new URLSearchParams();
  if (answered !== null) params.set("answered", String(answered));
  if (cursor) params.set("cursor", cursor);
  return apiCall<Paged<Doubt>>("GET", `/api/v1/noticehub/notices/${encodeURIComponent(noticeId)}/doubts?${params}`);
}
export function createDoubtRequest(noticeId: string, question: string) {
  return apiCall<Doubt>("POST", `/api/v1/noticehub/notices/${encodeURIComponent(noticeId)}/doubts`, { body: { question } });
}
export function updateDoubtRequest(id: string, question: string) {
  return apiCall<Doubt>("PATCH", `/api/v1/noticehub/doubts/${encodeURIComponent(id)}`, { body: { question } });
}
export function deleteDoubtRequest(id: string) {
  return apiCall<{ deleted: true; id: string }>("DELETE", `/api/v1/noticehub/doubts/${encodeURIComponent(id)}`);
}

export function listNoticesRequest(status: NoticeStatus, pinned: boolean | null, cursor?: string) {
  const params = new URLSearchParams({ status });
  if (pinned !== null) params.set("pinned", String(pinned));
  if (cursor) params.set("cursor", cursor);
  return apiCall<Paged<Notice>>("GET", `/api/v1/noticehub/notices?${params}`);
}

export function createNoticeRequest(input: { title: string; body: string; pinned: boolean; publish_at?: string; attachment?: File }) {
  const form = new FormData(); form.set("title", input.title); form.set("body", input.body); form.set("pinned", String(input.pinned));
  if (input.publish_at) form.set("publish_at", input.publish_at);
  if (input.attachment) form.set("attachment", input.attachment);
  return apiCall<Notice>("POST", "/api/v1/noticehub/notices", { formData: form });
}

export function getNoticeRequest(id: string) { return apiCall<Notice>("GET", `/api/v1/noticehub/notices/${encodeURIComponent(id)}`); }
export function downloadNoticeRequest(id: string) { return apiBlob(`/api/v1/noticehub/notices/${encodeURIComponent(id)}/attachment`); }
export type UpdateNoticeInput = { title?: string; body?: string; pinned?: boolean; status?: "active" | "archived"; publish_at?: string | null; attachment?: File; remove_attachment?: boolean };
export function updateNoticeRequest(id: string, input: UpdateNoticeInput) {
  const form = new FormData();
  for (const key of ["title", "body", "pinned", "status", "publish_at", "remove_attachment"] as const) {
    const value = input[key]; if (value !== undefined) form.set(key, String(value));
  }
  if (input.attachment) form.set("attachment", input.attachment);
  return apiCall<Notice>("PATCH", `/api/v1/noticehub/notices/${encodeURIComponent(id)}`, { formData: form });
}
export function deleteNoticeRequest(id: string) { return apiCall<{ deleted: true; id: string }>("DELETE", `/api/v1/noticehub/notices/${encodeURIComponent(id)}`); }

export type FoundPostStatus = "active" | "archived";

export function listPostsRequest(
  status: FoundPostStatus,
  cursor?: string,
) {
  const params = new URLSearchParams();
  if (status === "archived") params.set("status", status);
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  return apiCall<Paged<FoundPost>>("GET", `/api/v1/findit/posts${query ? `?${query}` : ""}`);
}

export function getPostRequest(postId: string) {
  return apiCall<FoundPost>("GET", `/api/v1/findit/posts/${encodeURIComponent(postId)}`);
}

export function listClaimsRequest(postId: string) {
  return apiCall<Paged<Claim>>(
    "GET",
    `/api/v1/findit/posts/${encodeURIComponent(postId)}/claims`,
  );
}

export function myClaimsRequest(cursor?: string) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  return apiCall<Paged<Claim>>("GET", `/api/v1/findit/claims/me${query ? `?${query}` : ""}`);
}

export function createClaimRequest(postId: string, message: string) {
  return apiCall<Claim>(
    "POST",
    `/api/v1/findit/posts/${encodeURIComponent(postId)}/claims`,
    { body: { message } },
  );
}

export function withdrawClaimRequest(claimId: string) {
  return apiCall<void>("DELETE", `/api/v1/findit/claims/${encodeURIComponent(claimId)}`);
}

export interface FoundPostInput {
  title: string;
  description: string;
  location_found: string;
  found_on: string;
  images?: File[];
  remove_images?: boolean;
}

function postFormData(input: Partial<FoundPostInput>) {
  const data = new FormData();
  if (input.title !== undefined) data.set("title", input.title);
  if (input.description !== undefined) data.set("description", input.description);
  if (input.location_found !== undefined) data.set("location_found", input.location_found);
  if (input.found_on !== undefined) data.set("found_on", input.found_on);
  input.images?.forEach((image) => data.append("images", image));
  if (input.remove_images) data.set("remove_images", "true");
  return data;
}

export function createPostRequest(input: FoundPostInput) {
  return apiCall<FoundPost>("POST", "/api/v1/findit/posts", { formData: postFormData(input) });
}

export function updatePostRequest(postId: string, input: Partial<FoundPostInput> & { status?: FoundPostStatus }) {
  const data = postFormData(input);
  if (input.status) data.set("status", input.status);
  return apiCall<FoundPost>("PATCH", `/api/v1/findit/posts/${encodeURIComponent(postId)}`, { formData: data });
}

export function deletePostRequest(postId: string) {
  return apiCall<void>("DELETE", `/api/v1/findit/posts/${encodeURIComponent(postId)}`);
}

export interface Resolution {
  claim_id: string;
  claimant_email: string;
  note?: string;
  resolved_by: string;
  resolved_at: string;
}

export function getResolutionRequest(postId: string) {
  return apiCall<Resolution>("GET", `/api/v1/findit/posts/${encodeURIComponent(postId)}/resolution`);
}

export function resolvePostRequest(postId: string, claim_id: string, note?: string) {
  return apiCall<Resolution>("POST", `/api/v1/findit/posts/${encodeURIComponent(postId)}/resolution`, {
    body: { claim_id, ...(note ? { note } : {}) },
  });
}

export function updateResolutionRequest(postId: string, claim_id: string, note?: string) {
  return apiCall<Resolution>("PATCH", `/api/v1/findit/posts/${encodeURIComponent(postId)}/resolution`, {
    body: { claim_id, ...(note ? { note } : {}) },
  });
}

export function undoResolutionRequest(postId: string) {
  return apiCall<void>("DELETE", `/api/v1/findit/posts/${encodeURIComponent(postId)}/resolution`);
}

export type LostRequestStatus = "active" | "archived";

export interface LostRequestFilters {
  status: LostRequestStatus;
  mine?: boolean;
}

export interface LostRequestInput {
  title: string;
  description?: string;
  location_lost?: string;
  lost_on?: string;
}

export function listLostRequestsRequest(
  filters: LostRequestFilters,
  cursor?: string,
) {
  const params = new URLSearchParams({ status: filters.status });
  if (filters.mine) params.set("mine", "true");
  if (cursor) params.set("cursor", cursor);
  return apiCall<Paged<LostRequest>>(
    "GET",
    `/api/v1/findit/lost-requests?${params.toString()}`,
  );
}

export function createLostRequestRequest(input: LostRequestInput) {
  return apiCall<LostRequest>("POST", "/api/v1/findit/lost-requests", {
    body: input,
  });
}

export function updateLostRequestRequest(
  requestId: string,
  input: Partial<LostRequestInput> & { status?: LostRequestStatus },
) {
  return apiCall<LostRequest>(
    "PATCH",
    `/api/v1/findit/lost-requests/${encodeURIComponent(requestId)}`,
    { body: input },
  );
}

export function deleteLostRequestRequest(requestId: string) {
  return apiCall<void>(
    "DELETE",
    `/api/v1/findit/lost-requests/${encodeURIComponent(requestId)}`,
  );
}

export interface LoginResponse {
  access_token: string;
  expires_in: number;
  profile: Profile;
}

export interface AdminLoginResponse {
  access_token: string;
  expires_in: number;
  profile: AdminProfile;
}

export function loginRequest(email_id: string, otp: string) {
  return apiCall<LoginResponse>("POST", "/api/v1/auth/login", {
    body: { email_id, otp },
  });
}

export function meRequest() {
  return apiCall<Profile>("GET", "/api/v1/users/me");
}

export function adminLoginRequest(email_id: string, otp: string) {
  return apiCall<AdminLoginResponse>("POST", "/api/v1/auth/admin/login", {
    body: { email_id, otp },
    authScope: "admin",
  });
}

export const ADMIN_TEAM_EMAIL_DOMAIN =
  process.env.NEXT_PUBLIC_ADMIN_TEAM_EMAIL_DOMAIN?.trim().toLowerCase() ?? "";

export function adminMeRequest() {
  return apiCall<AdminProfile>("GET", "/api/v1/admin/me", { authScope: "admin" });
}

export function listAdminUsersRequest(options: {
  role?: ManagedRole;
  cursor?: string;
  limit?: number;
} = {}) {
  const params = new URLSearchParams();
  if (options.role) params.set("role", options.role);
  if (options.cursor) params.set("cursor", options.cursor);
  if (options.limit) params.set("limit", String(options.limit));
  const query = params.toString();
  return apiCall<Paged<AdminUser>>(
    "GET",
    `/api/v1/admin/users${query ? `?${query}` : ""}`,
    { authScope: "admin" },
  );
}

export type CreateAdminUserInput =
  | { role: "student"; name: string; usn: string; dept: string; email_id: string; phone_number: string }
  | { role: "faculty"; name: string; designation: string; email_id: string; phone_number: string }
  | { role: "office_staff"; name: string; dept: string; designation: string; email_id: string; phone_number: string };

export interface AdminUserUpdate {
  name?: string;
  phone_number?: string;
  usn?: string | null;
  dept?: string | null;
  designation?: string | null;
}

export function createAdminUserRequest(input: CreateAdminUserInput) {
  return apiCall<AdminUser>("POST", "/api/v1/admin/users", {
    body: input,
    authScope: "admin",
  });
}

function adminUserPath(emailId: string) {
  return `/api/v1/admin/users/${encodeURIComponent(emailId)}`;
}

export function getAdminUserRequest(emailId: string) {
  return apiCall<AdminUser>("GET", adminUserPath(emailId), { authScope: "admin" });
}

export function updateAdminUserRequest(emailId: string, input: AdminUserUpdate) {
  return apiCall<AdminUser>("PATCH", adminUserPath(emailId), {
    body: input,
    authScope: "admin",
  });
}

export function deleteAdminUserRequest(emailId: string) {
  return apiCall<{ message: string }>("DELETE", adminUserPath(emailId), {
    authScope: "admin",
  });
}

export function regenerateAdminUserOtpRequest(emailId: string) {
  return apiCall<{ otp: string }>(
    "POST",
    `${adminUserPath(emailId)}/regenerate-otp`,
    { authScope: "admin" },
  );
}
