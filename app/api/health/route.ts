import { withApi } from "@/src/lib/http";

export const GET = withApi(() => Response.json({ status: "ok" }));
