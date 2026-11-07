"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, LogOut, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAdminSessionStore } from "@/src/store/admin-session";
import { useAdminMe } from "@/src/viewmodels/use-admin-users";
import type { ReactNode } from "react";

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAdminSessionStore((state) => state.token);
  const logout = useAdminSessionStore((state) => state.logout);
  const queryClient = useQueryClient();
  const me = useAdminMe(Boolean(token));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-none items-center justify-between gap-4 px-4 sm:px-8 lg:px-12 2xl:px-16">
          <Link href="/admin" className="font-semibold tracking-tight">GECHhub <span className="text-primary">/ Admin</span></Link>
          <nav aria-label="Administration" className="flex items-center gap-2 sm:gap-4">
            <Link href="/admin/users" aria-current={pathname.startsWith("/admin/users") ? "page" : undefined} className={`rounded-md px-3 py-2 text-sm font-medium ${pathname.startsWith("/admin/users") ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Users</Link>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button type="button" variant="ghost" className="min-h-11 gap-2 px-2 sm:px-3" aria-label="Open administrator profile menu" />}>
                <Avatar className="size-8"><AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{me.data?.name?.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() ?? "A"}</AvatarFallback></Avatar>
                <span className="hidden max-w-36 truncate text-sm font-medium sm:inline">{me.isPending ? "Loading profile" : me.data?.name ?? "Administrator"}</span>
                <ChevronDown aria-hidden="true" className="hidden size-4 text-muted-foreground sm:block" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuGroup><DropdownMenuLabel className="font-normal"><span className="flex items-center gap-3 py-1"><Avatar className="size-10"><AvatarFallback className="bg-primary/10 font-semibold text-primary">{me.data?.name?.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() ?? "A"}</AvatarFallback></Avatar><span className="grid min-w-0 gap-1"><span className="truncate font-semibold text-foreground">{me.data?.name ?? "Administrator"}</span><span className="truncate text-xs text-muted-foreground">{me.data?.email_id}</span></span></span></DropdownMenuLabel></DropdownMenuGroup>
                <DropdownMenuSeparator />
                <div className="px-2 py-2 text-xs text-muted-foreground"><span className="flex items-center gap-2"><ShieldCheck aria-hidden="true" className="size-4" />Administrator · {me.data?.institution_name ?? "GECHhub"}</span></div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { queryClient.removeQueries({ queryKey: ["admin"] }); logout(); router.replace("/admin-login"); }}><LogOut aria-hidden="true" />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-none px-5 pb-16 pt-8 sm:px-8 sm:pt-10 lg:px-12 2xl:px-16">
        {me.isError && <Alert variant="destructive" className="mb-6" role="alert"><AlertTitle>Admin profile could not be refreshed</AlertTitle><AlertDescription>{me.error instanceof Error ? me.error.message : "The request could not be completed."}</AlertDescription></Alert>}
        {children}
      </main>
    </div>
  );
}
