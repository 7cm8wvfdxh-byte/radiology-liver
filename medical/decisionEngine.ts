type Input = {
  symptoms?: string[];        // ör: ["RUQ ağrı", "Ateş", "Bulantı-kusma", "Sarılık"]
  labs?: string[];            // ör: ["Lökositoz", "CRP yüksekliği", "Bilirubin yüksekliği", "ALP/GGT yüksekliği"]
  imagingFindings?: string[]; // ör: ["Taş/sludge", "Duvar kalınlığı >= 3 mm", "Perikolesistik sıvı"]
  redFlags?: string[];        // ör: ["Sepsis/hipotansiyon", "Yaygın peritonit"]
};

type Likelihood = "Düşük" | "Orta" | "Yüksek";
type Urgency = "Rutin" | "Öncelikli" | "Acil";

function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

function countMatches(needles: string[], hay: string[]) {
  let c = 0;
  for (const n of needles) if (hay.includes(n)) c++;
  return c;
}

export function evaluatePathology(pathology: any, input: Input) {
  const symptoms = input.symptoms ?? [];
  const labs = input.labs ?? [];
  const imaging = input.imagingFindings ?? [];
  const redFlags = input.redFlags ?? [];

  const why: string[] = [];
  const matched: string[] = [];

  // 0) Kırmızı bayrak kontrolü (patoloji kartındaki red_flags ile)
  const cardRedFlags: string[] = pathology?.triage?.red_flags ?? [];
  const matchedRedFlags = cardRedFlags.filter((rf) => redFlags.includes(rf));

  if (matchedRedFlags.length > 0) {
    why.push(`Kırmızı bayrak(lar) mevcut: ${matchedRedFlags.join(", ")}`);
  }

  // 1) Görüntüleme eşleşmeleri (USG ana bulgular)
  const usgKey: string[] = pathology?.imaging?.USG?.key_findings ?? [];
  for (const f of usgKey) {
    if (imaging.includes(f)) matched.push(f);
  }
  if (matched.length > 0) {
    why.push(`USG ana bulgularından eşleşenler: ${matched.join(", ")}`);
  }

  // 2) Klinik + lab destek skorları (çok basit ama klinik gibi)
  // Tipik triad: RUQ ağrı + ateş + inflamasyon (lökositoz/CRP)
  const hasRUQ = symptoms.includes("RUQ ağrı");
  const hasFever = symptoms.includes("Ateş");
  const hasInflamm = labs.includes("Lökositoz") || labs.includes("CRP yüksekliği");

  if (hasRUQ) why.push("Klinik: RUQ ağrı mevcut.");
  if (hasFever) why.push("Klinik: Ateş mevcut.");
  if (hasInflamm) why.push("Laboratuvar: inflamasyon göstergeleri (lökositoz/CRP) mevcut.");

  // 3) Kolestaz uyarısı (kolanjit / koledok taşı ayrımı için)
  const cholestasis =
    labs.includes("Bilirubin yüksekliği") ||
    labs.includes("ALP/GGT yüksekliği") ||
    symptoms.includes("Sarılık");

  let ddxHints: string[] = [];
  if (cholestasis) {
    ddxHints.push("Kolestaz/sarılık bulguları var → koledok taşı/kolanjit eşlik edebilir.");
  }

  // 4) Skorlama (açıklanabilir)
  // USG eşleşmesi güçlüdür:
  //  - 3+ USG ana bulgu: yüksek
  //  - 2 bulgu + klinik triad: yüksek
  //  - 2 bulgu: orta
  //  - 1 bulgu + klinik destek: orta
  //  - aksi: düşük
  const usgMatchCount = matched.length;
  const clinicalTriad = (hasRUQ && hasFever && hasInflamm) ? 1 : 0;

  let likelihood: Likelihood = "Düşük";

  if (usgMatchCount >= 3) {
    likelihood = "Yüksek";
  } else if (usgMatchCount === 2 && clinicalTriad === 1) {
    likelihood = "Yüksek";
  } else if (usgMatchCount === 2) {
    likelihood = "Orta";
  } else if (usgMatchCount === 1 && (hasRUQ || hasFever || hasInflamm)) {
    likelihood = "Orta";
  } else {
    likelihood = "Düşük";
  }

  // 5) Aciliyet (kırmızı bayrak varsa acil)
  let urgency: Urgency = "Rutin";
  if (matchedRedFlags.length > 0) urgency = "Acil";
  else if (likelihood === "Yüksek") urgency = "Öncelikli";

  // 6) Öneriler (karttan + kolestaz varsa MRCP vurgusu)
  const rec = pathology?.recommendations ?? {};
  const imagingNext: string[] = rec?.imaging_next ?? [];

  const refinedImagingNext = [...imagingNext];
  if (cholestasis && !refinedImagingNext.some((x) => x.toLowerCase().includes("mrcp"))) {
    refinedImagingNext.push("Kolestaz/sarılık varsa MRCP ile koledok taşı/kolanjit açısından değerlendirme öner.");
  }

  // 7) “ne eksik?” (engine’i öğretici yapar)
  const missingKey = usgKey.filter((f) => !imaging.includes(f));
  const nextToConfirm =
    likelihood === "Düşük"
      ? ["USG ile temel kolesistit bulguları açısından tekrar değerlendirme", "Klinik/lab korelasyon"].concat(refinedImagingNext)
      : refinedImagingNext;

  if (likelihood !== "Yüksek" && usgKey.length > 0) {
    why.push(`Eksik/işaretlenmemiş USG ana bulguları: ${missingKey.slice(0, 4).join(", ")}${missingKey.length > 4 ? "..." : ""}`);
  }

  // 8) Rapor şablonları
  const templates = pathology?.report_templates ?? {};

  return {
    id: pathology.id,
    title: pathology.title,

    likelihood,
    urgency,

    matchedFindings: uniq(matched),
    redFlags: matchedRedFlags,

    ddxHints,
    why: uniq(why),

    recommendations: {
      imaging_next: uniq(refinedImagingNext),
      consult: rec?.consult ?? []
    },

    reportTemplates: templates,

    // debug/QA için küçük metrikler
    _meta: {
      usgMatchCount,
      clinicalTriad: clinicalTriad === 1 ? "present" : "absent",
      cholestasis: cholestasis ? "present" : "absent"
    }
  };
}
