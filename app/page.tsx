import { ArrowDown, ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/src/components/providers/theme-provider";

const steps = [
  {
    number: "01",
    title: "Browse found items",
    description:
      "Look through items reported by campus office staff and open the details when something looks familiar.",
  },
  {
    number: "02",
    title: "Share what you know",
    description:
      "Send a claim with details that help staff confirm an item belongs to you.",
  },
  {
    number: "03",
    title: "Bring it back",
    description:
      "Staff review claims and record when an item has been returned to its owner.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-[120rem] items-center justify-between px-5 py-5 sm:px-8 lg:px-12 2xl:px-16">
        <a href="#top" className="flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground">
            C
          </span>
          <span className="text-lg font-semibold tracking-tight">GECHhub</span>
        </a>
        <nav aria-label="Main navigation" className="flex items-center gap-3 text-sm font-medium sm:gap-6">
          <ThemeToggle />
          <a className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring" href="#findit">
            FindIt
          </a>
          <a className="hidden text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:inline" href="#how-it-works">
            How it works <ArrowRight aria-hidden="true" className="size-4" />
          </a>
          <Button nativeButton={false} render={<Link href="/login" />} className="min-h-11 px-4">
            Log in
          </Button>
        </nav>
      </header>

      <section id="top" className="mx-auto grid w-full max-w-[120rem] items-center gap-14 px-5 pb-20 pt-10 sm:px-8 sm:pb-28 sm:pt-16 lg:grid-cols-[1.04fr_0.96fr] lg:gap-16 lg:px-12 lg:pb-32 lg:pt-20 2xl:gap-24 2xl:px-16">
        <div className="max-w-2xl">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
            Campus, looking after its own
          </p>
          <h1 className="text-balance text-5xl font-semibold leading-[1.04] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Lost something? <span className="text-primary">Let’s find it.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
            GECHhub brings your campus lost and found into one clear place. Browse found items, share a claim, and let staff help make the connection.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button nativeButton={false} render={<a href="#findit" />} className="h-12 gap-2 px-5 text-sm font-semibold">
              Meet FindIt <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
            <Button nativeButton={false} render={<a href="#how-it-works" />} variant="ghost" className="h-12 gap-2 px-5 text-sm font-semibold">
              See how it works <ArrowDown aria-hidden="true" className="size-4" />
            </Button>
          </div>
          <p className="mt-7 text-sm text-muted-foreground">A thoughtful start to Track 01: FindIt · Lost &amp; Found</p>
        </div>

        <div aria-label="FindIt helps connect found items, claims, and lost reports" role="img" className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-5 rounded-[2rem] bg-primary/[0.06] sm:-inset-8" />
          <div className="relative rounded-2xl border border-border bg-card p-5 shadow-[0_20px_60px_-35px_rgba(38,45,90,0.32)] sm:p-7">
            <div className="flex items-center justify-between border-b border-border pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">GECHhub / Track 01</p>
                <p className="mt-1 text-xl font-semibold tracking-tight">FindIt</p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">Lost &amp; Found</span>
            </div>
            <div className="relative my-6 flex min-h-52 items-center justify-center overflow-hidden rounded-xl bg-muted sm:min-h-64">
              <div className="absolute size-44 rounded-full border border-primary/15 sm:size-56" />
              <div className="absolute size-32 rounded-full border border-primary/20 sm:size-40" />
              <div className="relative flex size-20 items-center justify-center rounded-2xl bg-card text-primary shadow-sm sm:size-24">
                <Search aria-hidden="true" className="size-9 sm:size-11" strokeWidth={1.6} />
              </div>
              <span className="absolute left-[16%] top-[22%] size-2 rounded-full bg-primary/40" />
              <span className="absolute bottom-[20%] right-[19%] size-3 rounded-full bg-primary/30" />
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                ["01", "Found items"],
                ["02", "Claims"],
                ["03", "Lost reports"],
              ].map(([number, label]) => (
                <div key={number} className="rounded-lg border border-border p-3 sm:p-4">
                  <p className="text-xs font-medium text-muted-foreground">{number}</p>
                  <p className="mt-2 text-xs font-semibold leading-4 sm:text-sm">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute -bottom-5 -left-2 rounded-xl border border-border bg-card px-4 py-3 shadow-sm sm:-left-6">
            <p className="text-xs font-medium text-muted-foreground">Made for campus</p>
            <p className="mt-0.5 text-sm font-semibold">One helpful connection at a time</p>
          </div>
        </div>
      </section>

      <section id="findit" className="border-y border-border bg-card">
        <div className="mx-auto grid w-full max-w-[120rem] gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[0.7fr_1.3fr] lg:items-center lg:px-12 2xl:px-16">
          <div>
            <p className="text-sm font-semibold text-primary">FindIt · Lost &amp; Found</p>
            <h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">A small moment of relief, made easier.</h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            FindIt gives office staff a place to post found items and review claims. Students and faculty can browse, explain why an item is theirs, or report something they have lost.
          </p>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto w-full max-w-[120rem] px-5 py-16 sm:px-8 sm:py-24 lg:px-12 2xl:px-16">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">A clear path back</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">From found to found again.</h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">Three simple steps bring the right people together.</p>
        </div>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <li key={step.number} className="rounded-xl border border-border bg-card p-6 sm:p-7">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">{step.number}</span>
              <h3 className="mt-6 text-lg font-semibold tracking-tight">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[120rem] flex-col gap-2 px-5 py-7 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12 2xl:px-16">
          <p className="font-semibold text-foreground">GECHhub</p>
          <p>FindIt · Track 01 · Built for the campus community</p>
        </div>
      </footer>
    </main>
  );
}
