"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SPECIALTIES } from "@/medical/pathologySchema";

type WeightedItem = { text: string; w?: number };
type CardBlockW = { title: string; items: WeightedItem[] };
type HowToDistinguish = { title: string; items: { title: string; bullets: string[] }[] };
type SpecialtyNote = { specialty: string; summary: string; keywords: string[] };
type Source = { label: string; detail?: string; url?: string };

type ImagingModalityBlock = {
  when_to_image: CardBlockW;
  main_findings: CardBlockW;
  supportive_findings: CardBlockW;
  complications: CardBlockW;
  pitfalls: CardBlockW;
  ddx: CardBlockW;
  how_to_distinguish: HowToDistinguish;
};

type SearchKeywords = {
  patient: string[];
  clinician: string[];
  radiology: string[];
};

type DiseaseLinks = {
  progression?: string[];
  risk_of?: string[];
  red_flag_for?: string[];
};

type Pathology = {
  id: string;
  title: string;
  summary: string;
  modalities: string[];

  core: {
    definition: CardBlockW;
    etiology: CardBlockW;
    risk_factors: CardBlockW;
    pathophysiology_short: string;
  };

  clinical: {
    symptoms: CardBlockW;
    exam: CardBlockW;
    red_flags: CardBlockW;
    scores: CardBlockW;
  };

  labs: {
    key_labs: CardBlockW;
    notes: CardBlockW;
  };

  imaging: {
    by_modality: Record<string, ImagingModalityBlock>;
  };

  management: {
    first_line: CardBlockW;
    when_to_escalate: CardBlockW;
    complication_management: CardBlockW;
    follow_up: CardBlockW;
  };

  specialties: SpecialtyNote[];
  sources: Source[];

  search_keywords?: SearchKeywords;
  disease_links?: DiseaseLinks;

  defaults?: { modality?: string; specialty?: string };
};

function safeArray<T>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

function normalizeModalityLabel(m: string) {
  const x = (m || "").trim().toUpperCase();
  if (x === "BT") return "CT";
  if (x === "MRG") return "MR";
  if (x === "US" || x === "USG") return "USG";
  return x || "CT";
}

function hasSpecialtyContent(s: SpecialtyNote) {
  return (s.summary && s.summary.trim().length > 0) || (Array.isArray(s.keywords) && s.keywords.length > 0);
}

function tokenize(q: string) {
  return q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function textIncludesAllTokens(text: string, tokens: string[]) {
  const s = (text || "").toLowerCase();
  return tokens.every((t) => s.includes(t));
}

function flattenWeightedBlocks(blocks: Array<CardBlockW | undefined | null>) {
  const out: Array<{ text: string; w: number; section: string }> = [];
  for (const b of blocks) {
    if (!b) continue;
    const items = safeArray<WeightedItem>(b.items);
    for (const it of items) {
      const w = typeof it.w === "number" && isFinite(it.w) ? it.w : 1;
      out.push({ text: it.text || "", w, section: b.title || "" });
    }
  }
  return out;
}

function computeRelevanceScore(pathology: Pathology, modality: string, query: string) {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return { score: 0, matches: 0, total: 0 };
  }

  const mod = pathology.imaging?.by_modality?.[modality];
  const pool = flattenWeightedBlocks([
    pathology.core?.definition,
    pathology.core?.etiology,
    pathology.core?.risk_factors,
    pathology.clinical?.symptoms,
    pathology.clinical?.exam,
    pathology.clinical?.red_flags,
    pathology.clinical?.scores,
    pathology.labs?.key_labs,
    pathology.labs?.notes,
    mod?.when_to_image,
    mod?.main_findings,
    mod?.supportive_findings,
    mod?.complications,
    mod?.pitfalls,
    mod?.ddx,
    pathology.management?.first_line,
    pathology.management?.when_to_escalate,
    pathology.management?.complication_management,
    pathology.management?.follow_up
  ]);

  const totalWeight = pool.reduce((a, x) => a + (x.w || 1), 0);
  let matchedWeight = 0;
  let matches = 0;

  for (const row of pool) {
    if (!row.text) continue;
    if (textIncludesAllTokens(row.text, tokens)) {
      matchedWeight += row.w || 1;
      matches += 1;
    }
  }

  const score = totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 0;
  return { score, matches, total: pool.length };
}

function computeSectionScores(pathology: Pathology, modality: string, query: string) {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return {
      sections: {
        clinical: { score: 0, hits: 0 },
        labs: { score: 0, hits: 0 },
        imaging: { score: 0, hits: 0 },
        management: { score: 0, hits: 0 }
      },
      top: [] as Array<{ text: string; section: string; w: number }>
    };
  }

  const mod = pathology.imaging?.by_modality?.[modality];

  const sectionPools: Record<string, Array<{ text: string; w: number; section: string }>> = {
    clinical: flattenWeightedBlocks([
      pathology.clinical?.symptoms,
      pathology.clinical?.exam,
      pathology.clinical?.red_flags,
      pathology.clinical?.scores
    ]),
    labs: flattenWeightedBlocks([pathology.labs?.key_labs, pathology.labs?.notes]),
    imaging: flattenWeightedBlocks([
      mod?.when_to_image,
      mod?.main_findings,
      mod?.supportive_findings,
      mod?.complications,
      mod?.ddx,
      mod?.pitfalls
    ]),
    management: flattenWeightedBlocks([
      pathology.management?.first_line,
      pathology.management?.when_to_escalate,
      pathology.management?.complication_management,
      pathology.management?.follow_up
    ])
  };

  const sections: Record<string, { score: number; hits: number }> = {};
  const hitsAll: Array<{ text: string; section: string; w: number }> = [];

  for (const [sec, pool] of Object.entries(sectionPools)) {
    const totalWeight = pool.reduce((a, x) => a + (x.w || 1), 0);
    let matchedWeight = 0;
    let hits = 0;

    for (const row of pool) {
      if (!row.text) continue;
      if (textIncludesAllTokens(row.text, tokens)) {
        matchedWeight += row.w || 1;
        hits += 1;
        hitsAll.push({ text: row.text, section: sec, w: row.w || 1 });
      }
    }

    const score = totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 0;
    sections[sec] = { score, hits };
  }

  hitsAll.sort((a, b) => b.w - a.w);
  const top = hitsAll.slice(0, 3);

  return { sections, top };
}

function Chip({
  label,
  active,
  disabled,
  onClick
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const base = "inline-flex items-center rounded-full border px-3 py-1 text-sm transition select-none";
  const activeCls = active ? "bg-black text-white border-black" : "bg-white text-black";
  const disabledCls = disabled ? "opacity-35 cursor-not-allowed" : "cursor-pointer hover:bg-muted";
  return (
    <span className={`${base} ${activeCls} ${disabledCls}`} onClick={disabled ? undefined : onClick}>
      {label}
    </span>
  );
}

function TagRow({ items }: { items: WeightedItem[] }) {
  const arr = safeArray<WeightedItem>(items);
  if (!arr.length) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {arr.map((t, i) => (
        <Badge key={i} variant="secondary" className="max-w-full whitespace-normal break-words leading-snug">
          {t.text}
        </Badge>
      ))}
    </div>
  );
}

function CardTags({ title, block }: { title: string; block: CardBlockW }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="break-words whitespace-pre-wrap">
        <TagRow items={block?.items || []} />
      </CardContent>
    </Card>
  );
}

function KeywordsTabs({ data }: { data?: SearchKeywords }) {
  const [tab, setTab] = useState<"patient" | "clinician" | "radiology">("patient");
  const list = data ? data[tab] || [] : [];
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Search Keyword Map</CardTitle>
          <div className="flex gap-2">
            <Chip label="Hasta" active={tab === "patient"} onClick={() => setTab("patient")} />
            <Chip label="Hekim" active={tab === "clinician"} onClick={() => setTab("clinician")} />
            <Chip label="Radyoloji" active={tab === "radiology"} onClick={() => setTab("radiology")} />
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Farklı kullanıcılar aynı hastalığa farklı jargonla ulaşabilir.
        </div>
      </CardHeader>
      <CardContent className="break-words whitespace-pre-wrap">
        {list.length ? (
          <div className="flex flex-wrap gap-2">
            {list.map((k, i) => (
              <Badge key={i} variant="secondary" className="max-w-full whitespace-normal break-words leading-snug">
                {k}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </CardContent>
    </Card>
  );
}

function DiseaseLinksCard({ links, onGo }: { links?: DiseaseLinks; onGo: (id: string) => void }) {
  const prog = safeArray<string>(links?.progression);
  const risk = safeArray<string>(links?.risk_of);
  const red = safeArray<string>(links?.red_flag_for);
  const hasAny = prog.length || risk.length || red.length;

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">İlişkili durumlar</CardTitle>
        <div className="text-xs text-muted-foreground mt-2">
          Akut → kronik süreç, komplikasyonlar ve red-flag ilişkileri.
        </div>
      </CardHeader>
      <CardContent className="space-y-4 break-words whitespace-pre-wrap">
        {!hasAny ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <>
            {prog.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">Progression</div>
                <div className="flex flex-wrap gap-2">
                  {prog.map((id) => (
                    <Chip key={id} label={id} onClick={() => onGo(id)} />
                  ))}
                </div>
              </div>
            )}

            {risk.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">Risk of</div>
                <div className="flex flex-wrap gap-2">
                  {risk.map((id) => (
                    <Chip key={id} label={id} onClick={() => onGo(id)} />
                  ))}
                </div>
              </div>
            )}

            {red.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">Red flag for</div>
                <div className="flex flex-wrap gap-2">
                  {red.map((id) => (
                    <Chip key={id} label={id} onClick={() => onGo(id)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function ClinicalAIClient({ pathology }: { pathology: Pathology | null }) {
  const router = useRouter();

  const [modality, setModality] = useState<string>("CT");
  const [specialty, setSpecialty] = useState<string>("radiology");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!pathology) return;
    const opts = safeArray<string>(pathology.modalities).map(normalizeModalityLabel);
    const def = pathology.defaults?.modality ? normalizeModalityLabel(pathology.defaults.modality) : opts[0] || "CT";
    setModality(opts.includes(def) ? def : opts[0] || "CT");
    setSpecialty(pathology.defaults?.specialty || "radiology");
    setSearch("");
  }, [pathology]);

  const modalityOptions = useMemo(() => {
    const m = safeArray<string>(pathology?.modalities).map(normalizeModalityLabel);
    return m.length ? m : ["USG", "CT", "MR"];
  }, [pathology]);

  const specialtyIndex = useMemo(() => {
    const map = new Map<string, SpecialtyNote>();
    safeArray<SpecialtyNote>(pathology?.specialties).forEach((s) => map.set(s.specialty, s));
    return map;
  }, [pathology]);

  const specialtySorted = useMemo(() => {
    const all = SPECIALTIES.map((sp) => {
      const note = specialtyIndex.get(sp.id) || { specialty: sp.id, summary: "", keywords: [] };
      return { ...sp, note };
    });

    const withContent = all.filter((x) => hasSpecialtyContent(x.note));
    const empty = all.filter((x) => !hasSpecialtyContent(x.note));

    withContent.sort((a, b) => a.label.localeCompare(b.label, "tr"));
    empty.sort((a, b) => a.label.localeCompare(b.label, "tr"));

    return { withContent, empty };
  }, [specialtyIndex]);

  const activeSpecialty = specialtyIndex.get(specialty) || { specialty, summary: "", keywords: [] };

  const modBlock = pathology?.imaging?.by_modality?.[modality];

  const matchInfo = useMemo(() => {
    if (!pathology) return { score: 0, matches: 0, total: 0 };
    return computeRelevanceScore(pathology, modality, search);
  }, [pathology, modality, search]);

  const sectionInfo = useMemo(() => {
    if (!pathology) {
      return {
        sections: {
          clinical: { score: 0, hits: 0 },
          labs: { score: 0, hits: 0 },
          imaging: { score: 0, hits: 0 },
          management: { score: 0, hits: 0 }
        },
        top: [] as Array<{ text: string; section: string; w: number }>
      };
    }
    return computeSectionScores(pathology, modality, search);
  }, [pathology, modality, search]);

  const onGo = (id: string) => {
    router.push(`/clinical-ai?id=${encodeURIComponent(id)}`);
  };

  if (!pathology) {
    return (
      <div className="p-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Yükleniyor…</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">Patoloji verisi henüz gelmedi.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-2xl font-semibold break-words">{pathology.title}</div>
          <div className="mt-1 text-sm text-zinc-500">
            A) Patoloji seç → B) Modalite/Branş → içerik (tag + kart)
          </div>
        </div>

        <div className="flex flex-col gap-2 md:items-end">
          <div className="flex items-center gap-2">
            <div className="text-xs text-zinc-500">ID</div>
            <div className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm font-semibold break-words">
              {pathology.id}
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
            <div className="text-sm font-semibold">
              Search{" "}
              {search.trim().length > 0 ? (
                <span className="font-bold">
                  ({matchInfo.matches}/{matchInfo.total || "—"})
                </span>
              ) : null}
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="bulgu / ddx / komplikasyon..."
              className="w-full md:w-[280px] rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm outline-none focus:border-black"
            />

            <div className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm whitespace-nowrap">
              <span className="text-zinc-500">Relevance</span>{" "}
              <span className="font-semibold">{search.trim() ? `${matchInfo.score}/100` : "—"}</span>
            </div>
          </div>

          {search.trim() ? (
            <div className="mt-1 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border px-3 py-1">
                Klinik <b>{sectionInfo.sections.clinical.score}</b>
              </span>
              <span className="rounded-full border px-3 py-1">
                Lab <b>{sectionInfo.sections.labs.score}</b>
              </span>
              <span className="rounded-full border px-3 py-1">
                Görüntüleme <b>{sectionInfo.sections.imaging.score}</b>
              </span>
              <span className="rounded-full border px-3 py-1">
                Yönetim <b>{sectionInfo.sections.management.score}</b>
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Main Layout */}
      <div className="mt-6 grid grid-cols-12 gap-6">
        {/* LEFT SIDEBAR */}
        <div className="col-span-12 md:col-span-4 space-y-6">
          {/* Specialty list */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Branş</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {specialtySorted.withContent.map((sp) => (
                  <Chip
                    key={sp.id}
                    label={sp.label}
                    active={sp.id === specialty}
                    onClick={() => setSpecialty(sp.id)}
                  />
                ))}
              </div>

              {specialtySorted.empty.length > 0 && (
                <>
                  <Separator />
                  <div className="text-xs text-muted-foreground">Diğer branşlar (şimdilik boş)</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {specialtySorted.empty.map((sp) => (
                      <Chip key={sp.id} label={sp.label} disabled />
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Specialty note */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base break-words">
                Branş notu: {SPECIALTIES.find((s) => s.id === specialty)?.label || specialty}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 break-words whitespace-pre-wrap">
              <div className="text-sm">
                {activeSpecialty.summary?.trim() ? (
                  <p className="break-words whitespace-pre-wrap">{activeSpecialty.summary}</p>
                ) : (
                  <p className="text-muted-foreground">Bu branş için henüz özel özet yok.</p>
                )}
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-2">Keyword (branş jargonu)</div>
                <div className="flex flex-wrap gap-2">
                  {activeSpecialty.keywords?.length ? (
                    activeSpecialty.keywords.map((k, i) => (
                      <Badge key={i} variant="secondary" className="max-w-full whitespace-normal break-words leading-snug">
                        {k}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Keyword map */}
          <KeywordsTabs data={pathology.search_keywords} />

          {/* Disease links */}
          <DiseaseLinksCard links={pathology.disease_links} onGo={onGo} />
        </div>

        {/* RIGHT MAIN */}
        <div className="col-span-12 md:col-span-8 space-y-6">
          {/* Summary */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Özet</CardTitle>
            </CardHeader>
            <CardContent className="text-sm break-words whitespace-pre-wrap">
              {pathology.summary?.trim() ? pathology.summary : <span className="text-muted-foreground">—</span>}

              {search.trim() ? (
                <div className="mt-4 rounded-xl border bg-white p-3">
                  <div className="text-xs text-muted-foreground mb-2">En güçlü eşleşmeler (Top 3)</div>
                  <div className="space-y-2">
                    {sectionInfo.top.length ? (
                      sectionInfo.top.map((x, i) => (
                        <div key={i} className="text-sm break-words whitespace-pre-wrap">
                          <span className="mr-2 rounded-full border px-2 py-0.5 text-xs">{x.section}</span>
                          <span className="font-medium">{x.text}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Core */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CardTags title="Tanım" block={pathology.core.definition} />
            <CardTags title="Etiyoloji" block={pathology.core.etiology} />
            <CardTags title="Risk faktörleri" block={pathology.core.risk_factors} />
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Patofizyoloji (kısa)</CardTitle>
              </CardHeader>
              <CardContent className="text-sm break-words whitespace-pre-wrap">
                {pathology.core.pathophysiology_short?.trim() ? (
                  pathology.core.pathophysiology_short
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Clinical */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CardTags title="Semptomlar" block={pathology.clinical.symptoms} />
            <CardTags title="Fizik muayene" block={pathology.clinical.exam} />
            <CardTags title="Acil kırmızı bayraklar" block={pathology.clinical.red_flags} />
            <CardTags title="Skor / sınıflama" block={pathology.clinical.scores} />
          </div>

          {/* Labs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CardTags title="Laboratuvar (key labs)" block={pathology.labs.key_labs} />
            <CardTags title="Laboratuvar notları" block={pathology.labs.notes} />
          </div>

          {/* Imaging */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-base">Görüntüleme</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {modalityOptions.map((m) => (
                    <Chip key={m} label={m} active={m === modality} onClick={() => setModality(m)} />
                  ))}
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Seçili modalite: <span className="font-semibold text-foreground">{modality}</span>
              </div>
            </CardHeader>

            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CardTags title="Endikasyon" block={modBlock?.when_to_image || { title: "Endikasyon", items: [] }} />
              <CardTags title="Ana bulgular" block={modBlock?.main_findings || { title: "Ana bulgular", items: [] }} />
              <CardTags
                title="Destekleyici bulgular"
                block={modBlock?.supportive_findings || { title: "Destekleyici bulgular", items: [] }}
              />
              <CardTags title="Komplikasyonlar" block={modBlock?.complications || { title: "Komplikasyonlar", items: [] }} />
              <CardTags title="DDx (Ayırıcı tanı)" block={modBlock?.ddx || { title: "DDx", items: [] }} />
              <CardTags title="Pitfalls / tuzaklar" block={modBlock?.pitfalls || { title: "Pitfalls", items: [] }} />

              <Card className="rounded-2xl md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base break-words">
                    {(modBlock?.how_to_distinguish?.title || "Nasıl ayırt ederiz?").trim()}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm break-words whitespace-pre-wrap">
                  {safeArray(modBlock?.how_to_distinguish?.items).length ? (
                    safeArray(modBlock?.how_to_distinguish?.items).map((it, idx) => (
                      <div key={idx}>
                        <div className="font-medium break-words">{it.title}</div>
                        <ul className="list-disc pl-5 text-muted-foreground">
                          {safeArray<string>(it.bullets).map((b, i) => (
                            <li key={i} className="break-words">
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          {/* Management */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CardTags title="İlk yaklaşım (first line)" block={pathology.management.first_line} />
            <CardTags title="Ne zaman escalate?" block={pathology.management.when_to_escalate} />
            <CardTags title="Komplikasyon yönetimi" block={pathology.management.complication_management} />
            <CardTags title="Takip / kontrol" block={pathology.management.follow_up} />
          </div>

          {/* Sources */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Kaynaklar</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2 break-words whitespace-pre-wrap">
              {safeArray<Source>(pathology.sources).length ? (
                safeArray<Source>(pathology.sources).map((s, i) => (
                  <div key={i} className="rounded-xl border p-3 break-words whitespace-pre-wrap">
                    <div className="font-medium break-words">
                      {s.url ? (
                        <a className="underline break-words" href={s.url} target="_blank" rel="noreferrer">
                          {s.label}
                        </a>
                      ) : (
                        s.label
                      )}
                    </div>
                    {s.detail ? <div className="text-muted-foreground mt-1 break-words">{s.detail}</div> : null}
                  </div>
                ))
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
