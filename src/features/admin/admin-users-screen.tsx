"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Check, Copy, Eye, EyeOff, MoreHorizontal, Plus, RotateCw, Trash2, UserRoundPen } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "@/components/ui/toast";
import { ADMIN_TEAM_EMAIL_DOMAIN, type AdminUserUpdate, type CreateAdminUserInput } from "@/src/lib/api/endpoints";
import { ApiError } from "@/src/lib/api/errors";
import type { AdminUser, ManagedRole } from "@/src/lib/api/types";
import { useAdminMe, useAdminUser, useAdminUsers, useCreateAdminUser, useDeleteAdminUser, useRegenerateAdminUserOtp, useUpdateAdminUser } from "@/src/viewmodels/use-admin-users";

type FieldErrors = Record<string, string>;
type UserValues = Record<string, string>;
type OtpNotice = { email: string; otp: string; kind: "created" | "regenerated" };
type DeleteTarget = { user: AdminUser; typedEmail: string };

const roleOptions = [
  { value: "all", label: "All users" },
  { value: "student", label: "Students" },
  { value: "faculty", label: "Faculty" },
  { value: "office_staff", label: "Office staff" },
] as const;

function validationErrors(error: unknown): FieldErrors {
  if (!(error instanceof ApiError) || !Array.isArray(error.details)) return {};
  return Object.fromEntries(error.details.flatMap((detail) => {
    if (typeof detail !== "object" || detail === null) return [];
    const entry = detail as { field?: unknown; message?: unknown };
    return typeof entry.field === "string" && typeof entry.message === "string"
      ? [[entry.field, entry.message]]
      : [];
  }));
}

function apiMessage(error: unknown) {
  return error instanceof Error ? error.message : "The request could not be completed.";
}

function roleField(user: AdminUser) {
  if (user.role === "student") return user.usn;
  if (user.role === "faculty") return user.designation;
  return user.dept;
}

function roleLabel(role: ManagedRole) {
  return role === "office_staff" ? "Office staff" : role[0].toUpperCase() + role.slice(1);
}

function FieldInput({
  id,
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
  maxLength,
  minLength,
  pattern,
  hint,
  error,
  readOnly = false,
  list,
}: {
  id: string;
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  hint?: string;
  error?: string;
  readOnly?: boolean;
  list?: string;
}) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}{required ? " *" : ""}</FieldLabel>
      <Input id={id} name={id} type={type} required={required} maxLength={maxLength} minLength={minLength} pattern={pattern} list={list} placeholder={placeholder} value={value} readOnly={readOnly} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} onChange={onChange ? (event) => onChange(event.target.value) : undefined} />
      {hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  );
}

function OtpNoticeCard({ notice, onDismiss }: { notice: OtpNotice; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  async function copyOtp() {
    try {
      await navigator.clipboard.writeText(notice.otp);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  }
  return (
    <Alert className="mt-6">
      <Check aria-hidden="true" />
      <AlertTitle>{notice.kind === "created" ? "User created" : "OTP regenerated"}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span><span className="font-medium">{notice.email}</span> · New login OTP: <code className="rounded bg-muted px-2 py-1 font-semibold tracking-wider text-foreground">{notice.otp}</code><span className="mt-1 block">This credential is shown once. Copy it now and share it securely.</span></span>
        <span className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" className="min-h-11" onClick={() => void copyOtp()}><Copy aria-hidden="true" data-icon="inline-start" />{copied ? "Copied" : "Copy"}</Button>
          <Button type="button" variant="ghost" className="min-h-11" onClick={onDismiss}>Dismiss</Button>
        </span>
        {copyError && <span role="alert" className="text-destructive">Clipboard access failed. Select and copy the OTP manually.</span>}
      </AlertDescription>
    </Alert>
  );
}

function CreateUserDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (user: AdminUser) => void }) {
  const create = useCreateAdminUser();
  const me = useAdminMe();
  const [role, setRole] = useState<ManagedRole>("student");
  const [values, setValues] = useState<UserValues>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const set = (field: string, value: string) => setValues((current) => ({ ...current, [field]: value }));
  const adminDomain = ADMIN_TEAM_EMAIL_DOMAIN || me.data?.email_id.split("@").at(-1)?.toLowerCase() || "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setRequestError(null);
    const normalizedEmail = (values.email_id ?? "").trim().toLowerCase();
    const phoneNumber = (values.phone_number ?? "").trim();
    if (!/^\d{10}$/.test(phoneNumber)) {
      setErrors({ phone_number: "Enter exactly 10 digits." });
      return;
    }
    if (!adminDomain) {
      setRequestError("Could not determine the team email domain from the admin profile.");
      return;
    }
    if (!normalizedEmail.endsWith(`@${adminDomain}`)) {
      setErrors({ email_id: `Use your team email domain: @${adminDomain}` });
      return;
    }
    const common = {
      role,
      name: (values.name ?? "").trim(),
      email_id: normalizedEmail,
      phone_number: phoneNumber,
    };
    const input: CreateAdminUserInput = role === "student"
      ? { ...common, role, usn: (values.usn ?? "").trim().toUpperCase(), dept: (values.dept ?? "").trim() }
      : role === "faculty"
        ? { ...common, role, designation: (values.designation ?? "").trim() }
        : { ...common, role, dept: (values.dept ?? "").trim(), designation: (values.designation ?? "").trim() };
    try {
      const user = await create.mutateAsync(input);
      onCreated(user);
      create.reset();
      onOpenChange(false);
      setValues({});
      setErrors({});
    } catch (error) {
      setRequestError(apiMessage(error));
      setErrors(validationErrors(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create a campus user</DialogTitle>
          <DialogDescription>All fields are required. The backend returns a one-time login OTP after creation.</DialogDescription>
        </DialogHeader>
        <form id="create-user-form" onSubmit={(event) => void submit(event)} className="flex flex-col gap-5">
          <Field>
            <FieldLabel htmlFor="new-role">Role *</FieldLabel>
            <Select value={role} onValueChange={(value) => { if (value === "student" || value === "faculty" || value === "office_staff") { setRole(value); setErrors({}); setRequestError(null); } }}>
              <SelectTrigger id="new-role" className="min-h-11 w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup>
                <SelectItem value="student">Student</SelectItem><SelectItem value="faculty">Faculty</SelectItem><SelectItem value="office_staff">Office staff</SelectItem>
              </SelectGroup></SelectContent>
            </Select>
          </Field>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <FieldInput id="name" label="Full name" required minLength={2} maxLength={100} value={values.name ?? ""} onChange={(value) => set("name", value)} error={errors.name} />
            <FieldInput id="email_id" label="Campus email" type="email" required value={values.email_id ?? ""} onChange={(value) => set("email_id", value)} hint={adminDomain ? `Must end with @${adminDomain}` : "Team domain is read from the administrator profile."} error={errors.email_id} />
            <FieldInput id="phone_number" label="Phone number" type="tel" required pattern="[0-9]{10}" maxLength={10} value={values.phone_number ?? ""} onChange={(value) => { set("phone_number", value.replace(/\D/g, "").slice(0, 10)); setErrors((current) => ({ ...current, phone_number: "" })); }} hint="Enter exactly 10 digits." error={errors.phone_number} />
            {role === "student" && <>
              <FieldInput id="usn" label="USN" required minLength={5} maxLength={20} pattern="[A-Za-z0-9]{5,20}" placeholder="1CF24CS001" value={values.usn ?? ""} onChange={(value) => set("usn", value)} hint="5–20 letters or numbers, e.g. 1CF24CS001." error={errors.usn} />
              <FieldInput id="dept" label="Department" required minLength={2} maxLength={60} list="student-departments" value={values.dept ?? ""} onChange={(value) => set("dept", value)} error={errors.dept} />
              <datalist id="student-departments"><option value="CSE"/><option value="ISE"/><option value="ECE"/><option value="MBA"/></datalist>
            </>}
            {role === "faculty" && <FieldInput id="designation" label="Designation" required minLength={2} maxLength={60} value={values.designation ?? ""} onChange={(value) => set("designation", value)} error={errors.designation} />}
            {role === "office_staff" && <>
              <FieldInput id="dept" label="Department" required minLength={2} maxLength={60} list="office-departments" value={values.dept ?? ""} onChange={(value) => set("dept", value)} hint="Student Affairs runs DocDesk; Campus Maintenance runs FixIt. Other departments are allowed." error={errors.dept} />
              <datalist id="office-departments"><option value="Student Affairs"/><option value="Campus Maintenance"/><option value="Accounts"/><option value="Library"/></datalist>
              <FieldInput id="designation" label="Designation" required minLength={2} maxLength={60} value={values.designation ?? ""} onChange={(value) => set("designation", value)} error={errors.designation} />
            </>}
          </FieldGroup>
          {requestError && <Alert variant="destructive" role="alert"><AlertTitle>User could not be created</AlertTitle><AlertDescription>{requestError}</AlertDescription></Alert>}
        </form>
        <DialogFooter className="flex-row justify-end">
          <Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="create-user-form" disabled={create.isPending} className="min-h-11">{create.isPending ? "Creating…" : "Create user"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({ emailId, open, onOpenChange, onSaved }: { emailId: string | null; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const query = useAdminUser(emailId, open);
  const update = useUpdateAdminUser(emailId ?? "");
  const [values, setValues] = useState<UserValues>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const user = query.data;
  const set = (field: string, value: string) => setValues((current) => ({ ...current, [field]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setErrors({});
    setRequestError(null);
    const editableFields: (keyof AdminUserUpdate)[] = ["name", "phone_number"];
    if (user.role === "student") editableFields.push("usn", "dept");
    if (user.role === "faculty") editableFields.push("designation");
    if (user.role === "office_staff") editableFields.push("dept", "designation");
    const input: AdminUserUpdate = {};
    for (const field of editableFields) {
      const value = values[field]?.trim();
      if (value === undefined) continue;
      const normalized = field === "usn" ? value.toUpperCase() : value;
      if (normalized !== (user[field] ?? "")) input[field] = normalized;
    }
    if (Object.keys(input).length === 0) return;
    try {
      await update.mutateAsync(input);
      onSaved();
      onOpenChange(false);
    } catch (error) {
      setRequestError(apiMessage(error));
      setErrors(validationErrors(error));
    }
  }

  const identityFields: ReactNode = user ? <FieldGroup className="grid gap-4 sm:grid-cols-2">
    <FieldInput id="edit-role" label="Role" value={roleLabel(user.role)} readOnly />
    <FieldInput id="edit-email" label="Email address" value={user.email_id} readOnly />
  </FieldGroup> : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><DialogTitle>Edit user</DialogTitle><DialogDescription>Update profile fields. Email and role are account identity and can’t be changed here.</DialogDescription></DialogHeader>
        {query.isPending ? <div className="flex flex-col gap-3"><Skeleton className="h-11 w-full"/><Skeleton className="h-11 w-full"/><Skeleton className="h-11 w-full"/></div>
          : query.isError ? <Alert variant="destructive" role="alert"><AlertTitle>User details could not be loaded</AlertTitle><AlertDescription>{apiMessage(query.error)}</AlertDescription></Alert>
          : user && <>
            {identityFields}
            <form id="edit-user-form" onSubmit={(event) => void submit(event)} className="flex flex-col gap-5">
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <FieldInput id="edit-name" label="Full name" required minLength={2} maxLength={100} value={values.name ?? user.name} onChange={(value) => set("name", value)} error={errors.name} />
                <FieldInput id="edit-phone_number" label="Phone number" type="tel" required pattern="\+?[0-9]{10,15}" value={values.phone_number ?? user.phone_number ?? ""} onChange={(value) => set("phone_number", value)} error={errors.phone_number} />
                {user.role === "student" && <>
                  <FieldInput id="edit-usn" label="USN" required minLength={5} maxLength={20} pattern="[A-Za-z0-9]{5,20}" placeholder="1CF24CS001" value={values.usn ?? user.usn ?? ""} onChange={(value) => set("usn", value)} hint="5–20 letters or numbers, e.g. 1CF24CS001." error={errors.usn} />
                  <FieldInput id="edit-dept" label="Department" required minLength={2} maxLength={60} value={values.dept ?? user.dept ?? ""} onChange={(value) => set("dept", value)} error={errors.dept} />
                </>}
                {user.role === "faculty" && <FieldInput id="edit-designation" label="Designation" required minLength={2} maxLength={60} value={values.designation ?? user.designation ?? ""} onChange={(value) => set("designation", value)} error={errors.designation} />}
                {user.role === "office_staff" && <>
                  <FieldInput id="edit-dept" label="Department" required minLength={2} maxLength={60} value={values.dept ?? user.dept ?? ""} onChange={(value) => set("dept", value)} error={errors.dept} />
                  <FieldInput id="edit-designation" label="Designation" required minLength={2} maxLength={60} value={values.designation ?? user.designation ?? ""} onChange={(value) => set("designation", value)} error={errors.designation} />
                </>}
              </FieldGroup>
              {requestError && <Alert variant="destructive" role="alert"><AlertTitle>Changes could not be saved</AlertTitle><AlertDescription>{requestError}</AlertDescription></Alert>}
            </form>
          </>}
        <DialogFooter className="flex-row justify-end">
          <Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="edit-user-form" disabled={!user || query.isPending || query.isError || update.isPending} className="min-h-11">{update.isPending ? "Saving…" : "Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserOtp({ user, revealed, onToggle }: { user: AdminUser; revealed: boolean; onToggle: () => void }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  async function copyOtp() {
    if (!user.otp) return;
    try {
      await navigator.clipboard.writeText(user.otp);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  }
  return <div className="flex flex-wrap items-center gap-2">
    <code aria-label={revealed && user.otp ? `OTP ${user.otp}` : "OTP hidden"} className="min-w-16 rounded bg-muted px-2 py-1 text-xs font-semibold tracking-wider">{revealed ? user.otp ?? "Unavailable" : "••••••"}</code>
    <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`${revealed ? "Hide" : "Reveal"} OTP for ${user.email_id}`} onClick={onToggle}>{revealed ? <EyeOff aria-hidden="true"/> : <Eye aria-hidden="true"/>}</Button>
    {revealed && user.otp && <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => void copyOtp()}><Copy aria-hidden="true" data-icon="inline-start"/>{copied ? "Copied" : "Copy"}</Button>}
    {copyError && <span role="alert" className="text-xs text-destructive">Clipboard unavailable</span>}
  </div>;
}

function UserActions({ user, onEdit, onRegenerate, onDelete }: { user: AdminUser; onEdit: () => void; onRegenerate: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Actions for ${user.name}`} />}><MoreHorizontal aria-hidden="true"/></DropdownMenuTrigger>
      <DropdownMenuContent align="end"><DropdownMenuGroup>
        <DropdownMenuItem onClick={onEdit}><UserRoundPen aria-hidden="true"/>Edit profile</DropdownMenuItem>
        <DropdownMenuItem onClick={onRegenerate}><RotateCw aria-hidden="true"/>Regenerate OTP</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDelete}><Trash2 aria-hidden="true"/>Delete user</DropdownMenuItem>
      </DropdownMenuGroup></DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AdminUsersScreen() {
  const [role, setRole] = useState<ManagedRole | undefined>();
  const usersQuery = useAdminUsers(role);
  const pages = usersQuery.data?.pages;
  const users = pages?.flatMap((page) => page.items) ?? [];
  const [createOpen, setCreateOpen] = useState(false);
  const [editEmail, setEditEmail] = useState<string | null>(null);
  const [revealedEmails, setRevealedEmails] = useState<Set<string>>(() => new Set());
  const [otpNotice, setOtpNotice] = useState<OtpNotice | null>(null);
  const [regenTarget, setRegenTarget] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const regenerate = useRegenerateAdminUserOtp();
  const remove = useDeleteAdminUser();

  async function regenerateOtp() {
    if (!regenTarget) return;
    const target = regenTarget;
    try {
      const result = await regenerate.mutateAsync(target.email_id);
      setOtpNotice({ email: target.email_id, otp: result.otp, kind: "regenerated" });
      regenerate.reset();
      setRegenTarget(null);
    } catch (error) {
      toast.add({ title: "OTP could not be regenerated", description: apiMessage(error), priority: "high" });
    }
  }

  async function deleteUser() {
    if (!deleteTarget || deleteTarget.typedEmail.trim().toLowerCase() !== deleteTarget.user.email_id.toLowerCase()) return;
    const email = deleteTarget.user.email_id;
    try {
      const result = await remove.mutateAsync(email);
      setDeleteTarget(null);
      setRevealedEmails((current) => { const next = new Set(current); next.delete(email); return next; });
      toast.add({ title: "User deleted", description: result.message });
    } catch (error) {
      toast.add({ title: "User could not be deleted", description: apiMessage(error), priority: "high" });
    }
  }

  function userRow(user: AdminUser, mobile = false) {
    return mobile ? (
      <Card key={user.email_id}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><CardTitle className="truncate">{user.name}</CardTitle><CardDescription className="mt-1 break-all">{user.email_id}</CardDescription></div>
            <UserActions user={user} onEdit={() => setEditEmail(user.email_id)} onRegenerate={() => setRegenTarget(user)} onDelete={() => setDeleteTarget({ user, typedEmail: "" })}/>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{roleLabel(user.role)}</Badge><span className="text-sm text-muted-foreground">{roleField(user) || user.designation || user.dept || "—"}</span></div>
          <p className="text-sm text-muted-foreground">{user.phone_number || "No phone number"}</p>
          <div className="border-t border-border pt-3"><p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Login OTP</p><UserOtp user={user} revealed={revealedEmails.has(user.email_id)} onToggle={() => setRevealedEmails((current) => { const next = new Set(current); if (next.has(user.email_id)) next.delete(user.email_id); else next.add(user.email_id); return next; })}/></div>
        </CardContent>
      </Card>
    ) : (
      <TableRow key={user.email_id}>
        <TableCell className="min-w-40"><span className="font-medium">{user.name}</span><span className="mt-1 block max-w-56 truncate text-xs text-muted-foreground">{user.email_id}</span></TableCell>
        <TableCell><Badge variant="secondary">{roleLabel(user.role)}</Badge></TableCell>
        <TableCell>{roleField(user) || user.designation || user.dept || "—"}</TableCell>
        <TableCell>{user.phone_number || "—"}</TableCell>
        <TableCell><UserOtp user={user} revealed={revealedEmails.has(user.email_id)} onToggle={() => setRevealedEmails((current) => { const next = new Set(current); if (next.has(user.email_id)) next.delete(user.email_id); else next.add(user.email_id); return next; })}/></TableCell>
        <TableCell><UserActions user={user} onEdit={() => setEditEmail(user.email_id)} onRegenerate={() => setRegenTarget(user)} onDelete={() => setDeleteTarget({ user, typedEmail: "" })}/></TableCell>
      </TableRow>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-semibold text-primary">Administration</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Users</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Create campus accounts, update profiles, and manage their login credentials.</p></div>
        <Button type="button" className="min-h-11 shrink-0" onClick={() => setCreateOpen(true)}><Plus aria-hidden="true" data-icon="inline-start"/>Create user</Button>
      </div>

      {otpNotice && <OtpNoticeCard notice={otpNotice} onDismiss={() => setOtpNotice(null)}/>}

      <section className="mt-8 flex flex-col gap-5" aria-label="Campus users">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Accounts <span className="text-sm font-normal text-muted-foreground">{pages?.[0]?.count ?? ""}</span></h2>
          <ToggleGroup value={[role ?? "all"]} onValueChange={(values) => { const selected = values.at(-1); setRole(selected === "student" || selected === "faculty" || selected === "office_staff" ? selected : undefined); }} aria-label="Filter users by role" variant="outline" spacing={1} className="w-full flex-wrap sm:w-auto">
            {roleOptions.map((option) => <ToggleGroupItem key={option.value} value={option.value} className="min-h-11 flex-1 px-3 sm:flex-none">{option.label}</ToggleGroupItem>)}
          </ToggleGroup>
        </div>

        {usersQuery.isPending ? <div className="grid gap-3 md:hidden" aria-label="Loading users">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-36 w-full"/>)}</div> : null}
        {usersQuery.isPending ? <div className="hidden rounded-xl border border-border p-4 md:block" aria-hidden="true"><Skeleton className="h-9 w-full"/><Skeleton className="mt-3 h-12 w-full"/><Skeleton className="mt-2 h-12 w-full"/></div> : null}
        {usersQuery.isError && <Alert variant="destructive" role="alert"><AlertTitle>Users couldn’t be loaded</AlertTitle><AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><span>{apiMessage(usersQuery.error)}</span><Button type="button" variant="outline" className="min-h-11" onClick={() => void usersQuery.refetch()}>Try again</Button></AlertDescription></Alert>}
        {!usersQuery.isPending && !usersQuery.isError && users.length === 0 && <Empty className="min-h-64 border"><EmptyHeader><EmptyMedia variant="icon"><UserRoundPen aria-hidden="true"/></EmptyMedia><EmptyTitle>No users found</EmptyTitle><EmptyDescription>{role ? `There are no ${roleLabel(role).toLowerCase()} accounts in this list.` : "Create the first campus account to get started."}</EmptyDescription></EmptyHeader></Empty>}
        {users.length > 0 && <>
          <div className="grid gap-3 md:hidden">{users.map((user) => userRow(user, true))}</div>
          <div className="hidden rounded-xl border border-border md:block">
            <Table>
              <TableHeader><TableRow><TableHead>Name / email</TableHead><TableHead>Role</TableHead><TableHead>USN / designation / dept</TableHead><TableHead>Phone</TableHead><TableHead>OTP</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
              <TableBody>{users.map((user) => userRow(user))}</TableBody>
            </Table>
          </div>
          {usersQuery.hasNextPage && <div className="flex justify-center"><Button type="button" variant="outline" className="min-h-11" disabled={usersQuery.isFetchingNextPage} onClick={() => void usersQuery.fetchNextPage()}>{usersQuery.isFetchingNextPage ? "Loading more…" : "Load more users"}</Button></div>}
        </>}
      </section>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(user) => { setOtpNotice(user.otp ? { email: user.email_id, otp: user.otp, kind: "created" } : null); if (!user.otp) toast.add({ title: "User created", description: "The API did not return an OTP in its response." }); }}/>
      <EditUserDialog key={editEmail ?? "closed"} emailId={editEmail} open={Boolean(editEmail)} onOpenChange={(open) => { if (!open) setEditEmail(null); }} onSaved={() => toast.add({ title: "User profile updated" })}/>

      <AlertDialog open={Boolean(regenTarget)} onOpenChange={(open) => { if (!open && !regenerate.isPending) setRegenTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Regenerate login OTP?</AlertDialogTitle><AlertDialogDescription>The current OTP stops working immediately for {regenTarget?.email_id}. You’ll need to share the new OTP with this user.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={regenerate.isPending}>Cancel</AlertDialogCancel><AlertDialogAction disabled={regenerate.isPending} onClick={(event) => { event.preventDefault(); void regenerateOtp(); }}>{regenerate.isPending ? "Regenerating…" : "Regenerate OTP"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open && !remove.isPending) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete campus user?</AlertDialogTitle><AlertDialogDescription>This permanently removes this account. Type <strong>{deleteTarget?.user.email_id}</strong> to confirm deletion.</AlertDialogDescription></AlertDialogHeader>
          <Field>
            <FieldLabel htmlFor="delete-email-confirm">Confirm email address</FieldLabel>
            <Input id="delete-email-confirm" type="email" autoComplete="off" value={deleteTarget?.typedEmail ?? ""} onChange={(event) => setDeleteTarget((current) => current ? { ...current, typedEmail: event.target.value } : current)}/>
          </Field>
          <AlertDialogFooter><AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={remove.isPending || !deleteTarget || deleteTarget.typedEmail.trim().toLowerCase() !== deleteTarget.user.email_id.toLowerCase()} onClick={(event) => { event.preventDefault(); void deleteUser(); }}>{remove.isPending ? "Deleting…" : "Delete user"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
