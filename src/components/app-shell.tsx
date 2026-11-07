"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Search, ClipboardList, ClipboardCheck, UserRound, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/src/components/providers/theme-provider";
import { useSessionStore } from "@/src/store/session";
import { useProfileRefresh } from "@/src/viewmodels/use-profile";
import type { ReactNode } from "react";

const links = [
  { href: "/findit", label: "Found items", icon: Search },
  { href: "/findit/lost-requests", label: "Lost reports", icon: ClipboardList },
  { href: "/claims", label: "My claims", icon: ClipboardCheck },
];

function roleName(role: string) {
  return role === "office_staff" ? "Office staff" : role.charAt(0).toUpperCase() + role.slice(1);
}

export function AppShell({ children }: { children: ReactNode }) {
  return <SidebarProvider defaultOpen={false}>
    <AppShellContent>{children}</AppShellContent>
  </SidebarProvider>;
}

function AppShellContent({ children }: { children: ReactNode }) {
  useProfileRefresh();
  const pathname = usePathname();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const profile = useSessionStore((state) => state.profile);
  const logout = useSessionStore((state) => state.logout);
  return (
    <div className="min-h-screen w-full min-w-0 flex-1 bg-background">
      <Sidebar side="left" collapsible="offcanvas" className="md:hidden">
        <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
          <Link href="/findit" onClick={() => setOpenMobile(false)} className="flex min-h-11 items-center gap-2.5 rounded-md font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Search aria-hidden="true" className="size-4" /></span>
            <span>GECHhub <span className="text-muted-foreground">/ FindIt</span></span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>FindIt</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {links.map(({ href, label, icon: Icon }) => {
                  const active = href === "/findit" ? pathname === href || pathname.startsWith("/findit/") : pathname === href;
                  return <SidebarMenuItem key={href}>
                    <SidebarMenuButton render={<Link href={href} aria-current={active ? "page" : undefined} onClick={() => setOpenMobile(false)} />} isActive={active} size="lg" className="min-h-11">
                      <Icon aria-hidden="true" /><span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>;
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        {profile && <SidebarFooter className="border-t border-sidebar-border p-4">
          <p className="truncate text-sm font-medium">{profile.name}</p>
          <p className="truncate text-xs text-muted-foreground">{profile.email_id}</p>
        </SidebarFooter>}
      </Sidebar>
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-none items-center justify-between gap-4 px-4 sm:px-6 lg:px-10 2xl:px-16">
          <Link href="/findit" className="flex min-h-11 items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Search aria-hidden="true" className="size-4" /></span>
            <span className="font-semibold tracking-tight">GECHhub <span className="text-muted-foreground">/ FindIt</span></span>
          </Link>
          <SidebarTrigger aria-label="Open navigation" className="min-h-11 min-w-11 md:hidden" />
          <nav aria-label="FindIt" className="hidden items-center gap-1 md:flex">
            {links.map(({ href, label }) => {
              const active = href === "/findit" ? pathname === href || pathname.startsWith("/findit/") : pathname === href;
              return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{label}</Link>;
            })}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {profile && <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" className="min-h-11 gap-2 px-2 sm:px-3" aria-label="Open profile menu" />}>
                <Avatar className="size-8"><AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{profile.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</AvatarFallback></Avatar>
                <span className="hidden max-w-36 truncate text-sm font-medium sm:inline">{profile.name}</span>
                <ChevronDown aria-hidden="true" className="hidden size-4 text-muted-foreground sm:block" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal">
                  <span className="flex items-center gap-3 py-1"><Avatar className="size-10"><AvatarFallback className="bg-primary/10 font-semibold text-primary">{profile.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</AvatarFallback></Avatar><span className="grid min-w-0 gap-1"><span className="truncate font-semibold text-foreground">{profile.name}</span><span className="truncate text-xs text-muted-foreground">{profile.email_id}</span></span></span>
                </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <div className="px-2 py-2 text-xs text-muted-foreground"><span className="flex items-center gap-2"><UserRound aria-hidden="true" className="size-4" />{roleName(profile.role)}{profile.dept ? ` · ${profile.dept}` : profile.designation ? ` · ${profile.designation}` : ""}</span>{profile.usn && <span className="mt-1 block pl-6">{profile.usn}</span>}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { logout(); router.replace("/login"); }}><LogOut aria-hidden="true" />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>}
          </div>
        </div>
      </header>
      <div className="w-full min-w-0">{children}</div>
    </div>
  );
}
