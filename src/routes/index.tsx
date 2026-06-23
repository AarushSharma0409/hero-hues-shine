import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Power AI — Talent Acquisition" },
      { name: "description", content: "The most powerful AI ever deployed in talent acquisition." },
      { property: "og:title", content: "Power AI" },
      { property: "og:description", content: "The most powerful AI ever deployed in talent acquisition." },
    ],
  }),
  component: Index,
});

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_065045_c44942da-53c6-4804-b734-f9e07fc22e08.mp4";

const NAV_ITEMS = [
  { label: "Features", hasChevron: true },
  { label: "Solutions", hasChevron: false },
  { label: "Plans", hasChevron: false },
  { label: "Learning", hasChevron: true },
];

const LOGOS = ["Vortex", "Nimbus", "Prysma", "Cirrus", "Kynder", "Halcyn"];

function useVideoFadeLoop() {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const FADE = 500; // ms
    let raf = 0;

    const tick = () => {
      if (!video.duration || Number.isNaN(video.duration)) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const t = video.currentTime;
      const d = video.duration;
      let op = 1;
      if (t < FADE / 1000) op = t / (FADE / 1000);
      else if (t > d - FADE / 1000) op = Math.max(0, (d - t) / (FADE / 1000));
      video.style.opacity = String(op);
      raf = requestAnimationFrame(tick);
    };

    const onEnded = () => {
      video.style.opacity = "0";
      window.setTimeout(() => {
        video.currentTime = 0;
        video.play().catch(() => {});
      }, 100);
    };

    video.style.opacity = "0";
    video.play().catch(() => {});
    raf = requestAnimationFrame(tick);
    video.addEventListener("ended", onEnded);

    return () => {
      cancelAnimationFrame(raf);
      video.removeEventListener("ended", onEnded);
    };
  }, []);

  return ref;
}

function Index() {
  const videoRef = useVideoFadeLoop();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <video
        ref={videoRef}
        src={VIDEO_URL}
        muted
        playsInline
        autoPlay
        className="absolute inset-0 h-full w-full object-cover"
        style={{ opacity: 0 }}
      />

      <section className="relative z-10 flex min-h-screen flex-col overflow-visible">
        {/* Blurred shape */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 h-[527px] w-[984px] -translate-x-1/2 -translate-y-1/2 bg-gray-950 opacity-90 blur-[82px]"
        />

        {/* Navbar */}
        <header className="relative z-20">
          <nav className="flex flex-row items-center justify-between px-8 py-5">
            <div className="flex items-center">
              <span className="font-display text-2xl font-semibold tracking-tight text-foreground">
                Lumen
              </span>
            </div>
            <div className="hidden items-center gap-8 md:flex">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.label}
                  className="inline-flex items-center gap-1 text-sm text-foreground/90 transition-colors hover:text-foreground"
                >
                  {item.label}
                  {item.hasChevron && <ChevronDown className="h-4 w-4 opacity-70" />}
                </button>
              ))}
            </div>
            <Button variant="heroSecondary" className="rounded-full px-4 py-2">
              Sign Up
            </Button>
          </nav>
          <div className="mt-[3px] h-px w-full bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
        </header>

        {/* Hero content */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-8">
          <div className="flex flex-col items-center text-center">
            <h1
              className="font-display font-normal text-foreground"
              style={{
                fontSize: "220px",
                lineHeight: 1.02,
                letterSpacing: "-0.024em",
              }}
            >
              <span>Power </span>
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(to left, #6366f1, #a855f7, #fcd34d)",
                }}
              >
                AI
              </span>
            </h1>
            <p
              className="mt-[9px] max-w-md text-lg leading-8 opacity-80"
              style={{ color: "var(--color-hero-sub)" }}
            >
              The most powerful AI ever deployed
              <br />
              in talent acquisition
            </p>
            <Button
              variant="heroSecondary"
              className="mt-[25px] rounded-full"
              style={{ padding: "24px 29px" }}
            >
              Schedule a Consult
            </Button>
          </div>
        </div>

        {/* Marquee */}
        <div className="relative z-10 pb-10">
          <div className="mx-auto flex max-w-5xl items-center gap-12 px-8">
            <p className="shrink-0 text-sm text-foreground/50">
              Relied on by brands
              <br />
              across the globe
            </p>
            <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
              <div className="flex w-max animate-marquee items-center gap-16">
                {[...LOGOS, ...LOGOS].map((name, i) => (
                  <div key={`${name}-${i}`} className="flex shrink-0 items-center gap-3">
                    <span className="liquid-glass flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-semibold text-foreground">
                      {name[0]}
                    </span>
                    <span className="text-base font-semibold text-foreground">
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
