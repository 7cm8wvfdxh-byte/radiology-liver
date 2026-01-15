"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import LiverPage from "./liver/page";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Organ = "liver" | "brain";

// ---- Shared helpers ----
type TriState = "bilinmiyor" | "var" | "yok";
function triLabel(v: TriState) {
  if (v === "var") return "Var";
  if (v === "yok") return "Yok";
  return "Bilinmiyor";
}

type Likelihood = "Yüksek" | "Orta" | "Düşük";
type Urgency = "Acil" | "Öncelikli" | "Rutin";
type DdxItem = {
  name: string;
  likelihood: Likelihood;
  why: string[];
};
type Recommendation = {
  title: string;
  urgency: Urgency;
  details: string[];
};

function uniqPush(arr: string[], x: string) {
  if (!arr.includes(x)) arr.push(x);
}

// ---- Brain module types ----
type BrainModality = "BT" | "MR" | "BT+MR";

type ExtraAxialType = "epidural" | "subdural" | "subaraknoid (SAH)" | "bilinmiyor";
type IntraAxialType =
  | "intraparenkimal hematom (IPH)"
  | "kontüzyon"
  | "hemorajik transformasyon"
  | "bilinmiyor";

type HemorrhageAge = "bilinmiyor" | "hiperakut" | "akut" | "erken subakut" | "geç subakut" | "kronik";

type MassCompartment = "bilinmiyor" | "intraaksiyel" | "ekstraaksiyel";
type EnhancementPattern = "bilinmiyor" | "yok" | "solid" | "halka (ring)" | "dural tail";
type Edema = "bilinmiyor" | "yok/az" | "orta" | "belirgin";
type NumberOfLesions = "bilinmiyor" | "tek" | "çoklu";

// Mild/marked intensity set (for future extension; used now in hemorrhage age hints and mass patterns)
type MRIntensity =
  | "bilinmiyor"
  | "belirgin hipo"
  | "hafif hipo"
  | "izo"
  | "hafif hiper"
  | "belirgin hiper";

type BrainState = {
  modality: BrainModality;

  // clinical context
  age: string; // keep as string for UI simplicity
  knownMalignancy: boolean;
  feverSepsis: boolean;
  trauma: boolean;
  anticoagulant: boolean;
  htn: boolean;
  immunosuppressed: boolean;

  // hemorrhage branch
  hemorrhagePresent: TriState; // var/yok/bilinmiyor
  hemorrhageLocation: "bilinmiyor" | "ekstraaksiyel" | "intraaksiyel" | "SAH baskın" | "IVH";
  extraAxialType: ExtraAxialType;
  intraAxialType: IntraAxialType;
  hemorrhageAge: HemorrhageAge;

  midlineShift: "bilinmiyor" | "yok" | "hafif" | "belirgin";
  herniationSigns: TriState;

  // trauma CT features (optional but practical)
  skullFracture: TriState;
  pneumocephalus: TriState;

  // mass branch
  massPresent: TriState;
  compartment: MassCompartment;
  numberOfLesions: NumberOfLesions;
  enhancement: EnhancementPattern;
  diffusionRestriction: TriState; // abscess vs necrotic tumor
  hemorrhagicComponent: TriState; // hemorrhagic mets / high-grade glioma
  calcification: TriState; // oligodendroglioma / meningioma etc
  edema: Edema;
  duralBased: TriState; // extra-axial clue

  // MR signal quick picks (optional)
  t1: MRIntensity;
  t2: MRIntensity;

  // free text addendum
  incidental: string;
};

const defaultBrainState: BrainState = {
  modality: "BT",

  age: "",
  knownMalignancy: false,
  feverSepsis: false,
  trauma: false,
  anticoagulant: false,
  htn: false,
  immunosuppressed: false,

  hemorrhagePresent: "bilinmiyor",
  hemorrhageLocation: "bilinmiyor",
  extraAxialType: "bilinmiyor",
  intraAxialType: "bilinmiyor",
  hemorrhageAge: "bilinmiyor",

  midlineShift: "bilinmiyor",
  herniationSigns: "bilinmiyor",

  skullFracture: "bilinmiyor",
  pneumocephalus: "bilinmiyor",

  massPresent: "bilinmiyor",
  compartment: "bilinmiyor",
  numberOfLesions: "bilinmiyor",
  enhancement: "bilinmiyor",
  diffusionRestriction: "bilinmiyor",
  hemorrhagicComponent: "bilinmiyor",
  calcification: "bilinmiyor",
  edema: "bilinmiyor",
  duralBased: "bilinmiyor",

  t1: "bilinmiyor",
  t2: "bilinmiyor",

  incidental: "",
};

// ---- UI small components ----
function ToggleButtons<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Button key={o.value} size="sm" variant={value === o.value ? "default" : "outline"} onClick={() => onChange(o.value)}>
          {o.label}
        </Button>
      ))}
    </div>
  );
}

function TriButtons({ value, onChange }: { value: TriState; onChange: (v: TriState) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(["var", "yok", "bilinmiyor"] as TriState[]).map((v) => (
        <Button
          key={v}
          size="sm"
          variant={value === v ? "default" : "outline"}
          onClick={() => onChange(v)}
          className="min-w-[86px]"
        >
          {triLabel(v)}
        </Button>
      ))}
    </div>
  );
}

function LikelihoodBadge({ v }: { v: Likelihood }) {
  const base = "border";
  if (v === "Yüksek") return <Badge className={base}>Yüksek</Badge>;
  if (v === "Orta") return <Badge className={base}>Orta</Badge>;
  return <Badge className={base}>Düşük</Badge>;
}

function UrgencyBadge({ v }: { v: Urgency }) {
  const base = "border";
  if (v === "Acil") return <Badge className={base}>Acil</Badge>;
  if (v === "Öncelikli") return <Badge className={base}>Öncelikli</Badge>;
  return <Badge className={base}>Rutin</Badge>;
}

// ---- Brain DDX engine (rule-based, explainable) ----
function brainHemorrhageDdx(s: BrainState): { ddx: DdxItem[]; recs: Recommendation[]; final: string; warning: string } {
  let ddx: DdxItem[] = [];
  let recs: Recommendation[] = [];
  const warn: string[] = [];

  const hasHemo = s.hemorrhagePresent === "var";
  if (!hasHemo) {
    return {
      ddx: [],
      recs: [],
      final: `${s.modality} incelemede belirgin intrakraniyal kanama lehine bulgu izlenmemektedir.`,
      warning: "",
    };
  }

  // Common urgent recs
  if (s.midlineShift === "belirgin" || s.herniationSigns === "var") {
    recs.unshift({
      title: "Kitle etkisi / herniasyon şüphesi",
      urgency: "Acil",
      details: [
        "Acil klinik/nöroşirürji değerlendirmesi önerilir.",
        "GCS, pupilla, vital bulgular ile korelasyon.",
        "BT anjiyografi/venografi endikasyonu klinik şüpheye göre değerlendirilebilir.",
      ],
    });
    warn.push("Belirgin kitle etkisi / herniasyon bulguları varsa acil yaklaşım gerekir.");
  }

  // Extra-axial hemorrhage patterns
  if (s.hemorrhageLocation === "ekstraaksiyel" || s.extraAxialType !== "bilinmiyor" || s.hemorrhageLocation === "SAH baskın") {
    // Epidural
    if (s.extraAxialType === "epidural") {
      ddx.unshift({
        name: "Epidural hematom (travma ile ilişkili)",
        likelihood: s.trauma ? "Yüksek" : "Orta",
        why: [
          "Ekstraaksiyel kanama paterni epidural hematom ile uyumlu olabilir.",
          s.skullFracture === "var" ? "Kafatası fraktürü eşliği epidural hematom lehine." : "Fraktür varlığı BT kemik pencerede değerlendirilmelidir.",
        ],
      });
      recs.unshift({
        title: "Travmatik epidural hematom için yönetim",
        urgency: "Acil",
        details: [
          "BT kemik pencerede fraktür değerlendirmesi.",
          "Klinik kötüleşme / midline shift varsa acil nöroşirürji.",
          "Antikoagülan/antiagregan kullanımı varsa tersine çevirme protokolleri (klinikle).",
        ],
      });
    }

    // Subdural
    if (s.extraAxialType === "subdural") {
      const high = s.trauma || s.anticoagulant;
      ddx.unshift({
        name: "Subdural hematom",
        likelihood: high ? "Yüksek" : "Orta",
        why: [
          "Ekstraaksiyel kanama paterni subdural hematom ile uyumlu olabilir.",
          s.anticoagulant ? "Antikoagülan kullanımı subdural hematom riskini artırır." : "Yaşlı/atrofi varlığında risk artar (klinikle).",
        ],
      });
      // age note
      if (s.hemorrhageAge !== "bilinmiyor") {
        ddx[0].why.push(`Kanama evresi seçimi: ${s.hemorrhageAge}. (BT yoğunluk / MR T1-T2-SWI ile korele edilmelidir.)`);
      }
      recs.push({
        title: "Subdural hematom izlem / kontrol",
        urgency: "Öncelikli",
        details: ["Klinik stabil değilse erken kontrol BT.", "Midline shift / herniasyon bulguları varsa acil nöroşirürji.", "Antikoagülan varsa klinikle yönetim."],
      });
    }

    // SAH
    if (s.extraAxialType === "subaraknoid (SAH)" || s.hemorrhageLocation === "SAH baskın") {
      // Trauma vs aneurysm heuristic
      const aneurysmSusp = !s.trauma; // simplistic; we later enrich with cisternal pattern etc.
      ddx.unshift({
        name: aneurysmSusp ? "Anevrizmal subaraknoid kanama olasılığı" : "Travmatik subaraknoid kanama",
        likelihood: aneurysmSusp ? "Orta" : "Yüksek",
        why: [
          "Subaraknoid kanama paterni seçilmiştir.",
          aneurysmSusp ? "Travma öyküsü yoksa anevrizmal SAH ayırıcı tanıda önem kazanır." : "Travma öyküsü travmatik SAH lehine.",
        ],
      });
      recs.unshift({
        title: "SAH için ileri inceleme",
        urgency: aneurysmSusp ? "Acil" : "Öncelikli",
        details: [
          aneurysmSusp ? "BT anjiyografi (CTA) ile anevrizma araştırılması önerilir." : "Klinik şüpheye göre CTA/MRA değerlendirilebilir.",
          "Hidrocefalus/IVH eşliği açısından değerlendirme.",
          "Nöroloji/nöroşirürji ile klinik korelasyon.",
        ],
      });
    }
  }

  // Intra-axial hemorrhage patterns
  if (s.hemorrhageLocation === "intraaksiyel" || s.intraAxialType !== "bilinmiyor") {
    // Hypertensive hemorrhage vs tumor/met
    if (s.htn && s.intraAxialType === "intraparenkimal hematom (IPH)") {
      ddx.unshift({
        name: "Hipertansif intraparenkimal kanama (tipik patern düşünülür)",
        likelihood: "Orta",
        why: [
          "İntraparenkimal hematom + hipertansiyon öyküsü varsa hipertansif kanama ayırıcı tanıda öne çıkar.",
          "Yerleşim (bazal ganglion/talamus/pontin/serebellar) ve BT paterni ile güçlenir.",
        ],
      });
    }

    // Contusion (trauma)
    if (s.intraAxialType === "kontüzyon") {
      ddx.unshift({
        name: "Travmatik kontüzyon / hemorajik kontüzyon",
        likelihood: s.trauma ? "Yüksek" : "Orta",
        why: [
          "Kontüzyon seçilmiştir; travma ile sık ilişkilidir.",
          "Frontotemporal yerleşim ve karşı coup/coup paterni klinik/BT ile uyumlu olabilir.",
        ],
      });
      recs.push({
        title: "Travma BT kontrol stratejisi",
        urgency: "Öncelikli",
        details: ["Klinik kötüleşme veya antikoagülan varlığında erken kontrol BT düşünülebilir.", "DAI şüphesi varsa MR (DWI/SWI) önerilir."],
      });
    }

    // Hemorrhagic transformation
    if (s.intraAxialType === "hemorajik transformasyon") {
      ddx.unshift({
        name: "Enfarkt alanında hemorajik transformasyon olasılığı",
        likelihood: "Orta",
        why: [
          "Hemorajik transformasyon seçilmiştir.",
          "DWI/ADC ile iskemi-enfarkt korelasyonu ve klinik zamanlama önemlidir.",
        ],
      });
      recs.push({
        title: "İskemik olay korelasyonu",
        urgency: "Öncelikli",
        details: ["MR DWI/ADC ve FLAIR ile zamanlama ve yayılım değerlendirmesi.", "Antikoagülan/antiagregan öyküsü klinikle birlikte ele alınmalı."],
      });
    }

    // Tumor bleed / hemorrhagic mets heuristic
    if (s.knownMalignancy || s.hemorrhagicComponent === "var") {
      ddx.push({
        name: "Kanamalı metastaz / tümör kanaması",
        likelihood: s.knownMalignancy ? "Orta" : "Düşük",
        why: [
          s.knownMalignancy ? "Bilinen malignite öyküsü metastaz olasılığını artırır." : "Kanamalı komponent tümör kanaması ile ilişkili olabilir.",
          "Gadolinyum kontrastlı MR (T1+C) ve SWI ile değerlendirme ayırıcı tanıda önemlidir.",
        ],
      });
      recs.push({
        title: "Tümör / metastaz değerlendirmesi",
        urgency: "Öncelikli",
        details: ["Kontrastlı beyin MR (T1+C), DWI/ADC, SWI/GRE", "Sistemik malignite taraması klinikle birlikte", "Lezyon sayısı ve dağılımı (kortikomedüller bileşke vb.)"],
      });
    }
  }

  // IVH
  if (s.hemorrhageLocation === "IVH") {
    ddx.unshift({
      name: "İntraventriküler kanama (primer/sekonder)",
      likelihood: "Orta",
      why: [
        "IVH seçilmiştir.",
        "Parankimal kanamaya sekonder veya vasküler etiyoloji ile ilişkili olabilir; eşlik eden kaynak araştırılmalıdır.",
      ],
    });
    recs.unshift({
      title: "IVH – hidrocefalus ve kaynak araştırması",
      urgency: "Acil",
      details: ["Hidrocefalus bulguları açısından değerlendirme", "CTA/MRA/DSA endikasyonu klinik şüpheye göre", "Nöroşirürji ile klinik korelasyon"],
    });
  }

  // Always suggest window/phase if modality mismatch
  if (s.modality === "BT") {
    recs.push({
      title: "Kanama karakterizasyonu",
      urgency: "Rutin",
      details: ["BT yoğunluk ve seri kontrollerle evreleme yapılabilir.", "Klinik gereksinime göre MR (T1/T2/FLAIR, DWI/ADC, SWI) ek fayda sağlayabilir."],
    });
  } else {
    recs.push({
      title: "MR sekans seti",
      urgency: "Rutin",
      details: ["T1/T2/FLAIR", "DWI/ADC", "SWI/GRE (kanama/DAI)", "Gerekirse kontrastlı T1 (tümör/enfeksiyon ayrımı)"],
    });
  }

  // Final sentence
  const parts: string[] = [];
  parts.push(`${s.modality} incelemede intrakraniyal kanama ile uyumlu bulgular mevcuttur.`);
  if (s.hemorrhageLocation !== "bilinmiyor") parts.push(`Dağılım: ${s.hemorrhageLocation}.`);
  if (s.extraAxialType !== "bilinmiyor") parts.push(`Ekstraaksiyel tip: ${s.extraAxialType}.`);
  if (s.intraAxialType !== "bilinmiyor") parts.push(`İntraaksiyel tip: ${s.intraAxialType}.`);
  if (s.hemorrhageAge !== "bilinmiyor") parts.push(`Kanama evresi: ${s.hemorrhageAge}.`);
  if (s.midlineShift !== "bilinmiyor" && s.midlineShift !== "yok") parts.push(`Midline shift: ${s.midlineShift}.`);
  if (s.herniationSigns === "var") parts.push("Herniasyon lehine bulgular izlenmektedir.");

  const final = parts.join(" ");

  return { ddx, recs, final, warning: warn.join(" ") };
}

function brainMassDdx(s: BrainState): { ddx: DdxItem[]; recs: Recommendation[]; final: string; warning: string } {
  let ddx: DdxItem[] = [];
  let recs: Recommendation[] = [];
  const warn: string[] = [];

  const hasMass = s.massPresent === "var";
  if (!hasMass) {
    return { ddx: [], recs: [], final: `${s.modality} incelemede belirgin kitle lezyonu lehine bulgu izlenmemektedir.`, warning: "" };
  }

  const isExtraAxial = s.compartment === "ekstraaksiyel" || s.duralBased === "var" || s.enhancement === "dural tail";
  const isRing = s.enhancement === "halka (ring)";
  const isSolid = s.enhancement === "solid";
  const isMultiple = s.numberOfLesions === "çoklu";

  // Abscess heuristic
  if (isRing && s.diffusionRestriction === "var" && (s.feverSepsis || s.immunosuppressed)) {
    ddx.unshift({
      name: "Beyin apsesi",
      likelihood: "Yüksek",
      why: [
        "Halka tarzı kontrastlanma + belirgin difüzyon kısıtlılığı apsede tipiktir.",
        s.feverSepsis ? "Ateş/sepsis öyküsü enfeksiyöz etiyolojiyi destekler." : "İmmünsüpresyon enfeksiyon riskini artırır.",
      ],
    });
    recs.unshift({
      title: "Apseden şüphe – acil yaklaşım",
      urgency: "Acil",
      details: ["Acil klinik değerlendirme, enfeksiyon hastalıkları / nöroşirürji konsültasyonu", "Gerekirse kan kültürü/CRP", "MR DWI/ADC ve kontrastlı T1 ile doğrulama"],
    });
    warn.push("Apseden şüphe varsa klinik aciliyet yüksektir.");
  }

  // Metastasis
  if (isMultiple && (s.knownMalignancy || s.enhancement === "halka (ring)" || s.edema === "belirgin")) {
    ddx.push({
      name: "Metastaz",
      likelihood: s.knownMalignancy ? "Yüksek" : "Orta",
      why: [
        isMultiple ? "Çoklu lezyon metastaz lehine." : "Lezyon paterni metastaz ile uyumlu olabilir.",
        s.knownMalignancy ? "Bilinen malignite öyküsü destekler." : "Primer malignite öyküsü yoksa sistemik tarama düşünülebilir.",
        "Kortikomedüller bileşke, gri-beyaz cevher sınırı dağılımı ile korele edilmelidir.",
      ],
    });
    recs.push({
      title: "Metastaz değerlendirmesi",
      urgency: "Öncelikli",
      details: ["Kontrastlı beyin MR (T1+C), DWI/ADC, SWI", "Sistemik tarama (klinikle)", "Steroid endikasyonu klinik/nöroloji ile"],
    });
  }

  // Primary glioma / high-grade
  if (!isExtraAxial && (isSolid || isRing) && s.edema !== "yok/az") {
    ddx.unshift({
      name: "Yüksek dereceli glial tümör (glioblastom spektrumu)",
      likelihood: "Orta",
      why: [
        "İntraaksiyel kitle + belirgin ödem ve heterojen/halka tarzı kontrastlanma yüksek dereceli tümörleri düşündürür.",
        s.hemorrhagicComponent === "var" ? "Kanamalı komponent yüksek dereceli tümörde/metastazda görülebilir." : "Kanama varlığı SWI ile desteklenebilir.",
      ],
    });
    recs.push({
      title: "Tümör karakterizasyonu",
      urgency: "Öncelikli",
      details: ["Kontrastlı MR + DWI/ADC", "Gerekirse perfüzyon MR / MR spektroskopi (merkez pratiğine göre)", "Nöroşirürji ile planlama"],
    });
  }

  // Extra-axial: meningioma / schwannoma
  if (isExtraAxial) {
    const menHigh = s.enhancement === "dural tail" || s.duralBased === "var";
    ddx.unshift({
      name: "Menenjiyom (ekstraaksiyel)",
      likelihood: menHigh ? "Yüksek" : "Orta",
      why: [
        "Ekstraaksiyel yerleşim ve dural tabanlı görünüm menenjiyom lehinedir.",
        s.calcification === "var" ? "Kalsifikasyon menenjiyomda görülebilir." : "Kalsifikasyon yokluğu dışlamaz.",
      ],
    });
    recs.push({
      title: "Ekstraaksiyel kitle değerlendirmesi",
      urgency: "Rutin",
      details: ["Kontrastlı MR (dural tail, komşu kemik değişiklikleri)", "Gerekirse BT ile kalsifikasyon/hiperostoz değerlendirmesi", "Klinik semptomlara göre nöroşirürji"],
    });
  }

  // Calcification clue: oligodendroglioma vs meningioma
  if (!isExtraAxial && s.calcification === "var") {
    ddx.push({
      name: "Oligodendroglial tümör olasılığı (kalsifikasyon ile)",
      likelihood: "Düşük",
      why: ["İntraaksiyel kalsifikasyon oligodendroglioma gibi glial tümörlerde görülebilir.", "Kesin ayrım için MR paternleri ve klinik korelasyon gerekir."],
    });
  }

  // If ring without restriction -> necrotic tumor vs metastasis
  if (isRing && s.diffusionRestriction !== "var") {
    ddx.push({
      name: "Nekrotik tümör / metastaz (ring-enhancing)",
      likelihood: s.knownMalignancy ? "Orta" : "Düşük",
      why: [
        "Halka tarzı kontrastlanma; difüzyon kısıtlılığı yoksa apseden çok nekrotik tümör/metastaz düşünülür.",
        s.knownMalignancy ? "Bilinen malignite öyküsü metastaz olasılığını artırır." : "Primer malignite açısından klinik tarama düşünülebilir.",
      ],
    });
  }

  // Urgency
  if (s.midlineShift === "belirgin" || s.herniationSigns === "var") {
    recs.unshift({
      title: "Kitle etkisi / herniasyon şüphesi",
      urgency: "Acil",
      details: ["Acil klinik değerlendirme ve nöroşirürji konsültasyonu", "Steroid/ICP yönetimi klinikle", "Gerekirse acil dekompresyon planı"],
    });
    warn.push("Belirgin kitle etkisi varsa acil yaklaşım gerekir.");
  }

  // Final sentence
  const parts: string[] = [];
  parts.push(`${s.modality} incelemede kitle lezyonu ile uyumlu bulgular mevcuttur.`);
  if (s.compartment !== "bilinmiyor") parts.push(`Kompartman: ${s.compartment}.`);
  if (s.numberOfLesions !== "bilinmiyor") parts.push(`Lezyon sayısı: ${s.numberOfLesions}.`);
  if (s.enhancement !== "bilinmiyor") parts.push(`Kontrastlanma paterni: ${s.enhancement}.`);
  if (s.diffusionRestriction !== "bilinmiyor") parts.push(`DWI: restriksiyon ${triLabel(s.diffusionRestriction)}.`);
  if (s.edema !== "bilinmiyor") parts.push(`Ödem: ${s.edema}.`);
  if (s.midlineShift !== "bilinmiyor" && s.midlineShift !== "yok") parts.push(`Midline shift: ${s.midlineShift}.`);
  if (s.herniationSigns === "var") parts.push("Herniasyon lehine bulgular izlenmektedir.");

  const final = parts.join(" ");

  return { ddx, recs, final, warning: warn.join(" ") };
}

function mergeDdx(a: DdxItem[], b: DdxItem[]): DdxItem[] {
  // simple merge with de-dup by name; keep highest likelihood (Yüksek>Orta>Düşük)
  const rank: Record<Likelihood, number> = { Yüksek: 3, Orta: 2, Düşük: 1 };
  const map = new Map<string, DdxItem>();
  for (const item of [...a, ...b]) {
    const existing = map.get(item.name);
    if (!existing) {
      map.set(item.name, item);
      continue;
    }
    const keep = rank[item.likelihood] > rank[existing.likelihood] ? item : existing;
    // merge whys (unique)
    const whys = [...existing.why];
    for (const w of item.why) uniqPush(whys, w);
    map.set(item.name, { ...keep, why: whys });
  }
  // sort by likelihood desc
  return Array.from(map.values()).sort((x, y) => rank[y.likelihood] - rank[x.likelihood]);
}

function mergeRecs(a: Recommendation[], b: Recommendation[]): Recommendation[] {
  // de-dup by title; keep more urgent
  const rank: Record<Urgency, number> = { Acil: 3, Öncelikli: 2, Rutin: 1 };
  const map = new Map<string, Recommendation>();
  for (const r of [...a, ...b]) {
    const ex = map.get(r.title);
    if (!ex) {
      map.set(r.title, r);
      continue;
    }
    const keep = rank[r.urgency] > rank[ex.urgency] ? r : ex;
    const details = [...ex.details];
    for (const d of r.details) uniqPush(details, d);
    map.set(r.title, { ...keep, details });
  }
  return Array.from(map.values()).sort((x, y) => rank[y.urgency] - rank[x.urgency]);
}

function BrainModule() {
  const [s, setS] = useState<BrainState>(defaultBrainState);
  const [reportStyleShort, setReportStyleShort] = useState(true);
  const [useSuggestionLanguage, setUseSuggestionLanguage] = useState(true);

  const hemo = useMemo(() => brainHemorrhageDdx(s), [s]);
  const mass = useMemo(() => brainMassDdx(s), [s]);

  const ddx = useMemo(() => mergeDdx(hemo.ddx, mass.ddx), [hemo.ddx, mass.ddx]);
  const recs = useMemo(() => mergeRecs(hemo.recs, mass.recs), [hemo.recs, mass.recs]);

  const finalSentence = useMemo(() => {
    const finals: string[] = [];
    if (s.hemorrhagePresent === "var") finals.push(hemo.final);
    if (s.massPresent === "var") finals.push(mass.final);

    if (finals.length === 0) {
      return `${s.modality} incelemede belirgin akut patoloji izlenmemektedir (klinik ile korele ediniz).`;
    }

    let text = finals.join(" ");

    // add incidental
    if (s.incidental.trim().length > 0) {
      text += ` Ek/insidental: ${s.incidental.trim()}`;
    }

    // optional language tweaks
    if (!useSuggestionLanguage) {
      // remove some “önerilir” vibes by not appending; our recs will still show
      text = text.replaceAll("önerilir", "düşünülebilir");
    }

    return text;
  }, [s, hemo.final, mass.final, useSuggestionLanguage]);

  const urgencyHeadline = useMemo(() => {
    const rank: Record<Urgency, number> = { Acil: 3, Öncelikli: 2, Rutin: 1 };
    let best: Urgency | null = null;
    for (const r of recs) {
      if (!best || rank[r.urgency] > rank[best]) best = r.urgency;
    }
    return best ? best : "Rutin";
  }, [recs]);

  const copyText = async (t: string) => {
    try {
      await navigator.clipboard.writeText(t);
    } catch {
      // ignore
    }
  };

  const mrIntensityOptions: MRIntensity[] = ["bilinmiyor", "belirgin hipo", "hafif hipo", "izo", "hafif hiper", "belirgin hiper"];

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Beyin AI Yardımcı Ajan (v1) — Travma / Kanama / Kitle</h1>
          <p className="text-sm text-muted-foreground">
            Kural tabanlı + açıklanabilir DDX. (Klinik bağlam + görüntü bulguları → olasılık/öneri/uyarı)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setS(defaultBrainState)}>
            Sıfırla
          </Button>
          <Button size="sm" onClick={() => copyText(finalSentence)}>
            Finali Kopyala
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: Form */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">1) İnceleme & Rapor Ayarları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>İnceleme tipi</Label>
                  <ToggleButtons<BrainModality>
                    value={s.modality}
                    onChange={(v) => setS((p) => ({ ...p, modality: v }))}
                    options={[
                      { value: "BT", label: "BT" },
                      { value: "MR", label: "MR" },
                      { value: "BT+MR", label: "BT+MR" },
                    ]}
                  />
                  <p className="text-xs text-muted-foreground">Travma/kanama → BT; karakterizasyon → MR (DWI/SWI + kontrast).</p>
                </div>

                <div className="space-y-2">
                  <Label>Rapor stili</Label>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant={reportStyleShort ? "default" : "outline"} onClick={() => setReportStyleShort(true)}>
                      Kısa
                    </Button>
                    <Button size="sm" variant={!reportStyleShort ? "default" : "outline"} onClick={() => setReportStyleShort(false)}>
                      Detaylı
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <Switch checked={useSuggestionLanguage} onCheckedChange={(v) => setUseSuggestionLanguage(!!v)} />
                    <span className="text-sm">Öneri dili</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Yaş (opsiyonel)</Label>
                  <Input
                    value={s.age}
                    onChange={(e) => setS((p) => ({ ...p, age: e.target.value }))}
                    placeholder="örn: 68"
                    inputMode="numeric"
                  />
                  <p className="text-xs text-muted-foreground">Yaş/antikoagülan gibi klinik faktörler DDX ağırlığını etkiler.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">2) Klinik zemin / bağlam</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Travma</div>
                  <div className="text-xs text-muted-foreground">Kontüzyon/EDH/SDH/DAI</div>
                </div>
                <Switch checked={s.trauma} onCheckedChange={(v) => setS((p) => ({ ...p, trauma: !!v }))} />
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Antikoagülan/antiagregan</div>
                  <div className="text-xs text-muted-foreground">SDH/ICH riski</div>
                </div>
                <Switch checked={s.anticoagulant} onCheckedChange={(v) => setS((p) => ({ ...p, anticoagulant: !!v }))} />
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Bilinen malignite</div>
                  <div className="text-xs text-muted-foreground">Metastaz olasılığı</div>
                </div>
                <Switch checked={s.knownMalignancy} onCheckedChange={(v) => setS((p) => ({ ...p, knownMalignancy: !!v }))} />
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Ateş / sepsis</div>
                  <div className="text-xs text-muted-foreground">Apsede önemli</div>
                </div>
                <Switch checked={s.feverSepsis} onCheckedChange={(v) => setS((p) => ({ ...p, feverSepsis: !!v }))} />
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">İmmünsüpresyon</div>
                  <div className="text-xs text-muted-foreground">Enfeksiyon risk</div>
                </div>
                <Switch checked={s.immunosuppressed} onCheckedChange={(v) => setS((p) => ({ ...p, immunosuppressed: !!v }))} />
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Hipertansiyon</div>
                  <div className="text-xs text-muted-foreground">Hipertansif ICH</div>
                </div>
                <Switch checked={s.htn} onCheckedChange={(v) => setS((p) => ({ ...p, htn: !!v }))} />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {/* Hemorrhage */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">3) Kanama (ekstraaksiyel / intraaksiyel / SAH / IVH)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Kanama var mı?</Label>
                  <TriButtons value={s.hemorrhagePresent} onChange={(v) => setS((p) => ({ ...p, hemorrhagePresent: v }))} />
                </div>

                {s.hemorrhagePresent === "var" ? (
                  <>
                    <Separator />

                    <div className="space-y-2">
                      <Label>Dağılım</Label>
                      <ToggleButtons<BrainState["hemorrhageLocation"]>
                        value={s.hemorrhageLocation}
                        onChange={(v) => setS((p) => ({ ...p, hemorrhageLocation: v }))}
                        options={[
                          { value: "bilinmiyor", label: "Bilinmiyor" },
                          { value: "ekstraaksiyel", label: "Ekstraaksiyel" },
                          { value: "intraaksiyel", label: "İntraaksiyel" },
                          { value: "SAH baskın", label: "SAH baskın" },
                          { value: "IVH", label: "IVH" },
                        ]}
                      />
                      <p className="text-xs text-muted-foreground">SAH’de travma vs anevrizma ayrımı için paterni ileride detaylandıracağız.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Ekstraaksiyel alt tip</Label>
                        <ToggleButtons<ExtraAxialType>
                          value={s.extraAxialType}
                          onChange={(v) => setS((p) => ({ ...p, extraAxialType: v }))}
                          options={[
                            { value: "bilinmiyor", label: "Bilinmiyor" },
                            { value: "epidural", label: "Epidural" },
                            { value: "subdural", label: "Subdural" },
                            { value: "subaraknoid (SAH)", label: "SAH" },
                          ]}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>İntraaksiyel alt tip</Label>
                        <ToggleButtons<IntraAxialType>
                          value={s.intraAxialType}
                          onChange={(v) => setS((p) => ({ ...p, intraAxialType: v }))}
                          options={[
                            { value: "bilinmiyor", label: "Bilinmiyor" },
                            { value: "intraparenkimal hematom (IPH)", label: "IPH" },
                            { value: "kontüzyon", label: "Kontüzyon" },
                            { value: "hemorajik transformasyon", label: "Hemorajik transf." },
                          ]}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Kanama evresi (opsiyonel)</Label>
                      <ToggleButtons<HemorrhageAge>
                        value={s.hemorrhageAge}
                        onChange={(v) => setS((p) => ({ ...p, hemorrhageAge: v }))}
                        options={[
                          { value: "bilinmiyor", label: "Bilinmiyor" },
                          { value: "hiperakut", label: "Hiperakut" },
                          { value: "akut", label: "Akut" },
                          { value: "erken subakut", label: "Erken subakut" },
                          { value: "geç subakut", label: "Geç subakut" },
                          { value: "kronik", label: "Kronik" },
                        ]}
                      />
                      <p className="text-xs text-muted-foreground">Evreleme BT yoğunluk + MR T1/T2/SWI ile daha güvenilir.</p>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Midline shift</Label>
                        <ToggleButtons<BrainState["midlineShift"]>
                          value={s.midlineShift}
                          onChange={(v) => setS((p) => ({ ...p, midlineShift: v }))}
                          options={[
                            { value: "bilinmiyor", label: "Bilinmiyor" },
                            { value: "yok", label: "Yok" },
                            { value: "hafif", label: "Hafif" },
                            { value: "belirgin", label: "Belirgin" },
                          ]}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Herniasyon bulgusu</Label>
                        <TriButtons value={s.herniationSigns} onChange={(v) => setS((p) => ({ ...p, herniationSigns: v }))} />
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Skull fraktür</Label>
                        <TriButtons value={s.skullFracture} onChange={(v) => setS((p) => ({ ...p, skullFracture: v }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Pnömosefali</Label>
                        <TriButtons value={s.pneumocephalus} onChange={(v) => setS((p) => ({ ...p, pneumocephalus: v }))} />
                      </div>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>

            {/* Mass */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">4) Kitle (ekstraaksiyel/intraaksiyel + patern)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Kitle var mı?</Label>
                  <TriButtons value={s.massPresent} onChange={(v) => setS((p) => ({ ...p, massPresent: v }))} />
                </div>

                {s.massPresent === "var" ? (
                  <>
                    <Separator />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Kompartman</Label>
                        <ToggleButtons<MassCompartment>
                          value={s.compartment}
                          onChange={(v) => setS((p) => ({ ...p, compartment: v }))}
                          options={[
                            { value: "bilinmiyor", label: "Bilinmiyor" },
                            { value: "intraaksiyel", label: "İntraaksiyel" },
                            { value: "ekstraaksiyel", label: "Ekstraaksiyel" },
                          ]}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Lezyon sayısı</Label>
                        <ToggleButtons<NumberOfLesions>
                          value={s.numberOfLesions}
                          onChange={(v) => setS((p) => ({ ...p, numberOfLesions: v }))}
                          options={[
                            { value: "bilinmiyor", label: "Bilinmiyor" },
                            { value: "tek", label: "Tek" },
                            { value: "çoklu", label: "Çoklu" },
                          ]}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Kontrastlanma paterni</Label>
                      <ToggleButtons<EnhancementPattern>
                        value={s.enhancement}
                        onChange={(v) => setS((p) => ({ ...p, enhancement: v }))}
                        options={[
                          { value: "bilinmiyor", label: "Bilinmiyor" },
                          { value: "yok", label: "Yok" },
                          { value: "solid", label: "Solid" },
                          { value: "halka (ring)", label: "Halka (ring)" },
                          { value: "dural tail", label: "Dural tail" },
                        ]}
                      />
                      <p className="text-xs text-muted-foreground">Ring + restriksiyon(+)+ateş → apse lehine; ring + restriksiyon(-) → nekrotik tümör/met.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>DWI restriksiyon</Label>
                        <TriButtons value={s.diffusionRestriction} onChange={(v) => setS((p) => ({ ...p, diffusionRestriction: v }))} />
                      </div>

                      <div className="space-y-2">
                        <Label>Kanamalı komponent</Label>
                        <TriButtons value={s.hemorrhagicComponent} onChange={(v) => setS((p) => ({ ...p, hemorrhagicComponent: v }))} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Kalsifikasyon</Label>
                        <TriButtons value={s.calcification} onChange={(v) => setS((p) => ({ ...p, calcification: v }))} />
                      </div>

                      <div className="space-y-2">
                        <Label>Dural tabanlı görünüm</Label>
                        <TriButtons value={s.duralBased} onChange={(v) => setS((p) => ({ ...p, duralBased: v }))} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Ödem</Label>
                      <ToggleButtons<Edema>
                        value={s.edema}
                        onChange={(v) => setS((p) => ({ ...p, edema: v }))}
                        options={[
                          { value: "bilinmiyor", label: "Bilinmiyor" },
                          { value: "yok/az", label: "Yok/Az" },
                          { value: "orta", label: "Orta" },
                          { value: "belirgin", label: "Belirgin" },
                        ]}
                      />
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>T1 sinyal (opsiyonel)</Label>
                        <ToggleButtons<MRIntensity>
                          value={s.t1}
                          onChange={(v) => setS((p) => ({ ...p, t1: v }))}
                          options={mrIntensityOptions.map((v) => ({ value: v, label: v }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>T2 sinyal (opsiyonel)</Label>
                        <ToggleButtons<MRIntensity>
                          value={s.t2}
                          onChange={(v) => setS((p) => ({ ...p, t2: v }))}
                          options={mrIntensityOptions.map((v) => ({ value: v, label: v }))}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>Midline shift</Label>
                      <ToggleButtons<BrainState["midlineShift"]>
                        value={s.midlineShift}
                        onChange={(v) => setS((p) => ({ ...p, midlineShift: v }))}
                        options={[
                          { value: "bilinmiyor", label: "Bilinmiyor" },
                          { value: "yok", label: "Yok" },
                          { value: "hafif", label: "Hafif" },
                          { value: "belirgin", label: "Belirgin" },
                        ]}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Herniasyon bulgusu</Label>
                      <TriButtons value={s.herniationSigns} onChange={(v) => setS((p) => ({ ...p, herniationSigns: v }))} />
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">5) Ek / insidental bulgular</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                value={s.incidental}
                onChange={(e) => setS((p) => ({ ...p, incidental: e.target.value }))}
                placeholder="Buraya serbest metin ekle; final rapora entegre olur."
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: Output */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">AI Çıktı</CardTitle>
                <div className="text-sm text-muted-foreground">Kural tabanlı (açıklanabilir)</div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className="border">Aciliyet: {urgencyHeadline}</Badge>
                  <Button size="sm" variant="outline" onClick={() => copyText(finalSentence)}>
                    Kopyala
                  </Button>
                </div>

                <div className="rounded-md border p-3 text-sm leading-6">
                  <div className="font-medium mb-1">Final (tek cümle)</div>
                  <div>{finalSentence}</div>
                </div>

                {(hemo.warning || mass.warning) && (
                  <div className="rounded-md border p-3 text-sm">
                    <div className="font-medium mb-1">Uyarı</div>
                    <div className="text-muted-foreground">{[hemo.warning, mass.warning].filter(Boolean).join(" ")}</div>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <div className="font-medium">Ayırıcı Tanı (DDX)</div>
                  {ddx.length === 0 ? (
                    <p className="text-sm text-muted-foreground">DDX için kanama veya kitle alanlarında “Var” seç.</p>
                  ) : (
                    <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
                      {ddx.slice(0, reportStyleShort ? 6 : 12).map((d) => (
                        <div key={d.name} className="rounded-md border p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium text-sm">{d.name}</div>
                            <LikelihoodBadge v={d.likelihood} />
                          </div>
                          {!reportStyleShort && d.why.length > 0 && (
                            <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground space-y-1">
                              {d.why.slice(0, 4).map((w, i) => (
                                <li key={i}>{w}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="font-medium">İleri inceleme / Öneriler</div>
                  {recs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Öneri üretimi için kanama/kitle girdilerini tamamla.</p>
                  ) : (
                    <div className="space-y-2 max-h-[280px] overflow-auto pr-1">
                      {recs.slice(0, reportStyleShort ? 5 : 10).map((r) => (
                        <div key={r.title} className="rounded-md border p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium text-sm">{r.title}</div>
                            <UrgencyBadge v={r.urgency} />
                          </div>
                          {!reportStyleShort && (
                            <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground space-y-1">
                              {r.details.slice(0, 4).map((d, i) => (
                                <li key={i}>{d}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Kısayollar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setS((p) => ({
                        ...p,
                        modality: "BT",
                        trauma: true,
                        hemorrhagePresent: "var",
                        hemorrhageLocation: "ekstraaksiyel",
                        extraAxialType: "epidural",
                        skullFracture: "var",
                        midlineShift: "hafif",
                      }))
                    }
                  >
                    Travma + EDH örnek
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setS((p) => ({
                        ...p,
                        modality: "MR",
                        feverSepsis: true,
                        massPresent: "var",
                        compartment: "intraaksiyel",
                        numberOfLesions: "tek",
                        enhancement: "halka (ring)",
                        diffusionRestriction: "var",
                        edema: "orta",
                      }))
                    }
                  >
                    Ring + restriksiyon (apse)
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setS((p) => ({
                        ...p,
                        modality: "MR",
                        knownMalignancy: true,
                        massPresent: "var",
                        compartment: "intraaksiyel",
                        numberOfLesions: "çoklu",
                        enhancement: "halka (ring)",
                        diffusionRestriction: "yok",
                        edema: "belirgin",
                      }))
                    }
                  >
                    Çoklu ring (met)
                  </Button>
                </div>

                <Separator />

                <p className="text-muted-foreground">
                  v2 planı: SAH paterni (bazal sistern/sulkus), DAI (SWI), venöz tromboz ayrımı, menenjit/empiyem, MR perf/spek opsiyonları.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Home (organ selector + module container) ----
export default function HomePage() {
  const [organ, setOrgan] = useState<Organ>("liver");

  // Optional: remember selection
  useEffect(() => {
    try {
      const v = window.localStorage.getItem("rc_organ");
      if (v === "liver" || v === "brain") setOrgan(v);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("rc_organ", organ);
    } catch {
      // ignore
    }
  }, [organ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">radiology-clean</h1>
          <p className="text-sm text-muted-foreground">
            Organ seç → ilgili modül açılır. (Kural tabanlı, açıklanabilir DDX + öneri)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant={organ === "liver" ? "default" : "outline"} onClick={() => setOrgan("liver")}>
            Karaciğer
          </Button>
          <Button size="sm" variant={organ === "brain" ? "default" : "outline"} onClick={() => setOrgan("brain")}>
            Beyin
          </Button>

          {/* Quick direct link too */}
          <Button asChild size="sm" variant="outline">
            <Link href="/liver">/liver’a git</Link>
          </Button>
        </div>
      </div>

      <Separator className="mb-5" />

      {organ === "liver" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Karaciğer Modülü</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Bu ekran ana sayfa içinde karaciğer modülünü gösterir. Ayrı sayfadan da erişebilirsin:{" "}
              <Link className="underline" href="/liver">
                /liver
              </Link>
            </CardContent>
          </Card>

          {/* Render existing liver module in-place */}
          <LiverPage />
        </div>
      ) : (
        <BrainModule />
      )}
    </div>
  );
}
