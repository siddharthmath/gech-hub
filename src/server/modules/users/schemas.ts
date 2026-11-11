import { z } from "zod";
import { ApiError } from "@/src/lib/errors";
import { decodeCursor, parseLimit } from "@/src/lib/pagination";

const sharedFields = {
  name: z.string().trim().min(2).max(100),
  email_id: z.string().trim().toLowerCase().email(),
  phone_number: z.string().regex(/^\d{10}$/),
};

export const studentSchema = z.object({
  role: z.literal("student"), ...sharedFields,
  usn: z.string().trim().regex(/^[a-zA-Z0-9]{5,20}$/).transform((value) => value.toUpperCase()),
  dept: z.string().trim().min(2).max(100),
});

export const facultySchema = z.object({
  role: z.literal("faculty"), ...sharedFields,
  designation: z.string().trim().min(2).max(100),
});

export const officeStaffSchema = z.object({
  role: z.literal("office_staff"), ...sharedFields,
  dept: z.string().trim().min(2).max(100),
  designation: z.string().trim().min(2).max(100),
});

const fieldsByRole = {
  student: new Set(["role", "name", "usn", "dept", "email_id", "phone_number"]),
  faculty: new Set(["role", "name", "designation", "email_id", "phone_number"]),
  office_staff: new Set(["role", "name", "dept", "designation", "email_id", "phone_number"]),
} as const;

export function parseCreateUser(input: unknown) {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ApiError(422, "VALIDATION_ERROR", "Request validation failed.", [{ field: "body", message: "Expected an object." }]);
  }
  const body = input as Record<string, unknown>;
  if (body.role !== "student" && body.role !== "faculty" && body.role !== "office_staff") {
    throw new ApiError(422, "VALIDATION_ERROR", "Request validation failed.", [{ field: "role", message: "Role must be student, faculty or office_staff." }]);
  }
  const allowed = fieldsByRole[body.role];
  const disallowed = Object.keys(body).find((field) => !allowed.has(field));
  if (disallowed) {
    throw new ApiError(422, "FIELD_NOT_ALLOWED_FOR_ROLE", "A field is not allowed for this role.", [{ field: disallowed, message: `The ${disallowed} field is not allowed for ${body.role}.` }]);
  }
  const schema = body.role === "student" ? studentSchema : body.role === "faculty" ? facultySchema : officeStaffSchema;
  const parsed = schema.parse(body);
  const domain = process.env.TEAM_EMAIL_DOMAIN;
  if (!domain || parsed.email_id.split("@")[1] !== domain.trim().toLowerCase()) {
    throw new ApiError(422, "EMAIL_DOMAIN_MISMATCH", "Email must use the configured team email domain.", [{ field: "email_id", message: "Email domain does not match the team." }]);
  }
  return parsed;
}

export function parseUserListQuery(query: URLSearchParams) {
  const role = query.get("role");
  if (role !== null && role !== "student" && role !== "faculty" && role !== "office_staff") {
    throw new ApiError(422, "VALIDATION_ERROR", "Request validation failed.", [{ field: "role", message: "Role must be student, faculty or office_staff." }]);
  }
  const limit = parseLimit(query.get("limit"));
  const rawCursor = query.get("cursor");
  return { role: role as "student" | "faculty" | "office_staff" | null, limit, cursor: rawCursor ? decodeCursor(rawCursor) : null };
}

const editableSchemas = {
  student: z.object({
    name: sharedFields.name.optional(),
    phone_number: sharedFields.phone_number.optional(),
    usn: studentSchema.shape.usn.optional(),
    dept: studentSchema.shape.dept.optional(),
  }).strict(),
  faculty: z.object({
    name: sharedFields.name.optional(),
    phone_number: sharedFields.phone_number.optional(),
    designation: facultySchema.shape.designation.optional(),
  }).strict(),
  office_staff: z.object({
    name: sharedFields.name.optional(),
    phone_number: sharedFields.phone_number.optional(),
    dept: officeStaffSchema.shape.dept.optional(),
    designation: officeStaffSchema.shape.designation.optional(),
  }).strict(),
} as const;

export function parseUserUpdate(input: unknown, role: "student" | "faculty" | "office_staff") {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ApiError(422, "VALIDATION_ERROR", "Request validation failed.", [{ field: "body", message: "Expected a non-empty object." }]);
  }
  const body = input as Record<string, unknown>;
  if (Object.keys(body).length === 0) {
    throw new ApiError(422, "VALIDATION_ERROR", "Request validation failed.", [{ field: "body", message: "At least one editable field is required." }]);
  }
  if (Object.hasOwn(body, "role") || Object.hasOwn(body, "email_id")) {
    const field = Object.hasOwn(body, "role") ? "role" : "email_id";
    throw new ApiError(422, "VALIDATION_ERROR", "Request validation failed.", [{ field, message: "Account identity fields are read-only." }]);
  }
  const allowed = fieldsByRole[role];
  const disallowed = Object.keys(body).find((field) => !allowed.has(field));
  if (disallowed) {
    throw new ApiError(422, "FIELD_NOT_ALLOWED_FOR_ROLE", "A field is not allowed for this role.", [{ field: disallowed, message: `The ${disallowed} field is not allowed for ${role}.` }]);
  }
  const result = editableSchemas[role].safeParse(body);
  if (!result.success) throw result.error;
  return result.data;
}
