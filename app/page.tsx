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

/** -----------------------------
 * Brain module (v1 skeleton)
 * Goal: Conditional UI by flow (Travma / Kanama / Kitle-Enfeksiyon)
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

  /** TRAVMA fields */
  const [gcsLow, setGcsLow] = useState(false);
  const [focalDeficit, setFocalDeficit] = useState(false);
  const [midlineShift, setMidlineShift] = useState<"yok" | "hafif" | "belirgin">("yok");
  const [cisternEffacement, setCisternEffacement] = useState<"yok" | "hafif" | "belirgin">("yok");
  const [extraAxialHematoma, setExtraAxialHematoma] = useState<"yok" | "epidural" | "subdural" | "bilinmiyor">("yok");
  const [contusion, setContusion] = useState(false);
  const [pneumocephalus, setPneumocephalus] = useState(false);
  const [skullFractureSuspect, setSkullFractureSuspect] = useState(false);
  const [daiSuspect, setDaiSuspect] = useState<"yok" | "var" | "bilinmiyor">("bilinmiyor");

  /** KANAMA fields */
  const [bleedType, setBleedType] = useState<
    "yok" | "SAH" | "IVH" | "ICH" | "SDH" | "EDH" | "bilinmiyor"
  >("bilinmiyor");
  const [bleedLocation, setBleedLocation] = useState<
    "bilinmiyor" | "lobar" | "derin (BG/talamus)" | "pons" | "serebellum"
  >("bilinmiyor");
  const [intraventricularExt, setIntraventricularExt] = useState(false);
  const [hydrocephalus, setHydrocephalus] = useState(false);

  // MR signal shorthand (basic v1)
  const [swiBlooming, setSwiBlooming] = useState<"bilinmiyor" | "var" | "yok">("bilinmiyor");
  const [dwiRestriction, setDwiRestriction] = useState<"bilinmiyor" | "var" | "yok">("bilinmiyor");

  /** KİTLE/ENF fields */
  const [massPresent, setMassPresent] = useState(false);
  const [ringEnhancing, setRingEnhancing] = useState<"bilinmiyor" | "var" | "yok">("bilinmiyor");
  const [edema, setEdema] = useState<"yok" | "hafif" | "belirgin" | "bilinmiyor">("bilinmiyor");
  const [multiLesion, setMultiLesion] = useState<"bilinmiyor" | "tek" | "coklu">("bilinmiyor");
  const [cbvHigh, setCbvHigh] = useState<"bilinmiyor" | "yuksek" | "dusuk">("bilinmiyor");

  const ddxAndSuggestions = useMemo(() => {
    let ddx: DdxItem[] = [];
    const suggestions: Suggestion[] = [];

    // --- Context weights ---
    const ctxWhy: string[] = [];
    if (knownMalignancy) ctxWhy.push("Bilinen malignite öyküsü.");
    if (feverSepsis) ctxWhy.push("Ateş/sepsis kliniği.");
    if (traumaHx) ctxWhy.push("Travma öyküsü.");
    if (anticoagulant) ctxWhy.push("Antikoagülan/antiagregan kullanımı.");

    // Flow specific
    if (flow === "travma") {
      // Basic trauma triage + suggestions
      if (traumaHx) {
        suggestions.push({
          title: "Travma BT değerlendirmesi: kemik pencere + seri kontrol",
          urgency: "Öncelikli",
          details: [
            "Skalp hematomu/fraktür açısından kemik pencere korelasyonu.",
            "Klinik kötüleşmede kontrol BT düşünülebilir.",
          ],
        });
      }

      if (daiSuspect === "var" || (daiSuspect === "bilinmiyor" && (gcsLow || focalDeficit))) {
        suggestions.push({
          title: "DAI şüphesinde beyin MR önerilir",
          urgency: "Öncelikli",
          details: ["SWI/GRE", "DWI/ADC", "FLAIR", "Gerekirse DTI (merkez olanaklı ise)"],
        });
      }

      if (midlineShift !== "yok" || cisternEffacement !== "yok") {
        suggestions.push({
          title: "Kitle etkisi / herniasyon riski: acil klinik korelasyon",
          urgency: "Acil",
          details: ["Nöroşirürji değerlendirmesi", "Yoğun bakım/izlem gereksinimi klinikle birlikte belirlenir"],
        });
      }

      // DDX (simple, explainable)
      if (extraAxialHematoma === "epidural") {
        ddx.push({
          name: "Epidural hematom",
          likelihood: "Yüksek",
          why: ["Ekstraaksiyel kanama paterni epidural ile uyumlu olabilir.", "Travma öyküsü destekler."],
        });
      } else if (extraAxialHematoma === "subdural") {
        ddx.push({
          name: "Subdural hematom",
          likelihood: "Yüksek",
          why: ["Ekstraaksiyel kanama paterni subdural ile uyumlu olabilir.", anticoagulant ? "Antikoagülan öyküsü risk artırır." : "Klinik korelasyon."],
        });
      } else if (contusion) {
        ddx.push({
          name: "Kontüzyon / hemorajik kontüzyon",
          likelihood: "Orta",
          why: ["Travma bağlamında parankimal kontüzyon olasılığı."],
        });
      }

      if (pneumocephalus) {
        ddx.unshift({
          name: "Pnömosefali",
          likelihood: "Yüksek",
          why: ["Travma sonrası hava odakları pnömosefali ile uyumludur."],
        });
      }

      if (skullFractureSuspect) {
        ddx.push({
          name: "Kafa tabanı / kalvaryal fraktür eşliği (şüphe)",
          likelihood: "Orta",
          why: ["Klinik/BT kemik pencere bulguları ile doğrulanmalıdır."],
        });
      }

      // Always keep at least one
      if (ddx.length === 0) {
        ddx.push({
          name: "Travmaya bağlı akut patoloji açısından belirgin bulgu yok / minimal bulgu",
          likelihood: "Düşük",
          why: ["Seçilen parametrelerde yüksek olasılık lehine belirti yok."],
        });
      }
    }

    if (flow === "kanama") {
      // Suggestions
      if (bleedType === "SAH") {
        suggestions.push({
          title: "SAH şüphesinde CTA (anevrizma açısından) düşün",
          urgency: traumaHx ? "Öncelikli" : "Acil",
          details: [
            traumaHx ? "Travma bağlamında da SAH görülebilir; dağılım paterni önemlidir." : "Anevrizmal SAH dışlanmalıdır.",
            "Klinik + BT dağılımı + IVH/hidrocefalus ile birlikte değerlendirilir.",
          ],
        });
      }
      if (hydrocephalus) {
        suggestions.push({
          title: "Hidrocefalus: acil klinik korelasyon",
          urgency: "Acil",
          details: ["BOS drenajı/endoskopik seçenekler nöroşirürji ile değerlendirilir."],
        });
      }

      // DDX rough
      if (bleedType !== "bilinmiyor" && bleedType !== "yok") {
        const baseWhy = [
          ...ctxWhy,
          modality === "MR" ? "MR parametreleriyle kanama özellikleri desteklenebilir." : "BT yoğunluk dağılımı ile korelasyon.",
        ].filter(Boolean);

        if (bleedType === "ICH") {
          let l: Likelihood = "Orta";
          const why = [...baseWhy];
          if (bleedLocation === "derin (BG/talamus)") {
            l = bumpLikelihood(l, "up");
            why.unshift("Derin yerleşim hipertansif hemoraji olasılığını artırır.");
          }
          if (anticoagulant) {
            l = bumpLikelihood(l, "up");
            why.push("Antikoagülan kullanımı hemoraji riskini artırır.");
          }
          ddx.push({ name: "İntraparenkimal hemoraji", likelihood: l, why });
        }

        if (bleedType === "SAH") {
          let l: Likelihood = traumaHx ? "Orta" : "Yüksek";
          const why = [...baseWhy];
          why.unshift(traumaHx ? "Travma ile ilişkili SAH görülebilir." : "Travma öyküsü yoksa anevrizmal SAH öncelikli dışlanır.");
          if (intraventricularExt || hydrocephalus) {
            l = bumpLikelihood(l, "up");
            why.push("IVH/hidrocefalus eşliği önemlidir (yüksek risk göstergesi olabilir).");
          }
          ddx.push({ name: "Subaraknoid kanama", likelihood: l, why });
        }

        if (bleedType === "IVH") {
          ddx.push({
            name: "İntraventriküler kanama",
            likelihood: intraventricularExt ? "Yüksek" : "Orta",
            why: [...baseWhy, "IVH; parankimal kanama uzanımı veya vasküler nedenlerle ilişkili olabilir."],
          });
        }

        if (bleedType === "SDH" || bleedType === "EDH") {
          ddx.push({
            name: bleedType === "SDH" ? "Subdural hematom" : "Epidural hematom",
            likelihood: traumaHx ? "Yüksek" : "Orta",
            why: [...baseWhy, traumaHx ? "Travma bağlamı destekler." : "Klinik/öykü ile doğrulanmalıdır."],
          });
        }
      } else {
        ddx.push({
          name: "Belirgin akut kanama lehine güçlü parametre seçilmedi",
          likelihood: "Düşük",
          why: ["Kanama tipi/yerleşim seçimi net değil veya 'yok' seçildi."],
        });
      }

      // MR adjunct hints (very lightweight v1)
      if (modality === "MR") {
        if (swiBlooming === "var") {
          ddx.unshift({
            name: "Hemorajik ürün/blooming (SWI)",
            likelihood: "Orta",
            why: ["SWI blooming; hemoraji ürünleri veya mikrokanama ile uyumlu olabilir."],
          });
        }
        if (dwiRestriction === "var" && feverSepsis) {
          ddx.unshift({
            name: "Enfeksiyöz süreç / apse olasılığı (DWI+ + klinik)",
            likelihood: "Orta",
            why: ["DWI restriksiyon + ateş/sepsis kliniği enfeksiyon lehine olabilir."],
          });
        }
      }
    }

    if (flow === "kitle") {
      if (!massPresent) {
        ddx.push({
          name: "Kitle/enfeksiyon açısından belirgin bulgu seçilmedi",
          likelihood: "Düşük",
          why: ["Kitle var seçilmedi."],
        });
      } else {
        // Suggestions
        suggestions.push({
          title: "Kitle/enfeksiyon ayrımı için kontrastlı beyin MR önerilir",
          urgency: "Öncelikli",
          details: ["T1 pre/post + FLAIR", "DWI/ADC", "SWI", "Gerekirse perfüzyon (CBV)"],
        });

        let metaLike: Likelihood = knownMalignancy ? "Yüksek" : "Orta";
        let absLike: Likelihood = feverSepsis ? "Orta" : "Düşük";

        // Ring patterns + diffusion etc.
        if (ringEnhancing === "var") {
          metaLike = bumpLikelihood(metaLike, "up");
          absLike = bumpLikelihood(absLike, "up");
        }
        if (dwiRestriction === "var") {
          absLike = bumpLikelihood(absLike, "up");
          metaLike = bumpLikelihood(metaLike, "down");
        }
        if (cbvHigh === "yuksek") {
          metaLike = bumpLikelihood(metaLike, "up");
          absLike = bumpLikelihood(absLike, "down");
        }
        if (multiLesion === "coklu") {
          metaLike = bumpLikelihood(metaLike, "up");
        }

        ddx.push({
          name: "Metastaz (özellikle çoklu lezyon / malignite öyküsü)",
          likelihood: metaLike,
          why: [
            knownMalignancy ? "Bilinen malignite metastaz olasılığını artırır." : "Malignite öyküsü yoksa da metastaz olasılığı dışlanmaz.",
            multiLesion === "coklu" ? "Çoklu lezyon metastaz lehine olabilir." : "Tek lezyonda primer tümör/apse ayrımı önemlidir.",
          ],
        });

        ddx.push({
          name: "Apse / enfeksiyöz lezyon",
          likelihood: absLike,
          why: [
            feverSepsis ? "Ateş/sepsis enfeksiyonu destekler." : "Klinik yoksa olasılık azalır.",
            dwiRestriction === "var" ? "DWI restriksiyon apse lehine olabilir." : "DWI negatifliği apse olasılığını azaltır.",
          ],
        });

        ddx.push({
          name: "Yüksek dereceli gliom / nekrotik tümör",
          likelihood: cbvHigh === "yuksek" ? "Yüksek" : "Orta",
          why: [
            cbvHigh === "yuksek" ? "Perfüzyon (CBV) artışı tümör lehine olabilir." : "Perfüzyon bilinmiyorsa diğer bulgularla desteklenmeli.",
            ringEnhancing === "var" ? "Ring paterni nekroz/enfeksiyon ayrımı gerektirir." : "Kontrast paterni değerlendirilmelidir.",
          ],
        });
      }
    }

    // Sort: Yüksek > Orta > Düşük
    const order: Record<Likelihood, number> = { Yüksek: 3, Orta: 2, Düşük: 1 };
    ddx = ddx.sort((a, b) => order[b.likelihood] - order[a.likelihood]).slice(0, 6);

    // Final sentence (very safe, conditional)
    const flowTitle =
      flow === "travma" ? "Travma" : flow === "kanama" ? "Kanama" : "Kitle/Enfeksiyon";
    const final =
      ddx.length > 0
        ? `${modality} incelemede ${flowTitle.toLowerCase()} açısından ön planda: ${ddx[0].name}. Klinik ve önceki tetkiklerle korelasyon önerilir.`
        : `${modality} incelemede belirgin akut patoloji izlenmemektedir. Klinik korelasyon önerilir.`;

    return { ddx, suggestions, final };
  }, [
    modality,
    flow,
    knownMalignancy,
    feverSepsis,
    traumaHx,
    anticoagulant,
    // travma
    gcsLow,
    focalDeficit,
    midlineShift,
    cisternEffacement,
    extraAxialHematoma,
    contusion,
    pneumocephalus,
    skullFractureSuspect,
    daiSuspect,
    // kanama
    bleedType,
    bleedLocation,
    intraventricularExt,
    hydrocephalus,
    swiBlooming,
    dwiRestriction,
    // kitle
    massPresent,
    ringEnhancing,
    edema,
    multiLesion,
    cbvHigh,
  ]);

  const { ddx, suggestions, final } = ddxAndSuggestions;

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Left */}
      <div className="space-y-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Beyin AI Yardımcı Modül (v1) — Akış seçimi</CardTitle>
            <p className="text-sm text-muted-foreground">
              Travma / Kanama / Kitle-Enfeksiyon akışına göre form alanları koşullu açılır.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Modality */}
            <div className="space-y-2">
              <Label>İnceleme tipi</Label>
              <div className="flex flex-wrap gap-2">
                {(["BT", "MR"] as Modality[]).map((v) => (
                  <Button
                    key={v}
                    size="sm"
                    variant={modality === v ? "default" : "outline"}
                    onClick={() => setModality(v)}
                  >
                    {v}
                  </Button>
                ))}
              </div>
            </div>

            {/* Flow toggle */}
            <div className="space-y-2">
              <Label>Akış</Label>
              <div className="flex flex-wrap gap-2">
                {([
                  { key: "travma", label: "Travma" },
                  { key: "kanama", label: "Kanama" },
                  { key: "kitle", label: "Kitle / Enfeksiyon" },
                ] as Array<{ key: BrainFlow; label: string }>).map((x) => (
                  <Button
                    key={x.key}
                    size="sm"
                    variant={flow === x.key ? "default" : "outline"}
                    onClick={() => setFlow(x.key)}
                  >
                    {x.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Seçtiğin akış, yalnız ilgili parametrelerin görünmesini sağlar.
              </p>
            </div>

            <Separator />

            {/* Clinical context */}
            <div className="space-y-3">
              <div className="text-sm font-medium">Klinik zemin / bağlam</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <div className="text-sm font-medium">Bilinen malignite</div>
                    <div className="text-xs text-muted-foreground">Metastaz olasılığını etkiler</div>
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
                    <div className="text-sm font-medium">Travma öyküsü</div>
                    <div className="text-xs text-muted-foreground">Travma akışını destekler</div>
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Flow cards */}
        {flow === "travma" && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Travma</CardTitle>
              <p className="text-sm text-muted-foreground">
                Pratik triage için temel parametreler (v1 iskelet).
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <div className="text-sm font-medium">GKS düşük / bilinç bozukluğu</div>
                    <div className="text-xs text-muted-foreground">DAI / ağır travma riski</div>
                  </div>
                  <Switch checked={gcsLow} onCheckedChange={setGcsLow} />
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <div className="text-sm font-medium">Fokal defisit</div>
                    <div className="text-xs text-muted-foreground">Kitle etkisi/kanama</div>
                  </div>
                  <Switch checked={focalDeficit} onCheckedChange={setFocalDeficit} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 rounded-xl border p-3">
                  <div className="text-sm font-medium">Midline shift</div>
                  <div className="flex flex-wrap gap-2">
                    {(["yok", "hafif", "belirgin"] as const).map((v) => (
                      <Button
                        key={v}
                        size="sm"
                        variant={midlineShift === v ? "default" : "outline"}
                        onClick={() => setMidlineShift(v)}
                      >
                        {v}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 rounded-xl border p-3">
                  <div className="text-sm font-medium">Sisternal effacement</div>
                  <div className="flex flex-wrap gap-2">
                    {(["yok", "hafif", "belirgin"] as const).map((v) => (
                      <Button
                        key={v}
                        size="sm"
                        variant={cisternEffacement === v ? "default" : "outline"}
                        onClick={() => setCisternEffacement(v)}
                      >
                        {v}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 rounded-xl border p-3">
                  <div className="text-sm font-medium">Ekstraaksiyel hematom</div>
                  <div className="flex flex-wrap gap-2">
                    {(["yok", "epidural", "subdural", "bilinmiyor"] as const).map((v) => (
                      <Button
                        key={v}
                        size="sm"
                        variant={extraAxialHematoma === v ? "default" : "outline"}
                        onClick={() => setExtraAxialHematoma(v)}
                      >
                        {v}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border p-3">
                  <div className="text-sm font-medium">DAI şüphesi</div>
                  <div className="flex flex-wrap gap-2">
                    {(["yok", "var", "bilinmiyor"] as const).map((v) => (
                      <Button
                        key={v}
                        size="sm"
                        variant={daiSuspect === v ? "default" : "outline"}
                        onClick={() => setDaiSuspect(v)}
                      >
                        {v}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">DAI için MR SWI/DWI kritik olabilir.</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div className="text-sm font-medium">Kontüzyon</div>
                  <Switch checked={contusion} onCheckedChange={setContusion} />
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div className="text-sm font-medium">Pnömosefali</div>
                  <Switch checked={pneumocephalus} onCheckedChange={setPneumocephalus} />
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div className="text-sm font-medium">Fraktür şüphesi</div>
                  <Switch checked={skullFractureSuspect} onCheckedChange={setSkullFractureSuspect} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {flow === "kanama" && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Kanama</CardTitle>
              <p className="text-sm text-muted-foreground">
                Kanama tipi + yerleşim + eşlik eden bulgular (v1 iskelet).
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 rounded-xl border p-3">
                <div className="text-sm font-medium">Kanama tipi</div>
                <div className="flex flex-wrap gap-2">
                  {(["bilinmiyor", "yok", "SAH", "IVH", "ICH", "SDH", "EDH"] as const).map((v) => (
                    <Button
                      key={v}
                      size="sm"
                      variant={bleedType === v ? "default" : "outline"}
                      onClick={() => setBleedType(v)}
                    >
                      {v}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 rounded-xl border p-3">
                <div className="text-sm font-medium">Yerleşim (özellikle ICH için)</div>
                <div className="flex flex-wrap gap-2">
                  {(["bilinmiyor", "lobar", "derin (BG/talamus)", "pons", "serebellum"] as const).map(
                    (v) => (
                      <Button
                        key={v}
                        size="sm"
                        variant={bleedLocation === v ? "default" : "outline"}
                        onClick={() => setBleedLocation(v)}
                      >
                        {v}
                      </Button>
                    )
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
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
                        <Button
                          key={v}
                          size="sm"
                          variant={swiBlooming === v ? "default" : "outline"}
                          onClick={() => setSwiBlooming(v)}
                        >
                          {v}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 rounded-xl border p-3">
                    <div className="text-sm font-medium">DWI restriksiyon</div>
                    <div className="flex flex-wrap gap-2">
                      {(["bilinmiyor", "var", "yok"] as const).map((v) => (
                        <Button
                          key={v}
                          size="sm"
                          variant={dwiRestriction === v ? "default" : "outline"}
                          onClick={() => setDwiRestriction(v)}
                        >
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

        {flow === "kitle" && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Kitle / Enfeksiyon</CardTitle>
              <p className="text-sm text-muted-foreground">
                Ring paterni + DWI + perfüzyon gibi ayrım parametreleri (v1 iskelet).
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border p-3">
                <div>
                  <div className="text-sm font-medium">Kitle / lezyon var</div>
                  <div className="text-xs text-muted-foreground">DDX üretmek için “var” seç</div>
                </div>
                <Switch checked={massPresent} onCheckedChange={setMassPresent} />
              </div>

              <div className={cn("grid gap-3 sm:grid-cols-2", !massPresent && "opacity-50 pointer-events-none")}>
                <div className="space-y-2 rounded-xl border p-3">
                  <div className="text-sm font-medium">Ring kontrastlanma</div>
                  <div className="flex flex-wrap gap-2">
                    {(["bilinmiyor", "var", "yok"] as const).map((v) => (
                      <Button
                        key={v}
                        size="sm"
                        variant={ringEnhancing === v ? "default" : "outline"}
                        onClick={() => setRingEnhancing(v)}
                      >
                        {v}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border p-3">
                  <div className="text-sm font-medium">Lezyon sayısı</div>
                  <div className="flex flex-wrap gap-2">
                    {(["bilinmiyor", "tek", "coklu"] as const).map((v) => (
                      <Button
                        key={v}
                        size="sm"
                        variant={multiLesion === v ? "default" : "outline"}
                        onClick={() => setMultiLesion(v)}
                      >
                        {v}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border p-3">
                  <div className="text-sm font-medium">Ödem</div>
                  <div className="flex flex-wrap gap-2">
                    {(["bilinmiyor", "yok", "hafif", "belirgin"] as const).map((v) => (
                      <Button
                        key={v}
                        size="sm"
                        variant={edema === v ? "default" : "outline"}
                        onClick={() => setEdema(v)}
                      >
                        {v}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border p-3">
                  <div className="text-sm font-medium">Perfüzyon (CBV)</div>
                  <div className="flex flex-wrap gap-2">
                    {(["bilinmiyor", "yuksek", "dusuk"] as const).map((v) => (
                      <Button
                        key={v}
                        size="sm"
                        variant={cbvHigh === v ? "default" : "outline"}
                        onClick={() => setCbvHigh(v)}
                      >
                        {v}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border p-3 sm:col-span-2">
                  <div className="text-sm font-medium">DWI restriksiyon</div>
                  <div className="flex flex-wrap gap-2">
                    {(["bilinmiyor", "var", "yok"] as const).map((v) => (
                      <Button
                        key={v}
                        size="sm"
                        variant={dwiRestriction === v ? "default" : "outline"}
                        onClick={() => setDwiRestriction(v)}
                      >
                        {v}
                      </Button>
                    ))}
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
            <Textarea
              value={incidental}
              onChange={(e) => setIncidental(e.target.value)}
              placeholder="Serbest metin ekle; final çıktıya eklenir."
            />
            <p className="text-xs text-muted-foreground">
              Not: Bu modül karar destek amaçlıdır; kesin tanı/tedavi için klinik korelasyon gereklidir.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Right panel */}
      <div className="lg:sticky lg:top-6 h-fit space-y-4">
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">AI Çıktı</CardTitle>
              <p className="text-xs text-muted-foreground">Seçimlere göre canlı güncellenir (kural tabanlı).</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => copyText(final)}>
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
                <div className="text-sm text-muted-foreground rounded-xl border p-3">
                  Bu seçimlerle otomatik öneri oluşmadı.
                </div>
              ) : (
                <div className="space-y-2">
                  {suggestions.map((s) => (
                    <div key={s.title} className="rounded-xl border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium">{s.title}</div>
                        <UrgencyBadge v={s.urgency} />
                      </div>
                      <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground space-y-1">
                        {s.details.slice(0, 4).map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />
            <div className="text-xs text-muted-foreground">
              Bu sistem “kural tabanlı karar destek”tir; görüntüler ve klinik bilgilerle birlikte değerlendirilmelidir.
            </div>
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
            <p className="text-sm text-muted-foreground">
              Karaciğer modülü ayrı sayfada çalışır. Aşağıdaki butonla açabilirsin.
            </p>
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
