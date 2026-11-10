export function resolutionObject(resolution: {
  postId: string;
  claimId: string;
  note: string | null;
  resolvedAt: Date;
  claim: { claimant: { emailId: string; name: string; role: "admin" | "student" | "faculty" | "office_staff"; phoneNumber: string | null } };
  resolver: { emailId: string; name: string };
}) {
  return {
    post_id: resolution.postId,
    claim_id: resolution.claimId,
    claimant: {
      email_id: resolution.claim.claimant.emailId,
      name: resolution.claim.claimant.name,
      role: resolution.claim.claimant.role,
      phone_number: resolution.claim.claimant.phoneNumber,
    },
    note: resolution.note,
    resolved_by: { email_id: resolution.resolver.emailId, name: resolution.resolver.name },
    resolved_at: resolution.resolvedAt.toISOString(),
  };
}
