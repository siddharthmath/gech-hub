export function serializeDoubt(row: { id: string; noticeId: string; askerId: string; question: string; createdAt: Date; asker: { name: string; role: string }; response: null | { message: string; respondedAt: Date; responder: { name: string } } }) {
  return { id: row.id, notice_id: row.noticeId, question: row.question, asker: { name: row.asker.name, role: row.asker.role }, created_at: row.createdAt.toISOString(), response: row.response ? { message: row.response.message, responded_by: { name: row.response.responder.name }, responded_at: row.response.respondedAt.toISOString() } : null };
}
