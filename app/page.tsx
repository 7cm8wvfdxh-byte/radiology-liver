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

type DdxItem = { name: string; likelihood: Likelihood; why: string[] };
type Suggestion = { title: string; urgency: "Acil" | "Öncelikli" | "Rutin"; details: string[] };

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
  return `${Number.isInteger(n) ? n : n} mm`;
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

/** ---- MRI intensity scale with intermediate options ---- */
type Intensity5 = "Belirsiz" | "Hipointens" | "Hafif hiperintens" | "Hiperintens" | "Belirgin hiperintens";
type T2Scale = "Belirsiz" | "Hipointens" | "İzo" | "Hafif hiperintens" | "Hiperintens" | "Belirgin hiperintens";

/** ---- Protocol selections (new) ---- */
type CTPackage = "Non-kontrast BT" | "CTA" | "CTV" | "CTP";
type MRPackage = "Non-kontrast MR" | "Kontrastlı MR" | "MRA" | "MRV" | "Perfüzyon (DSC/ASL)";

type EnhancementPattern =
  | "Belirsiz"
  | "Kontrast yok"
  | "Solid"
  | "Ring (ince-düzgün)"
  | "Ring (kalın/irregüler)"
  | "Dural tail / ekstraaksiyel"
  | "Leptomeningeal/pial";

/** -----------------------------
 * Brain module (v1.5)
 * Added: Robust TRAVMA + KITLE protocols (CT/MR package selection + contrast/angiography/perfusion)
 * Keeps SDH/EDH mass-effect engine intact.
 * ----------------------------- */
function BrainModule() {
  const [modality, setModality] = useState<Modality>("BT");
  const [flow, setFlow] = useState<BrainFlow>("travma");

  // Common clinical toggles
  const [knownMalignancy, setKnownMalignancy] = useState(false);
  const [feverSepsis, setFeverSepsis] = useState(false);
  const [traumaHx, setTraumaHx] = useState(true);
  const [anticoagulant, setAnticoagulant] = useState(false);

  const [incidental, setIncidental] = useState("");

  /** ---------- PROTOCOLS ---------- */
  const [ctPackage, setCtPackage] = useState<CTPackage>("Non-kontrast BT");
  const [mrPackage, setMrPackage] = useState<MRPackage>("Non-kontrast MR");

  /** ---------- TRAVMA fields ---------- */
  const [gcsLow, setGcsLow] = useState(false);
  const [focalDeficit, setFocalDeficit] = useState(false);

  const [skullFractureSuspect, setSkullFractureSuspect] = useState(false);
  const [pneumocephalus, setPneumocephalus] = useState(false);
  const [contusion, setContusion] = useState(false);
  const [daiSuspect, setDaiSuspect] = useState<"yok" | "var" | "bilinmiyor">("bilinmiyor");

  // Vascular injury suspicion in trauma
  const [vascularInjurySuspect, setVascularInjurySuspect] = useState(false); // dissection/active bleeding risk
  const [venousSinusInjurySuspect, setVenousSinusInjurySuspect] = useState(false);

  /** ---------- KANAMA fields ---------- */
  const [bleedType, setBleedType] = useState<"yok" | "SAH" | "IVH" | "ICH" | "SDH" | "EDH" | "bilinmiyor">("bilinmiyor");
  const [bleedLocation, setBleedLocation] = useState<"bilinmiyor" | "lobar" | "derin (BG/talamus)" | "pons" | "serebellum">("bilinmiyor");
  const [intraventricularExt, setIntraventricularExt] = useState(false);
  const [hydrocephalus, setHydrocephalus] = useState(false);

  // MR adjunct for bleed (light)
  const [swiBlooming, setSwiBlooming] = useState<"bilinmiyor" | "var" | "yok">("bilinmiyor");
  const [dwiRestriction, setDwiRestriction] = useState<"bilinmiyor" | "var" | "yok">("bilinmiyor");

  /** ---------- SDH/EDH detailed descriptors ---------- */
  const [extraAxialSide, setExtraAxialSide] = useState<"Sağ" | "Sol" | "Bilateral" | "Orta hat" | "Bilinmiyor">("Bilinmiyor");
  const [sdhRegions, setSdhRegions] = useState<Array<"Frontal" | "Temporal" | "Parietal" | "Oksipital" | "Falx boyunca" | "Tentoryum boyunca" | "Interhemisferik">>([]);
  const [edhRegions, setEdhRegions] = useState<Array<"Frontal" | "Temporal" | "Parietal" | "Oksipital" | "Bilinmiyor">>([]);
  const [extraAxialThicknessMm, setExtraAxialThicknessMm] = useState<string>("");
  const [midlineShiftMm, setMidlineShiftMm] = useState<string>("");

  const [extraAxialAge, setExtraAxialAge] = useState<ExtraAxialAge>("Bilinmiyor");
  const [ctDensity, setCtDensity] = useState<CtDensity>("Bilinmiyor");

  const [sulcalEff, setSulcalEff] = useState<Effacement>("yok");
  const [basalCisternEff, setBasalCisternEff] = useState<Effacement>("yok");
  const [herniations, setHerniations] = useState<Herniation[]>([]);
  const [effectSide, setEffectSide] = useState<EffectSide>("Bilinmiyor");
  const [ventricleCompression, setVentricleCompression] = useState<Effacement>("yok");
  const [ventricleCompressionSide, setVentricleCompressionSide] = useState<EffectSide>("Bilinmiyor");

  /** ---------- KİTLE/ENF fields (stronger) ---------- */
  const [massPresent, setMassPresent] = useState(false);
  const [enhPattern, setEnhPattern] = useState<EnhancementPattern>("Belirsiz");
  const [t2Signal, setT2Signal] = useState<T2Scale>("Belirsiz");
  const [ringWallIrregular, setRingWallIrregular] = useState<"bilinmiyor" | "ince-düzgün" | "kalın/irregüler">("bilinmiyor");
  const [edema, setEdema] = useState<"yok" | "hafif" | "belirgin" | "bilinmiyor">("bilinmiyor");
  const [multiLesion, setMultiLesion] = useState<"bilinmiyor" | "tek" | "coklu">("bilinmiyor");
  const [cbv, setCbv] = useState<"bilinmiyor" | "yuksek" | "dusuk">("bilinmiyor");
  const [swiHemorrhage, setSwiHemorrhage] = useState<"bilinmiyor" | "var" | "yok">("bilinmiyor");
  const [extraAxialSigns, setExtraAxialSigns] = useState(false); // dural tail/CSF cleft etc.
  const [meningealEnh, setMeningealEnh] = useState(false); // leptomeningeal/pachymeningeal enhancement

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  /** ---------- Helpers ---------- */
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

  /** ---------- Core engine ---------- */
  const engine = useMemo(() => {
    const ddx: DdxItem[] = [];
    const suggestions: Suggestion[] = [];

    const ctx: string[] = [];
    if (knownMalignancy) ctx.push("Bilinen malignite öyküsü.");
    if (feverSepsis) ctx.push("Ateş/sepsis kliniği.");
    if (traumaHx) ctx.push("Travma öyküsü.");
    if (anticoagulant) ctx.push("Antikoagülan/antiagregan kullanımı.");

    /** ---- PROTOCOL SUGGESTIONS ---- */
    const protocolLine =
      modality === "BT"
        ? `BT protokol: ${ctPackage}.`
        : `MR protokol: ${mrPackage}.`;

    /** ---- TRAVMA ---- */
    if (flow === "travma") {
      // Protocol sanity
      if (modality === "BT") {
        if (ctPackage === "Non-kontrast BT") {
          suggestions.push({
            title: "Travma BT: non-kontrast temel değerlendirme",
            urgency: "Öncelikli",
            details: [
              "Kemik pencerede fraktür değerlendirmesi",
              "Ekstraaksiyel hematom/SAH/ICH açısından gözden geçir",
              "Klinik kötüleşmede kontrol BT düşünülebilir",
            ],
          });
        }
        if (vascularInjurySuspect && ctPackage !== "CTA") {
          suggestions.push({
            title: "Vasküler yaralanma şüphesinde CTA öner",
            urgency: "Öncelikli",
            details: ["Diseksiyon/aktif ekstravazasyon/pseudoanevrizma açısından CTA baş-boyun düşün."],
          });
        }
        if (venousSinusInjurySuspect && ctPackage !== "CTV") {
          suggestions.push({
            title: "Venöz sinüs yaralanması / tromboz şüphesinde CTV öner",
            urgency: "Öncelikli",
            details: ["Transvers/sigmoid/sagittal sinüs değerlendirmesi için CTV yararlı olabilir."],
          });
        }
        if ((gcsLow || focalDeficit) && ctPackage === "Non-kontrast BT") {
          suggestions.push({
            title: "Ağır travma / nörolojik defisitte CTA/CTP düşün",
            urgency: "Öncelikli",
            details: ["Vasküler hasar, hipoperfüzyon veya sekonder iskemik süreç açısından klinikle birlikte değerlendirilir."],
          });
        }
      } else {
        // MR trauma
        if ((daiSuspect === "var" || (daiSuspect === "bilinmiyor" && (gcsLow || focalDeficit))) && mrPackage !== "Non-kontrast MR") {
          suggestions.push({
            title: "DAI şüphesinde non-kontrast MR protokolü yeterli olabilir",
            urgency: "Öncelikli",
            details: ["SWI/GRE + DWI/ADC + FLAIR", "Gerekirse DTI (merkez olanaklıysa)"],
          });
        }
        if (mrPackage === "Non-kontrast MR") {
          suggestions.push({
            title: "Travma MR: DAI ve mikrokanama için en kritik sekanslar",
            urgency: "Öncelikli",
            details: ["SWI/GRE", "DWI/ADC", "FLAIR", "T1/T2"],
          });
        }
        if (vascularInjurySuspect && mrPackage !== "MRA") {
          suggestions.push({
            title: "Vasküler yaralanma şüphesinde MRA (gerekirse kontrastlı) düşün",
            urgency: "Öncelikli",
            details: ["Diseksiyon/pseudoanevrizma açısından MRA/kontrastlı MRA klinikle değerlendirilebilir."],
          });
        }
        if (venousSinusInjurySuspect && mrPackage !== "MRV") {
          suggestions.push({
            title: "Venöz sinüs patolojisi şüphesinde MRV düşün",
            urgency: "Öncelikli",
            details: ["Akım artefaktı vs trombüs ayrımı için MRV + SWI + T1/T2 korelasyon."],
          });
        }
      }

      // DDX logic (trauma)
      if (skullFractureSuspect) {
        ddx.push({ name: "Kalvaryal / kafa tabanı fraktürü (şüphe)", likelihood: "Orta", why: [protocolLine, ...ctx, "Kemik pencere korelasyonu önerilir."] });
      }
      if (pneumocephalus) {
        ddx.push({ name: "Pnömosefali", likelihood: "Yüksek", why: [protocolLine, ...ctx, "Travma sonrası hava odakları pnömosefali ile uyumlu olabilir."] });
      }
      if (contusion) {
        ddx.push({ name: "Kontüzyon / hemorajik kontüzyon", likelihood: "Orta", why: [protocolLine, ...ctx, "Travma bağlamında parankimal kontüzyon olasılığı."] });
      }
      if (daiSuspect === "var") {
        ddx.push({ name: "Diffüz aksonal yaralanma (DAI) olası", likelihood: "Orta", why: [protocolLine, ...ctx, "Klinik ağır travma/defisit ile birlikte DAI düşünülür; SWI/DWI önemlidir."] });
      }

      // If none selected, still guide
      if (ddx.length === 0) {
        ddx.push({
          name: "Travmaya bağlı belirgin akut patoloji lehine seçili güçlü parametre yok",
          likelihood: "Düşük",
          why: [protocolLine, ...ctx, "Seçilen bulgular minimal; klinik korelasyon önerilir."],
        });
      }

      if (gcsLow || focalDeficit) {
        suggestions.push({
          title: "Klinik ağırsa: yakın izlem / seri değerlendirme",
          urgency: "Öncelikli",
          details: ["Nörolojik muayene ile birlikte değerlendirme", "Klinik kötüleşmede kontrol görüntüleme"],
        });
      }
    }

    /** ---- KANAMA ---- */
    if (flow === "kanama") {
      if (bleedType === "SDH" || bleedType === "EDH") {
        let l: Likelihood = traumaHx ? "Yüksek" : "Orta";

        const urgency = massEffectUrgency(resolvedMlsMm, basalCisternEff, herniations, ventricleCompression);

        const why: string[] = [
          ...ctx,
          protocolLine,
          extraAxialSentence ? `Rapor cümlesi: "${extraAxialSentence}"` : "Ekstraaksiyel kanama parametreleri seçildi.",
        ];

        if (anticoagulant && bleedType === "SDH") {
          l = bumpLikelihood(l, "up");
          why.push("Antikoagülan kullanımı SDH riskini artırır.");
        }

        if (modality === "BT" && ctDensity !== "Bilinmiyor") {
          why.push(`BT densitesi: ${ctDensity}.`);
          if (extraAxialAge === "Bilinmiyor" && ageAssist.guess !== "Bilinmiyor") why.push(`Evre için otomatik öneri: ${ageAssist.guess} (yardımcı).`);
        }

        if (urgency === "Acil") l = bumpLikelihood(l, "up");

        if (urgency === "Acil") {
          const details: string[] = [];
          if (resolvedMlsMm !== null && resolvedMlsMm >= 5) details.push("Midline shift ≥ 5 mm.");
          if (basalCisternEff === "belirgin") details.push("Bazal sistern effacement belirgin.");
          if (herniations.length > 0) details.push(`Herniasyon: ${joinHuman(herniations)}.`);
          if (ventricleCompression === "belirgin") details.push("Belirgin lateral ventrikül kompresyonu.");
          suggestions.push({
            title: "Kitle etkisi / herniasyon riski: acil nöroşirürji",
            urgency: "Acil",
            details: [...details, "Klinik durum ve nörolojik muayene ile birlikte değerlendirilmelidir."],
          });
        } else if (urgency === "Öncelikli") {
          suggestions.push({
            title: "Kitle etkisi açısından yakın izlem",
            urgency: "Öncelikli",
            details: ["Hafif MLS/sistern/sulkus/ventrikül kompresyonu varlığında klinik korelasyon önerilir."],
          });
        }

        ddx.push({
          name: bleedType === "SDH" ? "Subdural hematom" : "Epidural hematom",
          likelihood: l,
          why,
        });
      } else if (bleedType === "SAH") {
        let l: Likelihood = traumaHx ? "Orta" : "Yüksek";
        const why = [protocolLine, ...ctx, traumaHx ? "Travma ile ilişkili SAH görülebilir." : "Travma yoksa anevrizmal SAH öncelikli dışlanır."];
        if (intraventricularExt || hydrocephalus) {
          l = bumpLikelihood(l, "up");
          why.push("IVH/hidrocefalus eşliği risk göstergesi olabilir.");
        }
        ddx.push({ name: "Subaraknoid kanama", likelihood: l, why });
        suggestions.push({
          title: "SAH şüphesinde vasküler değerlendirme",
          urgency: traumaHx ? "Öncelikli" : "Acil",
          details: ["BT ise CTA; MR ise MRA/MRV klinikle birlikte değerlendirilebilir."],
        });
      } else if (bleedType === "ICH") {
        let l: Likelihood = "Orta";
        const why = [protocolLine, ...ctx];
        if (bleedLocation === "derin (BG/talamus)") {
          l = bumpLikelihood(l, "up");
          why.unshift("Derin yerleşim hipertansif hemoraji olasılığını artırır.");
        }
        if (anticoagulant) {
          l = bumpLikelihood(l, "up");
          why.push("Antikoagülan kullanımı hemoraji riskini artırır.");
        }
        ddx.push({ name: "İntraparenkimal hemoraji", likelihood: l, why });
      } else if (bleedType === "IVH") {
        ddx.push({
          name: "İntraventriküler kanama",
          likelihood: intraventricularExt ? "Yüksek" : "Orta",
          why: [protocolLine, ...ctx, "IVH; parankimal kanama uzanımı veya vasküler nedenlerle ilişkili olabilir."],
        });
      } else if (bleedType === "bilinmiyor" || bleedType === "yok") {
        ddx.push({ name: "Belirgin akut kanama lehine güçlü parametre seçilmedi", likelihood: "Düşük", why: [protocolLine, ...ctx] });
      }

      if (hydrocephalus) {
        suggestions.push({
          title: "Hidrocefalus: acil klinik korelasyon",
          urgency: "Acil",
          details: ["BOS drenajı/endoskopik seçenekler nöroşirürji ile değerlendirilir."],
        });
      }

      if (modality === "MR") {
        if (swiBlooming === "var") ddx.unshift({ name: "Hemorajik ürün/blooming (SWI)", likelihood: "Orta", why: [protocolLine, ...ctx, "SWI blooming hemoraji ürünleri/mikrokanama ile uyumlu olabilir."] });
        if (dwiRestriction === "var" && feverSepsis) ddx.unshift({ name: "Enfeksiyöz süreç / apse olasılığı (DWI+ + klinik)", likelihood: "Orta", why: [protocolLine, ...ctx] });
      }
    }

    /** ---- KİTLE / ENFEKSİYON (strong) ---- */
    if (flow === "kitle") {
      if (!massPresent) {
        ddx.push({ name: "Kitle/enfeksiyon açısından belirgin bulgu seçilmedi", likelihood: "Düşük", why: [protocolLine, ...ctx, "Kitle var seçilmedi."] });
      } else {
        // Protocol suggestions
        if (modality === "BT") {
          if (ctPackage === "Non-kontrast BT") {
            suggestions.push({
              title: "Kitle değerlendirmesinde kontrastlı MR tercih edilir",
              urgency: "Öncelikli",
              details: ["BT non-kontrast kitle karakterizasyonunda sınırlı olabilir.", "Kontrastlı MR + DWI + SWI önerilir."],
            });
          }
        } else {
          if (mrPackage === "Non-kontrast MR") {
            suggestions.push({
              title: "Kitle değerlendirmesinde kontrastlı MR önerilir",
              urgency: "Öncelikli",
              details: ["T1 pre/post + FLAIR", "DWI/ADC", "SWI", "Gerekirse perfüzyon (DSC/ASL)"],
            });
          }
          if (mrPackage === "Kontrastlı MR" || mrPackage === "Perfüzyon (DSC/ASL)") {
            suggestions.push({
              title: "Kitle ayrımında perfüzyon ve DWI kritik",
              urgency: "Öncelikli",
              details: ["CBV↑ → tümör lehine", "DWI(+) → apse/hipersellüler lezyon lehine olabilir"],
            });
          }
        }

        // DDX scoring
        let absLike: Likelihood = feverSepsis ? "Orta" : "Düşük";
        let gbmLike: Likelihood = "Orta";
        let metLike: Likelihood = knownMalignancy ? "Yüksek" : "Orta";
        let meningiomaLike: Likelihood = extraAxialSigns || enhPattern === "Dural tail / ekstraaksiyel" ? "Yüksek" : "Düşük";

        const whyAbs: string[] = [protocolLine, ...ctx];
        const whyGbm: string[] = [protocolLine, ...ctx];
        const whyMet: string[] = [protocolLine, ...ctx];
        const whyMen: string[] = [protocolLine, ...ctx];

        // Enhancement pattern logic
        if (enhPattern === "Ring (ince-düzgün)" || ringWallIrregular === "ince-düzgün") {
          absLike = bumpLikelihood(absLike, "up");
          whyAbs.push("İnce-düzgün ring paterni apse lehine olabilir.");
          gbmLike = bumpLikelihood(gbmLike, "down");
        }
        if (enhPattern === "Ring (kalın/irregüler)" || ringWallIrregular === "kalın/irregüler") {
          gbmLike = bumpLikelihood(gbmLike, "up");
          whyGbm.push("Kalın/irregüler ring paterni yüksek dereceli tümör lehine olabilir.");
        }
        if (enhPattern === "Dural tail / ekstraaksiyel" || extraAxialSigns) {
          meningiomaLike = bumpLikelihood(meningiomaLike, "up");
          whyMen.push("Dural tail/ekstraaksiyel işaretler meningiom lehine.");
          metLike = bumpLikelihood(metLike, "down");
          gbmLike = bumpLikelihood(gbmLike, "down");
        }
        if (enhPattern === "Leptomeningeal/pial" || meningealEnh) {
          // leptomeningeal disease: carcinomatosis/infection
          metLike = bumpLikelihood(metLike, "up");
          absLike = bumpLikelihood(absLike, "up");
          whyMet.push("Leptomeningeal/pial tutulum metastatik/inflamatuar süreç lehine olabilir.");
          whyAbs.push("Leptomeningeal tutulum enfeksiyöz menenjit/ensefalit bağlamında olabilir.");
        }
        if (enhPattern === "Solid") {
          gbmLike = bumpLikelihood(gbmLike, "up");
          metLike = bumpLikelihood(metLike, "up");
          whyGbm.push("Solid kontrastlanma tümör lehine olabilir.");
        }

        // DWI restriction
        if (dwiRestriction === "var") {
          absLike = bumpLikelihood(absLike, "up");
          whyAbs.push("DWI restriksiyon apse lehine olabilir (özellikle ring lezyonda).");
          if (!feverSepsis) whyAbs.push("Klinik ateş yoksa yine de hipersellüler tümör/lenfoma ayırıcıda düşünülür.");
          gbmLike = bumpLikelihood(gbmLike, "down");
        }

        // CBV / perfusion
        if (cbv === "yuksek") {
          gbmLike = bumpLikelihood(gbmLike, "up");
          metLike = bumpLikelihood(metLike, "up");
          whyGbm.push("CBV artışı neovaskülarizasyon/tümör lehine.");
          whyMet.push("CBV artışı bazı metastazlarda görülebilir.");
          absLike = bumpLikelihood(absLike, "down");
        }
        if (cbv === "dusuk") {
          absLike = bumpLikelihood(absLike, "up");
          whyAbs.push("CBV düşük olması enfeksiyöz/nekrotik süreç lehine olabilir.");
        }

        // Multiplicity
        if (multiLesion === "coklu") {
          metLike = bumpLikelihood(metLike, "up");
          whyMet.push("Çoklu lezyon metastaz lehine olabilir.");
          if (feverSepsis) {
            absLike = bumpLikelihood(absLike, "up");
            whyAbs.push("Çoklu ring + ateş: septik emboli/çoklu apse ayırıcıda.");
          }
        }

        // Edema
        if (edema === "belirgin") {
          gbmLike = bumpLikelihood(gbmLike, "up");
          metLike = bumpLikelihood(metLike, "up");
          whyGbm.push("Belirgin vazojenik ödem tümör/met lehine olabilir.");
        }

        // SWI hemorrhage
        if (swiHemorrhage === "var") {
          metLike = bumpLikelihood(metLike, "up");
          whyMet.push("Hemorajik komponent bazı metastazlarda daha sık olabilir (melanom/ RCC / koryokarsinom vb.).");
        }

        // T2 nuance (intermediate)
        if (t2Signal === "Belirgin hiperintens" || t2Signal === "Hiperintens") {
          whyAbs.push("T2 hiperintens içerik nekroz/sıvı/ödem bileşeni ile uyumlu olabilir.");
        }

        // Build DDX list
        ddx.push({ name: "Apse / enfeksiyöz lezyon", likelihood: absLike, why: whyAbs });
        ddx.push({ name: "Yüksek dereceli gliom / nekrotik tümör", likelihood: gbmLike, why: whyGbm });
        ddx.push({ name: "Metastaz", likelihood: metLike, why: whyMet });
        ddx.push({ name: "Meningiom (ekstraaksiyel)", likelihood: meningiomaLike, why: whyMen });

        // Suggestions for next steps
        if (modality === "MR") {
          suggestions.push({
            title: "Önerilen MR sekans paketi",
            urgency: "Öncelikli",
            details: [
              "T1 pre/post + FLAIR + DWI/ADC + SWI",
              cbv === "bilinmiyor" ? "Ayrım için perfüzyon (DSC/ASL) eklenebilir" : "Perfüzyon bilgisi motoru destekler",
              enhPattern.includes("Leptomeningeal") ? "Gerekirse spinal MR / BOS korelasyonu" : "Klinik korelasyon",
            ],
          });
        } else {
          suggestions.push({
            title: "BT’de kitle şüphesinde bir sonraki adım",
            urgency: "Öncelikli",
            details: ["Kontrastlı beyin MR ile karakterizasyon", "DWI/ADC + SWI + gerekirse perfüzyon"],
          });
        }
      }
    }

    // Sort + trim
    const order: Record<Likelihood, number> = { Yüksek: 3, Orta: 2, Düşük: 1 };
    const topDdx = ddx.sort((a, b) => order[b.likelihood] - order[a.likelihood]).slice(0, 7);

    // Final sentence
    let final = "";
    if (flow === "kanama" && (bleedType === "SDH" || bleedType === "EDH") && extraAxialSentence) {
      final = `${modality} incelemede ${extraAxialSentence} Klinik korelasyon önerilir.`.replace(/\s+/g, " ").trim();
    } else if (topDdx.length > 0) {
      const flowTitle = flow === "travma" ? "travma" : flow === "kanama" ? "kanama" : "kitle/enfeksiyon";
      final = `${modality} incelemede ${flowTitle} açısından ön planda: ${topDdx[0].name}. Klinik ve önceki tetkiklerle korelasyon önerilir.`;
    } else {
      final = `${modality} incelemede belirgin akut patoloji izlenmemektedir. Klinik korelasyon önerilir.`;
    }

    return { ddx: topDdx, suggestions, final, protocolLine };
  }, [
    modality,
    flow,
    knownMalignancy,
    feverSepsis,
    traumaHx,
    anticoagulant,
    ctPackage,
    mrPackage,
    // travma
    gcsLow,
    focalDeficit,
    skullFractureSuspect,
    pneumocephalus,
    contusion,
    daiSuspect,
    vascularInjurySuspect,
    venousSinusInjurySuspect,
    // kanama
    bleedType,
    bleedLocation,
    intraventricularExt,
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
    sulcalEff,
    basalCisternEff,
    herniations,
    effectSide,
    ventricleCompression,
    ventricleCompressionSide,
    extraAxialSentence,
    // kitle
    massPresent,
    enhPattern,
    ringWallIrregular,
    t2Signal,
    edema,
    multiLesion,
    cbv,
    swiHemorrhage,
    extraAxialSigns,
    meningealEnh,
  ]);

  const { ddx, suggestions, final, protocolLine } = engine;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* LEFT */}
      <div className="space-y-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Beyin AI Yardımcı Modül (v1.5)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Travma + Kitle akışlarında BT/MR protokol (kontrast/anjiyo/perfüzyon) + alt seçimler eklendi.
            </p>
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

            {/* Protocol block */}
            <div className="space-y-2">
              <Label>Protokol / Faz</Label>
              {modality === "BT" ? (
                <div className="flex flex-wrap gap-2">
                  {(["Non-kontrast BT", "CTA", "CTV", "CTP"] as CTPackage[]).map((v) => (
                    <Button key={v} size="sm" variant={ctPackage === v ? "default" : "outline"} onClick={() => setCtPackage(v)}>
                      {v}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(["Non-kontrast MR", "Kontrastlı MR", "MRA", "MRV", "Perfüzyon (DSC/ASL)"] as MRPackage[]).map((v) => (
                    <Button key={v} size="sm" variant={mrPackage === v ? "default" : "outline"} onClick={() => setMrPackage(v)}>
                      {v}
                    </Button>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">{protocolLine}</p>
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
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="text-sm font-medium">Klinik zemin / bağlam</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <div className="text-sm font-medium">Travma öyküsü</div>
                    <div className="text-xs text-muted-foreground">Travma akışını güçlendirir</div>
                  </div>
                  <Switch checked={traumaHx} onCheckedChange={setTraumaHx} />
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <div className="text-sm font-medium">Antikoagülan / antiagregan</div>
                    <div className="text-xs text-muted-foreground">Kanama riski</div>
                  </div>
                  <Switch checked={anticoagulant} onCheckedChange={setAnticoagulant} />
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <div className="text-sm font-medium">Bilinen malignite</div>
                    <div className="text-xs text-muted-foreground">Metastaz olasılığı</div>
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TRAVMA */}
        {flow === "travma" && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Travma</CardTitle>
              <p className="text-sm text-muted-foreground">BT/MR protokol seçimine göre öneriler güçlenir (CTA/CTV/MRA/MRV/Perfüzyon).</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <div className="text-sm font-medium">GCS düşük / ağır klinik</div>
                    <div className="text-xs text-muted-foreground">Yakın izlem + ek protokol</div>
                  </div>
                  <Switch checked={gcsLow} onCheckedChange={setGcsLow} />
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <div className="text-sm font-medium">Fokal nörolojik defisit</div>
                    <div className="text-xs text-muted-foreground">Vasküler yaralanma/iskemi dışla</div>
                  </div>
                  <Switch checked={focalDeficit} onCheckedChange={setFocalDeficit} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <div className="text-sm font-medium">Fraktür şüphesi</div>
                    <div className="text-xs text-muted-foreground">Kemik pencere korelasyonu</div>
                  </div>
                  <Switch checked={skullFractureSuspect} onCheckedChange={setSkullFractureSuspect} />
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <div className="text-sm font-medium">Pnömosefali</div>
                    <div className="text-xs text-muted-foreground">Fraktür/CSF fistülü ile ilişkili olabilir</div>
                  </div>
                  <Switch checked={pneumocephalus} onCheckedChange={setPneumocephalus} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <div className="text-sm font-medium">Kontüzyon şüphesi</div>
                    <div className="text-xs text-muted-foreground">Frontobazal/temporal polar sık</div>
                  </div>
                  <Switch checked={contusion} onCheckedChange={setContusion} />
                </div>

                <div className="space-y-2 rounded-xl border p-3">
                  <div className="text-sm font-medium">DAI şüphesi</div>
                  <div className="flex flex-wrap gap-2">
                    {(["bilinmiyor", "var", "yok"] as const).map((v) => (
                      <Button key={v} size="sm" variant={daiSuspect === v ? "default" : "outline"} onClick={() => setDaiSuspect(v)}>
                        {v}
                      </Button>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">DAI için MR: SWI/DWI/FLAIR kritik.</div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <div className="text-sm font-medium">Vasküler yaralanma şüphesi</div>
                    <div className="text-xs text-muted-foreground">Diseksiyon/pseudoanevrizma vb</div>
                  </div>
                  <Switch checked={vascularInjurySuspect} onCheckedChange={setVascularInjurySuspect} />
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <div className="text-sm font-medium">Venöz sinüs yaralanma/tromboz şüphesi</div>
                    <div className="text-xs text-muted-foreground">CTV/MRV faydalı</div>
                  </div>
                  <Switch checked={venousSinusInjurySuspect} onCheckedChange={setVenousSinusInjurySuspect} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KANAMA */}
        {flow === "kanama" && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Kanama</CardTitle>
              <p className="text-sm text-muted-foreground">SDH/EDH: ölçüm + evre + kitle etkisi → otomatik rapor cümlesi.</p>
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
                      <div className="text-xs text-muted-foreground">Lateralite + dağılım + kalınlık + MLS + kitle etkisi + herniasyon</div>
                    </div>
                    <Badge variant="secondary">{bleedType}</Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Evre (manuel)</div>
                    <div className="flex flex-wrap gap-2">
                      {(["Bilinmiyor", "Akut", "Subakut", "Kronik", "Akut üzerine kronik"] as ExtraAxialAge[]).map((v) => (
                        <Button key={v} size="sm" variant={extraAxialAge === v ? "default" : "outline"} onClick={() => setExtraAxialAge(v)}>
                          {v}
                        </Button>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">“Bilinmiyor” + BT densite → yardımcı öneri.</div>
                  </div>

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
                            Önerilen evre: <span className="font-medium">{ageAssist.guess}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

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
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2 rounded-xl border p-3">
                      <Label className="text-sm">Maksimum kalınlık (mm)</Label>
                      <Input inputMode="decimal" placeholder="örn: 6" value={extraAxialThicknessMm} onChange={(e) => setExtraAxialThicknessMm(e.target.value)} />
                    </div>
                    <div className="space-y-2 rounded-xl border p-3">
                      <Label className="text-sm">Midline shift (mm)</Label>
                      <Input inputMode="decimal" placeholder="örn: 4" value={midlineShiftMm} onChange={(e) => setMidlineShiftMm(e.target.value)} />
                    </div>
                  </div>

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
                        <div className="text-xs text-muted-foreground">“Belirgin” → ACİL.</div>
                      </div>
                    </div>

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
                    </div>
                  </div>

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

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 rounded-xl border p-3">
                  <div className="text-sm font-medium">Yerleşim (ICH için)</div>
                  <div className="flex flex-wrap gap-2">
                    {(["bilinmiyor", "lobar", "derin (BG/talamus)", "pons", "serebellum"] as const).map((v) => (
                      <Button key={v} size="sm" variant={bleedLocation === v ? "default" : "outline"} onClick={() => setBleedLocation(v)}>
                        {v}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="flex items-center justify-between rounded-xl border p-3">
                    <div>
                      <div className="text-sm font-medium">IVH eşlik</div>
                      <div className="text-xs text-muted-foreground">Risk göstergesi olabilir</div>
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

        {/* KITLE */}
        {flow === "kitle" && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Kitle / Enfeksiyon</CardTitle>
              <p className="text-sm text-muted-foreground">Kontrast paterni + DWI + perfüzyon (CBV) + ara sinyal seçenekleri ile güçlü DDX.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border p-3">
                <div>
                  <div className="text-sm font-medium">Kitle / lezyon var</div>
                  <div className="text-xs text-muted-foreground">Var ise ddx motoru aktifleşir</div>
                </div>
                <Switch checked={massPresent} onCheckedChange={setMassPresent} />
              </div>

              <div className={cn("space-y-3", !massPresent && "opacity-60 pointer-events-none")}>
                <div className="space-y-2 rounded-xl border p-3">
                  <div className="text-sm font-medium">Kontrastlanma paterni</div>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        "Belirsiz",
                        "Kontrast yok",
                        "Solid",
                        "Ring (ince-düzgün)",
                        "Ring (kalın/irregüler)",
                        "Dural tail / ekstraaksiyel",
                        "Leptomeningeal/pial",
                      ] as EnhancementPattern[]
                    ).map((v) => (
                      <Button key={v} size="sm" variant={enhPattern === v ? "default" : "outline"} onClick={() => setEnhPattern(v)}>
                        {v}
                      </Button>
                    ))}
                  </div>

                  <div className="mt-2 space-y-2">
                    <div className="text-sm font-medium">Ring duvar karakteri (opsiyonel)</div>
                    <div className="flex flex-wrap gap-2">
                      {(["bilinmiyor", "ince-düzgün", "kalın/irregüler"] as const).map((v) => (
                        <Button key={v} size="sm" variant={ringWallIrregular === v ? "default" : "outline"} onClick={() => setRingWallIrregular(v)}>
                          {v}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 rounded-xl border p-3">
                    <div className="text-sm font-medium">T2 sinyal (ara formlar)</div>
                    <div className="flex flex-wrap gap-2">
                      {(["Belirsiz", "Hipointens", "İzo", "Hafif hiperintens", "Hiperintens", "Belirgin hiperintens"] as T2Scale[]).map((v) => (
                        <Button key={v} size="sm" variant={t2Signal === v ? "default" : "outline"} onClick={() => setT2Signal(v)}>
                          {v}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 rounded-xl border p-3">
                    <div className="text-sm font-medium">Ödem</div>
                    <div className="flex flex-wrap gap-2">
                      {(["bilinmiyor", "yok", "hafif", "belirgin"] as const).map((v) => (
                        <Button key={v} size="sm" variant={edema === v ? "default" : "outline"} onClick={() => setEdema(v)}>
                          {v}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 rounded-xl border p-3">
                    <div className="text-sm font-medium">Lezyon sayısı</div>
                    <div className="flex flex-wrap gap-2">
                      {(["bilinmiyor", "tek", "coklu"] as const).map((v) => (
                        <Button key={v} size="sm" variant={multiLesion === v ? "default" : "outline"} onClick={() => setMultiLesion(v)}>
                          {v}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 rounded-xl border p-3">
                    <div className="text-sm font-medium">CBV / perfüzyon</div>
                    <div className="flex flex-wrap gap-2">
                      {(["bilinmiyor", "yuksek", "dusuk"] as const).map((v) => (
                        <Button key={v} size="sm" variant={cbv === v ? "default" : "outline"} onClick={() => setCbv(v)}>
                          {v}
                        </Button>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">CBV↑ genelde tümör lehine; CBV↓ enfeksiyon/nekroz lehine olabilir.</div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
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

                  <div className="space-y-2 rounded-xl border p-3">
                    <div className="text-sm font-medium">SWI hemoraji</div>
                    <div className="flex flex-wrap gap-2">
                      {(["bilinmiyor", "var", "yok"] as const).map((v) => (
                        <Button key={v} size="sm" variant={swiHemorrhage === v ? "default" : "outline"} onClick={() => setSwiHemorrhage(v)}>
                          {v}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-xl border p-3">
                    <div>
                      <div className="text-sm font-medium">Ekstraaksiyel işaretler</div>
                      <div className="text-xs text-muted-foreground">Dural tail / CSF cleft vb</div>
                    </div>
                    <Switch checked={extraAxialSigns} onCheckedChange={setExtraAxialSigns} />
                  </div>

                  <div className="flex items-center justify-between rounded-xl border p-3">
                    <div>
                      <div className="text-sm font-medium">Meningeal tutulum</div>
                      <div className="text-xs text-muted-foreground">Leptomeningeal/pachymeningeal</div>
                    </div>
                    <Switch checked={meningealEnh} onCheckedChange={setMeningealEnh} />
                  </div>
                </div>
              </div>
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

      {/* RIGHT */}
      <div className="lg:sticky lg:top-6 h-fit space-y-4">
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">AI Çıktı</CardTitle>
              <p className="text-xs text-muted-foreground">Seçimlere göre canlı güncellenir (kural tabanlı).</p>
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
                      {d.why.slice(0, 4).map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Öneriler</div>
              {engine.suggestions.length === 0 ? (
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
            <div className="text-xs text-muted-foreground">Bu sistem kural tabanlı karar destektir; görüntüler ve klinik ile birlikte değerlendirilmelidir.</div>
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
