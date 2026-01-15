"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

/** =============================
 * Types
 * ============================= */

type StudyModality = "BT" | "MR" | "BT+MR";
type YesNo = "yok" | "var";
type Likelihood = "Yüksek" | "Orta" | "Düşük";

type TriState = "bilinmiyor" | "yok" | "var";

type BTContrastStatus = "kontrastsız" | "kontrastlı (tek faz)" | "dinamik (3 faz)";
type MRContrastStatus = "kontrastsız" | "dinamik gadolinyum var" | "hepatobiliyer faz var";

type DdxItem = {
  name: string;
  likelihood: Likelihood;
  why?: string[];
};

type Recommendation = {
  title: string;
  details?: string[];
  urgency?: "Acil" | "Öncelikli" | "Rutin";
};

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function bump(l: Likelihood, dir: "up" | "down"): Likelihood {
  if (dir === "up") {
    if (l === "Düşük") return "Orta";
    if (l === "Orta") return "Yüksek";
    return "Yüksek";
  }
  // down
  if (l === "Yüksek") return "Orta";
  if (l === "Orta") return "Düşük";
  return "Düşük";
}

/** =============================
 * DDX Engines
 * ============================= */

type LiverBTHypodenseFeatures = {
  sizeMm?: number;
  number?: "tek" | "çok";
  margins?: "düzgün" | "düzensiz";
  attenuation?: "saf sıvı densiteye yakın" | "hipodens (nonspesifik)" | "heterojen";
  enhancement?: "değerlendirilemedi" | "yok/çok az" | "periferik nodüler" | "arteryel hipervasküler" | "halka" | "heterojen";
  calcification?: boolean;
  fat?: boolean;
  air?: boolean;
  backgroundLiver?: "normal" | "steatoz" | "siroz/kronik karaciğer";
  knownPrimary?: boolean;
  feverOrSepsis?: boolean;
  trauma?: boolean;
  biliaryDilation?: boolean;

  // NEW: capsule-related morphology
  subcapsular?: boolean; // subcapsular location
  capsuleAppearance?: boolean; // capsule appearance / capsule-like rim
  capsularRetraction?: boolean; // capsular retraction
};

function liverHypodenseBT_Ddx(f: LiverBTHypodenseFeatures): DdxItem[] {
  const base: DdxItem[] = [
    { name: "Basit kist", likelihood: "Orta", why: ["BT’de hipodens odak için sık benign nedenlerden."] },
    { name: "Hemanjiyom", likelihood: "Orta", why: ["Sıklıkla insidental; dinamik patern belirleyicidir."] },
    { name: "Metastaz", likelihood: "Orta", why: ["Çoklu lezyon / bilinen primer varsa önem kazanır."] },
    { name: "Hepatoselüler karsinom (HCC)", likelihood: "Düşük", why: ["Siroz zemininde olasılık artar; dinamik paterne bakılır."] },
    { name: "İntrahepatik kolanjiokarsinom (ICC)", likelihood: "Düşük", why: ["Kapsüler çekinti / fibrotik yapı ile ilişki olabilir; dinamik/MR ile netleşir."] },
    { name: "Epitheloid hemanjiyoendotelyoma (HEHE)", likelihood: "Düşük", why: ["Sıklıkla subkapsüler/multifokal olabilir; kapsüler çekinti görülebilir."] },
    { name: "FNH / Adenom", likelihood: "Düşük", why: ["Dinamik yoksa ayrım sınırlı; ek sekanslar değerlidir."] },
    { name: "Apse / mikroapseler", likelihood: "Düşük", why: ["Klinik ateş/sepsis varlığında öncelik kazanır."] },
  ];

  let ddx = [...base];

  // Trauma
  if (f.trauma) {
    ddx.unshift({
      name: "Kontüzyon / laserasyon",
      likelihood: "Yüksek",
      why: ["Travma öyküsü varsa hipodens parankimal alan kontüzyon/laserasyon lehine olabilir."],
    });
  }

  // Fever / sepsis
  if (f.feverOrSepsis) {
    ddx = ddx.map((d) =>
      d.name.toLowerCase().includes("apse")
        ? { ...d, likelihood: "Yüksek", why: uniq([...(d.why ?? []), "Ateş/sepsis ile uyumlu klinikte öncelikli."]) }
        : d
    );
    ddx.unshift({
      name: "Pyojenik apse",
      likelihood: "Orta",
      why: ["Ateş, lökositoz, CRP yüksekliği gibi klinik bulgularla korele."],
    });
  }

  // Multiplicity
  if (f.number === "çok") {
    ddx = ddx.map((d) => {
      if (d.name === "Metastaz") return { ...d, likelihood: "Yüksek", why: uniq([...(d.why ?? []), "Çoklu lezyon metastaz lehine."]) };
      if (d.name.includes("Apse")) return { ...d, likelihood: f.feverOrSepsis ? "Yüksek" : "Orta" };
      if (d.name.includes("HEHE")) return { ...d, likelihood: bump(d.likelihood, "up"), why: uniq([...(d.why ?? []), "Multifokal/subkapsüler dağılım ile görülebilir."]) };
      return d;
    });
  }

  // Known primary
  if (f.knownPrimary) {
    ddx = ddx.map((d) =>
      d.name === "Metastaz" ? { ...d, likelihood: "Yüksek", why: uniq([...(d.why ?? []), "Bilinen primer malignite varlığı."]) } : d
    );
  }

  // Cirrhosis
  if (f.backgroundLiver === "siroz/kronik karaciğer") {
    ddx = ddx.map((d) =>
      d.name.includes("HCC") ? { ...d, likelihood: bump(d.likelihood, "up"), why: uniq([...(d.why ?? []), "Siroz zemininde HCC olasılığı artar."]) } : d
    );
  }

  // Cyst-like
  if (f.attenuation === "saf sıvı densiteye yakın" && f.margins === "düzgün" && (f.enhancement === "yok/çok az" || f.enhancement === "değerlendirilemedi")) {
    ddx = ddx.map((d) =>
      d.name === "Basit kist" ? { ...d, likelihood: "Yüksek", why: uniq([...(d.why ?? []), "Sıvı densitesi + düzgün kontur kist lehine."]) } : d
    );
  }

  // Enhancement patterns
  if (f.enhancement === "periferik nodüler") {
    ddx = ddx.map((d) =>
      d.name === "Hemanjiyom" ? { ...d, likelihood: "Yüksek", why: uniq([...(d.why ?? []), "Periferik nodüler kontrastlanma hemanjiyom için tipik."]) } : d
    );
  }

  if (f.enhancement === "arteryel hipervasküler") {
    ddx.unshift({
      name: "Hipervasküler metastaz",
      likelihood: "Orta",
      why: ["Arteriyel hipervaskülarite hipervasküler metastaz/HCC gibi lezyonları düşündürür."],
    });
    ddx = ddx.map((d) => (d.name.includes("HCC") ? { ...d, likelihood: f.backgroundLiver === "siroz/kronik karaciğer" ? "Yüksek" : "Orta" } : d));
  }

  if (f.enhancement === "halka") {
    ddx.unshift({
      name: "Nekrotik metastaz",
      likelihood: "Orta",
      why: ["Halka tarzı tutulum nekrotik metastaz / apse ile ayırıcı tanıda."],
    });
    if (f.feverOrSepsis) {
      ddx.unshift({
        name: "Apse (halka tutulum)",
        likelihood: "Yüksek",
        why: ["Klinik enfeksiyon bulguları varsa halka tutulumlu lezyon apse lehine güçlenir."],
      });
    }
  }

  if (f.calcification) {
    ddx.unshift({
      name: "Kalsifiye metastaz / mukinöz tümör metastazı",
      likelihood: "Orta",
      why: ["Lezyon içi kalsifikasyon belirli metastaz tiplerinde görülebilir."],
    });
  }

  if (f.air) {
    ddx.unshift({
      name: "Gaz içeren apse",
      likelihood: "Yüksek",
      why: ["Lezyon içinde hava/gaz görülmesi apse lehine güçlü bulgudur."],
    });
  }

  /** ===== NEW: Capsule-related morphology logic =====
   * Bu üç değişken özellikle fibrotik komponentli lezyonlarda ve subkapsüler dağılımda yardımcı olur.
   * - subkapsüler + kapsüler çekinti: HEHE / ICC / metastaz (fibrotik) lehine
   * - kapsül görünümü (capsule appearance): HCC (özellikle sirozda), ICC ve bazı metastazlarda görülebilir
   */
  const sub = !!f.subcapsular;
  const cap = !!f.capsuleAppearance;
  const retr = !!f.capsularRetraction;

  if (sub) {
    ddx = ddx.map((d) => {
      if (d.name.includes("HEHE")) return { ...d, likelihood: bump(d.likelihood, "up"), why: uniq([...(d.why ?? []), "Subkapsüler yerleşim HEHE’de sık bildirilen bir patern olabilir."]) };
      if (d.name.includes("ICC")) return { ...d, likelihood: bump(d.likelihood, "up"), why: uniq([...(d.why ?? []), "Subkapsüler yerleşimli fibrotik lezyonlarda ICC düşünülür."]) };
      if (d.name === "Metastaz") return { ...d, likelihood: bump(d.likelihood, "up"), why: uniq([...(d.why ?? []), "Subkapsüler yerleşim metastatik odaklarda da görülebilir."]) };
      return d;
    });
  }

  if (retr) {
    ddx = ddx.map((d) => {
      if (d.name.includes("HEHE")) return { ...d, likelihood: bump(d.likelihood, "up"), why: uniq([...(d.why ?? []), "Kapsüler çekinti HEHE’de tarif edilebilir."]) };
      if (d.name.includes("ICC")) return { ...d, likelihood: bump(d.likelihood, "up"), why: uniq([...(d.why ?? []), "Kapsüler çekinti ICC lehine fibrotik stroma ile ilişkili olabilir."]) };
      if (d.name === "Metastaz") return { ...d, likelihood: bump(d.likelihood, "up"), why: uniq([...(d.why ?? []), "Bazı metastazlarda fibrozis ile kapsüler çekinti görülebilir."]) };
      if (d.name.includes("Hemanjiyom") || d.name.includes("Basit kist"))
        return { ...d, likelihood: bump(d.likelihood, "down"), why: uniq([...(d.why ?? []), "Kapsüler çekinti basit kist/hemanjiyom için tipik değildir."]) };
      return d;
    });
  }

  if (cap) {
    ddx = ddx.map((d) => {
      if (d.name.includes("HCC")) {
        return {
          ...d,
          likelihood: bump(d.likelihood, "up"),
          why: uniq([...(d.why ?? []), "Kapsül görünümü (pseudo-kapsül) HCC’de görülebilir (özellikle siroz zemininde)."]),
        };
      }
      if (d.name.includes("ICC")) return { ...d, likelihood: bump(d.likelihood, "up"), why: uniq([...(d.why ?? []), "Kapsül benzeri rim/fibrotik komponent ICC’de görülebilir."]) };
      if (d.name === "Metastaz") return { ...d, likelihood: bump(d.likelihood, "up"), why: uniq([...(d.why ?? []), "Bazı metastazlarda periferik rim/kapsül benzeri görünüm olabilir."]) };
      return d;
    });
  }

  // De-duplicate
  const seen = new Set<string>();
  const out: DdxItem[] = [];
  for (const item of ddx) {
    const key = item.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

type LiverMRSignalCombo = {
  t1: "hipo" | "izo" | "hiper" | "bilinmiyor";
  t2: "hipo" | "izo" | "hiper" | "bilinmiyor";
  dwi: "restriksiyon var" | "restriksiyon yok" | "bilinmiyor";
  adc: "düşük" | "normal/yüksek" | "bilinmiyor";
  inOut: "yağ var (signal drop)" | "yağ yok" | "bilinmiyor";
  hemorrhageOrProtein?: boolean;
  backgroundLiver?: "normal" | "steatoz" | "siroz/kronik karaciğer";
  knownPrimary?: boolean;

  // NEW: MR contrast availability (baseline ddx + recommendation gating)
  mrContrastStatus?: MRContrastStatus;

  // Optional morphology
  subcapsular?: boolean;
  capsularRetraction?: boolean;
  capsuleAppearance?: boolean;
};

function liverMR_BaselineDdx(s: LiverMRSignalCombo): DdxItem[] {
  const ddx: DdxItem[] = [];

  ddx.push(
    { name: "Basit kist", likelihood: "Orta", why: ["T2 hiper ve DWI restriksiyon yoksa kist lehine güçlenir."] },
    { name: "Hemanjiyom", likelihood: "Orta", why: ["Genellikle T2 belirgin hiperintens; restriksiyon tipik değil."] },
    { name: "Metastaz", likelihood: "Orta", why: ["DWI/ADC ve klinik bağlamla değerlendirilir; çoklu olabilir."] },
    { name: "HCC", likelihood: "Düşük", why: ["Siroz zemininde öncelik kazanır; dinamik patern değerlidir."] },
    { name: "ICC", likelihood: "Düşük", why: ["Fibrotik lezyonlarda düşünülebilir; dinamik/hepatobiliyer faz yardımcıdır."] },
    { name: "FNH / Adenom", likelihood: "Düşük", why: ["T1/T2 + yağ/hemoraji bulguları ile ayrım; dinamik yoksa sınırlı."] }
  );

  const hasRestriction = s.dwi === "restriksiyon var" || s.adc === "düşük";
  const noRestriction = s.dwi === "restriksiyon yok" || s.adc === "normal/yüksek";

  if (s.t2 === "hiper" && noRestriction) {
    ddx.unshift({
      name: "Basit kist / kistik lezyon",
      likelihood: "Yüksek",
      why: ["T2 hiper + restriksiyon yok → kistik içerik lehine.", s.t1 === "hipo" ? "T1 hipointensite kisti destekler." : "T1 bulgusu ile korele."],
    });
    ddx.unshift({
      name: "Hemanjiyom (özellikle T2 belirgin hiperintens)",
      likelihood: "Orta",
      why: ["T2 belirgin hiperintensite hemanjiyomda sık.", "Dinamik kontrast paterni tanısaldır (varsa)."],
    });
  }

  if (hasRestriction) {
    ddx.unshift({
      name: "Metastaz (restriksiyon gösterebilir)",
      likelihood: s.knownPrimary ? "Yüksek" : "Orta",
      why: ["DWI restriksiyon / ADC düşükliği malignite lehine olabilir.", s.knownPrimary ? "Bilinen primer malignite ile olasılık artar." : "Klinik ve dağılım ile değerlendirilir."],
    });
    ddx.unshift({
      name: "Apse / enfekte lezyon",
      likelihood: "Orta",
      why: ["DWI restriksiyon apse lehine de olabilir; klinik ile korele."],
    });
  }

  if (s.t1 === "hiper") {
    if (s.inOut === "yağ var (signal drop)") {
      ddx.unshift({
        name: "Adenom (intralezyonel yağ olası)",
        likelihood: "Orta",
        why: ["In/Out-phase sinyal düşüşü yağ lehine.", "Adenomlarda yağ ve/veya hemoraji görülebilir."],
      });
    }
    if (s.hemorrhageOrProtein) {
      ddx.unshift({
        name: "Hemorajik / proteinöz içerikli lezyon",
        likelihood: "Orta",
        why: ["T1 hiperintensite hemoraji/proteinöz içerikte görülebilir."],
      });
    }
  }

  if (s.backgroundLiver === "siroz/kronik karaciğer") {
    ddx.unshift({
      name: "HCC (siroz zemininde)",
      likelihood: "Orta",
      why: ["Siroz zemininde HCC olasılığı artar.", "Dinamik + hepatobiliyer faz (varsa) tanısal katkı sağlar."],
    });
  }

  // NEW: MR morphology (subcapsular/capsular retraction/capsule appearance)
  if (s.subcapsular) {
    ddx.unshift({ name: "HEHE (subkapsüler dağılım)", likelihood: "Orta", why: ["Subkapsüler yerleşim/multifokal dağılım HEHE’de tarif edilebilir.", "Dinamik + DWI ile korele."] });
  }
  if (s.capsularRetraction) {
    ddx = ddx.map((d) => {
      if (d.name.includes("ICC")) return { ...d, likelihood: bump(d.likelihood, "up"), why: uniq([...(d.why ?? []), "Kapsüler çekinti ICC lehine olabilir (fibrotik komponent)."]) };
      if (d.name.includes("HCC")) return { ...d, likelihood: bump(d.likelihood, "down"), why: uniq([...(d.why ?? []), "Kapsüler çekinti HCC için daha az tipik; diğer fibrotik lezyonlar düşünülür."]) };
      return d;
    });
  }
  if (s.capsuleAppearance) {
    ddx = ddx.map((d) => {
      if (d.name.includes("HCC")) return { ...d, likelihood: bump(d.likelihood, "up"), why: uniq([...(d.why ?? []), "Pseudo-kapsül görünümü HCC’de görülebilir."]) };
      return d;
    });
  }

  // De-duplicate
  const seen = new Set<string>();
  const out: DdxItem[] = [];
  for (const item of ddx) {
    const key = item.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** =============================
 * Report language filtering
 * ============================= */

type OrganFinding = {
  organ: "Karaciğer" | "Safra kesesi" | "Safra yolları";
  status: YesNo;
  summary?: string;
  ddx?: DdxItem[];
};

function buildFinalReportSentence(opts: {
  modality: StudyModality;
  organs: OrganFinding[];
  incidental: string;
  style: "Kısa" | "Detaylı";
  includeProbabilityLanguage: boolean;
  includeRecommendationsLanguage: boolean;
  recommendations: Recommendation[];
}): string {
  const { modality, organs, incidental, style, includeProbabilityLanguage, includeRecommendationsLanguage, recommendations } = opts;

  const pathologic = organs.filter((o) => o.status === "var" && (o.summary?.trim() || o.ddx?.length));
  const parts: string[] = [];

  if (pathologic.length === 0) {
    parts.push(`${modality} incelemede belirgin akut patoloji izlenmemektedir.`);
  } else {
    for (const o of pathologic) {
      const organPart: string[] = [];
      organPart.push(`${o.organ}: ${o.summary?.trim() || "Patolojik bulgu mevcuttur."}`);

      if (includeProbabilityLanguage && o.ddx && o.ddx.length) {
        const high = o.ddx.filter((d) => d.likelihood === "Yüksek").map((d) => d.name);
        const mid = o.ddx.filter((d) => d.likelihood === "Orta").map((d) => d.name);
        const low = o.ddx.filter((d) => d.likelihood === "Düşük").map((d) => d.name);

        const ddxBits: string[] = [];
        if (high.length) ddxBits.push(`Öncelikle ${high.join(", ")}`);
        if (mid.length) ddxBits.push(`ayırıcıda ${mid.join(", ")}`);
        if (style === "Detaylı" && low.length) ddxBits.push(`daha düşük olasılıkla ${low.join(", ")}`);

        if (ddxBits.length) organPart.push(ddxBits.join("; ") + ".");
      }

      parts.push(organPart.join(" "));
    }
  }

  if (incidental.trim()) parts.push(`Ek/İnsidental: ${incidental.trim()}`);

  if (includeRecommendationsLanguage && recommendations.length) {
    const sorted = [...recommendations].sort((a, b) => {
      const rank = (u?: Recommendation["urgency"]) => (u === "Acil" ? 0 : u === "Öncelikli" ? 1 : 2);
      return rank(a.urgency) - rank(b.urgency);
    });

    const recText = sorted
      .map((r) => {
        const pref = r.urgency ? `${r.urgency}: ` : "";
        const details = r.details?.length ? ` (${r.details.join("; ")})` : "";
        return `${pref}${r.title}${details}`;
      })
      .join(" | ");

    parts.push(`Öneri: ${recText}`);
  }

  let out = parts.join(" ").replace(/\s+/g, " ").trim();
  if (!/[.!?]$/.test(out)) out += ".";
  return out;
}

/** =============================
 * Presets
 * ============================= */

type LiverPresetId =
  | "BT_HYPO_BASE"
  | "BT_CYST_LIKE"
  | "BT_PERIPH_NOD_HEM"
  | "BT_RING_ENH"
  | "BT_HYPERVASC"
  | "MR_T2BRIGHT_NORES"
  | "MR_RESTRICT"
  | "MR_T1BRIGHT_FATDROP"
  | "MR_T1BRIGHT_PROTEIN";

const liverPresets: Array<{ id: LiverPresetId; title: string; hint: string }> = [
  { id: "BT_HYPO_BASE", title: "BT • Hipodens (nonspesifik)", hint: "Baz hipodens preset (DDX boş kalmaz)." },
  { id: "BT_CYST_LIKE", title: "BT • Kist-benzeri", hint: "Sıvı densitesi + düzgün kontur + minimal/yok tutulum." },
  { id: "BT_PERIPH_NOD_HEM", title: "BT • Hemanjiyom paterni", hint: "Periferik nodüler tutulum." },
  { id: "BT_RING_ENH", title: "BT • Halka tutulum", hint: "Nekrotik metastaz/apse ddx’i yükseltir." },
  { id: "BT_HYPERVASC", title: "BT • Arteriyel hipervasküler", hint: "HCC/hipervasküler metastaz ddx’i yükseltir." },
  { id: "MR_T2BRIGHT_NORES", title: "MR • T2 parlak + restriksiyon yok", hint: "Kist/hemanjiyom ağırlıklı baz ddx." },
  { id: "MR_RESTRICT", title: "MR • Restriksiyon/ADC düşük", hint: "Metastaz/apse ddx’i yükseltir." },
  { id: "MR_T1BRIGHT_FATDROP", title: "MR • T1 hiper + yağ drop", hint: "Adenom/yağ içeren lezyon ddx." },
  { id: "MR_T1BRIGHT_PROTEIN", title: "MR • T1 hiper (protein/hemoraji)", hint: "Proteinöz/hemorajik içerik ddx." },
];

const liverSegments = ["I", "II", "III", "IVa", "IVb", "V", "VI", "VII", "VIII"] as const;
type LiverSegment = (typeof liverSegments)[number];

function numOrUndef(s: string) {
  const x = Number(String(s).replace(",", "."));
  return Number.isFinite(x) ? x : undefined;
}

function makeLiverSummary(opts: {
  modality: StudyModality;
  segment?: LiverSegment;
  sizeMm?: number;
  lesionLabel?: string;
  extra?: string;
}) {
  const seg = opts.segment ? `Segment ${opts.segment}` : "Karaciğer parankiminde";
  const size = opts.sizeMm ? `${Math.round(opts.sizeMm)} mm` : "ölçümü";
  const label = opts.lesionLabel ?? "fokal lezyon";
  const extra = opts.extra?.trim() ? ` ${opts.extra.trim()}` : "";
  return `${seg} düzeyinde yaklaşık ${size} ${label} izlenmektedir.${extra}`.replace(/\s+/g, " ").trim();
}

/** =============================
 * Small UI helpers
 * ============================= */

function triButtons(value: TriState, setValue: (v: TriState) => void) {
  const items: Array<{ v: TriState; t: string }> = [
    { v: "bilinmiyor", t: "Bilinmiyor" },
    { v: "yok", t: "Yok" },
    { v: "var", t: "Var" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((x) => (
        <Button key={x.v} size="sm" variant={value === x.v ? "default" : "outline"} onClick={() => setValue(x.v)}>
          {x.t}
        </Button>
      ))}
    </div>
  );
}

export default function Page() {
  const [modality, setModality] = useState<StudyModality>("BT");

  const [liverStatus, setLiverStatus] = useState<YesNo>("yok");
  const [gbStatus, setGbStatus] = useState<YesNo>("yok");
  const [bileDuctStatus, setBileDuctStatus] = useState<YesNo>("yok");

  const [incidental, setIncidental] = useState<string>("");

  const [style, setStyle] = useState<"Kısa" | "Detaylı">("Kısa");
  const [includeProbLang, setIncludeProbLang] = useState(true);
  const [includeRecLang, setIncludeRecLang] = useState(true);

  // Segment + unified size
  const [liverSegment, setLiverSegment] = useState<LiverSegment | "bilinmiyor">("bilinmiyor");
  const [liverSizeMm, setLiverSizeMm] = useState<string>("");

  // Presets + auto-summary behavior
  const [liverPreset, setLiverPreset] = useState<LiverPresetId | "">("");
  const [autoFillSummary, setAutoFillSummary] = useState(true);
  const [liverSummaryTouched, setLiverSummaryTouched] = useState(false);

  // NEW: Contrast status
  const [btContrastStatus, setBtContrastStatus] = useState<BTContrastStatus>("kontrastsız");
  const [mrContrastStatus, setMrContrastStatus] = useState<MRContrastStatus>("kontrastsız");

  // Liver BT features
  const [liverBtNumber, setLiverBtNumber] = useState<LiverBTHypodenseFeatures["number"]>("tek");
  const [liverBtMargins, setLiverBtMargins] = useState<LiverBTHypodenseFeatures["margins"]>("düzgün");
  const [liverBtAtt, setLiverBtAtt] = useState<LiverBTHypodenseFeatures["attenuation"]>("hipodens (nonspesifik)");
  const [liverBtEnh, setLiverBtEnh] = useState<LiverBTHypodenseFeatures["enhancement"]>("değerlendirilemedi");
  const [liverBtCalc, setLiverBtCalc] = useState(false);
  const [liverBtFat, setLiverBtFat] = useState(false);
  const [liverBtAir, setLiverBtAir] = useState(false);
  const [liverBtBg, setLiverBtBg] = useState<LiverBTHypodenseFeatures["backgroundLiver"]>("normal");
  const [liverBtKnownPrimary, setLiverBtKnownPrimary] = useState(false);
  const [liverBtFever, setLiverBtFever] = useState(false);
  const [liverBtTrauma, setLiverBtTrauma] = useState(false);
  const [liverBtBileDil, setLiverBtBileDil] = useState(false);

  // NEW: capsule related toggles (used by BOTH BT+MR ddx)
  const [subcapsular, setSubcapsular] = useState<TriState>("bilinmiyor");
  const [capsuleAppearance, setCapsuleAppearance] = useState<TriState>("bilinmiyor");
  const [capsularRetraction, setCapsularRetraction] = useState<TriState>("bilinmiyor");

  // Liver MR combos
  const [mrT1, setMrT1] = useState<LiverMRSignalCombo["t1"]>("bilinmiyor");
  const [mrT2, setMrT2] = useState<LiverMRSignalCombo["t2"]>("bilinmiyor");
  const [mrDwi, setMrDwi] = useState<LiverMRSignalCombo["dwi"]>("bilinmiyor");
  const [mrAdc, setMrAdc] = useState<LiverMRSignalCombo["adc"]>("bilinmiyor");
  const [mrInOut, setMrInOut] = useState<LiverMRSignalCombo["inOut"]>("bilinmiyor");
  const [mrHemProt, setMrHemProt] = useState(false);
  const [mrBg, setMrBg] = useState<LiverMRSignalCombo["backgroundLiver"]>("normal");
  const [mrKnownPrimary, setMrKnownPrimary] = useState(false);

  // Free-text summaries
  const [liverSummary, setLiverSummary] = useState<string>("");
  const [gbSummary, setGbSummary] = useState<string>("");
  const [bileDuctSummary, setBileDuctSummary] = useState<string>("");

  const [recs, setRecs] = useState<Recommendation[]>([]);

  const showBT = modality === "BT" || modality === "BT+MR";
  const showMR = modality === "MR" || modality === "BT+MR";

  /** If BT is contrastless → enhancement pattern is not meaningful */
  useEffect(() => {
    if (btContrastStatus === "kontrastsız") {
      setLiverBtEnh("değerlendirilemedi");
    }
  }, [btContrastStatus]);

  /** Keep modality consistent with tabs */
  useEffect(() => {
    if (modality === "BT") {
      setMrContrastStatus("kontrastsız");
    }
    if (modality === "MR") {
      setBtContrastStatus("kontrastsız");
      setLiverBtEnh("değerlendirilemedi");
    }
  }, [modality]);

  /** =============================
   * Preset apply
   * ============================= */
  function applyPreset(id: LiverPresetId) {
    setLiverPreset(id);

    if (autoFillSummary) setLiverSummaryTouched(false);

    // ensure liver is on
    setLiverStatus("var");

    // BT presets
    if (id.startsWith("BT_")) {
      if (modality === "MR") setModality("BT+MR");
      setBtContrastStatus("kontrastsız"); // default; user can set later
      setLiverBtNumber("tek");
      setLiverBtMargins("düzgün");
      setLiverBtCalc(false);
      setLiverBtFat(false);
      setLiverBtAir(false);
      setLiverBtFever(false);
      setLiverBtTrauma(false);

      if (id === "BT_HYPO_BASE") {
        setLiverBtAtt("hipodens (nonspesifik)");
        setLiverBtEnh("değerlendirilemedi");
      }
      if (id === "BT_CYST_LIKE") {
        setLiverBtAtt("saf sıvı densiteye yakın");
        setLiverBtEnh("yok/çok az");
        setLiverBtMargins("düzgün");
      }
      if (id === "BT_PERIPH_NOD_HEM") {
        setBtContrastStatus("dinamik (3 faz)");
        setLiverBtAtt("hipodens (nonspesifik)");
        setLiverBtEnh("periferik nodüler");
      }
      if (id === "BT_RING_ENH") {
        setBtContrastStatus("dinamik (3 faz)");
        setLiverBtAtt("hipodens (nonspesifik)");
        setLiverBtEnh("halka");
      }
      if (id === "BT_HYPERVASC") {
        setBtContrastStatus("dinamik (3 faz)");
        setLiverBtAtt("hipodens (nonspesifik)");
        setLiverBtEnh("arteryel hipervasküler");
      }
    }

    // MR presets
    if (id.startsWith("MR_")) {
      if (modality === "BT") setModality("BT+MR");
      setMrContrastStatus("kontrastsız");

      setMrT1("bilinmiyor");
      setMrT2("bilinmiyor");
      setMrDwi("bilinmiyor");
      setMrAdc("bilinmiyor");
      setMrInOut("bilinmiyor");
      setMrHemProt(false);

      if (id === "MR_T2BRIGHT_NORES") {
        setMrT2("hiper");
        setMrT1("hipo");
        setMrDwi("restriksiyon yok");
        setMrAdc("normal/yüksek");
      }
      if (id === "MR_RESTRICT") {
        setMrDwi("restriksiyon var");
        setMrAdc("düşük");
      }
      if (id === "MR_T1BRIGHT_FATDROP") {
        setMrT1("hiper");
        setMrInOut("yağ var (signal drop)");
        setMrT2("izo");
      }
      if (id === "MR_T1BRIGHT_PROTEIN") {
        setMrT1("hiper");
        setMrHemProt(true);
        setMrT2("izo");
      }
    }

    // Auto summary
    if (autoFillSummary) {
      const size = numOrUndef(liverSizeMm);
      const seg = liverSegment === "bilinmiyor" ? undefined : liverSegment;

      let label = "fokal lezyon";
      let extra = "";

      if (id === "BT_HYPO_BASE") label = "hipodens fokal lezyon";
      if (id === "BT_CYST_LIKE") label = "kist ile uyumlu hipodens lezyon";
      if (id === "BT_PERIPH_NOD_HEM") label = "hemanjiyom lehine lezyon";
      if (id === "BT_RING_ENH") label = "halka tarzı kontrastlanan lezyon";
      if (id === "BT_HYPERVASC") label = "arteriyel hipervasküler lezyon";

      if (id === "MR_T2BRIGHT_NORES") label = "T2 belirgin hiperintens (kistik/hemanjiyom lehine) lezyon";
      if (id === "MR_RESTRICT") label = "DWI restriksiyon gösteren lezyon";
      if (id === "MR_T1BRIGHT_FATDROP") label = "T1 hiperintens ve yağ içeriği gösteren lezyon";
      if (id === "MR_T1BRIGHT_PROTEIN") label = "T1 hiperintens (protein/hemoraji olası) lezyon";

      if (liverBtKnownPrimary || mrKnownPrimary) extra = "Bilinen malignite öyküsü ile korelasyon önerilir.";
      if (liverBtFever) extra = "Klinik enfeksiyon bulguları ile korele ediniz.";

      setLiverSummary(
        makeLiverSummary({
          modality,
          segment: seg,
          sizeMm: size,
          lesionLabel: label,
          extra,
        })
      );
    }
  }

  /** Auto-update summary */
  useEffect(() => {
    if (liverStatus !== "var") return;
    if (!autoFillSummary) return;
    if (liverSummaryTouched) return;

    const size = numOrUndef(liverSizeMm);
    const seg = liverSegment === "bilinmiyor" ? undefined : liverSegment;

    let label = "fokal lezyon";
    if (liverPreset) {
      const id = liverPreset;
      if (id === "BT_HYPO_BASE") label = "hipodens fokal lezyon";
      if (id === "BT_CYST_LIKE") label = "kist ile uyumlu hipodens lezyon";
      if (id === "BT_PERIPH_NOD_HEM") label = "hemanjiyom lehine lezyon";
      if (id === "BT_RING_ENH") label = "halka tarzı kontrastlanan lezyon";
      if (id === "BT_HYPERVASC") label = "arteriyel hipervasküler lezyon";
      if (id === "MR_T2BRIGHT_NORES") label = "T2 belirgin hiperintens (kistik/hemanjiyom lehine) lezyon";
      if (id === "MR_RESTRICT") label = "DWI restriksiyon gösteren lezyon";
      if (id === "MR_T1BRIGHT_FATDROP") label = "T1 hiperintens ve yağ içeriği gösteren lezyon";
      if (id === "MR_T1BRIGHT_PROTEIN") label = "T1 hiperintens (protein/hemoraji olası) lezyon";
    } else {
      if (showMR) label = "MR’de izlenen fokal lezyon";
      else label = "hipodens fokal lezyon";
    }

    setLiverSummary(
      makeLiverSummary({
        modality,
        segment: seg,
        sizeMm: size,
        lesionLabel: label,
      })
    );
  }, [liverSegment, liverSizeMm, autoFillSummary, liverSummaryTouched, liverStatus, liverPreset, modality, showMR]);

  /** DDX */
  const liverDdx = useMemo(() => {
    if (liverStatus !== "var") return [] as DdxItem[];

    const sub = subcapsular === "var";
    const cap = capsuleAppearance === "var";
    const retr = capsularRetraction === "var";

    // Prefer MR ddx if MR is selected
    if (showMR) {
      const combo: LiverMRSignalCombo = {
        t1: mrT1,
        t2: mrT2,
        dwi: mrDwi,
        adc: mrAdc,
        inOut: mrInOut,
        hemorrhageOrProtein: mrHemProt,
        backgroundLiver: mrBg,
        knownPrimary: mrKnownPrimary,
        mrContrastStatus,
        subcapsular: sub,
        capsuleAppearance: cap,
        capsularRetraction: retr,
      };
      return liverMR_BaselineDdx(combo);
    }

    // Otherwise BT ddx
    const sizeNum = numOrUndef(liverSizeMm);
    const features: LiverBTHypodenseFeatures = {
      sizeMm: sizeNum,
      number: liverBtNumber,
      margins: liverBtMargins,
      attenuation: liverBtAtt,
      enhancement: liverBtEnh,
      calcification: liverBtCalc,
      fat: liverBtFat,
      air: liverBtAir,
      backgroundLiver: liverBtBg,
      knownPrimary: liverBtKnownPrimary,
      feverOrSepsis: liverBtFever,
      trauma: liverBtTrauma,
      biliaryDilation: liverBtBileDil,
      subcapsular: sub,
      capsuleAppearance: cap,
      capsularRetraction: retr,
    };
    return liverHypodenseBT_Ddx(features);
  }, [
    liverStatus,
    showMR,
    liverSizeMm,
    mrT1,
    mrT2,
    mrDwi,
    mrAdc,
    mrInOut,
    mrHemProt,
    mrBg,
    mrKnownPrimary,
    mrContrastStatus,
    liverBtNumber,
    liverBtMargins,
    liverBtAtt,
    liverBtEnh,
    liverBtCalc,
    liverBtFat,
    liverBtAir,
    liverBtBg,
    liverBtKnownPrimary,
    liverBtFever,
    liverBtTrauma,
    liverBtBileDil,
    subcapsular,
    capsuleAppearance,
    capsularRetraction,
  ]);

  /** Recommendations */
  useEffect(() => {
    const next: Recommendation[] = [];

    const mrHasDynamic = mrContrastStatus !== "kontrastsız";
    const btHasDynamic = btContrastStatus === "dinamik (3 faz)";

    if (liverStatus === "var") {
      if (showMR) {
        if (!mrHasDynamic) {
          next.push({
            title: "Karaciğer lezyonu karakterizasyonu için dinamik kontrastlı karaciğer MR önerilir",
            urgency: "Öncelikli",
            details: ["DWI/ADC + in/out-phase", "Gadolinyum dinamik fazlar", "Uygunsa hepatobiliyer faz (gadoxetate)"],
          });
        }
      } else if (showBT) {
        if (!btHasDynamic) {
          next.push({
            title: "Lezyon karakterizasyonu için üç fazlı (arteriyel-portal-geç) kontrastlı üst abdomen BT / karaciğer MR önerilir",
            urgency: "Öncelikli",
            details: ["Mevcut BT kontrastsız/tek faz ise patern ayrımı sınırlıdır"],
          });
        }
      }

      if (liverBtBileDil || bileDuctStatus === "var") {
        next.push({
          title: "Kolestaz/koledok patolojisi açısından MRCP önerilir",
          urgency: "Öncelikli",
          details: ["Heavily T2 MRCP", "Gerekirse ERCP ile korelasyon"],
        });
      }

      if (liverBtFever) {
        next.push({
          title: "Enfeksiyon/apse şüphesi varsa klinik-lab korelasyonu ve kısa aralıklı kontrol görüntüleme",
          urgency: "Acil",
          details: ["Ateş, lökositoz, CRP", "Gerekirse drenaj/enfeksiyon hast. konsültasyonu"],
        });
      }

      if (liverBtKnownPrimary || mrKnownPrimary) {
        next.push({
          title: "Bilinen malignite öyküsü varsa evreleme amaçlı onkoloji protokolü ile değerlendirme",
          urgency: "Öncelikli",
          details: ["Lezyon sayısı/dağılım", "Ek odaklar için tüm abdomen taraması"],
        });
      }

      // capsule-related: add suggestion
      if (capsularRetraction === "var" || subcapsular === "var") {
        next.push({
          title: "Subkapsüler yerleşim/kapsüler çekinti varsa fibrotik lezyonlar (ICC/HEHE vb.) açısından dinamik + hepatobiliyer fazlı MR ile değerlendirme",
          urgency: "Öncelikli",
          details: ["DWI/ADC", "Dinamik fazlar", "Hepatobiliyer faz (mümkünse)"],
        });
      }
    }

    setRecs(next);
  }, [
    liverStatus,
    showBT,
    showMR,
    btContrastStatus,
    mrContrastStatus,
    liverBtBileDil,
    bileDuctStatus,
    liverBtFever,
    liverBtKnownPrimary,
    mrKnownPrimary,
    subcapsular,
    capsularRetraction,
  ]);

  const organs: OrganFinding[] = useMemo(() => {
    const arr: OrganFinding[] = [];

    arr.push({
      organ: "Karaciğer",
      status: liverStatus,
      summary: liverSummary,
      ddx: liverStatus === "var" ? liverDdx : [],
    });

    arr.push({
      organ: "Safra kesesi",
      status: gbStatus,
      summary: gbSummary,
      ddx: [],
    });

    arr.push({
      organ: "Safra yolları",
      status: bileDuctStatus,
      summary: bileDuctSummary,
      ddx: [],
    });

    return arr;
  }, [liverStatus, liverSummary, liverDdx, gbStatus, gbSummary, bileDuctStatus, bileDuctSummary]);

  const finalSentence = useMemo(() => {
    return buildFinalReportSentence({
      modality,
      organs,
      incidental,
      style,
      includeProbabilityLanguage: includeProbLang,
      includeRecommendationsLanguage: includeRecLang,
      recommendations: recs,
    });
  }, [modality, organs, incidental, style, includeProbLang, includeRecLang, recs]);

  const ddxPanel = useMemo(() => {
    const liver = organs.find((o) => o.organ === "Karaciğer");
    if (!liver || liver.status !== "var" || !liver.ddx?.length) {
      return <div className="text-sm text-muted-foreground">DDX için karaciğerde “Var” seç.</div>;
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge>Ayırıcı Tanı</Badge>
          <span className="text-xs text-muted-foreground">Canlı (kural tabanlı)</span>
        </div>
        <div className="grid gap-2">
          {liver.ddx.slice(0, 10).map((d) => (
            <Card key={d.name} className="border">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium">{d.name}</div>
                  <Badge variant={d.likelihood === "Yüksek" ? "default" : d.likelihood === "Orta" ? "secondary" : "outline"}>
                    {d.likelihood}
                  </Badge>
                </div>
                {d.why?.length ? (
                  <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                    {d.why.slice(0, 3).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }, [organs]);

  function resetAll() {
    setModality("BT");
    setLiverStatus("yok");
    setGbStatus("yok");
    setBileDuctStatus("yok");
    setIncidental("");
    setStyle("Kısa");
    setIncludeProbLang(true);
    setIncludeRecLang(true);

    setLiverSegment("bilinmiyor");
    setLiverSizeMm("");
    setLiverPreset("");
    setAutoFillSummary(true);
    setLiverSummaryTouched(false);

    setBtContrastStatus("kontrastsız");
    setMrContrastStatus("kontrastsız");

    setLiverBtNumber("tek");
    setLiverBtMargins("düzgün");
    setLiverBtAtt("hipodens (nonspesifik)");
    setLiverBtEnh("değerlendirilemedi");
    setLiverBtCalc(false);
    setLiverBtFat(false);
    setLiverBtAir(false);
    setLiverBtBg("normal");
    setLiverBtKnownPrimary(false);
    setLiverBtFever(false);
    setLiverBtTrauma(false);
    setLiverBtBileDil(false);

    setSubcapsular("bilinmiyor");
    setCapsuleAppearance("bilinmiyor");
    setCapsularRetraction("bilinmiyor");

    setMrT1("bilinmiyor");
    setMrT2("bilinmiyor");
    setMrDwi("bilinmiyor");
    setMrAdc("bilinmiyor");
    setMrInOut("bilinmiyor");
    setMrHemProt(false);
    setMrBg("normal");
    setMrKnownPrimary(false);

    setLiverSummary("");
    setGbSummary("");
    setBileDuctSummary("");
    setRecs([]);
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="mb-4 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold">radiology-clean</h1>
                <p className="text-sm text-muted-foreground">
                  Abdomen odaklı • BT/MR uyumlu • Canlı çıktı • Patoloji-odaklı rapor filtresi • <span className="font-medium">Preset + Segment/Ölçüm otomasyonu</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">vNext</Badge>
                <Button variant="outline" size="sm" onClick={resetAll}>
                  Sıfırla
                </Button>
              </div>
            </div>

            {/* Top Controls */}
            <Card>
              <CardContent className="p-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>İnceleme tipi</Label>
                    <div className="flex flex-wrap gap-2">
                      {(["BT", "MR", "BT+MR"] as StudyModality[]).map((m) => (
                        <Button key={m} variant={modality === m ? "default" : "outline"} onClick={() => setModality(m)} size="sm">
                          {m}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Seçime göre alanlar koşullu açılır/kapanır.</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Rapor stili</Label>
                    <div className="flex flex-wrap gap-2">
                      {(["Kısa", "Detaylı"] as const).map((s) => (
                        <Button key={s} variant={style === s ? "default" : "outline"} onClick={() => setStyle(s)} size="sm">
                          {s}
                        </Button>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Switch checked={includeProbLang} onCheckedChange={(v) => setIncludeProbLang(!!v)} />
                        <span className="text-sm">Olasılık dili</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={includeRecLang} onCheckedChange={(v) => setIncludeRecLang(!!v)} />
                        <span className="text-sm">Öneri dili</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Preset</Label>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Preset</span> seçince (1 tık) ilgili BT/MR alanları dolar.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {liverPresets.slice(0, 4).map((p) => (
                        <Tooltip key={p.id}>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant={liverPreset === p.id ? "default" : "outline"} onClick={() => applyPreset(p.id)}>
                              {p.title.split("•")[1]?.trim() ?? p.title}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{p.hint}</TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Clinical Context (geri geldi) */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Klinik zemin / bağlam</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={liverBtKnownPrimary || mrKnownPrimary} onCheckedChange={(v) => (setLiverBtKnownPrimary(!!v), setMrKnownPrimary(!!v))} />
                    <span className="text-sm">Bilinen malignite</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={liverBtFever} onCheckedChange={(v) => setLiverBtFever(!!v)} />
                    <span className="text-sm">Ateş / sepsis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={liverBtTrauma} onCheckedChange={(v) => setLiverBtTrauma(!!v)} />
                    <span className="text-sm">Travma</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch checked={liverBtBileDil || bileDuctStatus === "var"} onCheckedChange={(v) => (setLiverBtBileDil(!!v), setBileDuctStatus(!!v ? "var" : bileDuctStatus))} />
                    <span className="text-sm">Kolestaz / safra dilatasyonu</span>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Karaciğer zemini</Label>
                    <div className="flex flex-wrap gap-2">
                      {(["normal", "steatoz", "siroz/kronik karaciğer"] as const).map((v) => (
                        <Button
                          key={v}
                          size="sm"
                          variant={(showMR ? mrBg : liverBtBg) === v ? "default" : "outline"}
                          onClick={() => {
                            setLiverBtBg(v);
                            setMrBg(v);
                          }}
                        >
                          {v}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main grid: left form, right output */}
            <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
              {/* LEFT */}
              <div className="space-y-4">
                {/* Organ toggles */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Organlar</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Karaciğer</Label>
                        <div className="flex gap-2">
                          {(["yok", "var"] as const).map((v) => (
                            <Button key={v} size="sm" variant={liverStatus === v ? "default" : "outline"} onClick={() => setLiverStatus(v)}>
                              {v === "var" ? "Var" : "Yok"}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Safra kesesi</Label>
                        <div className="flex gap-2">
                          {(["yok", "var"] as const).map((v) => (
                            <Button key={v} size="sm" variant={gbStatus === v ? "default" : "outline"} onClick={() => setGbStatus(v)}>
                              {v === "var" ? "Var" : "Yok"}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Safra yolları</Label>
                        <div className="flex gap-2">
                          {(["yok", "var"] as const).map((v) => (
                            <Button key={v} size="sm" variant={bileDuctStatus === v ? "default" : "outline"} onClick={() => setBileDuctStatus(v)}>
                              {v === "var" ? "Var" : "Yok"}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Liver details */}
                {liverStatus === "var" ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Karaciğer • Lezyon detayları</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label>Segment</Label>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant={liverSegment === "bilinmiyor" ? "default" : "outline"} onClick={() => setLiverSegment("bilinmiyor")}>
                              Bilinmiyor
                            </Button>
                            {liverSegments.map((s) => (
                              <Button key={s} size="sm" variant={liverSegment === s ? "default" : "outline"} onClick={() => setLiverSegment(s)}>
                                {s}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Boyut (mm)</Label>
                          <Input value={liverSizeMm} onChange={(e) => setLiverSizeMm(e.target.value)} placeholder="örn: 18" />
                          <div className="flex items-center gap-2">
                            <Switch checked={autoFillSummary} onCheckedChange={(v) => setAutoFillSummary(!!v)} />
                            <span className="text-sm">Otomatik özet</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Özet (editlenebilir)</Label>
                          <Input
                            value={liverSummary}
                            onChange={(e) => {
                              setLiverSummary(e.target.value);
                              setLiverSummaryTouched(true);
                            }}
                            placeholder="Otomatik dolar; istersen düzenle"
                          />
                        </div>
                      </div>

                      <Separator className="my-4" />

                      {/* NEW: Capsule morphology block */}
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label>Subkapsüler yerleşim</Label>
                          {triButtons(subcapsular, setSubcapsular)}
                          <p className="text-xs text-muted-foreground">Subkapsüler + çekinti birlikteliği fibrotik lezyonlarda (ICC/HEHE vb.) ayırıcıya katkı sağlar.</p>
                        </div>

                        <div className="space-y-2">
                          <Label>Kapsül görünümü (pseudo-kapsül)</Label>
                          {triButtons(capsuleAppearance, setCapsuleAppearance)}
                          <p className="text-xs text-muted-foreground">Pseudo-kapsül HCC’de (özellikle sirozda) görülebilir; bazı fibrotik lezyonlarda da olabilir.</p>
                        </div>

                        <div className="space-y-2">
                          <Label>Kapsüler çekinti</Label>
                          {triButtons(capsularRetraction, setCapsularRetraction)}
                          <p className="text-xs text-muted-foreground">Kapsüler çekinti ICC/HEHE ve fibrotik metastazlarda daha olası; kist/hemanjiyom için tipik değildir.</p>
                        </div>
                      </div>

                      <Separator className="my-4" />

                      {/* BT/MR tabs */}
                      <Tabs defaultValue={showMR ? "MR" : "BT"} value={showMR ? "MR" : "BT"} onValueChange={() => {}}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="BT" disabled={!showBT}>
                            BT
                          </TabsTrigger>
                          <TabsTrigger value="MR" disabled={!showMR}>
                            MR
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="BT">
                          {!showBT ? (
                            <div className="text-sm text-muted-foreground mt-3">BT seçili değil.</div>
                          ) : (
                            <div className="mt-4 space-y-4">
                              <div className="space-y-2">
                                <Label>BT kontrast durumu</Label>
                                <div className="flex flex-wrap gap-2">
                                  {(["kontrastsız", "kontrastlı (tek faz)", "dinamik (3 faz)"] as BTContrastStatus[]).map((v) => (
                                    <Button key={v} size="sm" variant={btContrastStatus === v ? "default" : "outline"} onClick={() => setBtContrastStatus(v)}>
                                      {v}
                                    </Button>
                                  ))}
                                </div>
                                <p className="text-xs text-muted-foreground">Kontrastsız BT’de kontrast paterni değerlendirilemez. Patern en anlamlı dinamik (3 faz) incelemede.</p>
                              </div>

                              <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-2">
                                  <Label>Lezyon sayısı</Label>
                                  <div className="flex flex-wrap gap-2">
                                    {(["tek", "çok"] as const).map((v) => (
                                      <Button key={v} size="sm" variant={liverBtNumber === v ? "default" : "outline"} onClick={() => setLiverBtNumber(v)}>
                                        {v === "tek" ? "Tek" : "Çoklu"}
                                      </Button>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label>Sınır</Label>
                                  <div className="flex flex-wrap gap-2">
                                    {(["düzgün", "düzensiz"] as const).map((v) => (
                                      <Button key={v} size="sm" variant={liverBtMargins === v ? "default" : "outline"} onClick={() => setLiverBtMargins(v)}>
                                        {v}
                                      </Button>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label>Nonkontrast densite</Label>
                                  <div className="flex flex-wrap gap-2">
                                    {(["saf sıvı densiteye yakın", "hipodens (nonspesifik)", "heterojen"] as const).map((v) => (
                                      <Button key={v} size="sm" variant={liverBtAtt === v ? "default" : "outline"} onClick={() => setLiverBtAtt(v)}>
                                        {v}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Enhancement pattern (only if contrast present) */}
                              {btContrastStatus === "kontrastsız" ? (
                                <div className="rounded-md border p-3 text-sm text-muted-foreground">
                                  Kontrastsız BT seçili → kontrastlanma paterni <span className="font-medium">değerlendirilemedi</span>.
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <Label>Kontrast paterni</Label>
                                  <div className="flex flex-wrap gap-2">
                                    {(["yok/çok az", "periferik nodüler", "arteryel hipervasküler", "halka", "heterojen"] as const).map((v) => (
                                      <Button key={v} size="sm" variant={liverBtEnh === v ? "default" : "outline"} onClick={() => setLiverBtEnh(v)}>
                                        {v}
                                      </Button>
                                    ))}
                                    <Button size="sm" variant={liverBtEnh === "değerlendirilemedi" ? "default" : "outline"} onClick={() => setLiverBtEnh("değerlendirilemedi")}>
                                      değerlendirilemedi
                                    </Button>
                                  </div>
                                </div>
                              )}

                              <div className="grid gap-4 md:grid-cols-3">
                                <div className="flex items-center gap-2">
                                  <Switch checked={liverBtCalc} onCheckedChange={(v) => setLiverBtCalc(!!v)} />
                                  <span className="text-sm">Kalsifikasyon</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Switch checked={liverBtFat} onCheckedChange={(v) => setLiverBtFat(!!v)} />
                                  <span className="text-sm">Yağ</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Switch checked={liverBtAir} onCheckedChange={(v) => setLiverBtAir(!!v)} />
                                  <span className="text-sm">Hava/gaz</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="MR">
                          {!showMR ? (
                            <div className="text-sm text-muted-foreground mt-3">MR seçili değil.</div>
                          ) : (
                            <div className="mt-4 space-y-4">
                              <div className="space-y-2">
                                <Label>MR kontrast durumu</Label>
                                <div className="flex flex-wrap gap-2">
                                  {(["kontrastsız", "dinamik gadolinyum var", "hepatobiliyer faz var"] as MRContrastStatus[]).map((v) => (
                                    <Button key={v} size="sm" variant={mrContrastStatus === v ? "default" : "outline"} onClick={() => setMrContrastStatus(v)}>
                                      {v}
                                    </Button>
                                  ))}
                                </div>
                                <p className="text-xs text-muted-foreground">Kontrastsız MR’da T1/T2/DWI/ADC + In/Out ile baz DDX üretiriz; dinamik/hepatobiliyer varsa ayrım güçlenir.</p>
                              </div>

                              <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-2">
                                  <Label>T1</Label>
                                  <div className="flex flex-wrap gap-2">
                                    {(["bilinmiyor", "hipo", "izo", "hiper"] as const).map((v) => (
                                      <Button key={v} size="sm" variant={mrT1 === v ? "default" : "outline"} onClick={() => setMrT1(v)}>
                                        {v}
                                      </Button>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label>T2</Label>
                                  <div className="flex flex-wrap gap-2">
                                    {(["bilinmiyor", "hipo", "izo", "hiper"] as const).map((v) => (
                                      <Button key={v} size="sm" variant={mrT2 === v ? "default" : "outline"} onClick={() => setMrT2(v)}>
                                        {v}
                                      </Button>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label>DWI</Label>
                                  <div className="flex flex-wrap gap-2">
                                    {(["bilinmiyor", "restriksiyon var", "restriksiyon yok"] as const).map((v) => (
                                      <Button key={v} size="sm" variant={mrDwi === v ? "default" : "outline"} onClick={() => setMrDwi(v)}>
                                        {v}
                                      </Button>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label>ADC</Label>
                                  <div className="flex flex-wrap gap-2">
                                    {(["bilinmiyor", "düşük", "normal/yüksek"] as const).map((v) => (
                                      <Button key={v} size="sm" variant={mrAdc === v ? "default" : "outline"} onClick={() => setMrAdc(v)}>
                                        {v}
                                      </Button>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label>In/Out phase</Label>
                                  <div className="flex flex-wrap gap-2">
                                    {(["bilinmiyor", "yağ var (signal drop)", "yağ yok"] as const).map((v) => (
                                      <Button key={v} size="sm" variant={mrInOut === v ? "default" : "outline"} onClick={() => setMrInOut(v)}>
                                        {v}
                                      </Button>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Switch checked={mrHemProt} onCheckedChange={(v) => setMrHemProt(!!v)} />
                                  <span className="text-sm">Hemoraji/Protein (T1 hiper)</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                ) : null}

                {/* GB */}
                {gbStatus === "var" ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Safra kesesi • Özet</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Input value={gbSummary} onChange={(e) => setGbSummary(e.target.value)} placeholder="örn: Taş ile uyumlu hiperdens odaklar..." />
                    </CardContent>
                  </Card>
                ) : null}

                {/* Bile ducts */}
                {bileDuctStatus === "var" ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Safra yolları • Özet</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Input value={bileDuctSummary} onChange={(e) => setBileDuctSummary(e.target.value)} placeholder="örn: İntra/ekstrahepatik safra yollarında dilatasyon..." />
                    </CardContent>
                  </Card>
                ) : null}

                {/* Incidental */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Ek / İnsidental bulgular</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Textarea value={incidental} onChange={(e) => setIncidental(e.target.value)} placeholder="Buraya serbest metin ekle; final rapora entegre olur." />
                  </CardContent>
                </Card>
              </div>

              {/* RIGHT OUTPUT */}
              <div className="lg:sticky lg:top-6 h-fit">
                <Card className="border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">AI Çıktı</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary">Final (tek cümle)</Badge>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard?.writeText(finalSentence);
                            }}
                          >
                            Kopyala
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Tek-cümlelik final raporu panoya kopyalar</TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="rounded-lg border p-3 text-sm leading-relaxed">{finalSentence}</div>

                    <Separator />

                    <ScrollArea className="h-[360px] pr-2">
                      <div className="space-y-4">
                        {ddxPanel}

                        {includeRecLang && recs.length ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge>Öneriler</Badge>
                              <span className="text-xs text-muted-foreground">Koşullu otomatik</span>
                            </div>
                            <div className="grid gap-2">
                              {recs.map((r, idx) => (
                                <Card key={idx} className="border">
                                  <CardContent className="p-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="font-medium">{r.title}</div>
                                      {r.urgency ? (
                                        <Badge variant={r.urgency === "Acil" ? "default" : r.urgency === "Öncelikli" ? "secondary" : "outline"}>{r.urgency}</Badge>
                                      ) : null}
                                    </div>
                                    {r.details?.length ? (
                                      <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                                        {r.details.slice(0, 4).map((d, i) => (
                                          <li key={i}>{d}</li>
                                        ))}
                                      </ul>
                                    ) : null}
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </ScrollArea>

                    <Separator />

                    <div className="text-xs text-muted-foreground">
                      Not: DDX önerileri “kılavuz” amaçlıdır; kesin tanı için dinamik kontrast paterni/sekanslar ve klinik korelasyon gerekir.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="mt-8 text-xs text-muted-foreground">
              radiology-clean • preset tabanlı • segment/ölçüm otomasyonu • var/yok → koşullu derinleşme • patoloji-odaklı rapor filtresi • canlı çıktı paneli
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
