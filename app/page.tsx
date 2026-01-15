"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type Organ = "liver" | "brain";
type BrainFlow = "travma" | "kanama" | "kitle";

type Modality = "BT" | "MR";
type Likelihood = "Yüksek" | "Orta" | "Düşük";

type DdxItem = {
  name: string;
  likelihood: Likelihood;
  why: string[];
};

type Suggestion = {
  title: string;
  urgency: "Acil" | "Öncelikli" | "Rutin";
  details: string[];
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function bumpLikelihood(l: Likelihood, dir: "up" | "down"): Likelihood {
  const order: Likelihood[] = ["Düşük", "Orta", "Yüksek"];
  const i = order.indexOf(l);
  const next = dir === "up" ? Math.min(i + 1, order.length - 1) : Math.max(i - 1, 0);
  return order[next] ?? l;
}

function LikelihoodBadge({ v }: { v: Likelihood }) {
  const variant = v === "Yüksek" ? "default" : v === "Orta" ? "secondary" : "outline";
  return <Badge variant={variant}>{v}</Badge>;
}

function UrgencyBadge({ v }: { v: Suggestion["urgency"] }) {
  const variant = v === "Acil" ? "default" : v === "Öncelikli" ? "secondary" : "outline";
  return <Badge variant={variant}>{v}</Badge>;
}

function toNum(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function formatMm(n: number | null, fallback = "—") {
  if (n === null) return fallback;
  const s = Number.isInteger(n) ? `${n}` : `${n}`;
  return `${s} mm`;
}

function toggleInArray<T extends string>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function joinHuman(list: string[]) {
  if (list.length === 0) return "";
  if (list.length === 1) return list[0]!;
  if (list.length === 2) return `${list[0]} ve ${list[1]}`;
  return `${list.slice(0, -1).join(", ")} ve ${list[list.length - 1]}`;
}

/** ---- Extra-axial "age" helpers ---- */
type ExtraAxialAge = "Bilinmiyor" | "Akut" | "Subakut" | "Kronik" | "Akut üzerine kronik";
type CtDensity = "Bilinmiyor" | "Hiperdens" | "İzodens" | "Hipodens" | "Miks";

function inferExtraAxialAgeFromCT(d: CtDensity): { guess: ExtraAxialAge; note: string } {
  if (d === "Miks") return { guess: "Akut üzerine kronik", note: "Miks densite, akut üzerine kronik ile uyumlu olabilir." };
  if (d === "Hiperdens") return { guess: "Akut", note: "Hiperdensite akut kanama lehine olabilir." };
  if (d === "Hipodens") return { guess: "Kronik", note: "Hipodensite kronik koleksiyon lehine olabilir." };
  if (d === "İzodens") return { guess: "Subakut", note: "İzodens koleksiyon subakut dönemde görülebilir." };
  return { guess: "Bilinmiyor", note: "Densite seçilmedi; evre için otomatik öneri yok." };
}

function ageWordTR(age: ExtraAxialAge): string {
  if (age === "Bilinmiyor") return "ekstraaksiyel";
  if (age === "Akut") return "akut";
  if (age === "Subakut") return "subakut";
  if (age === "Kronik") return "kronik";
  return "akut üzerine kronik";
}

/** ---- Mass effect / herniation helpers ---- */
type Effacement = "yok" | "hafif" | "belirgin";
type Herniation = "Subfalksin" | "Unkal" | "Tonsiller" | "Transtentoriyal (downward)";
type EffectSide = "Bilinmiyor" | "İpsilateral" | "Bilateral" | "Kontralateral";

function effacementPhraseTR(kind: "sulkal" | "bazal sistern", v: Effacement): string {
  if (v === "yok") return "";
  if (kind === "sulkal") return v === "hafif" ? "sulkal effasman (hafif)" : "sulkal effasman (belirgin)";
  return v === "hafif" ? "bazal sisternlerde effasman (hafif)" : "bazal sisternlerde effasman (belirgin)";
}

function herniationPhraseTR(list: Herniation[]): string {
  if (list.length === 0) return "";
  const map: Record<Herniation, string> = {
    Subfalksin: "subfalksin herniasyon",
    Unkal: "unkal herniasyon",
    Tonsiller: "tonsiller herniasyon",
    "Transtentoriyal (downward)": "transtentoriyal (downward) herniasyon",
  };
  return `${joinHuman(list.map((x) => map[x]))} lehine bulgular`;
}

function effectSideTR(v: EffectSide): string {
  if (v === "Bilinmiyor") return "";
  if (v === "İpsilateral") return "ipsilateral";
  if (v === "Bilateral") return "bilateral";
  return "kontralateral";
}

function ventriclePhraseTR(sev: Effacement, side: EffectSide): string {
  if (sev === "yok") return "";
  const s = effectSideTR(side);
  const sidePart = s ? `${s} ` : "";
  return `${sidePart}lateral ventrikül kompresyonu (${sev})`;
}

function massEffectUrgency(
  mlsMm: number | null,
  cistern: Effacement,
  herniations: Herniation[],
  ventricleComp: Effacement
): "Acil" | "Öncelikli" | "Rutin" {
  if (herniations.length > 0) return "Acil";
  if (cistern === "belirgin") return "Acil";
  if (mlsMm !== null && mlsMm >= 5) return "Acil";
  if (ventricleComp === "belirgin") return "Öncelikli";
  if (cistern === "hafif") return "Öncelikli";
  if (mlsMm !== null && mlsMm > 0) return "Öncelikli";
  if (ventricleComp === "hafif") return "Öncelikli";
  return "Rutin";
}

/** -----------------------------
 * Brain module (v1.4)
 * Added: SDH/EDH effect side + lateral ventricle compression (severity + side) + sentence + urgency
 * ----------------------------- */
function BrainModule() {
  const [modality, setModality] = useState<Modality>("BT");
  const [flow, setFlow] = useState<BrainFlow>("travma");

  // Common clinical toggles
  const [knownMalignancy, setKnownMalignancy] = useState(false);
  const [feverSepsis, setFeverSepsis] = useState(false);
  const [traumaHx, setTraumaHx] = useState(false);
  const [anticoagulant, setAnticoagulant] = useState(false);

  // Free text
  const [incidental, setIncidental] = useState("");

  /** KANAMA fields */
  const [bleedType, setBleedType] = useState<"yok" | "SAH" | "IVH" | "ICH" | "SDH" | "EDH" | "bilinmiyor">("bilinmiyor");
  const [bleedLocation, setBleedLocation] = useState<"bilinmiyor" | "lobar" | "derin (BG/talamus)" | "pons" | "serebellum">("bilinmiyor");
  const [intraventricularExt, setIntraventricularExt] = useState(false);
  const [hydrocephalus, setHydrocephalus] = useState(false);

  // MR adjunct (light)
  const [swiBlooming, setSwiBlooming] = useState<"bilinmiyor" | "var" | "yok">("bilinmiyor");
  const [dwiRestriction, setDwiRestriction] = useState<"bilinmiyor" | "var" | "yok">("bilinmiyor");

  /** SDH/EDH detailed descriptors */
  const [extraAxialSide, setExtraAxialSide] = useState<"Sağ" | "Sol" | "Bilateral" | "Orta hat" | "Bilinmiyor">("Bilinmiyor");
  const [sdhRegions, setSdhRegions] = useState<Array<"Frontal" | "Temporal" | "Parietal" | "Oksipital" | "Falx boyunca" | "Tentoryum boyunca" | "Interhemisferik">>([]);
  const [edhRegions, setEdhRegions] = useState<Array<"Frontal" | "Temporal" | "Parietal" | "Oksipital" | "Bilinmiyor">>([]);
  const [extraAxialThicknessMm, setExtraAxialThicknessMm] = useState<string>("");
  const [midlineShiftMm, setMidlineShiftMm] = useState<string>("");

  // Age + CT density assist
  const [extraAxialAge, setExtraAxialAge] = useState<ExtraAxialAge>("Bilinmiyor");
  const [ctDensity, setCtDensity] = useState<CtDensity>("Bilinmiyor");

  // Mass effect + herniation (SDH/EDH)
  const [sulcalEff, setSulcalEff] = useState<Effacement>("yok");
  const [basalCisternEff, setBasalCisternEff] = useState<Effacement>("yok");
  const [herniations, setHerniations] = useState<Herniation[]>([]);

  // NEW: effect side + ventricle compression
  const [effectSide, setEffectSide] = useState<EffectSide>("Bilinmiyor");
  const [ventricleCompression, setVentricleCompression] = useState<Effacement>("yok");
  const [ventricleCompressionSide, setVentricleCompressionSide] = useState<EffectSide>("Bilinmiyor");

  /** KİTLE/ENF fields (kept light) */
  const [massPresent, setMassPresent] = useState(false);
  const [ringEnhancing, setRingEnhancing] = useState<"bilinmiyor" | "var" | "yok">("bilinmiyor");
  const [edema, setEdema] = useState<"yok" | "hafif" | "belirgin" | "bilinmiyor">("bilinmiyor");
  const [multiLesion, setMultiLesion] = useState<"bilinmiyor" | "tek" | "coklu">("bilinmiyor");
  const [cbvHigh, setCbvHigh] = useState<"bilinmiyor" | "yuksek" | "dusuk">("bilinmiyor");

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  const isExtraAxialDetail = flow === "kanama" && (bleedType === "SDH" || bleedType === "EDH");

  const ageAssist = useMemo(() => {
    if (!isExtraAxialDetail) return { guess: "Bilinmiyor" as ExtraAxialAge, note: "" };
    if (modality !== "BT") return { guess: "Bilinmiyor" as ExtraAxialAge, note: "MR için otomatik evre önerisi kapalı (manuel seçebilirsin)." };
    const { guess, note } = inferExtraAxialAgeFromCT(ctDensity);
    return { guess, note };
  }, [isExtraAxialDetail, modality, ctDensity]);

  const resolvedAge: ExtraAxialAge = useMemo(() => {
    if (!isExtraAxialDetail) return "Bilinmiyor";
    if (extraAxialAge !== "Bilinmiyor") return extraAxialAge;
    if (ageAssist.guess !== "Bilinmiyor") return ageAssist.guess;
    return "Bilinmiyor";
  }, [isExtraAxialDetail, extraAxialAge, ageAssist.guess]);

  const resolvedMlsMm = useMemo(() => toNum(midlineShiftMm), [midlineShiftMm]);
  const resolvedThicknessMm = useMemo(() => toNum(extraAxialThicknessMm), [extraAxialThicknessMm]);

  const massEffectText = useMemo(() => {
    if (!isExtraAxialDetail) return "";

    const sideTxt = effectSideTR(effectSide);
    const sidePart = sideTxt ? `${sideTxt} ` : "";

    const parts = [
      effacementPhraseTR("sulkal", sulcalEff),
      effacementPhraseTR("bazal sistern", basalCisternEff),
      ventriclePhraseTR(ventricleCompression, ventricleCompressionSide),
      herniationPhraseTR(herniations),
    ].filter(Boolean);

    if (parts.length === 0) return "";

    // SidePart only makes sense if there is an overall mass-effect statement
    const prefix = sidePart ? `${sidePart}kitle etkisi lehine ` : "Kitle etkisi lehine ";
    return ` ${prefix}${joinHuman(parts)}.`;
  }, [isExtraAxialDetail, effectSide, sulcalEff, basalCisternEff, ventricleCompression, ventricleCompressionSide, herniations]);

  const extraAxialSentence = useMemo(() => {
    const isSDH = bleedType === "SDH";
    const isEDH = bleedType === "EDH";
    if (!isSDH && !isEDH) return "";

    const typeText = isSDH ? "subdural hematom" : "epidural hematom";

    const sideText =
      extraAxialSide === "Bilinmiyor"
        ? ""
        : extraAxialSide === "Orta hat"
          ? "orta hat boyunca"
          : extraAxialSide.toLowerCase();

    const regionList = isSDH ? sdhRegions : edhRegions;
    const regionText = regionList.length ? joinHuman(regionList.map((x) => x.toLowerCase())) : "";

    const locParts = [sideText, regionText].filter(Boolean);
    const loc = locParts.length ? `${locParts.join(" ")} ` : "";

    const thicknessPart = resolvedThicknessMm !== null ? `maksimum ~${formatMm(resolvedThicknessMm)} kalınlıkta ` : "";

    const ageWord = ageWordTR(resolvedAge);
    const prefix = ageWord === "ekstraaksiyel" ? "" : `${ageWord} `;

    const mlsPart = resolvedMlsMm !== null && resolvedMlsMm > 0 ? ` Orta hat ~${formatMm(resolvedMlsMm)} deviyedir.` : "";

    return `${loc}${thicknessPart}${prefix}${typeText} izlenmektedir.${mlsPart}${massEffectText}`.replace(/\s+/g, " ").trim();
  }, [
    bleedType,
    extraAxialSide,
    sdhRegions,
    edhRegions,
    resolvedThicknessMm,
    resolvedMlsMm,
    resolvedAge,
    massEffectText,
  ]);

  const ddxAndSuggestions = useMemo(() => {
    let ddx: DdxItem[] = [];
    const suggestions: Suggestion[] = [];

    const ctxWhy: string[] = [];
    if (knownMalignancy) ctxWhy.push("Bilinen malignite öyküsü.");
    if (feverSepsis) ctxWhy.push("Ateş/sepsis kliniği.");
    if (anticoagulant) ctxWhy.push("Antikoagülan/antiagregan kullanımı.");

    if (flow === "kanama") {
      // SDH/EDH with mass effect / herniation thresholds
      if (bleedType === "SDH" || bleedType === "EDH") {
        let l: Likelihood = "Orta";

        const urgency = massEffectUrgency(resolvedMlsMm, basalCisternEff, herniations, ventricleCompression);

        const why: string[] = [
          ...ctxWhy,
          extraAxialSentence ? `Rapor cümlesi: "${extraAxialSentence}"` : "Ekstraaksiyel kanama parametreleri seçildi.",
        ];

        if (anticoagulant && bleedType === "SDH") {
          l = bumpLikelihood(l, "up");
          why.push("Antikoagülan kullanımı SDH riskini artırır.");
        }

        if (modality === "BT" && ctDensity !== "Bilinmiyor") {
          why.push(`BT densitesi: ${ctDensity}.`);
          if (extraAxialAge === "Bilinmiyor" && ageAssist.guess !== "Bilinmiyor") {
            why.push(`Evre için otomatik öneri: ${ageAssist.guess} (yardımcı).`);
          }
        }

        if (urgency === "Acil") l = bumpLikelihood(l, "up");

        // ACIL / Öncelikli suggestion
        if (urgency === "Acil") {
          const details: string[] = [];
          if (resolvedMlsMm !== null && resolvedMlsMm >= 5) details.push("Midline shift ≥ 5 mm.");
          if (basalCisternEff === "belirgin") details.push("Bazal sistern effacement belirgin.");
          if (herniations.length > 0) details.push(`Herniasyon: ${joinHuman(herniations)}.`);
          if (ventricleCompression === "belirgin") details.push("Belirgin lateral ventrikül kompresyonu.");
          if (details.length === 0) details.push("Kitle etkisi/hayati risk lehine bulgular.");

          suggestions.push({
            title: "Kitle etkisi / herniasyon riski: acil klinik korelasyon ve nöroşirürji",
            urgency: "Acil",
            details: [
              ...details,
              "Klinik durum ve nörolojik muayene ile birlikte değerlendirilmelidir.",
              "Gerekirse seri görüntüleme / acil müdahale planı nöroşirürji ile belirlenir.",
            ],
          });
        } else if (urgency === "Öncelikli") {
          const details: string[] = [];
          if (resolvedMlsMm !== null && resolvedMlsMm > 0) details.push("Midline shift mevcut.");
          if (basalCisternEff === "hafif") details.push("Bazal sisternlerde hafif effacement.");
          if (ventricleCompression !== "yok") details.push("Lateral ventrikül kompresyonu mevcut.");
          suggestions.push({
            title: "Kitle etkisi açısından yakın klinik korelasyon",
            urgency: "Öncelikli",
            details: details.length ? details : ["Hafif kitle etkisi lehine bulgular; klinik korelasyon/izlem önerilir."],
          });
        }

        if (resolvedThicknessMm !== null && resolvedThicknessMm >= 10) {
          suggestions.push({
            title: "Hematoma kalınlığı artmış olabilir: klinik önem",
            urgency: urgency === "Acil" ? "Acil" : "Öncelikli",
            details: ["Maksimum kalınlık ≥ 10 mm.", "Kitle etkisi ve klinik durumla birlikte değerlendirilmelidir."],
          });
        }

        ddx.push({
          name: bleedType === "SDH" ? "Subdural hematom" : "Epidural hematom",
          likelihood: l,
          why,
        });
      } else if (bleedType === "bilinmiyor" || bleedType === "yok") {
        ddx.push({ name: "Belirgin akut kanama lehine güçlü parametre seçilmedi", likelihood: "Düşük", why: ["Kanama tipi seçimi net değil veya 'yok' seçildi."] });
      } else {
        // Other types kept minimal
        ddx.push({ name: "Diğer kanama tipi (v1.4'te minimal)", likelihood: "Orta", why: ["Bu akışta SDH/EDH detay motoru önceliklidir."] });
      }

      if (hydrocephalus) {
        suggestions.push({
          title: "Hidrocefalus: acil klinik korelasyon",
          urgency: "Acil",
          details: ["BOS drenajı/endoskopik seçenekler nöroşirürji ile değerlendirilir."],
        });
      }

      if (modality === "MR") {
        if (swiBlooming === "var") ddx.unshift({ name: "Hemorajik ürün/blooming (SWI)", likelihood: "Orta", why: ["SWI blooming; hemoraji ürünleri veya mikrokanama ile uyumlu olabilir."] });
        if (dwiRestriction === "var" && feverSepsis) ddx.unshift({ name: "Enfeksiyöz süreç / apse olasılığı (DWI+ + klinik)", likelihood: "Orta", why: ["DWI restriksiyon + ateş/sepsis kliniği enfeksiyon lehine olabilir."] });
      }
    }

    if (flow === "kitle") {
      if (!massPresent) {
        ddx.push({ name: "Kitle/enfeksiyon açısından belirgin bulgu seçilmedi", likelihood: "Düşük", why: ["Kitle var seçilmedi."] });
      } else {
        suggestions.push({
          title: "Kitle/enfeksiyon ayrımı için kontrastlı beyin MR önerilir",
          urgency: "Öncelikli",
          details: ["T1 pre/post + FLAIR", "DWI/ADC", "SWI", "Gerekirse perfüzyon (CBV)"],
        });

        ddx.push({ name: "Kitle (v1.4 minimal)", likelihood: "Orta", why: ["Bu sürümde öncelik ekstraaksiyel kanamadır."] });
      }
    }

    if (flow === "travma") {
      ddx.push({ name: "Travma akışı (v1.4 minimal)", likelihood: "Orta", why: ["Bu sürümde öncelik SDH/EDH kitle etkisidir."] });
    }

    const order: Record<Likelihood, number> = { Yüksek: 3, Orta: 2, Düşük: 1 };
    ddx = ddx.sort((a, b) => order[b.likelihood] - order[a.likelihood]).slice(0, 6);

    let final: string;
    if (flow === "kanama" && (bleedType === "SDH" || bleedType === "EDH") && extraAxialSentence) {
      final = `${modality} incelemede ${extraAxialSentence} Klinik korelasyon önerilir.`.replace(/\s+/g, " ").trim();
    } else {
      final = `${modality} incelemede belirgin akut patoloji izlenmemektedir. Klinik korelasyon önerilir.`;
    }

    return { ddx, suggestions, final };
  }, [
    modality,
    flow,
    knownMalignancy,
    feverSepsis,
    anticoagulant,
    bleedType,
    hydrocephalus,
    swiBlooming,
    dwiRestriction,
    // extra-axial
    extraAxialSide,
    sdhRegions,
    edhRegions,
    extraAxialThicknessMm,
    midlineShiftMm,
    extraAxialAge,
    ctDensity,
    resolvedAge,
    ageAssist.guess,
    ageAssist.note,
    sulcalEff,
    basalCisternEff,
    herniations,
    effectSide,
    ventricleCompression,
    ventricleCompressionSide,
    massEffectText,
    extraAxialSentence,
    resolvedMlsMm,
    resolvedThicknessMm,
    // kitle
    massPresent,
    ringEnhancing,
    edema,
    multiLesion,
    cbvHigh,
    intraventricularExt,
    bleedLocation,
  ]);

  const { ddx, suggestions, final } = ddxAndSuggestions;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Left */}
      <div className="space-y-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Beyin AI Yardımcı Modül (v1.4)</CardTitle>
            <p className="text-sm text-muted-foreground">SDH/EDH: kitle etkisi tarafı + lateral ventrikül kompresyonu eklendi.</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>İnceleme tipi</Label>
              <div className="flex flex-wrap gap-2">
                {(["BT", "MR"] as Modality[]).map((v) => (
                  <Button key={v} size="sm" variant={modality === v ? "default" : "outline"} onClick={() => setModality(v)}>
                    {v}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Akış</Label>
              <div className="flex flex-wrap gap-2">
                {([
                  { key: "travma", label: "Travma" },
                  { key: "kanama", label: "Kanama" },
                  { key: "kitle", label: "Kitle / Enfeksiyon" },
                ] as Array<{ key: BrainFlow; label: string }>).map((x) => (
                  <Button key={x.key} size="sm" variant={flow === x.key ? "default" : "outline"} onClick={() => setFlow(x.key)}>
                    {x.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Bu adımda ağırlık SDH/EDH rapor dilidir.</p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="text-sm font-medium">Klinik zemin / bağlam</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <div className="text-sm font-medium">Bilinen malignite</div>
                    <div className="text-xs text-muted-foreground">Kitle akışında daha kritik</div>
                  </div>
                  <Switch checked={knownMalignancy} onCheckedChange={setKnownMalignancy} />
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <div className="text-sm font-medium">Ateş / sepsis</div>
                    <div className="text-xs text-muted-foreground">Enfeksiyon lehine</div>
                  </div>
                  <Switch checked={feverSepsis} onCheckedChange={setFeverSepsis} />
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <div className="text-sm font-medium">Antikoagülan / antiagregan</div>
                    <div className="text-xs text-muted-foreground">SDH riskini artırır</div>
                  </div>
                  <Switch checked={anticoagulant} onCheckedChange={setAnticoagulant} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KANAMA */}
        {flow === "kanama" && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Kanama</CardTitle>
              <p className="text-sm text-muted-foreground">SDH/EDH için: rapor cümlesi + kitle etkisi + ventrikül kompresyonu.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 rounded-xl border p-3">
                <div className="text-sm font-medium">Kanama tipi</div>
                <div className="flex flex-wrap gap-2">
                  {(["bilinmiyor", "yok", "SAH", "IVH", "ICH", "SDH", "EDH"] as const).map((v) => (
                    <Button key={v} size="sm" variant={bleedType === v ? "default" : "outline"} onClick={() => setBleedType(v)}>
                      {v}
                    </Button>
                  ))}
                </div>
              </div>

              {isExtraAxialDetail && (
                <div className="space-y-3 rounded-2xl border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Ekstraaksiyel hematom detayları</div>
                      <div className="text-xs text-muted-foreground">Yeni: kitle etkisi tarafı + lateral ventrikül kompresyonu</div>
                    </div>
                    <Badge variant="secondary">{bleedType}</Badge>
                  </div>

                  {/* Age */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Evre (manuel)</div>
                    <div className="flex flex-wrap gap-2">
                      {(["Bilinmiyor", "Akut", "Subakut", "Kronik", "Akut üzerine kronik"] as ExtraAxialAge[]).map((v) => (
                        <Button key={v} size="sm" variant={extraAxialAge === v ? "default" : "outline"} onClick={() => setExtraAxialAge(v)}>
                          {v}
                        </Button>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">“Bilinmiyor” bırakırsan BT densite seçimine göre yardımcı öneri çıkar.</div>
                  </div>

                  {/* CT density assist */}
                  {modality === "BT" && (
                    <div className="space-y-2 rounded-xl border p-3">
                      <div className="text-sm font-medium">BT densite (yardımcı)</div>
                      <div className="flex flex-wrap gap-2">
                        {(["Bilinmiyor", "Hiperdens", "İzodens", "Hipodens", "Miks"] as CtDensity[]).map((v) => (
                          <Button key={v} size="sm" variant={ctDensity === v ? "default" : "outline"} onClick={() => setCtDensity(v)}>
                            {v}
                          </Button>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {ageAssist.note || ""}
                        {ageAssist.guess !== "Bilinmiyor" && extraAxialAge === "Bilinmiyor" && (
                          <div className="mt-1">
                            Önerilen evre: <span className="font-medium">{ageAssist.guess}</span> (manuel seçerek override edebilirsin)
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Laterality */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Hematoma lateralitesi</div>
                    <div className="flex flex-wrap gap-2">
                      {(["Sağ", "Sol", "Bilateral", "Orta hat", "Bilinmiyor"] as const).map((v) => (
                        <Button key={v} size="sm" variant={extraAxialSide === v ? "default" : "outline"} onClick={() => setExtraAxialSide(v)}>
                          {v}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Regions */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Dağılım / bölge</div>
                    {bleedType === "SDH" ? (
                      <div className="flex flex-wrap gap-2">
                        {(["Frontal", "Temporal", "Parietal", "Oksipital", "Falx boyunca", "Tentoryum boyunca", "Interhemisferik"] as const).map((r) => (
                          <Button key={r} size="sm" variant={sdhRegions.includes(r) ? "default" : "outline"} onClick={() => setSdhRegions((prev) => toggleInArray(prev, r))}>
                            {r}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(["Frontal", "Temporal", "Parietal", "Oksipital", "Bilinmiyor"] as const).map((r) => (
                          <Button key={r} size="sm" variant={edhRegions.includes(r) ? "default" : "outline"} onClick={() => setEdhRegions((prev) => toggleInArray(prev, r))}>
                            {r}
                          </Button>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">Birden fazla bölge seçebilirsin (özellikle SDH için).</div>
                  </div>

                  {/* Thickness + MLS */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2 rounded-xl border p-3">
                      <Label className="text-sm">Maksimum kalınlık (mm)</Label>
                      <Input inputMode="decimal" placeholder="örn: 6" value={extraAxialThicknessMm} onChange={(e) => setExtraAxialThicknessMm(e.target.value)} />
                      <div className="text-xs text-muted-foreground">Rapor: “maksimum ~X mm kalınlıkta”</div>
                    </div>

                    <div className="space-y-2 rounded-xl border p-3">
                      <Label className="text-sm">Midline shift (mm)</Label>
                      <Input inputMode="decimal" placeholder="örn: 4" value={midlineShiftMm} onChange={(e) => setMidlineShiftMm(e.target.value)} />
                      <div className="text-xs text-muted-foreground">Rapor: “Orta hat ~X mm deviyedir”</div>
                    </div>
                  </div>

                  {/* Mass effect */}
                  <div className="space-y-2 rounded-2xl border p-4">
                    <div className="text-sm font-semibold">Kitle etkisi / herniasyon</div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Kitle etkisinin tarafı</div>
                      <div className="flex flex-wrap gap-2">
                        {(["Bilinmiyor", "İpsilateral", "Bilateral", "Kontralateral"] as EffectSide[]).map((v) => (
                          <Button key={v} size="sm" variant={effectSide === v ? "default" : "outline"} onClick={() => setEffectSide(v)}>
                            {v}
                          </Button>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground">Genellikle hematom tarafına “ipsilateral” seçilir; bilateral SDH’de “bilateral” daha uygundur.</div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2 rounded-xl border p-3">
                        <div className="text-sm font-medium">Sulkus effacement</div>
                        <div className="flex flex-wrap gap-2">
                          {(["yok", "hafif", "belirgin"] as Effacement[]).map((v) => (
                            <Button key={v} size="sm" variant={sulcalEff === v ? "default" : "outline"} onClick={() => setSulcalEff(v)}>
                              {v}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 rounded-xl border p-3">
                        <div className="text-sm font-medium">Bazal sistern effacement</div>
                        <div className="flex flex-wrap gap-2">
                          {(["yok", "hafif", "belirgin"] as Effacement[]).map((v) => (
                            <Button key={v} size="sm" variant={basalCisternEff === v ? "default" : "outline"} onClick={() => setBasalCisternEff(v)}>
                              {v}
                            </Button>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground">“Belirgin” seçimi ACİL uyarısını tetikler.</div>
                      </div>
                    </div>

                    {/* NEW: Ventricle compression */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2 rounded-xl border p-3">
                        <div className="text-sm font-medium">Lateral ventrikül kompresyonu</div>
                        <div className="flex flex-wrap gap-2">
                          {(["yok", "hafif", "belirgin"] as Effacement[]).map((v) => (
                            <Button key={v} size="sm" variant={ventricleCompression === v ? "default" : "outline"} onClick={() => setVentricleCompression(v)}>
                              {v}
                            </Button>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground">“Belirgin” → öneri aciliyeti yükselir.</div>
                      </div>

                      <div className={cn("space-y-2 rounded-xl border p-3", ventricleCompression === "yok" && "opacity-60")}>
                        <div className="text-sm font-medium">Kompresyon tarafı</div>
                        <div className="flex flex-wrap gap-2">
                          {(["Bilinmiyor", "İpsilateral", "Bilateral", "Kontralateral"] as EffectSide[]).map((v) => (
                            <Button
                              key={v}
                              size="sm"
                              variant={ventricleCompressionSide === v ? "default" : "outline"}
                              onClick={() => setVentricleCompressionSide(v)}
                              disabled={ventricleCompression === "yok"}
                            >
                              {v}
                            </Button>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground">Kompresyon “yok” ise bu alan pasif.</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Herniasyon bulguları</div>
                      <div className="flex flex-wrap gap-2">
                        {(["Subfalksin", "Unkal", "Tonsiller", "Transtentoriyal (downward)"] as Herniation[]).map((h) => (
                          <Button key={h} size="sm" variant={herniations.includes(h) ? "default" : "outline"} onClick={() => setHerniations((prev) => toggleInArray(prev, h))}>
                            {h}
                          </Button>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground">Herhangi bir herniasyon seçimi ACİL uyarısını tetikler.</div>
                    </div>
                  </div>

                  {/* Auto sentence */}
                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-muted-foreground mb-1">Otomatik rapor cümlesi</div>
                    <div className="text-sm">{extraAxialSentence || "Seçimleri doldurdukça burada cümle oluşur."}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyText(extraAxialSentence || "")} disabled={!extraAxialSentence}>
                        Cümleyi kopyala
                      </Button>
                      <Badge variant="outline">Evre: {resolvedAge}</Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Minimal extras kept */}
              <div className={cn("grid gap-3 sm:grid-cols-2", !isExtraAxialDetail && "opacity-60")}>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <div className="text-sm font-medium">IVH eşlik / uzanım</div>
                    <div className="text-xs text-muted-foreground">Varlığı aciliyet/risk artırabilir</div>
                  </div>
                  <Switch checked={intraventricularExt} onCheckedChange={setIntraventricularExt} />
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <div className="text-sm font-medium">Hidrocefalus</div>
                    <div className="text-xs text-muted-foreground">Acil uyarı üretir</div>
                  </div>
                  <Switch checked={hydrocephalus} onCheckedChange={setHydrocephalus} />
                </div>
              </div>

              {modality === "MR" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 rounded-xl border p-3">
                    <div className="text-sm font-medium">SWI blooming</div>
                    <div className="flex flex-wrap gap-2">
                      {(["bilinmiyor", "var", "yok"] as const).map((v) => (
                        <Button key={v} size="sm" variant={swiBlooming === v ? "default" : "outline"} onClick={() => setSwiBlooming(v)}>
                          {v}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 rounded-xl border p-3">
                    <div className="text-sm font-medium">DWI restriksiyon</div>
                    <div className="flex flex-wrap gap-2">
                      {(["bilinmiyor", "var", "yok"] as const).map((v) => (
                        <Button key={v} size="sm" variant={dwiRestriction === v ? "default" : "outline"} onClick={() => setDwiRestriction(v)}>
                          {v}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Incidental */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Ek / İnsidental bulgular</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea value={incidental} onChange={(e) => setIncidental(e.target.value)} placeholder="Serbest metin ekle; final çıktıya eklenir." />
            <p className="text-xs text-muted-foreground">Not: Bu modül karar destek amaçlıdır; kesin tanı/tedavi için klinik korelasyon gereklidir.</p>
          </CardContent>
        </Card>
      </div>

      {/* Right panel */}
      <div className="lg:sticky lg:top-6 h-fit space-y-4">
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">AI Çıktı</CardTitle>
              <p className="text-xs text-muted-foreground">Seçimlere göre canlı güncellenir.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(final)}>
              Kopyala
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground mb-1">Final (tek cümle)</div>
              <div className="text-sm">{final}</div>
              {incidental.trim().length > 0 && (
                <div className="mt-2 text-sm">
                  <span className="text-xs text-muted-foreground">Ek:</span> {incidental.trim()}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">DDX (Top)</div>
              <div className="space-y-2">
                {ddx.map((d) => (
                  <div key={d.name} className="rounded-xl border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium">{d.name}</div>
                      <LikelihoodBadge v={d.likelihood} />
                    </div>
                    <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground space-y-1">
                      {d.why.slice(0, 3).map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Öneriler</div>
              {suggestions.length === 0 ? (
                <div className="text-sm text-muted-foreground rounded-xl border p-3">Bu seçimlerle otomatik öneri oluşmadı.</div>
              ) : (
                <div className="space-y-2">
                  {suggestions.map((s) => (
                    <div key={s.title} className="rounded-xl border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium">{s.title}</div>
                        <UrgencyBadge v={s.urgency} />
                      </div>
                      <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground space-y-1">
                        {s.details.slice(0, 6).map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />
            <div className="text-xs text-muted-foreground">Bu sistem “kural tabanlı karar destek”tir; görüntüler ve klinik bilgilerle birlikte değerlendirilmelidir.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Page() {
  const router = useRouter();
  const [organ, setOrgan] = useState<Organ>("liver");

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">radiology-clean</h1>
          <p className="text-sm text-muted-foreground">
            Organ seçimi → ilgili modül açılır. (Karaciğer ayrı route: <span className="font-medium">/liver</span>)
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={organ === "liver" ? "default" : "outline"}
            onClick={() => {
              setOrgan("liver");
              router.push("/liver");
            }}
          >
            Karaciğer
          </Button>
          <Button variant={organ === "brain" ? "default" : "outline"} onClick={() => setOrgan("brain")}>
            Beyin
          </Button>
        </div>
      </div>

      {organ === "brain" ? (
        <BrainModule />
      ) : (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Karaciğer modülü</CardTitle>
            <p className="text-sm text-muted-foreground">Karaciğer modülü ayrı sayfada çalışır.</p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={() => router.push("/liver")}>Karaciğer modülüne git</Button>
            <Button variant="outline" onClick={() => setOrgan("brain")}>
              Beyin modülünü aç
            </Button>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
