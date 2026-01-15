"use client";

import React, { useMemo, useState } from "react";
import LiverPage from "./liver/page";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** -----------------------------
 *  Shared helpers
 *  ----------------------------- */

type Likelihood = "yüksek" | "orta" | "düşük";
type Urgency = "acil" | "önemli" | "rutin";

type DdxItem = {
  name: string;
  likelihood: Likelihood;
  why: string[];
  urgency?: Urgency;
};

function bump(l: Likelihood, dir: "up" | "down"): Likelihood {
  const order: Likelihood[] = ["düşük", "orta", "yüksek"];
  const idx = order.indexOf(l);
  const next = dir === "up" ? Math.min(2, idx + 1) : Math.max(0, idx - 1);
  return order[next];
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr)).filter(Boolean);
}

function fmtDdx(ddx: DdxItem[]) {
  const sorted = [...ddx].sort((a, b) => {
    const w = (x: Likelihood) => (x === "yüksek" ? 3 : x === "orta" ? 2 : 1);
    return w(b.likelihood) - w(a.likelihood);
  });
  const high = sorted.filter((d) => d.likelihood === "yüksek");
  const mid = sorted.filter((d) => d.likelihood === "orta");
  const low = sorted.filter((d) => d.likelihood === "düşük");
  return { high, mid, low, all: sorted };
}

function copyToClipboard(text: string) {
  if (!text) return;
  navigator.clipboard?.writeText(text);
}

/** -----------------------------
 *  Brain module (v1)
 *  Practical, rule-based
 *  ----------------------------- */

type BrainModality = "BT" | "MR";

type MildScale = "belirsiz" | "hipo" | "izo" | "hafif hiper" | "hiper" | "çok hiper";
type YesNo = "bilinmiyor" | "var" | "yok";

type ExtraAxialType = "epidural" | "subdural" | "subaraknoid";
type DensityCT = "hiperdens" | "izodens" | "hipodens" | "mikst";
type LocationGeneral =
  | "frontal"
  | "parietal"
  | "temporal"
  | "oksipital"
  | "bazal ganglion"
  | "talamus"
  | "beyin sapı"
  | "serebellum"
  | "intraventriküler"
  | "diffüz"
  | "bilinmiyor";

type MassCompartment = "intraaksiyel" | "ekstraaksiyel" | "bilinmiyor";
type Enhance = "yok" | "hafif" | "belirgin" | "ring" | "dural tail" | "bilinmiyor";
type DwiRestrict = "yok" | "var" | "bilinmiyor";
type Edema = "yok" | "hafif" | "belirgin" | "bilinmiyor";

type BrainState = {
  modality: BrainModality;

  // Clinical
  trauma: boolean;
  anticoag: boolean;
  ageGroup: "çocuk" | "erişkin" | "yaşlı" | "bilinmiyor";
  symptoms: string;

  // Hemorrhage toggles
  hemorrhage: boolean;

  // Extra-axial
  extraAxial: YesNo;
  extraAxialType: ExtraAxialType;
  extraAxialSide: "sağ" | "sol" | "bilateral" | "bilinmiyor";
  extraAxialCTDensity: DensityCT;
  extraAxialThicknessMm: string;
  midlineShift: YesNo;
  herniation: YesNo;

  // Intra-axial hemorrhage
  intraAxialHem: YesNo;
  intraAxialLoc: LocationGeneral;
  intraAxialCTDensity: DensityCT;
  ivh: YesNo;
  sah: YesNo;

  // Ischemia (basic)
  ischemiaSus: YesNo;
  earlyCTSigns: boolean; // insular ribbon, sulcal effacement etc.
  restrictedDiff: YesNo;

  // Mass / lesion
  mass: boolean;
  massCompartment: MassCompartment;
  massLoc: LocationGeneral;
  enhance: Enhance;
  dwi: DwiRestrict;
  edema: Edema;
  hemorrhagicComponent: YesNo;
  calcification: YesNo;

  // MRI signals (baseline)
  t1: MildScale;
  t2: MildScale;
  flair: MildScale;
  adcLow: YesNo; // simplified
  perfHigh: YesNo;

  // Output
  incidental: string;
};

const brainDefault: BrainState = {
  modality: "BT",
  trauma: true,
  anticoag: false,
  ageGroup: "erişkin",
  symptoms: "",

  hemorrhage: true,

  extraAxial: "bilinmiyor",
  extraAxialType: "subdural",
  extraAxialSide: "bilinmiyor",
  extraAxialCTDensity: "hiperdens",
  extraAxialThicknessMm: "",
  midlineShift: "bilinmiyor",
  herniation: "bilinmiyor",

  intraAxialHem: "bilinmiyor",
  intraAxialLoc: "bilinmiyor",
  intraAxialCTDensity: "hiperdens",
  ivh: "bilinmiyor",
  sah: "bilinmiyor",

  ischemiaSus: "bilinmiyor",
  earlyCTSigns: false,
  restrictedDiff: "bilinmiyor",

  mass: false,
  massCompartment: "bilinmiyor",
  massLoc: "bilinmiyor",
  enhance: "bilinmiyor",
  dwi: "bilinmiyor",
  edema: "bilinmiyor",
  hemorrhagicComponent: "bilinmiyor",
  calcification: "bilinmiyor",

  t1: "belirsiz",
  t2: "belirsiz",
  flair: "belirsiz",
  adcLow: "bilinmiyor",
  perfHigh: "bilinmiyor",

  incidental: "",
};

function densityToStageHint(d: DensityCT) {
  // CT density is only a proxy; keep language conditional.
  // Acute SDH/EDH usually hyperdense; chronic often hypodense; subacute iso; mixed suggests rebleed/active.
  if (d === "hiperdens") return "akut/subakut olasılığı";
  if (d === "izodens") return "subakut olasılığı";
  if (d === "hipodens") return "kronik olasılığı";
  return "farklı yaşta kanama / yeniden kanama olasılığı";
}

function brainDdx(s: BrainState): { ddx: DdxItem[]; urgent: string[]; recs: string[]; report: string } {
  let ddx: DdxItem[] = [];
  const urgent: string[] = [];
  const recs: string[] = [];
  const reportLines: string[] = [];

  // --- Hemorrhage domain
  if (s.hemorrhage) {
    if (s.extraAxial === "var") {
      // baseline
      const stageHint = densityToStageHint(s.extraAxialCTDensity);
      if (s.extraAxialType === "epidural") {
        ddx.push({
          name: "Epidural hematom",
          likelihood: "yüksek",
          urgency: "acil",
          why: uniq([
            "Ekstraaksiyel kanama var",
            "Epidural patern seçildi",
            `BT densitesi: ${s.extraAxialCTDensity} (${stageHint})`,
            s.trauma ? "Travma öyküsü ile uyumlu olabilir" : "",
          ]),
        });
        reportLines.push(
          `Ekstraaksiyel alanda epidural hematom ile uyumlu kanama izlenmektedir (BT densitesi ${s.extraAxialCTDensity}; ${stageHint}).`
        );
      } else if (s.extraAxialType === "subdural") {
        ddx.push({
          name: "Subdural hematom",
          likelihood: "yüksek",
          urgency: s.midlineShift === "var" || s.herniation === "var" ? "acil" : "önemli",
          why: uniq([
            "Ekstraaksiyel kanama var",
            "Subdural patern seçildi",
            `BT densitesi: ${s.extraAxialCTDensity} (${stageHint})`,
            s.anticoag ? "Antikoagülan kullanımı/subdural risk artışı" : "",
            s.ageGroup === "yaşlı" ? "Yaşlı hasta/atrofi zemininde subdural daha olası" : "",
          ]),
        });
        reportLines.push(
          `Ekstraaksiyel alanda subdural hematom ile uyumlu kanama izlenmektedir (BT densitesi ${s.extraAxialCTDensity}; ${stageHint}).`
        );
      } else if (s.extraAxialType === "subaraknoid") {
        ddx.push({
          name: "Subaraknoid kanama",
          likelihood: "yüksek",
          urgency: "acil",
          why: uniq([
            "SAH paterni seçildi",
            s.trauma ? "Travmatik SAH ile uyumlu olabilir" : "Anevrizmal SAH dışlanamaz",
          ]),
        });
        reportLines.push(`Subaraknoid kanama ile uyumlu görünüm mevcuttur.`);
        urgent.push("Subaraknoid kanama: Klinik korelasyon + hızlı nöroşirürji/nöroloji değerlendirmesi.");
        if (!s.trauma) recs.push("Anevrizmal SAH şüphesinde BT anjiyografi / DSA değerlendirmesi önerilir.");
      }

      if (s.extraAxialSide !== "bilinmiyor") reportLines.push(`Lateralizasyon: ${s.extraAxialSide}.`);
      if (s.extraAxialThicknessMm?.trim()) reportLines.push(`Maksimum kalınlık yaklaşık ${s.extraAxialThicknessMm} mm.`);
      if (s.midlineShift === "var") {
        urgent.push("Orta hat şifti mevcut: acil nöroşirürji görüşü önerilir.");
        reportLines.push("Orta hat şifti izlenmektedir.");
      }
      if (s.herniation === "var") {
        urgent.push("Herniasyon bulgusu şüphesi: acil klinik değerlendirme ve yönetim.");
        reportLines.push("Herniasyon lehine bulgular izlenmektedir/şüphelidir.");
      }
    }

    if (s.intraAxialHem === "var") {
      ddx.push({
        name: "İntraparenkimal hematom / hemoraji",
        likelihood: "yüksek",
        urgency: "acil",
        why: uniq([
          "İntraaksiyel kanama var",
          `Lokalizasyon: ${s.intraAxialLoc}`,
          `BT densitesi: ${s.intraAxialCTDensity}`,
          s.anticoag ? "Antikoagülasyon eşlik ediyor olabilir" : "",
          s.trauma ? "Travma ilişkili kontüzyon/hematom olabilir" : "",
        ]),
      });
      reportLines.push(
        `İntraaksiyel alanda ${s.intraAxialLoc} düzeyinde intraparenkimal kanama/hematom ile uyumlu görünüm mevcuttur (BT densitesi ${s.intraAxialCTDensity}).`
      );
      urgent.push("İntraparenkimal kanama: kan basıncı/koagülasyon değerlendirmesi + nöroloji/nöroşirürji konsültasyonu.");
      if (s.ivh === "var") {
        reportLines.push("İntraventriküler kanama eşlik etmektedir.");
        urgent.push("İntraventriküler kanama: akut hidrosefali açısından yakın takip.");
      }
      if (s.sah === "var") {
        reportLines.push("Subaraknoid kanama eşlik etmektedir.");
      }
    }

    if (s.sah === "var" && s.extraAxial !== "var") {
      ddx.push({
        name: "Subaraknoid kanama",
        likelihood: "yüksek",
        urgency: "acil",
        why: uniq([s.trauma ? "Travma ile ilişkili olabilir" : "Anevrizmal SAH dışlanamaz"]),
      });
      reportLines.push("Subaraknoid kanama ile uyumlu görünüm mevcuttur.");
      urgent.push("SAH: hızlı klinik değerlendirme ve uygun vasküler görüntüleme planı.");
    }
  }

  // --- Ischemia domain (basic triage)
  if (s.ischemiaSus === "var") {
    let l: Likelihood = "orta";
    const why: string[] = ["İskemi şüphesi seçildi"];
    if (s.earlyCTSigns) {
      l = bump(l, "up");
      why.push("Erken BT iskemi bulguları (örn. sulkus silinmesi/insular ribbon vb.) mevcut olabilir");
    }
    if (s.modality === "MR" && s.restrictedDiff === "var") {
      l = bump(l, "up");
      why.push("DWI kısıtlı diffüzyon (akut iskemi lehine)");
    }
    ddx.push({
      name: "Akut iskemik inme",
      likelihood: l,
      urgency: "acil",
      why,
    });
    urgent.push("Akut iskemik inme: klinik zaman penceresine göre tromboliz/trombektomi uygunluğu açısından acil değerlendirme.");
    recs.push("BT/BT-perfüzyon/BT anjiyografi veya MR-DWI/TOF MRA ile vasküler değerlendirme (klinik uygunlukla).");
    reportLines.push("Akut iskemik olay açısından değerlendirme önerilir; klinik korelasyon önemlidir.");
  }

  // --- Mass/lesion domain (practical)
  if (s.mass) {
    if (s.massCompartment === "ekstraaksiyel") {
      let lMen: Likelihood = "orta";
      const whyMen: string[] = ["Ekstraaksiyel kompartman seçildi"];
      if (s.enhance === "dural tail") {
        lMen = "yüksek";
        whyMen.push("Dural tail paterni");
      }
      if (s.calcification === "var") whyMen.push("Kalsifikasyon eşlik edebilir");
      ddx.push({
        name: "Menenjiyom",
        likelihood: lMen,
        urgency: "rutin",
        why: uniq(whyMen),
      });

      ddx.push({
        name: "Dural metastaz",
        likelihood: s.enhance === "dural tail" ? "düşük" : "orta",
        urgency: "önemli",
        why: uniq([
          "Ekstraaksiyel kitle",
          s.enhance === "belirgin" ? "Belirgin kontrastlanma" : "",
          "Primer malignite öyküsü ile korelasyon",
        ]),
      });

      reportLines.push(
        `Ekstraaksiyel yerleşimli kitle lezyonu izlenmektedir (${s.massLoc}). Kontrastlanma paterni: ${s.enhance}.`
      );
      recs.push("Kontrastlı beyin MR (gerekirse MRV/MRA) ile karakterizasyon önerilir.");
    } else if (s.massCompartment === "intraaksiyel") {
      // abscess vs GBM vs metastasis (simplified)
      let lAbs: Likelihood = "düşük";
      let lMet: Likelihood = "orta";
      let lGbm: Likelihood = "orta";

      const whyAbs: string[] = ["İntraaksiyel lezyon"];
      const whyMet: string[] = ["İntraaksiyel lezyon"];
      const whyGbm: string[] = ["İntraaksiyel lezyon"];

      if (s.enhance === "ring") {
        lMet = bump(lMet, "up");
        lGbm = bump(lGbm, "up");
        whyMet.push("Ring kontrastlanma");
        whyGbm.push("Ring/heterojen kontrastlanma");
      }
      if (s.dwi === "var") {
        lAbs = "yüksek";
        whyAbs.push("DWI kısıtlı diffüzyon (apse lehine)");
        lMet = bump(lMet, "down");
        lGbm = bump(lGbm, "down");
      }
      if (s.edema === "belirgin") {
        whyMet.push("Belirgin vazojenik ödem");
        whyGbm.push("Belirgin ödem/komşu infiltrasyon olabilir");
      }
      if (s.hemorrhagicComponent === "var") {
        lMet = bump(lMet, "up");
        whyMet.push("Hemorajik komponent (metastaz/melanom/renal/tiroid vb. ile uyumlu olabilir)");
      }

      ddx.push({ name: "Metastaz", likelihood: lMet, urgency: "önemli", why: uniq(whyMet) });
      ddx.push({ name: "Yüksek dereceli glial tümör (GBM vb.)", likelihood: lGbm, urgency: "önemli", why: uniq(whyGbm) });
      ddx.push({ name: "Beyin apsesi", likelihood: lAbs, urgency: lAbs === "yüksek" ? "acil" : "önemli", why: uniq(whyAbs) });

      reportLines.push(
        `İntraaksiyel yerleşimli kitle/lezyon izlenmektedir (${s.massLoc}). Kontrastlanma: ${s.enhance}, DWI: ${s.dwi}, ödem: ${s.edema}.`
      );
      recs.push("Kontrastlı beyin MR + DWI/ADC (gerekirse perfüzyon/spektroskopi) ile ileri karakterizasyon önerilir.");
      recs.push("Sistemik malignite öyküsü varsa tüm vücut tarama/klinik korelasyon önerilir.");
    } else {
      reportLines.push("Kitle/lezyon seçildi ancak kompartman bilinmiyor: ileri karakterizasyon önerilir.");
      recs.push("Kontrastlı beyin MR ile kompartman ve karakterizasyon önerilir.");
    }
  }

  // --- MRI signal baseline (optional, helps ddx language even if no dynamic)
  if (s.modality === "MR") {
    const anySignal =
      s.t1 !== "belirsiz" || s.t2 !== "belirsiz" || s.flair !== "belirsiz" || s.adcLow !== "bilinmiyor";
    if (anySignal) {
      reportLines.push(
        `MR sinyal özeti: T1 ${s.t1}, T2 ${s.t2}, FLAIR ${s.flair}${s.adcLow === "var" ? ", ADC düşük (diff kısıtlı)" : ""}.`
      );
    }
  }

  // --- Urgency rollup
  const ddxFmt = fmtDdx(ddx);

  const report =
    [
      "BEYİN GÖRÜNTÜLEME – YAPILANDIRILMIŞ ÖZET",
      s.symptoms?.trim() ? `Klinik: ${s.symptoms.trim()}` : "",
      reportLines.length ? "Bulgular:" : "",
      ...reportLines.map((x) => `• ${x}`),
      s.incidental?.trim() ? "Ek/İnsidental:" : "",
      s.incidental?.trim() ? `• ${s.incidental.trim()}` : "",
      ddxFmt.all.length ? "Olası Tanılar (kural tabanlı):" : "",
      ...ddxFmt.high.map((d) => `• [YÜKSEK] ${d.name} — ${uniq(d.why).join("; ")}`),
      ...ddxFmt.mid.map((d) => `• [ORTA] ${d.name} — ${uniq(d.why).join("; ")}`),
      ...ddxFmt.low.map((d) => `• [DÜŞÜK] ${d.name} — ${uniq(d.why).join("; ")}`),
      urgent.length ? "Acil/Uyarı:" : "",
      ...urgent.map((u) => `• ${u}`),
      recs.length ? "Öneri / İleri İnceleme:" : "",
      ...recs.map((r) => `• ${r}`),
    ]
      .filter(Boolean)
      .join("\n") + "\n";

  return { ddx: ddxFmt.all, urgent: uniq(urgent), recs: uniq(recs), report };
}

function BrainModule() {
  const [s, setS] = useState<BrainState>(brainDefault);

  const out = useMemo(() => brainDdx(s), [s]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-8 space-y-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Beyin Modülü (v1)
              <Badge variant="secondary">Kural tabanlı</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* 1) Modality & clinical */}
            <div className="space-y-2">
              <div className="text-sm font-semibold">1) İnceleme & Klinik</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Modality</Label>
                  <Select value={s.modality} onValueChange={(v) => setS((p) => ({ ...p, modality: v as BrainModality }))}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Seç" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BT">BT</SelectItem>
                      <SelectItem value="MR">MR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Yaş grubu</Label>
                  <Select
                    value={s.ageGroup}
                    onValueChange={(v) => setS((p) => ({ ...p, ageGroup: v as BrainState["ageGroup"] }))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Seç" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bilinmiyor">Bilinmiyor</SelectItem>
                      <SelectItem value="çocuk">Çocuk</SelectItem>
                      <SelectItem value="erişkin">Erişkin</SelectItem>
                      <SelectItem value="yaşlı">Yaşlı</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <div className="text-sm font-medium">Travma</div>
                    <div className="text-xs text-muted-foreground">Travma zemini var mı?</div>
                  </div>
                  <Switch checked={s.trauma} onCheckedChange={(v) => setS((p) => ({ ...p, trauma: v }))} />
                </div>

                <div className="flex items-center justify-between rounded-xl border p-3 md:col-span-2">
                  <div>
                    <div className="text-sm font-medium">Antikoagülan / Antitrombosit</div>
                    <div className="text-xs text-muted-foreground">Kanama riski / şiddet artışı</div>
                  </div>
                  <Switch checked={s.anticoag} onCheckedChange={(v) => setS((p) => ({ ...p, anticoag: v }))} />
                </div>

                <div className="md:col-span-3 space-y-1">
                  <Label>Klinik not</Label>
                  <Input
                    className="rounded-xl"
                    value={s.symptoms}
                    onChange={(e) => setS((p) => ({ ...p, symptoms: e.target.value }))}
                    placeholder="Örn: Ani baş ağrısı, GKS düşüş, fokal defisit, nöbet..."
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* 2) Hemorrhage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">2) Kanama / Travma</div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Kanama değerlendirmesi</Label>
                  <Switch checked={s.hemorrhage} onCheckedChange={(v) => setS((p) => ({ ...p, hemorrhage: v }))} />
                </div>
              </div>

              {s.hemorrhage && (
                <div className="space-y-3">
                  <Card className="rounded-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Ekstraaksiyel</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label>Ekstraaksiyel kanama</Label>
                        <Select
                          value={s.extraAxial}
                          onValueChange={(v) => setS((p) => ({ ...p, extraAxial: v as YesNo }))}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bilinmiyor">Bilinmiyor</SelectItem>
                            <SelectItem value="yok">Yok</SelectItem>
                            <SelectItem value="var">Var</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label>Tip</Label>
                        <Select
                          value={s.extraAxialType}
                          onValueChange={(v) => setS((p) => ({ ...p, extraAxialType: v as ExtraAxialType }))}
                          disabled={s.extraAxial !== "var"}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="epidural">Epidural</SelectItem>
                            <SelectItem value="subdural">Subdural</SelectItem>
                            <SelectItem value="subaraknoid">Subaraknoid</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label>Lateralizasyon</Label>
                        <Select
                          value={s.extraAxialSide}
                          onValueChange={(v) => setS((p) => ({ ...p, extraAxialSide: v as BrainState["extraAxialSide"] }))}
                          disabled={s.extraAxial !== "var"}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bilinmiyor">Bilinmiyor</SelectItem>
                            <SelectItem value="sağ">Sağ</SelectItem>
                            <SelectItem value="sol">Sol</SelectItem>
                            <SelectItem value="bilateral">Bilateral</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label>BT densite (yaklaşık evre)</Label>
                        <Select
                          value={s.extraAxialCTDensity}
                          onValueChange={(v) => setS((p) => ({ ...p, extraAxialCTDensity: v as DensityCT }))}
                          disabled={s.extraAxial !== "var" || s.modality !== "BT"}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hiperdens">Hiperdens</SelectItem>
                            <SelectItem value="izodens">İzodens</SelectItem>
                            <SelectItem value="hipodens">Hipodens</SelectItem>
                            <SelectItem value="mikst">Mikst</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="text-xs text-muted-foreground">
                          Not: Densite yaş tayininde kaba göstergedir; klinik & seri görüntüleme ile yorumlanır.
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label>Maks. kalınlık (mm)</Label>
                        <Input
                          className="rounded-xl"
                          value={s.extraAxialThicknessMm}
                          onChange={(e) => setS((p) => ({ ...p, extraAxialThicknessMm: e.target.value }))}
                          placeholder="örn: 6"
                          disabled={s.extraAxial !== "var"}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label>Orta hat şifti</Label>
                        <Select
                          value={s.midlineShift}
                          onValueChange={(v) => setS((p) => ({ ...p, midlineShift: v as YesNo }))}
                          disabled={s.extraAxial !== "var" && s.intraAxialHem !== "var"}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bilinmiyor">Bilinmiyor</SelectItem>
                            <SelectItem value="yok">Yok</SelectItem>
                            <SelectItem value="var">Var</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1 md:col-span-3">
                        <Label>Herniasyon şüphesi</Label>
                        <Select value={s.herniation} onValueChange={(v) => setS((p) => ({ ...p, herniation: v as YesNo }))}>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bilinmiyor">Bilinmiyor</SelectItem>
                            <SelectItem value="yok">Yok</SelectItem>
                            <SelectItem value="var">Var</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">İntraaksiyel</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label>İntraaksiyel kanama</Label>
                        <Select
                          value={s.intraAxialHem}
                          onValueChange={(v) => setS((p) => ({ ...p, intraAxialHem: v as YesNo }))}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bilinmiyor">Bilinmiyor</SelectItem>
                            <SelectItem value="yok">Yok</SelectItem>
                            <SelectItem value="var">Var</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label>Lokalizasyon</Label>
                        <Select
                          value={s.intraAxialLoc}
                          onValueChange={(v) => setS((p) => ({ ...p, intraAxialLoc: v as LocationGeneral }))}
                          disabled={s.intraAxialHem !== "var"}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              "bilinmiyor",
                              "frontal",
                              "parietal",
                              "temporal",
                              "oksipital",
                              "bazal ganglion",
                              "talamus",
                              "beyin sapı",
                              "serebellum",
                              "intraventriküler",
                              "diffüz",
                            ].map((x) => (
                              <SelectItem key={x} value={x}>
                                {x}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label>BT densite</Label>
                        <Select
                          value={s.intraAxialCTDensity}
                          onValueChange={(v) => setS((p) => ({ ...p, intraAxialCTDensity: v as DensityCT }))}
                          disabled={s.intraAxialHem !== "var" || s.modality !== "BT"}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hiperdens">Hiperdens</SelectItem>
                            <SelectItem value="izodens">İzodens</SelectItem>
                            <SelectItem value="hipodens">Hipodens</SelectItem>
                            <SelectItem value="mikst">Mikst</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label>IVH</Label>
                        <Select value={s.ivh} onValueChange={(v) => setS((p) => ({ ...p, ivh: v as YesNo }))}>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bilinmiyor">Bilinmiyor</SelectItem>
                            <SelectItem value="yok">Yok</SelectItem>
                            <SelectItem value="var">Var</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label>SAH</Label>
                        <Select value={s.sah} onValueChange={(v) => setS((p) => ({ ...p, sah: v as YesNo }))}>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bilinmiyor">Bilinmiyor</SelectItem>
                            <SelectItem value="yok">Yok</SelectItem>
                            <SelectItem value="var">Var</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label>Ekstraaksiyel (genel)</Label>
                        <Select value={s.extraAxial} onValueChange={(v) => setS((p) => ({ ...p, extraAxial: v as YesNo }))}>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bilinmiyor">Bilinmiyor</SelectItem>
                            <SelectItem value="yok">Yok</SelectItem>
                            <SelectItem value="var">Var</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="text-xs text-muted-foreground">IVH/SAH seçimleri DDX ve uyarıları etkiler.</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            <Separator />

            {/* 3) Ischemia */}
            <div className="space-y-2">
              <div className="text-sm font-semibold">3) İskemi / DWI</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Akut iskemi şüphesi</Label>
                  <Select value={s.ischemiaSus} onValueChange={(v) => setS((p) => ({ ...p, ischemiaSus: v as YesNo }))}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bilinmiyor">Bilinmiyor</SelectItem>
                      <SelectItem value="yok">Yok</SelectItem>
                      <SelectItem value="var">Var</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <div className="text-sm font-medium">Erken BT bulguları</div>
                    <div className="text-xs text-muted-foreground">insular ribbon/sulkus silinmesi vb.</div>
                  </div>
                  <Switch
                    checked={s.earlyCTSigns}
                    onCheckedChange={(v) => setS((p) => ({ ...p, earlyCTSigns: v }))}
                    disabled={s.modality !== "BT"}
                  />
                </div>

                <div className="space-y-1">
                  <Label>DWI kısıtlı diffüzyon</Label>
                  <Select
                    value={s.restrictedDiff}
                    onValueChange={(v) => setS((p) => ({ ...p, restrictedDiff: v as YesNo }))}
                    disabled={s.modality !== "MR"}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bilinmiyor">Bilinmiyor</SelectItem>
                      <SelectItem value="yok">Yok</SelectItem>
                      <SelectItem value="var">Var</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* 4) Mass */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">4) Kitle / Lezyon</div>
                <Switch checked={s.mass} onCheckedChange={(v) => setS((p) => ({ ...p, mass: v }))} />
              </div>

              {s.mass && (
                <Card className="rounded-2xl">
                  <CardContent className="pt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>Kompartman</Label>
                      <Select
                        value={s.massCompartment}
                        onValueChange={(v) => setS((p) => ({ ...p, massCompartment: v as MassCompartment }))}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bilinmiyor">Bilinmiyor</SelectItem>
                          <SelectItem value="intraaksiyel">İntraaksiyel</SelectItem>
                          <SelectItem value="ekstraaksiyel">Ekstraaksiyel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label>Lokalizasyon</Label>
                      <Select
                        value={s.massLoc}
                        onValueChange={(v) => setS((p) => ({ ...p, massLoc: v as LocationGeneral }))}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            "bilinmiyor",
                            "frontal",
                            "parietal",
                            "temporal",
                            "oksipital",
                            "bazal ganglion",
                            "talamus",
                            "beyin sapı",
                            "serebellum",
                            "intraventriküler",
                            "diffüz",
                          ].map((x) => (
                            <SelectItem key={x} value={x}>
                              {x}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label>Kontrastlanma paterni</Label>
                      <Select
                        value={s.enhance}
                        onValueChange={(v) => setS((p) => ({ ...p, enhance: v as Enhance }))}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bilinmiyor">Bilinmiyor</SelectItem>
                          <SelectItem value="yok">Yok</SelectItem>
                          <SelectItem value="hafif">Hafif</SelectItem>
                          <SelectItem value="belirgin">Belirgin</SelectItem>
                          <SelectItem value="ring">Ring</SelectItem>
                          <SelectItem value="dural tail">Dural tail</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label>DWI</Label>
                      <Select value={s.dwi} onValueChange={(v) => setS((p) => ({ ...p, dwi: v as DwiRestrict }))}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bilinmiyor">Bilinmiyor</SelectItem>
                          <SelectItem value="yok">Kısıt yok</SelectItem>
                          <SelectItem value="var">Kısıt var</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label>Ödem</Label>
                      <Select value={s.edema} onValueChange={(v) => setS((p) => ({ ...p, edema: v as Edema }))}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bilinmiyor">Bilinmiyor</SelectItem>
                          <SelectItem value="yok">Yok</SelectItem>
                          <SelectItem value="hafif">Hafif</SelectItem>
                          <SelectItem value="belirgin">Belirgin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label>Hemorajik komponent</Label>
                      <Select
                        value={s.hemorrhagicComponent}
                        onValueChange={(v) => setS((p) => ({ ...p, hemorrhagicComponent: v as YesNo }))}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bilinmiyor">Bilinmiyor</SelectItem>
                          <SelectItem value="yok">Yok</SelectItem>
                          <SelectItem value="var">Var</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label>Kalsifikasyon</Label>
                      <Select value={s.calcification} onValueChange={(v) => setS((p) => ({ ...p, calcification: v as YesNo }))}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bilinmiyor">Bilinmiyor</SelectItem>
                          <SelectItem value="yok">Yok</SelectItem>
                          <SelectItem value="var">Var</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* MRI signal granular (mild/moderate/marked) */}
                    {s.modality === "MR" && (
                      <>
                        <div className="md:col-span-3">
                          <Separator />
                        </div>

                        {[
                          ["T1", "t1"],
                          ["T2", "t2"],
                          ["FLAIR", "flair"],
                        ].map(([label, key]) => (
                          <div className="space-y-1" key={key}>
                            <Label>{label} sinyal</Label>
                            <Select
                              value={(s as any)[key]}
                              onValueChange={(v) => setS((p) => ({ ...p, [key]: v } as any))}
                            >
                              <SelectTrigger className="rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="belirsiz">Belirsiz</SelectItem>
                                <SelectItem value="hipo">Hipo</SelectItem>
                                <SelectItem value="izo">İzo</SelectItem>
                                <SelectItem value="hafif hiper">Hafif hiper (mild)</SelectItem>
                                <SelectItem value="hiper">Hiper</SelectItem>
                                <SelectItem value="çok hiper">Çok hiper (marked)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ))}

                        <div className="space-y-1">
                          <Label>ADC düşük</Label>
                          <Select value={s.adcLow} onValueChange={(v) => setS((p) => ({ ...p, adcLow: v as YesNo }))}>
                            <SelectTrigger className="rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bilinmiyor">Bilinmiyor</SelectItem>
                              <SelectItem value="yok">Yok</SelectItem>
                              <SelectItem value="var">Var</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label>Perfüzyon yüksek</Label>
                          <Select value={s.perfHigh} onValueChange={(v) => setS((p) => ({ ...p, perfHigh: v as YesNo }))}>
                            <SelectTrigger className="rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bilinmiyor">Bilinmiyor</SelectItem>
                              <SelectItem value="yok">Yok</SelectItem>
                              <SelectItem value="var">Var</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            <Separator />

            {/* 5) Incidental */}
            <div className="space-y-2">
              <div className="text-sm font-semibold">5) Ek / İnsidental Bulgular</div>
              <Textarea
                className="rounded-2xl min-h-[90px]"
                value={s.incidental}
                onChange={(e) => setS((p) => ({ ...p, incidental: e.target.value }))}
                placeholder="Örn: kronik mikroanjiyopatik değişiklikler, eski lakün, sinüzit, mastoid efüzyon..."
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                className="rounded-xl"
                onClick={() => setS(brainDefault)}
              >
                Sıfırla
              </Button>
              <Button
                className="rounded-xl"
                onClick={() => copyToClipboard(out.report)}
              >
                Raporu Kopyala
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sticky output */}
      <div className="lg:col-span-4">
        <div className="lg:sticky lg:top-4 space-y-4">
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                AI Çıktı
                <Badge variant="secondary">Canlı</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {out.urgent.length > 0 && (
                <div className="rounded-2xl border p-3">
                  <div className="text-sm font-semibold mb-2">Acil / Uyarı</div>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {out.urgent.map((u) => (
                      <li key={u}>{u}</li>
                    ))}
                  </ul>
                </div>
              )}

              {out.ddx.length > 0 && (
                <div className="rounded-2xl border p-3">
                  <div className="text-sm font-semibold mb-2">Olası Tanılar</div>
                  <div className="space-y-2">
                    {out.ddx.slice(0, 8).map((d) => (
                      <div key={d.name} className="rounded-xl border p-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm">{d.name}</div>
                          <Badge
                            variant={d.likelihood === "yüksek" ? "destructive" : d.likelihood === "orta" ? "secondary" : "outline"}
                          >
                            {d.likelihood}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {uniq(d.why).slice(0, 3).join(" · ")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {out.recs.length > 0 && (
                <div className="rounded-2xl border p-3">
                  <div className="text-sm font-semibold mb-2">Öneri</div>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {out.recs.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-2xl border p-3">
                <div className="text-sm font-semibold mb-2">Rapor Metni</div>
                <pre className="whitespace-pre-wrap text-xs leading-relaxed">{out.report}</pre>
                <div className="flex gap-2 mt-2">
                  <Button className="rounded-xl" onClick={() => copyToClipboard(out.report)}>
                    Raporu Kopyala
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Not: Çıktı kural tabanlıdır; klinik korelasyon ve kesin tanı için uygun ileri inceleme/seri takip gerekebilir.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** -----------------------------
 *  Root page: organ selector
 *  ----------------------------- */

type Organ = "karaciğer" | "beyin";

export default function Page() {
  const [organ, setOrgan] = useState<Organ>("karaciğer");

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="mx-auto max-w-6xl p-4 md:p-6 space-y-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center gap-2">
              Radiology-clean — Modül Seçimi
              <Badge variant="secondary">v1</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
            <div className="text-sm text-muted-foreground">
              İlk ekranda organ seç: seçime göre ilgili modül açılır (Karaciğer / Beyin).
            </div>

            <div className="flex gap-2">
              <Button
                className="rounded-xl"
                variant={organ === "karaciğer" ? "default" : "secondary"}
                onClick={() => setOrgan("karaciğer")}
              >
                Karaciğer
              </Button>
              <Button
                className="rounded-xl"
                variant={organ === "beyin" ? "default" : "secondary"}
                onClick={() => setOrgan("beyin")}
              >
                Beyin
              </Button>
            </div>
          </CardContent>
        </Card>

        {organ === "karaciğer" ? (
          <LiverPage />
        ) : (
          <BrainModule />
        )}
      </div>
    </div>
  );
}
