export function claimObject(claim: {
  id: string; postId: string; message: string; decision: "pending" | "approved" | "rejected"; createdAt: Date;
  post: { title: string };
  claimant: { emailId: string; name: string; role: "admin" | "student" | "faculty" | "office_staff"; phoneNumber: string | null };
}) {
  return {
    id: claim.id, post_id: claim.postId, post_title: claim.post.title, message: claim.message, decision: claim.decision,
    claimant: { email_id: claim.claimant.emailId, name: claim.claimant.name, role: claim.claimant.role, phone_number: claim.claimant.phoneNumber },
    created_at: claim.createdAt.toISOString(),
  };
}
