import { NoticeDetailPage } from "@/src/components/notices/notice-detail-page";

export const instant = false;

export default async function Page({ params, searchParams }: { params: Promise<{ noticeId: string }>; searchParams: Promise<{ status?: string }> }) {
  const [{ noticeId }, query] = await Promise.all([params, searchParams]);
  const status = query.status === "scheduled" || query.status === "archived" ? query.status : "active";
  return <NoticeDetailPage noticeId={noticeId} feedStatus={status}/>;
}
