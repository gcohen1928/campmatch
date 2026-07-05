"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { CAMPS } from "@/lib/camps-data";
import type { CampType, Gender, Interest } from "@/lib/types";
import { INTEREST_EMOJI, INTEREST_LABELS } from "@/lib/quiz";
import { CampCard } from "@/components/CampCard";

const CampsMap = dynamic(() => import("@/components/CampsMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-pine-light text-ink-soft">
      Loading map…
    </div>
  ),
});

const REGIONS = [
  { key: "all", label: "All regions" },
  { key: "northeast", label: "Northeast" },
  { key: "mid-atlantic", label: "Mid-Atlantic" },
  { key: "south", label: "South" },
  { key: "midwest", label: "Midwest" },
  { key: "west", label: "West" },
] as const;

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
        active
          ? "border-pine bg-pine text-cream"
          : "border-ink/15 bg-white text-ink-soft hover:border-pine/50 hover:text-pine"
      }`}
    >
      {children}
    </button>
  );
}

const PAGE_SIZE = 48;

export function CampsExplorer() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<CampType | "all">("all");
  const [region, setRegion] = useState<(typeof REGIONS)[number]["key"]>("all");
  const [gender, setGender] = useState<Gender | "all">("all");
  const [interest, setInterest] = useState<Interest | "all">("all");
  const [maxPrice, setMaxPrice] = useState<number>(20000);
  const [view, setView] = useState<"grid" | "map">("grid");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return CAMPS.filter((c) => {
      if (type !== "all" && c.type !== type) return false;
      if (region !== "all" && c.region !== region) return false;
      if (gender !== "all" && c.gender !== gender) return false;
      if (interest !== "all" && !c.interests.includes(interest)) return false;
      if (c.tuitionMin > maxPrice) return false;
      if (
        needle &&
        ![c.name, c.city, c.state, c.description].some((s) =>
          s.toLowerCase().includes(needle),
        )
      )
        return false;
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [q, type, region, gender, interest, maxPrice]);

  // Render incrementally — the dataset has thousands of camps.
  const shown = filtered.slice(0, visible);
  const setAndReset = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setVisible(PAGE_SIZE);
  };
  const setQ2 = setAndReset(setQ);
  const setType2 = setAndReset(setType);
  const setRegion2 = setAndReset(setRegion);
  const setGender2 = setAndReset(setGender);
  const setInterest2 = setAndReset(setInterest);
  const setMaxPrice2 = setAndReset(setMaxPrice);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-ink">Browse camps</h1>
          <p className="mt-2 text-lg text-ink-soft">
            {CAMPS.length.toLocaleString()} camps and counting. Want a ranked list instead?{" "}
            <Link href="/quiz" className="font-semibold text-ember hover:text-ember-deep">
              Take the questionnaire →
            </Link>
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-8 rounded-2xl border border-ink/10 bg-white p-5 shadow-lift">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ2(e.target.value)}
          placeholder="Search by name, town or vibe…"
          className="w-full rounded-xl border-2 border-ink/10 px-4 py-3 text-ink placeholder:text-ink-soft/60 focus:border-ember focus:outline-none"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip active={type === "all"} onClick={() => setType2("all")}>All camps</Chip>
          <Chip active={type === "sleepaway"} onClick={() => setType2("sleepaway")}>🌙 Sleepaway</Chip>
          <Chip active={type === "day"} onClick={() => setType2("day")}>🚌 Day camp</Chip>
          <span className="mx-1 hidden w-px self-stretch bg-ink/10 sm:block" />
          {REGIONS.map((r) => (
            <Chip key={r.key} active={region === r.key} onClick={() => setRegion2(r.key)}>
              {r.label}
            </Chip>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip active={gender === "all"} onClick={() => setGender2("all")}>Any gender</Chip>
          <Chip active={gender === "coed"} onClick={() => setGender2("coed")}>Co-ed</Chip>
          <Chip active={gender === "boys"} onClick={() => setGender2("boys")}>Boys</Chip>
          <Chip active={gender === "girls"} onClick={() => setGender2("girls")}>Girls</Chip>
          <Chip active={gender === "brother-sister"} onClick={() => setGender2("brother-sister")}>Brother/sister</Chip>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip active={interest === "all"} onClick={() => setInterest2("all")}>Any specialty</Chip>
          {(Object.keys(INTEREST_LABELS) as Interest[]).map((i) => (
            <Chip key={i} active={interest === i} onClick={() => setInterest2(i)}>
              {INTEREST_EMOJI[i]} {INTEREST_LABELS[i]}
            </Chip>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-4">
          <label htmlFor="price" className="shrink-0 text-sm font-semibold text-ink">
            Starting price up to{" "}
            <span className="text-ember">
              {maxPrice >= 20000 ? "any" : `$${maxPrice.toLocaleString()}`}
            </span>
          </label>
          <input
            id="price"
            type="range"
            min={1000}
            max={20000}
            step={500}
            value={maxPrice}
            onChange={(e) => setMaxPrice2(Number(e.target.value))}
            className="w-full max-w-xs accent-ember"
          />
        </div>
      </div>

      {/* Results */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-wider text-ink-soft">
          {filtered.length.toLocaleString()} camp{filtered.length === 1 ? "" : "s"}
        </p>
        <div className="flex gap-2">
          <Chip active={view === "grid"} onClick={() => setView("grid")}>▦ Grid</Chip>
          <Chip active={view === "map"} onClick={() => setView("map")}>🗺️ Map</Chip>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-ink/10 bg-white p-10 text-center text-ink-soft">
          Nothing matches those filters — try loosening one.
        </div>
      ) : view === "map" ? (
        <div className="isolate mt-4 h-[32rem] overflow-hidden rounded-2xl border border-ink/10 shadow-lift sm:h-[36rem]">
          <CampsMap camps={filtered} />
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((c) => (
              <CampCard key={c.slug} camp={c} />
            ))}
          </div>
          {filtered.length > shown.length && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="rounded-full border-2 border-pine px-8 py-3 font-semibold text-pine transition hover:bg-pine hover:text-cream"
              >
                Show {Math.min(PAGE_SIZE, filtered.length - shown.length)} more of {(filtered.length - shown.length).toLocaleString()}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
