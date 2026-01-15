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

type StudyModality = "BT" | "MR" | "BT+MR";
type YesNo = "yok" | "var";
type Likelihood = "Yüksek" | "Orta" | "Düşük";

// NEW: Tri-state (bilinmiyor/yok/var) for capsule & capsular retraction
type TriState = "bilinmiyor" | "yok" | "var";

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

/**
 * ----------------------------
 * DDX ENGINES (BT / MR)
 * ----------------------------
 */

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

  // NEW
  capsuleAppearance?: TriState; // lesion capsule appearance
  capsularRetraction?: TriState; // capsular retraction
};

function liverHypodenseBT_Ddx(f: LiverBTHypodenseFeatures): DdxItem[] {
  const base: DdxItem[] = [
    { name: "Basit kist", likelihood: "Orta", why: ["BT’de hipodens odak için sık benign nedenlerden."] },
    { name: "Hemanjiyom", likelihood: "Orta", why: ["Sıklıkla insidental; dinamik patern belirleyicidir."] },
    { name: "Metastaz", likelihood: "Orta", why: ["Çoklu lezyon / bilinen primer varsa önem kazanır."] },
    { name: "Hepatoselüler karsinom (HCC)", likelihood: "Düşük", why: ["Siroz zemininde olasılık artar; dinamik paterne bakılır."] },
    { name: "FNH / Adenom", likelihood: "Düşük", why: ["Dinamik yoksa ayrım sınırlı; ek sekanslar değerlidir."] },
    { name: "Apse / mikroapseler", likelihood: "Düşük", why: ["Klinik ateş/sepsis varlığında öncelik kazanır."] },
  ];

  let ddx = [...base];

  if (f.trauma) {
    ddx.unshift({
      name: "Kontüzyon / laserasyon",
      likelihood: "Yüksek",
      why: ["Travma öyküsü varsa hipodens parankimal alan kontüzyon/laserasyon lehine olabilir."],
    });
  }

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

  if (f.number === "çok") {
    ddx = ddx.map((d) => {
      if (d.name === "Metastaz") return { ...d, likelihood: "Yüksek", why: uniq([...(d.why ?? []), "Çoklu lezyon metastaz lehine."]) };
      if (d.name.includes("Apse")) return { ...d, likelihood: f.feverOrSepsis ? "Yüksek" : "Orta" };
      return d;
    });
  }

  if (f.knownPrimary) {
    ddx = ddx.map((d) => (d.name === "Metastaz" ? { ...d, likelihood: "Yüksek", why: uniq([...(d.why ?? []), "Bilinen primer malignite varlığı."]) } : d));
  }

  if (f.backgroundLiver === "siroz/kronik karaciğer") {
    ddx = ddx.map((d) => (d.name.includes("HCC") ? { ...d, likelihood: "Orta", why: uniq([...(d.why ?? []), "Siroz zemininde HCC olasılığı artar."]) } : d));
  }

  if (f.attenuation === "saf sıvı densiteye yakın" && f.margins === "düzgün" && (f.enhancement === "yok/çok az" || f.enhancement === "değerlendirilemedi")) {
    ddx = ddx.map((d) => (d.name === "Basit kist" ? { ...d, likelihood: "Yüksek", why: uniq([...(d.why ?? []), "Sıvı densitesi + düzgün kontur kist lehine."]) } : d));
  }

  if (f.enhancement === "periferik nodüler") {
    ddx = ddx.map((d) => (d.name === "Hemanjiyom" ? { ...d, likelihood: "Yüksek", why: uniq([...(d.why ?? []), "Periferik nodüler kontrastlanma hemanjiyom için tipik."]) } : d));
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

  /**
   * ----------------------------
   * NEW: Capsule / Capsular Retraction logic (BT)
   * ----------------------------
   */

  // Capsule appearance -> HCC up (especially in cirrhosis)
  if (f.capsuleAppearance === "var") {
    ddx = ddx.map((d) =>
      d.name.includes("HCC")
        ? {
            ...d,
            likelihood: f.backgroundLiver === "siroz/kronik karaciğer" ? "Yüksek" : "Orta",
            why: uniq([...(d.why ?? []), "Lezyon çevresinde kapsül görünümü HCC lehine bir bulgudur."]),
          }
        : d
    );
  }

  // Capsular retraction -> ICC/Met/HEHE up; classic HCC down a notch
  if (f.capsularRetraction === "var") {
    ddx.unshift(
      {
        name: "İntrahepatik kolanjiokarsinom (ICC)",
        likelihood: "Orta",
        why: ["Kapsüler çekinti ICC’de görülebilen bir bulgudur (fibrotik stroma ile ilişkili)."],
      },
      {
        name: "Epiteloid hemanjiyoendotelyoma (HEHE)",
        likelihood: "Orta",
        why: ["Subkapsüler yerleşim ve kapsüler çekinti ile ilişkilendirilebilir."],
      },
      {
        name: "Sklerozan hemanjiyom",
        likelihood: "Düşük",
        why: ["Nadir benign neden; kapsüler çekinti ile raporlanabilir."],
      }
    );

    ddx = ddx.map((d) => {
      if (d.name === "Metastaz") {
        return {
          ...d,
          likelihood: f.knownPrimary ? "Yüksek" : "Orta",
          why: uniq([...(d.why ?? []), "Kapsüler çekinti (özellikle subkapsüler metastazlarda) görülebilir."]),
        };
      }
      if (d.name.includes("HCC")) {
        const down: Likelihood = d.likelihood === "Yüksek" ? "Orta" : d.likelihood === "Orta" ? "Düşük" : "Düşük";
        return {
          ...d,
          likelihood: down,
          why: uniq([...(d.why ?? []), "Klasik/tedavisiz HCC’de kapsüler çekinti tipik değildir (istisnalar olabilir)."]),
        };
      }
      return d;
    });
  }

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

  // NEW
  capsuleAppearance?: TriState;
  capsularRetraction?: TriState;
};

function liverMR_BaselineDdx(s: LiverMRSignalCombo): DdxItem[] {
  const ddx: DdxItem[] = [];

  ddx.push(
    { name: "Basit kist", likelihood: "Orta", why: ["T2 hiper ve DWI restriksiyon yoksa kist lehine güçlenir."] },
    { name: "Hemanjiyom", likelihood: "Orta", why: ["Genellikle T2 belirgin hiperintens; restriksiyon tipik değil."] },
    { name: "Metastaz", likelihood: "Orta", why: ["DWI/ADC ve klinik bağlamla değerlendirilir; çoklu olabilir."] },
    { name: "HCC", likelihood: "Düşük", why: ["Siroz zemininde öncelik kazanır; dinamik patern değerlidir."] },
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
    ddx.unshift({
      name: "T1 hiperintens benign/malign lezyonlar (spesifik değil)",
      likelihood: "Düşük",
      why: ["T1 hiperintensite tek başına spesifik değildir; ek sekanslarla netleşir."],
    });
  }

  if (s.backgroundLiver === "siroz/kronik karaciğer") {
    ddx.unshift({
      name: "HCC (siroz zemininde)",
      likelihood: "Orta",
      why: ["Siroz zemininde HCC olasılığı artar.", "Dinamik + hepatobiliyer faz (varsa) tanısal katkı sağlar."],
    });
  }

  /**
   * ----------------------------
   * NEW: Capsule / Capsular Retraction logic (MR)
   * ----------------------------
   */

  if (s.capsuleAppearance === "var") {
    ddx.unshift({
      name: "HCC (kapsül görünümü lehine)",
      likelihood: s.backgroundLiver === "siroz/kronik karaciğer" ? "Yüksek" : "Orta",
      why: ["Lezyon çevresinde kapsül görünümü HCC lehine bir bulgudur."],
    });
    // also gently bump existing HCC row if present
    for (let i = 0; i < ddx.length; i++) {
      if (ddx[i].name === "HCC") {
        ddx[i] = {
          ...ddx[i],
          likelihood: s.backgroundLiver === "siroz/kronik karaciğer" ? "Yüksek" : "Orta",
          why: uniq([...(ddx[i].why ?? []), "Kapsül görünümü HCC lehine."]),
        };
      }
    }
  }

  if (s.capsularRetraction === "var") {
    ddx.unshift(
      { name: "İntrahepatik kolanjiokarsinom (ICC)", likelihood: "Orta", why: ["Kapsüler çekinti ICC’de görülebilir."] },
      { name: "Metastaz (özellikle subkapsüler)", likelihood: s.knownPrimary ? "Yüksek" : "Orta", why: ["Kapsüler çekinti metastazlarda görülebilir."] },
      { name: "Epiteloid hemanjiyoendotelyoma (HEHE)", likelihood: "Orta", why: ["Subkapsüler yerleşim + çekinti kombinasyonu düşündürebilir."] },
      { name: "Sklerozan hemanjiyom", likelihood: "Düşük", why: ["Nadir benign neden; çekinti ile raporlanabilir."] }
    );

    // downshift classic HCC a notch
    for (let i = 0; i < ddx.length; i++) {
      if (ddx[i].name === "HCC") {
        const down: Likelihood = ddx[i].likelihood === "Yüksek" ? "Orta" : ddx[i].likelihood === "Orta" ? "Düşük" : "Düşük";
        ddx[i] = {
          ...ddx[i],
          likelihood: down,
          why: uniq([...(ddx[i].why ?? []), "Kapsüler çekinti klasik HCC’de tipik değildir (istisnalar olabilir)."]),
        };
      }
    }
  }

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

/**
 * ----------------------------
 * REPORT LANGUAGE FILTERING
 * ----------------------------
 */

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

/**
 * ----------------------------
 * PRESETS (1-tık)
 * ----------------------------
 */

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

export default function Page() {
  const [modality, setModality] = useState<StudyModality>("BT");

  const [liverStatus, setLiverStatus] = useState<YesNo>("yok");
  const [gbStatus, setGbStatus] = useState<YesNo>("yok");
  const [bileDuctStatus, setBileDuctStatus] = useState<YesNo>("yok");

  const [incidental, setIncidental] = useState<string>("");

  const [style, setStyle] = useState<"Kısa" | "Detaylı">("Kısa");
  const [includeProbLang, setIncludeProbLang] = useState(true);
  const [includeRecLang, setIncludeRecLang] = useState(true);

  // NEW: Segment + unified size
  const [liverSegment, setLiverSegment] = useState<LiverSegment | "bilinmiyor">("bilinmiyor");
  const [liverSizeMm, setLiverSizeMm] = useState<string>("");

  // NEW: Presets + auto-summary behavior
  const [liverPreset, setLiverPreset] = useState<LiverPresetId | "">("");
  const [autoFillSummary, setAutoFillSummary] = useState(true);
  const [liverSummaryTouched, setLiverSummaryTouched] = useState(false);

  // NEW: Capsule & capsular retraction (global to liver lesion)
  const [capsuleAppearance, setCapsuleAppearance] = useState<TriState>("bilinmiyor");
  const [capsularRetraction, setCapsularRetraction] = useState<TriState>("bilinmiyor");

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

  /**
   * ----------------------------
   * PRESET APPLY (1 click)
   * ----------------------------
   */
  function applyPreset(id: LiverPresetId) {
    setLiverPreset(id);

    // If you click a preset, we assume you want auto-summary unless you turned it off.
    if (autoFillSummary) {
      setLiverSummaryTouched(false);
    }

    // Make sure liver is on
    setLiverStatus("var");

    // BT presets
    if (id.startsWith("BT_")) {
      // move modality to include BT if needed
      if (modality === "MR") setModality("BT+MR");
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
        setLiverBtAtt("hipodens (nonspesifik)");
        setLiverBtEnh("periferik nodüler");
      }
      if (id === "BT_RING_ENH") {
        setLiverBtAtt("hipodens (nonspesifik)");
        setLiverBtEnh("halka");
      }
      if (id === "BT_HYPERVASC") {
        setLiverBtAtt("hipodens (nonspesifik)");
        setLiverBtEnh("arteryel hipervasküler");
      }
    }

    // MR presets
    if (id.startsWith("MR_")) {
      if (modality === "BT") setModality("BT+MR");

      // baseline defaults
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
        setMrInOut("bilinmiyor");
      }
      if (id === "MR_RESTRICT") {
        setMrDwi("restriksiyon var");
        setMrAdc("düşük");
        // T1/T2 leave unknown unless user sets
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

    // Auto-generate summary right away (if enabled and not touched)
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

      // If user already checked key clinical toggles, add subtle phrase
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

  /**
   * Auto-update summary when segment/size changes (only if autoFillSummary ON and user hasn't touched summary)
   */
  useEffect(() => {
    if (liverStatus !== "var") return;
    if (!autoFillSummary) return;
    if (liverSummaryTouched) return;

    // If no preset chosen, still provide a clean default
    const size = numOrUndef(liverSizeMm);
    const seg = liverSegment === "bilinmiyor" ? undefined : liverSegment;

    let label = "fokal lezyon";
    if (liverPreset) {
      // Reuse label mapping for current preset
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
      // no preset: choose by modality visibility
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

  const liverDdx = useMemo(() => {
    if (liverStatus !== "var") return [] as DdxItem[];

    // Prefer MR ddx if MR is selected (or BT+MR)
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

        // NEW
        capsuleAppearance,
        capsularRetraction,
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

      // NEW
      capsuleAppearance,
      capsularRetraction,
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

    // NEW deps
    capsuleAppearance,
    capsularRetraction,
  ]);

  // Recommendations auto
  useEffect(() => {
    const next: Recommendation[] = [];

    if (liverStatus === "var") {
      if (showMR) {
        next.push({
          title: "Karaciğer lezyonu karakterizasyonu için dinamik kontrastlı karaciğer MR önerilir",
          urgency: "Öncelikli",
          details: ["DWI/ADC + in/out-phase", "Gadolinyum dinamik fazlar", "Uygunsa hepatobiliyer faz (gadoxetate)"],
        });
      } else if (showBT) {
        next.push({
          title: "Lezyon karakterizasyonu için üç fazlı (arteriyel-portal-geç) kontrastlı üst abdomen BT / karaciğer MR önerilir",
          urgency: "Öncelikli",
          details: ["Mevcut BT kontrastsız ise veya dinamik faz yoksa"],
        });
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
    }

    setRecs(next);
  }, [liverStatus, showBT, showMR, liverBtBileDil, bileDuctStatus, liverBtFever, liverBtKnownPrimary, mrKnownPrimary]);

  const organs: OrganFinding[] = useMemo(() => {
    const arr: OrganFinding[] = [];

    arr.push({
      organ: "Karaciğer",
      status: liverStatus,
      summary: liverStatus === "var" ? (liverSummary.trim() || "Karaciğerde fokal lezyon izlenmektedir.") : "",
      ddx: liverStatus === "var" ? liverDdx : [],
    });

    arr.push({
      organ: "Safra kesesi",
      status: gbStatus,
      summary: gbStatus === "var" ? gbSummary.trim() : "",
      ddx: gbStatus === "var" ? [{ name: "Kolesistit / taş", likelihood: "Orta" }] : [],
    });

    arr.push({
      organ: "Safra yolları",
      status: bileDuctStatus,
      summary: bileDuctStatus === "var" ? bileDuctSummary.trim() : "",
      ddx: bileDuctStatus === "var" ? [{ name: "Koledokolitiazis / obstrüksiyon", likelihood: "Orta" }] : [],
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
    if (!liver || liver.status !== "var") return null;
    const ddx = liver.ddx || [];
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge>Karaciğer DDX</Badge>
          <span className="text-xs text-muted-foreground">Canlı güncellenir (preset + özelliklere göre)</span>
        </div>
        <div className="grid gap-2">
          {ddx.slice(0, 10).map((d) => (
            <Card key={d.name} className="border">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium">{d.name}</div>
                  <Badge variant={d.likelihood === "Yüksek" ? "default" : d.likelihood === "Orta" ? "secondary" : "outline"}>{d.likelihood}</Badge>
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

  const triButtons = (value: TriState, onChange: (v: TriState) => void) => (
    <div className="flex flex-wrap gap-2">
      {(["bilinmiyor", "yok", "var"] as TriState[]).map((v) => (
        <Button key={v} size="sm" variant={value === v ? "default" : "outline"} onClick={() => onChange(v)}>
          {v}
        </Button>
      ))}
    </div>
  );

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
              </div>
            </div>

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
                    <Label>Yeni özellik</Label>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Preset</span> seçince (1 tık) ilgili BT/MR alanları dolar. <span className="font-medium">Segment + ölçüm</span> girince özet bulgu cümlesi otomatik güncellenir.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
            {/* LEFT */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Organ seçimi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Karaciğer</Label>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={liverStatus === "yok" ? "default" : "outline"}
                            onClick={() => setLiverStatus("yok")}
                          >
                            Yok
                          </Button>
                          <Button
                            size="sm"
                            variant={liverStatus === "var" ? "default" : "outline"}
                            onClick={() => setLiverStatus("var")}
                          >
                            Var
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Lezyon varsa DDX otomatik üretilecek.</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Safra kesesi</Label>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant={gbStatus === "yok" ? "default" : "outline"} onClick={() => setGbStatus("yok")}>
                            Yok
                          </Button>
                          <Button size="sm" variant={gbStatus === "var" ? "default" : "outline"} onClick={() => setGbStatus("var")}>
                            Var
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Var ise manuel özet ekle.</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Safra yolları</Label>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant={bileDuctStatus === "yok" ? "default" : "outline"} onClick={() => setBileDuctStatus("yok")}>
                            Yok
                          </Button>
                          <Button size="sm" variant={bileDuctStatus === "var" ? "default" : "outline"} onClick={() => setBileDuctStatus("var")}>
                            Var
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Dilatatasyon/taş şüphesinde MRCP önerisi otomatik eklenir.</p>
                    </div>
                  </div>

                  <Separator />

                  {/* LIVER */}
                  {liverStatus === "var" ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-semibold">Karaciğer</div>
                          <div className="text-sm text-muted-foreground">Preset → otomatik doldur • Segment/ölçüm → otomatik özet</div>
                        </div>
                        <Badge variant="secondary">Live</Badge>
                      </div>

                      {/* Presets */}
                      <Card>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-medium">Preset (1 tık)</div>
                              <div className="text-xs text-muted-foreground">Seçince ilgili alanlar otomatik doldurulur.</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch checked={autoFillSummary} onCheckedChange={(v) => setAutoFillSummary(!!v)} />
                              <span className="text-sm">Otomatik özet</span>
                            </div>
                          </div>

                          <div className="grid gap-2 md:grid-cols-2">
                            {liverPresets.map((p) => (
                              <Button
                                key={p.id}
                                variant={liverPreset === p.id ? "default" : "outline"}
                                className="justify-start h-auto py-3"
                                onClick={() => applyPreset(p.id)}
                              >
                                <div className="text-left">
                                  <div className="font-medium">{p.title}</div>
                                  <div className="text-xs opacity-80">{p.hint}</div>
                                </div>
                              </Button>
                            ))}
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Segment</Label>
                              <div className="flex flex-wrap gap-2">
                                <Button size="sm" variant={liverSegment === "bilinmiyor" ? "default" : "outline"} onClick={() => setLiverSegment("bilinmiyor")}>
                                  bilinmiyor
                                </Button>
                                {liverSegments.map((s) => (
                                  <Button key={s} size="sm" variant={liverSegment === s ? "default" : "outline"} onClick={() => setLiverSegment(s)}>
                                    {s}
                                  </Button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Lezyon ölçümü (mm)</Label>
                              <Input value={liverSizeMm} onChange={(e) => setLiverSizeMm(e.target.value)} placeholder="örn: 18" />
                              <p className="text-xs text-muted-foreground">Ölçüm/segment değişince (özet dokunulmadıysa) otomatik güncellenir.</p>
                            </div>
                          </div>

                          {/* NEW: capsule + capsular retraction */}
                          <Separator className="my-2" />
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Lezyon çevresinde kapsül görünümü</Label>
                              {triButtons(capsuleAppearance, setCapsuleAppearance)}
                              <p className="text-xs text-muted-foreground">Özellikle siroz zemininde “kapsül” HCC lehine ağırlıklandırılır.</p>
                            </div>
                            <div className="space-y-2">
                              <Label>Kapsüler çekinti (capsular retraction)</Label>
                              {triButtons(capsularRetraction, setCapsularRetraction)}
                              <p className="text-xs text-muted-foreground">ICC / metastaz / HEHE gibi lezyonları öne çeker; klasik HCC’yi bir kademe düşürür.</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Özet bulgu (rapora girecek)</Label>
                          <Textarea
                            value={liverSummary}
                            onChange={(e) => {
                              setLiverSummary(e.target.value);
                              setLiverSummaryTouched(true);
                            }}
                            placeholder='Örn: "Segment VI’da 18 mm hipodens lezyon izlenmektedir."'
                          />
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline">{autoFillSummary ? "Auto" : "Manual"}</Badge>
                            {autoFillSummary && !liverSummaryTouched ? <span>Özet otomatik yönetiliyor.</span> : <span>Özete manuel dokundun; otomatik güncelleme durdu.</span>}
                            {autoFillSummary && liverSummaryTouched ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setLiverSummaryTouched(false);
                                  // trigger refresh by re-setting same size (effect will run)
                                  setLiverSizeMm((v) => v);
                                }}
                              >
                                Otomatiğe dön
                              </Button>
                            ) : null}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Ek/İnsidental (nihai rapora eklenecek)</Label>
                          <Textarea value={incidental} onChange={(e) => setIncidental(e.target.value)} placeholder='Örn: "Sağ böbrekte 12 mm basit kist..."' />
                        </div>
                      </div>

                      <Tabs defaultValue={showBT ? "bt" : "mr"} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="bt" disabled={!showBT}>
                            BT
                          </TabsTrigger>
                          <TabsTrigger value="mr" disabled={!showMR}>
                            MR (dinamik olmasa bile)
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="bt" className="mt-4">
                          {!showBT ? (
                            <div className="text-sm text-muted-foreground">BT seçili değil.</div>
                          ) : (
                            <div className="grid gap-4 md:grid-cols-3">
                              <div className="space-y-2">
                                <Label>Sayı</Label>
                                <div className="flex flex-wrap gap-2">
                                  {(["tek", "çok"] as const).map((v) => (
                                    <Button key={v} size="sm" variant={liverBtNumber === v ? "default" : "outline"} onClick={() => setLiverBtNumber(v)}>
                                      {v}
                                    </Button>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>Kontur</Label>
                                <div className="flex flex-wrap gap-2">
                                  {(["düzgün", "düzensiz"] as const).map((v) => (
                                    <Button key={v} size="sm" variant={liverBtMargins === v ? "default" : "outline"} onClick={() => setLiverBtMargins(v)}>
                                      {v}
                                    </Button>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>Kontrast paterni</Label>
                                <div className="flex flex-wrap gap-2">
                                  {(["değerlendirilemedi", "yok/çok az", "periferik nodüler", "arteryel hipervasküler", "halka", "heterojen"] as const).map((v) => (
                                    <Button key={v} size="sm" variant={liverBtEnh === v ? "default" : "outline"} onClick={() => setLiverBtEnh(v)}>
                                      {v}
                                    </Button>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-2 md:col-span-2">
                                <Label>Densite</Label>
                                <div className="flex flex-wrap gap-2">
                                  {(["saf sıvı densiteye yakın", "hipodens (nonspesifik)", "heterojen"] as const).map((v) => (
                                    <Button key={v} size="sm" variant={liverBtAtt === v ? "default" : "outline"} onClick={() => setLiverBtAtt(v)}>
                                      {v}
                                    </Button>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-2 md:col-span-3">
                                <Label>Zemin ve klinik</Label>
                                <div className="grid gap-3 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap gap-2">
                                      {(["normal", "steatoz", "siroz/kronik karaciğer"] as const).map((v) => (
                                        <Button key={v} size="sm" variant={liverBtBg === v ? "default" : "outline"} onClick={() => setLiverBtBg(v)}>
                                          {v}
                                        </Button>
                                      ))}
                                    </div>

                                    <div className="mt-2 grid gap-2">
                                      <div className="flex items-center justify-between rounded-lg border p-2">
                                        <span className="text-sm">Bilinen primer malignite</span>
                                        <Switch checked={liverBtKnownPrimary} onCheckedChange={(v) => setLiverBtKnownPrimary(!!v)} />
                                      </div>
                                      <div className="flex items-center justify-between rounded-lg border p-2">
                                        <span className="text-sm">Ateş/sepsis (apse lehine)</span>
                                        <Switch checked={liverBtFever} onCheckedChange={(v) => setLiverBtFever(!!v)} />
                                      </div>
                                      <div className="flex items-center justify-between rounded-lg border p-2">
                                        <span className="text-sm">Travma</span>
                                        <Switch checked={liverBtTrauma} onCheckedChange={(v) => setLiverBtTrauma(!!v)} />
                                      </div>
                                      <div className="flex items-center justify-between rounded-lg border p-2">
                                        <span className="text-sm">Safra yolu dilatasyonu şüphesi</span>
                                        <Switch checked={liverBtBileDil} onCheckedChange={(v) => setLiverBtBileDil(!!v)} />
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <div className="grid gap-2">
                                      <div className="flex items-center justify-between rounded-lg border p-2">
                                        <span className="text-sm">Kalsifikasyon</span>
                                        <Switch checked={liverBtCalc} onCheckedChange={(v) => setLiverBtCalc(!!v)} />
                                      </div>
                                      <div className="flex items-center justify-between rounded-lg border p-2">
                                        <span className="text-sm">Yağ içeriği (BT’de)</span>
                                        <Switch checked={liverBtFat} onCheckedChange={(v) => setLiverBtFat(!!v)} />
                                      </div>
                                      <div className="flex items-center justify-between rounded-lg border p-2">
                                        <span className="text-sm">Hava/gaz</span>
                                        <Switch checked={liverBtAir} onCheckedChange={(v) => setLiverBtAir(!!v)} />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="mr" className="mt-4">
                          {!showMR ? (
                            <div className="text-sm text-muted-foreground">MR seçili değil.</div>
                          ) : (
                            <div className="grid gap-4 md:grid-cols-3">
                              <div className="space-y-2">
                                <Label>T1 sinyal</Label>
                                <div className="flex flex-wrap gap-2">
                                  {(["hipo", "izo", "hiper", "bilinmiyor"] as const).map((v) => (
                                    <Button key={v} size="sm" variant={mrT1 === v ? "default" : "outline"} onClick={() => setMrT1(v)}>
                                      {v}
                                    </Button>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>T2 sinyal</Label>
                                <div className="flex flex-wrap gap-2">
                                  {(["hipo", "izo", "hiper", "bilinmiyor"] as const).map((v) => (
                                    <Button key={v} size="sm" variant={mrT2 === v ? "default" : "outline"} onClick={() => setMrT2(v)}>
                                      {v}
                                    </Button>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>DWI / ADC</Label>
                                <div className="flex flex-wrap gap-2">
                                  {(["restriksiyon var", "restriksiyon yok", "bilinmiyor"] as const).map((v) => (
                                    <Button key={v} size="sm" variant={mrDwi === v ? "default" : "outline"} onClick={() => setMrDwi(v)}>
                                      {v}
                                    </Button>
                                  ))}
                                  {(["düşük", "normal/yüksek", "bilinmiyor"] as const).map((v) => (
                                    <Button key={v} size="sm" variant={mrAdc === v ? "default" : "outline"} onClick={() => setMrAdc(v)}>
                                      ADC {v}
                                    </Button>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>In/Out-phase</Label>
                                <div className="flex flex-wrap gap-2">
                                  {(["yağ var (signal drop)", "yağ yok", "bilinmiyor"] as const).map((v) => (
                                    <Button key={v} size="sm" variant={mrInOut === v ? "default" : "outline"} onClick={() => setMrInOut(v)}>
                                      {v}
                                    </Button>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>Klinik / zemin</Label>
                                <div className="grid gap-2">
                                  <div className="flex flex-wrap gap-2">
                                    {(["normal", "steatoz", "siroz/kronik karaciğer"] as const).map((v) => (
                                      <Button key={v} size="sm" variant={mrBg === v ? "default" : "outline"} onClick={() => setMrBg(v)}>
                                        {v}
                                      </Button>
                                    ))}
                                  </div>
                                  <div className="flex items-center justify-between rounded-lg border p-2">
                                    <span className="text-sm">Bilinen primer malignite</span>
                                    <Switch checked={mrKnownPrimary} onCheckedChange={(v) => setMrKnownPrimary(!!v)} />
                                  </div>
                                  <div className="flex items-center justify-between rounded-lg border p-2">
                                    <span className="text-sm">Hemoraji/proteinöz içerik şüphesi (T1 hiper ise)</span>
                                    <Switch checked={mrHemProt} onCheckedChange={(v) => setMrHemProt(!!v)} />
                                  </div>
                                </div>
                              </div>

                              <Card className="md:col-span-3">
                                <CardContent className="p-3 text-sm text-muted-foreground">
                                  <div className="font-medium text-foreground">MR “dinamik olmasa bile” baz DDX mantığı</div>
                                  <ul className="mt-2 list-disc pl-5">
                                    <li>T2 hiper + restriksiyon yok → kist/hemanjiyom yükselir.</li>
                                    <li>Restriksiyon/ADC düşük → metastaz/apse gibi lezyonlar yükselir.</li>
                                    <li>T1 hiper + yağ drop → adenom lehine olabilir.</li>
                                    <li>Siroz → HCC ön olasılığı artar.</li>
                                    <li>Kapsül görünümü → HCC lehine; kapsüler çekinti → ICC/metastaz/HEHE lehine.</li>
                                  </ul>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>
                  ) : null}

                  {/* GB */}
                  {gbStatus === "var" ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>Safra kesesi</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Label>Özet bulgu</Label>
                        <Textarea value={gbSummary} onChange={(e) => setGbSummary(e.target.value)} placeholder='Örn: "Lümen içinde milimetrik hiperdens taşlar..."' />
                      </CardContent>
                    </Card>
                  ) : null}

                  {/* Bile ducts */}
                  {bileDuctStatus === "var" ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>Safra yolları</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Label>Özet bulgu</Label>
                        <Textarea value={bileDuctSummary} onChange={(e) => setBileDuctSummary(e.target.value)} placeholder='Örn: "Koledok proksimalinde dilatasyon, distal kesimde taş şüphesi..."' />
                      </CardContent>
                    </Card>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            {/* RIGHT: STICKY OUTPUT */}
            <div className="lg:sticky lg:top-4 h-fit">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Mini çıktı paneli</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <Badge variant="outline">Final rapor</Badge>
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
                  </div>

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

                  <div className="text-xs text-muted-foreground">Not: DDX önerileri “kılavuz” amaçlıdır; kesin tanı için dinamik kontrast paterni/klinik korelasyon gerekir.</div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-8 text-xs text-muted-foreground">
            radiology-clean • preset tabanlı • segment/ölçüm otomasyonu • var/yok → koşullu derinleşme • patoloji-odaklı rapor filtresi • canlı çıktı paneli
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
