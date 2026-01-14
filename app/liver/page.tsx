"use client";

import React, { useMemo, useState } from "react";

type Modality = "BT" | "MR" | "BTMR";
type Tri = "UNK" | "NO" | "YES";

const cx = (...a: Array<string | false | null | undefined>) => a.filter(Boolean).join(" ");

function Card({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-1 text-xs font-medium text-gray-700">{children}</div>;
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
      value={value}
      type={type}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border bg-gray-50 px-2 py-0.5 text-[11px] text-gray-700">
      {children}
    </span>
  );
}

export default function LiverStrictBTMR() {
  const [modality, setModality] = useState<Modality>("BT");

  // Klinik zemin
  const [malignancyHx, setMalignancyHx] = useState<Tri>("UNK");
  const [cirrhosis, setCirrhosis] = useState<Tri>("UNK");
  const [feverInf, setFeverInf] = useState<Tri>("NO");
  const [jaundice, setJaundice] = useState<Tri>("NO");

  // Karaciğer parankim/lezon
  const [hasLesion, setHasLesion] = useState<Tri>("NO");
  const [fattyLiver, setFattyLiver] = useState<Tri>("UNK");
  const [vascularInvasion, setVascularInvasion] = useState<Tri>("UNK");
  const [lesionCount, setLesionCount] = useState<string>("Tek");
  const [lesionSizeMm, setLesionSizeMm] = useState<string>("18");
  const [lesionSegment, setLesionSegment] = useState<string>("S7");
  const [lesionMargin, setLesionMargin] = useState<string>("Düzgün");

  // BT alanları
  const [ctDensity, setCtDensity] = useState<string>("Hipodens");
  const [ctEnhPattern, setCtEnhPattern] = useState<string>("Periferik nodüler");
  const [ctFillIn, setCtFillIn] = useState<Tri>("YES");
  const [ctWashout, setCtWashout] = useState<Tri>("NO");

  // MR alanları
  const [mrT1, setMrT1] = useState<string>("Hipo");
  const [mrT2, setMrT2] = useState<string>("Hiper");
  const [mrDwi, setMrDwi] = useState<string>("Belirsiz");
  const [mrHbp, setMrHbp] = useState<string>("Hipointens");
  const [mrArterial, setMrArterial] = useState<string>("Periferik nodüler");
  const [mrWashout, setMrWashout] = useState<Tri>("NO");

  // --- SAFRA KESESİ ---
  const [gbHasPath, setGbHasPath] = useState<Tri>("NO");
  const [gbMainDx, setGbMainDx] = useState<string>("Kolesistolitiazis (taş)");
  const [gbWallThick, setGbWallThick] = useState<Tri>("UNK");
  const [gbPericholecysticFluid, setGbPericholecysticFluid] = useState<Tri>("UNK");
  const [gbDistension, setGbDistension] = useState<Tri>("UNK");
  const [gbMurphy, setGbMurphy] = useState<Tri>("UNK");
  const [gbPolypSizeMm, setGbPolypSizeMm] = useState<string>("6");
  const [gbEmphysematous, setGbEmphysematous] = useState<Tri>("NO");
  const [gbPerforation, setGbPerforation] = useState<Tri>("NO");

  // --- SAFRA YOLLARI ---
  const [bdHasPath, setBdHasPath] = useState<Tri>("NO");
  const [bdDilated, setBdDilated] = useState<Tri>("UNK");
  const [bdLevel, setBdLevel] = useState<string>("Ekstrahepatik (CBD)");
  const [bdCause, setBdCause] = useState<string>("Koledok taşı");
  const [bdCholangitis, setBdCholangitis] = useState<Tri>("UNK");
  const [bdAir, setBdAir] = useState<Tri>("NO");
  const [bdStrictureType, setBdStrictureType] = useState<string>("Benign striktür");
  const [bdPsc, setBdPsc] = useState<Tri>("NO");
  const [bdMassSuspect, setBdMassSuspect] = useState<Tri>("UNK");

  // Strict gating: BT/MR seçilince diğerini temizle; BT+MR’de temizleme yok.
  const onChangeModality = (m: Modality) => {
    setModality(m);

    if (m === "BT") {
      // MR temizle
      setMrT1("Hipo");
      setMrT2("Hiper");
      setMrDwi("Belirsiz");
      setMrHbp("Hipointens");
      setMrArterial("Periferik nodüler");
      setMrWashout("NO");
    }

    if (m === "MR") {
      // BT temizle
      setCtDensity("Hipodens");
      setCtEnhPattern("Periferik nodüler");
      setCtFillIn("YES");
      setCtWashout("NO");
    }

    // BTMR => temizleme yok (ikisi birlikte)
  };

  // Safra kesesi var/yok değişince detay reset
  const onGbHasPath = (v: Tri) => {
    setGbHasPath(v);
    if (v !== "YES") {
      setGbMainDx("Kolesistolitiazis (taş)");
      setGbWallThick("UNK");
      setGbPericholecysticFluid("UNK");
      setGbDistension("UNK");
      setGbMurphy("UNK");
      setGbPolypSizeMm("6");
      setGbEmphysematous("NO");
      setGbPerforation("NO");
    }
  };

  // Safra yolu var/yok değişince detay reset
  const onBdHasPath = (v: Tri) => {
    setBdHasPath(v);
    if (v !== "YES") {
      setBdDilated("UNK");
      setBdLevel("Ekstrahepatik (CBD)");
      setBdCause("Koledok taşı");
      setBdCholangitis("UNK");
      setBdAir("NO");
      setBdStrictureType("Benign striktür");
      setBdPsc("NO");
      setBdMassSuspect("UNK");
    }
  };

  const resetAll = () => {
    setModality("BT");

    setMalignancyHx("UNK");
    setCirrhosis("UNK");
    setFeverInf("NO");
    setJaundice("NO");

    setHasLesion("NO");
    setFattyLiver("UNK");
    setVascularInvasion("UNK");
    setLesionCount("Tek");
    setLesionSizeMm("18");
    setLesionSegment("S7");
    setLesionMargin("Düzgün");

    setCtDensity("Hipodens");
    setCtEnhPattern("Periferik nodüler");
    setCtFillIn("YES");
    setCtWashout("NO");

    setMrT1("Hipo");
    setMrT2("Hiper");
    setMrDwi("Belirsiz");
    setMrHbp("Hipointens");
    setMrArterial("Periferik nodüler");
    setMrWashout("NO");

    onGbHasPath("NO");
    onBdHasPath("NO");
  };

  const computed = useMemo(() => {
    const urgent: string[] = [];
    const warnings: string[] = [];
    const diffDx: string[] = [];
    const recs: string[] = [];
    const reportLines: string[] = [];

    const cholestaticContext = jaundice === "YES" || bdHasPath === "YES";
    if (cholestaticContext) {
      warnings.push("Kolestaz/obstrüksiyon olasılığı: klinik + lab korelasyonu önemlidir.");
      recs.push("Uygunsa MRCP ile obstrüksiyon seviyesi/nedeni değerlendirilebilir.");
    }

    // --- Safra Kesesi ---
    if (gbHasPath === "NO") {
      reportLines.push("Safra kesesinde belirgin patoloji izlenmemektedir.");
    } else if (gbHasPath === "YES") {
      if (gbMainDx.includes("taş")) {
        reportLines.push("Safra kesesinde kolesistolitiazis (taş) ile uyumlu görünüm mevcuttur.");
        diffDx.push("Kolesistolitiazis");
        if (gbWallThick === "YES" || gbPericholecysticFluid === "YES" || gbMurphy === "YES") {
          warnings.push("Akut kolesistit lehine eşlikçi bulgular mevcut olabilir.");
          diffDx.push("Akut kolesistit");
          recs.push("Klinik/lab korelasyonu; komplikasyon açısından değerlendirme önerilir.");
        }
      }

      if (gbMainDx.includes("Akut kolesistit")) {
        reportLines.push("Akut kolesistit ile uyumlu olabilecek bulgular mevcuttur.");
        diffDx.push("Akut kolesistit");
        if (gbPerforation === "YES") {
          urgent.push("Komplike/perfore kolesistit şüphesi: acil cerrahi değerlendirme önerilir.");
          reportLines.push("Komplike kolesistit/perforasyon lehine bulgular izlenmektedir.");
        }
        if (gbEmphysematous === "YES") {
          urgent.push("Emfizematöz kolesistit şüphesi: acil klinik değerlendirme önerilir.");
          reportLines.push("Safra kesesinde gaz izlenimi (emfizematöz kolesistit lehine).");
        }
        recs.push("USG korelasyonu ve klinik/lab ile birlikte yönetim.");
      }

      if (gbMainDx.includes("Polip")) {
        const n = Number(gbPolypSizeMm || "0");
        reportLines.push(`Safra kesesinde yaklaşık ${gbPolypSizeMm} mm polipoid lezyon izlenmektedir.`);
        diffDx.push("Kolesterol polipi");
        diffDx.push("Adenom");
        if (Number.isFinite(n) && n >= 10) {
          warnings.push("≥10 mm poliplerde malignite riski artar.");
          recs.push("Cerrahi/HPB konsültasyonu veya kısa aralık takip düşünülebilir.");
        } else {
          recs.push("USG ile takip (risk faktörlerine göre).");
        }
      }

      if (gbMainDx.includes("Adenomiyomatozis")) {
        reportLines.push("Safra kesesinde adenomyomatozis ile uyumlu bulgular düşünülebilir.");
        diffDx.push("Adenomiyomatozis");
        recs.push("USG/MR korelasyonu; fokal kalınlaşmada malignite ayırıcı tanısı akılda tutulmalı.");
      }

      if (gbMainDx.includes("Porselen")) {
        warnings.push("Porselen safra kesesi: malignite riski artabilir.");
        reportLines.push("Safra kesesi duvarında kalsifikasyon (porselen safra kesesi lehine) izlenmektedir.");
        recs.push("Cerrahi/HPB değerlendirmesi önerilir.");
      }

      if (gbMainDx.includes("Kitle")) {
        urgent.push("Safra kesesi kitle şüphesi: malignite açısından ileri değerlendirme önerilir.");
        reportLines.push("Safra kesesinde kitle lezyonu lehine bulgular izlenmektedir.");
        diffDx.push("Safra kesesi karsinomu");
        diffDx.push("Xantogranülomatöz kolesistit");
        recs.push("Kontrastlı BT/MR ile değerlendirme ve HPB/onkoloji konsültasyonu önerilir.");
      }
    }

    // --- Safra Yolları ---
    if (bdHasPath === "NO") {
      reportLines.push("Safra yollarında belirgin dilatasyon/patoloji izlenmemektedir.");
    } else if (bdHasPath === "YES") {
      if (bdDilated === "YES") reportLines.push(`Safra yollarında dilatasyon izlenmektedir (${bdLevel}).`);
      if (bdDilated === "NO") reportLines.push("Safra yollarında belirgin dilatasyon izlenmemektedir; klinik/lab korelasyonu önerilir.");

      if (bdCause.includes("Koledok taşı")) {
        reportLines.push("Koledok taşı ile uyumlu görünüm mevcuttur.");
        diffDx.push("Koledokolitiazis");
        recs.push("Klinik uygunsa ERCP planlaması; MRCP ile doğrulama düşünülebilir.");
        if (feverInf === "YES" || bdCholangitis === "YES") {
          urgent.push("Kolanjit olasılığı: acil klinik değerlendirme ve tedavi planı önerilir.");
          diffDx.push("Akut kolanjit");
        }
      }

      if (bdCause.includes("Benign striktür")) {
        reportLines.push("Benign safra yolu striktürü ile uyumlu bulgular olabilir.");
        diffDx.push("Postoperatif striktür");
        diffDx.push("Kronik pankreatit ilişkili darlık");
        recs.push("MRCP ± endoskopik değerlendirme ile korelasyon önerilir.");
      }

      if (bdCause.includes("Malign obstrüksiyon")) {
        urgent.push("Malign obstrüksiyon şüphesi: hızlı ileri değerlendirme ve konsültasyon önerilir.");
        reportLines.push("Malign obstrüksiyon lehine bulgular izlenmektedir.");
        diffDx.push("Pankreas başı karsinomu");
        diffDx.push("Kolanjiyokarsinom");
        diffDx.push("Ampulla tümörü");
        recs.push("Pankreas protokol BT/MR ve/veya MRCP; EUS/ERCP ile planlama düşünülebilir.");
      }

      if (bdCause.includes("PSC")) {
        warnings.push("PSC ile uyumlu olabilecek patern: klinik korelasyon önemli.");
        reportLines.push("PSC ile uyumlu olabilecek bulgular düşünülebilir.");
        diffDx.push("PSC");
        recs.push("MRCP ile patern doğrulama; İBH öyküsü ile korelasyon.");
      }

      if (bdAir === "YES") {
        reportLines.push("Safra yollarında pnömobili izlenmektedir.");
        diffDx.push("Post-ERCP/sfinkterotomi sonrası pnömobili");
        diffDx.push("Bilyoenterik anastomoz");
        recs.push("Girişim öyküsü ile korelasyon; yoksa fistül/infeksiyon açısından değerlendirme.");
      }

      if (bdMassSuspect === "YES") {
        urgent.push("Obstrüksiyon etyolojisinde kitle şüphesi: ileri değerlendirme önerilir.");
        reportLines.push("Obstrüksiyon etyolojisinde kitle şüphesi mevcuttur.");
      }
    }

    // --- Karaciğer lezyon motoru ---
    const useCT = modality === "BT" || modality === "BTMR";
    const useMR = modality === "MR" || modality === "BTMR";

    if (hasLesion === "NO") {
      reportLines.push("Karaciğerde belirgin fokal lezyon izlenmemektedir.");
      if (fattyLiver === "YES") reportLines.push("Hepatik steatoz ile uyumlu görünüm mevcuttur.");
    } else if (hasLesion === "YES") {
      const size = Number(lesionSizeMm || "0");
      const isSmall = Number.isFinite(size) && size > 0 && size < 10;
      const highRiskHcc = cirrhosis === "YES";
      const oncHx = malignancyHx === "YES";

      let likely = "İndetermine lezyon";

      // BT sinyali
      let ctLikely: string | null = null;
      if (useCT) {
        const hemangiomaLike = ctEnhPattern.includes("Periferik") && ctFillIn === "YES" && ctWashout !== "YES";
        const hccLike = ctWashout === "YES" || (highRiskHcc && ctEnhPattern.includes("Arteriyel"));
        const metsLike = oncHx && (ctEnhPattern.includes("Halkasal") || lesionCount !== "Tek");
        if (hemangiomaLike) ctLikely = "Hemangiom";
        else if (hccLike) ctLikely = "HCC";
        else if (metsLike) ctLikely = "Metastaz";
      }

      // MR sinyali
      let mrLikely: string | null = null;
      if (useMR) {
        const hemangiomaLike = mrT2 === "Hiper" && mrArterial.includes("Periferik") && mrWashout !== "YES";
        const hccLike = mrWashout === "YES" || (highRiskHcc && mrArterial.includes("Arteriyel") && mrHbp === "Hipointens");
        const metsLike = oncHx && (lesionCount !== "Tek" || mrDwi === "Belirgin kısıtlılık");
        if (hemangiomaLike) mrLikely = "Hemangiom";
        else if (hccLike) mrLikely = "HCC";
        else if (metsLike) mrLikely = "Metastaz";
      }

      // BT+MR birlikteyse: MR daha spesifik (HBP/DWI) => öncelik MR; yoksa BT
      const finalPick = mrLikely ?? ctLikely;
      if (finalPick === "Hemangiom") likely = "Hemangiom olası";
      else if (finalPick === "HCC") likely = "HCC olası";
      else if (finalPick === "Metastaz") likely = "Metastaz olası";

      if (likely.includes("Hemangiom")) {
        diffDx.push("Hemangiom");
        diffDx.push("FNH");
        recs.push("Tipik patern varsa takip/karşılaştırma; atipik ise MR (dinamik + HBP) ile karakterizasyon.");
        reportLines.push(`Karaciğerde ${lesionSegment} düzeyinde ~${lesionSizeMm} mm lezyon; hemangiom lehine patern.`);
      } else if (likely.includes("HCC")) {
        diffDx.push("HCC");
        diffDx.push("Displastik nodül / rejeneratif nodül");
        warnings.push("Siroz/kronik KC zemininde malignite riski artmıştır.");
        recs.push("LI-RADS yaklaşımı + AFP/hepatoloji korelasyonu önerilir.");
        if (vascularInvasion === "YES") urgent.push("Vasküler invazyon şüphesi: acil HB/onkoloji değerlendirme.");
        reportLines.push(`Karaciğerde ${lesionSegment} düzeyinde ~${lesionSizeMm} mm lezyon; HCC lehine patern, ileri değerlendirme önerilir.`);
      } else if (likely.includes("Metastaz")) {
        diffDx.push("Metastaz");
        diffDx.push("Kolanjiyokarsinom");
        recs.push("Bilinen malignite öyküsü ile korelasyon; evreleme amaçlı uygun inceleme düşünülebilir.");
        reportLines.push(`Karaciğerde ${lesionCount.toLowerCase()} lezyon; metastatik hastalık ile uyumlu olabilir.`);
      } else {
        diffDx.push("Atipik hemangiom");
        diffDx.push("FNH");
        diffDx.push("Adenom");
        diffDx.push("Metastaz");
        if (cirrhosis === "YES") diffDx.push("Erken HCC / displastik nodül");
        recs.push("İndetermine lezyon: MR (dinamik + HBP) veya kısa aralık takip düşünülebilir.");
        if (isSmall) recs.push("<10 mm lezyonlarda risk durumuna göre takip planlanabilir.");
        reportLines.push(`Karaciğerde ${lesionSegment} düzeyinde ~${lesionSizeMm} mm lezyon; karakterizasyon önerilir.`);
      }
    }

    if ((feverInf === "YES" && cholestaticContext) || bdCholangitis === "YES") {
      urgent.push("Ateş + kolestaz bulguları varsa akut kolanjit acil durum olabilir (hızlı klinik değerlendirme).");
    }

    return { urgent, warnings, diffDx: Array.from(new Set(diffDx)), recs, reportLines };
  }, [
    modality,
    malignancyHx,
    cirrhosis,
    feverInf,
    jaundice,
    hasLesion,
    fattyLiver,
    vascularInvasion,
    lesionCount,
    lesionSizeMm,
    lesionSegment,
    lesionMargin,
    ctDensity,
    ctEnhPattern,
    ctFillIn,
    ctWashout,
    mrT1,
    mrT2,
    mrDwi,
    mrHbp,
    mrArterial,
    mrWashout,
    gbHasPath,
    gbMainDx,
    gbWallThick,
    gbPericholecysticFluid,
    gbDistension,
    gbMurphy,
    gbPolypSizeMm,
    gbEmphysematous,
    gbPerforation,
    bdHasPath,
    bdDilated,
    bdLevel,
    bdCause,
    bdCholangitis,
    bdAir,
    bdStrictureType,
    bdPsc,
    bdMassSuspect,
  ]);

  const showCT = modality === "BT" || modality === "BTMR";
  const showMR = modality === "MR" || modality === "BTMR";

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Abdomen AI Yardımcı Ajan (v1) — Karaciğer + Safra</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <Pill>Var/Yok → Detay</Pill>
              <Pill>BT / MR / BT+MR</Pill>
              <Pill>Rapor dili + öneri</Pill>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              Değerlendir
            </button>
            <button
              className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              onClick={resetAll}
            >
              Sıfırla
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          <Card title="1) İnceleme & Klinik Zemin">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>İnceleme tipi</FieldLabel>
                <Select
                  value={modality}
                  onChange={(v) => onChangeModality(v as Modality)}
                  options={[
                    { value: "BT", label: "BT" },
                    { value: "MR", label: "MR" },
                    { value: "BTMR", label: "BT + MR" },
                  ]}
                />
                <div className="mt-1 text-[11px] text-gray-500">
                  BT/MR seçilirse diğer modalite alanları temizlenir. BT+MR seçilirse ikisi birlikte kullanılır.
                </div>
              </div>

              <div>
                <FieldLabel>Malignite öyküsü</FieldLabel>
                <Select
                  value={malignancyHx}
                  onChange={(v) => setMalignancyHx(v as Tri)}
                  options={[
                    { value: "UNK", label: "Bilinmiyor" },
                    { value: "NO", label: "Yok" },
                    { value: "YES", label: "Var" },
                  ]}
                />
              </div>

              <div>
                <FieldLabel>Siroz / kronik KC</FieldLabel>
                <Select
                  value={cirrhosis}
                  onChange={(v) => setCirrhosis(v as Tri)}
                  options={[
                    { value: "UNK", label: "Bilinmiyor" },
                    { value: "NO", label: "Yok" },
                    { value: "YES", label: "Var" },
                  ]}
                />
              </div>

              <div>
                <FieldLabel>Ateş / enfeksiyon</FieldLabel>
                <Select
                  value={feverInf}
                  onChange={(v) => setFeverInf(v as Tri)}
                  options={[
                    { value: "UNK", label: "Bilinmiyor" },
                    { value: "NO", label: "Yok" },
                    { value: "YES", label: "Var" },
                  ]}
                />
              </div>

              <div>
                <FieldLabel>Sarılık / kolestaz</FieldLabel>
                <Select
                  value={jaundice}
                  onChange={(v) => setJaundice(v as Tri)}
                  options={[
                    { value: "UNK", label: "Bilinmiyor" },
                    { value: "NO", label: "Yok" },
                    { value: "YES", label: "Var" },
                  ]}
                />
              </div>
            </div>
          </Card>

          <Card title="2) Karaciğer (Parankim & Lezyon)">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>Karaciğerde lezyon</FieldLabel>
                <Select
                  value={hasLesion}
                  onChange={(v) => setHasLesion(v as Tri)}
                  options={[
                    { value: "UNK", label: "Bilinmiyor" },
                    { value: "NO", label: "Yok" },
                    { value: "YES", label: "Var" },
                  ]}
                />
              </div>

              <div>
                <FieldLabel>Yağlı karaciğer</FieldLabel>
                <Select
                  value={fattyLiver}
                  onChange={(v) => setFattyLiver(v as Tri)}
                  options={[
                    { value: "UNK", label: "Bilinmiyor" },
                    { value: "NO", label: "Yok" },
                    { value: "YES", label: "Var" },
                  ]}
                />
              </div>

              <div>
                <FieldLabel>Vasküler invazyon</FieldLabel>
                <Select
                  value={vascularInvasion}
                  onChange={(v) => setVascularInvasion(v as Tri)}
                  options={[
                    { value: "UNK", label: "Bilinmiyor" },
                    { value: "NO", label: "Yok" },
                    { value: "YES", label: "Var" },
                  ]}
                />
              </div>

              <div>
                <FieldLabel>Lezyon sayısı</FieldLabel>
                <Select
                  value={lesionCount}
                  onChange={setLesionCount}
                  options={[
                    { value: "Tek", label: "Tek" },
                    { value: "Çoklu", label: "Çoklu" },
                  ]}
                />
              </div>

              <div>
                <FieldLabel>En büyük boyut (mm)</FieldLabel>
                <Input value={lesionSizeMm} onChange={setLesionSizeMm} type="number" />
              </div>

              <div>
                <FieldLabel>Segment</FieldLabel>
                <Select
                  value={lesionSegment}
                  onChange={setLesionSegment}
                  options={["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"].map((s) => ({ value: s, label: s }))}
                />
              </div>

              <div>
                <FieldLabel>Sınır</FieldLabel>
                <Select
                  value={lesionMargin}
                  onChange={setLesionMargin}
                  options={[
                    { value: "Düzgün", label: "Düzgün" },
                    { value: "Düzensiz", label: "Düzensiz" },
                  ]}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {showCT && (
                <div className="rounded-xl border bg-gray-50 p-3">
                  <div className="mb-2 text-sm font-semibold">BT</div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <FieldLabel>Nonkontrast densite</FieldLabel>
                      <Select
                        value={ctDensity}
                        onChange={setCtDensity}
                        options={[
                          { value: "Hipodens", label: "Hipodens" },
                          { value: "İzodens", label: "İzodens" },
                          { value: "Hiperdens", label: "Hiperdens" },
                        ]}
                      />
                    </div>

                    <div>
                      <FieldLabel>Kontrastlanma paterni</FieldLabel>
                      <Select
                        value={ctEnhPattern}
                        onChange={setCtEnhPattern}
                        options={[
                          { value: "Periferik nodüler", label: "Periferik nodüler" },
                          { value: "Arteriyel hiper", label: "Arteriyel hiper" },
                          { value: "Halkasal", label: "Halkasal" },
                          { value: "Belirsiz", label: "Belirsiz" },
                        ]}
                      />
                    </div>

                    <div>
                      <FieldLabel>Geç dolum (fill-in)</FieldLabel>
                      <Select
                        value={ctFillIn}
                        onChange={(v) => setCtFillIn(v as Tri)}
                        options={[
                          { value: "UNK", label: "Bilinmiyor" },
                          { value: "NO", label: "Yok" },
                          { value: "YES", label: "Var" },
                        ]}
                      />
                    </div>

                    <div>
                      <FieldLabel>Washout</FieldLabel>
                      <Select
                        value={ctWashout}
                        onChange={(v) => setCtWashout(v as Tri)}
                        options={[
                          { value: "UNK", label: "Bilinmiyor" },
                          { value: "NO", label: "Yok" },
                          { value: "YES", label: "Var" },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              )}

              {showMR && (
                <div className="rounded-xl border bg-gray-50 p-3">
                  <div className="mb-2 text-sm font-semibold">MR</div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <FieldLabel>T1 sinyal</FieldLabel>
                      <Select
                        value={mrT1}
                        onChange={setMrT1}
                        options={[
                          { value: "Hipo", label: "Hipo" },
                          { value: "İzo", label: "İzo" },
                          { value: "Hiper", label: "Hiper" },
                        ]}
                      />
                    </div>

                    <div>
                      <FieldLabel>T2 sinyal</FieldLabel>
                      <Select
                        value={mrT2}
                        onChange={setMrT2}
                        options={[
                          { value: "Hipo", label: "Hipo" },
                          { value: "İzo", label: "İzo" },
                          { value: "Hiper", label: "Hiper" },
                          { value: "Belirsiz", label: "Belirsiz" },
                        ]}
                      />
                    </div>

                    <div>
                      <FieldLabel>DWI/ADC</FieldLabel>
                      <Select
                        value={mrDwi}
                        onChange={setMrDwi}
                        options={[
                          { value: "Belirsiz", label: "Belirsiz" },
                          { value: "Belirgin kısıtlılık", label: "Belirgin kısıtlılık" },
                          { value: "Kısıtlılık yok", label: "Kısıtlılık yok" },
                        ]}
                      />
                    </div>

                    <div>
                      <FieldLabel>Hepatobiliyer faz (HBP)</FieldLabel>
                      <Select
                        value={mrHbp}
                        onChange={setMrHbp}
                        options={[
                          { value: "Hipointens", label: "Hipointens" },
                          { value: "İzointens", label: "İzointens" },
                          { value: "Hiperintens", label: "Hiperintens" },
                          { value: "Yok/çekilmedi", label: "Yok/çekilmedi" },
                        ]}
                      />
                    </div>

                    <div>
                      <FieldLabel>Arteriyel faz patern</FieldLabel>
                      <Select
                        value={mrArterial}
                        onChange={setMrArterial}
                        options={[
                          { value: "Periferik nodüler", label: "Periferik nodüler" },
                          { value: "Arteriyel hiper", label: "Arteriyel hiper" },
                          { value: "Halkasal", label: "Halkasal" },
                          { value: "Belirsiz", label: "Belirsiz" },
                        ]}
                      />
                    </div>

                    <div>
                      <FieldLabel>Washout</FieldLabel>
                      <Select
                        value={mrWashout}
                        onChange={(v) => setMrWashout(v as Tri)}
                        options={[
                          { value: "UNK", label: "Bilinmiyor" },
                          { value: "NO", label: "Yok" },
                          { value: "YES", label: "Var" },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-2 text-xs text-gray-500">
              ✅ BT+MR seçilince iki modalite alanları birlikte görünür ve motor ikisini birlikte kullanır.
            </div>
          </Card>

          <Card title="3) Safra Kesesi (Var/Yok → Detay)">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>Safra kesesinde patoloji</FieldLabel>
                <Select
                  value={gbHasPath}
                  onChange={(v) => onGbHasPath(v as Tri)}
                  options={[
                    { value: "NO", label: "Yok" },
                    { value: "YES", label: "Var" },
                  ]}
                />
              </div>

              {gbHasPath === "YES" && (
                <div>
                  <FieldLabel>Ön tanı / sık patoloji</FieldLabel>
                  <Select
                    value={gbMainDx}
                    onChange={setGbMainDx}
                    options={[
                      { value: "Kolesistolitiazis (taş)", label: "Kolesistolitiazis (taş)" },
                      { value: "Akut kolesistit", label: "Akut kolesistit" },
                      { value: "Kronik kolesistit", label: "Kronik kolesistit" },
                      { value: "Safra kesesi polipi", label: "Safra kesesi polipi" },
                      { value: "Adenomiyomatozis", label: "Adenomiyomatozis" },
                      { value: "Porselen safra kesesi (duvar kalsifikasyonu)", label: "Porselen safra kesesi" },
                      { value: "Kitle şüphesi", label: "Kitle şüphesi" },
                    ]}
                  />
                </div>
              )}
            </div>

            {gbHasPath === "YES" && (
              <div className="mt-3 rounded-xl border bg-gray-50 p-3">
                <div className="mb-2 text-sm font-semibold">Detay bulgular</div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <FieldLabel>Duvar kalınlaşması</FieldLabel>
                    <Select
                      value={gbWallThick}
                      onChange={(v) => setGbWallThick(v as Tri)}
                      options={[
                        { value: "UNK", label: "Bilinmiyor" },
                        { value: "NO", label: "Yok" },
                        { value: "YES", label: "Var" },
                      ]}
                    />
                  </div>

                  <div>
                    <FieldLabel>Perikolesistik sıvı</FieldLabel>
                    <Select
                      value={gbPericholecysticFluid}
                      onChange={(v) => setGbPericholecysticFluid(v as Tri)}
                      options={[
                        { value: "UNK", label: "Bilinmiyor" },
                        { value: "NO", label: "Yok" },
                        { value: "YES", label: "Var" },
                      ]}
                    />
                  </div>

                  <div>
                    <FieldLabel>Distansiyon</FieldLabel>
                    <Select
                      value={gbDistension}
                      onChange={(v) => setGbDistension(v as Tri)}
                      options={[
                        { value: "UNK", label: "Bilinmiyor" },
                        { value: "NO", label: "Yok" },
                        { value: "YES", label: "Var" },
                      ]}
                    />
                  </div>

                  <div>
                    <FieldLabel>Murphy (klinik)</FieldLabel>
                    <Select
                      value={gbMurphy}
                      onChange={(v) => setGbMurphy(v as Tri)}
                      options={[
                        { value: "UNK", label: "Bilinmiyor" },
                        { value: "NO", label: "Negatif" },
                        { value: "YES", label: "Pozitif" },
                      ]}
                    />
                  </div>

                  <div className={cx(gbMainDx.includes("polip") ? "" : "opacity-50 pointer-events-none")}>
                    <FieldLabel>Polip boyutu (mm)</FieldLabel>
                    <Input value={gbPolypSizeMm} onChange={setGbPolypSizeMm} type="number" />
                  </div>

                  <div className={cx(showCT ? "" : "opacity-50 pointer-events-none")}>
                    <FieldLabel>Duvar/lümende gaz</FieldLabel>
                    <Select
                      value={gbEmphysematous}
                      onChange={(v) => setGbEmphysematous(v as Tri)}
                      options={[
                        { value: "NO", label: "Yok" },
                        { value: "YES", label: "Var" },
                      ]}
                    />
                  </div>

                  <div>
                    <FieldLabel>Perforasyon/komplikasyon</FieldLabel>
                    <Select
                      value={gbPerforation}
                      onChange={(v) => setGbPerforation(v as Tri)}
                      options={[
                        { value: "NO", label: "Yok" },
                        { value: "YES", label: "Var" },
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card title="4) Safra Yolları (Var/Yok → Detay)">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>Safra yollarında patoloji</FieldLabel>
                <Select
                  value={bdHasPath}
                  onChange={(v) => onBdHasPath(v as Tri)}
                  options={[
                    { value: "NO", label: "Yok" },
                    { value: "YES", label: "Var" },
                  ]}
                />
              </div>

              {bdHasPath === "YES" && (
                <div>
                  <FieldLabel>Olası neden</FieldLabel>
                  <Select
                    value={bdCause}
                    onChange={setBdCause}
                    options={[
                      { value: "Koledok taşı", label: "Koledok taşı" },
                      { value: "Benign striktür", label: "Benign striktür" },
                      { value: "Malign obstrüksiyon", label: "Malign obstrüksiyon" },
                      { value: "PSC", label: "PSC" },
                      { value: "Belirsiz", label: "Belirsiz" },
                    ]}
                  />
                </div>
              )}
            </div>

            {bdHasPath === "YES" && (
              <div className="mt-3 rounded-xl border bg-gray-50 p-3">
                <div className="mb-2 text-sm font-semibold">Detay bulgular</div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <FieldLabel>Dilatasyon</FieldLabel>
                    <Select
                      value={bdDilated}
                      onChange={(v) => setBdDilated(v as Tri)}
                      options={[
                        { value: "UNK", label: "Bilinmiyor" },
                        { value: "NO", label: "Yok" },
                        { value: "YES", label: "Var" },
                      ]}
                    />
                  </div>

                  <div>
                    <FieldLabel>Seviye</FieldLabel>
                    <Select
                      value={bdLevel}
                      onChange={setBdLevel}
                      options={[
                        { value: "İntrahepatik", label: "İntrahepatik" },
                        { value: "Ekstrahepatik (CBD)", label: "Ekstrahepatik (CBD)" },
                        { value: "Hiler", label: "Hiler" },
                        { value: "İntra+Ekstra", label: "İntra + Ekstra" },
                      ]}
                    />
                  </div>

                  <div>
                    <FieldLabel>Kolanjit şüphesi</FieldLabel>
                    <Select
                      value={bdCholangitis}
                      onChange={(v) => setBdCholangitis(v as Tri)}
                      options={[
                        { value: "UNK", label: "Bilinmiyor" },
                        { value: "NO", label: "Yok" },
                        { value: "YES", label: "Var" },
                      ]}
                    />
                  </div>

                  <div>
                    <FieldLabel>Pnömobili</FieldLabel>
                    <Select
                      value={bdAir}
                      onChange={(v) => setBdAir(v as Tri)}
                      options={[
                        { value: "NO", label: "Yok" },
                        { value: "YES", label: "Var" },
                      ]}
                    />
                  </div>

                  <div className={cx(bdCause.includes("striktür") ? "" : "opacity-50 pointer-events-none")}>
                    <FieldLabel>Striktür tipi</FieldLabel>
                    <Select
                      value={bdStrictureType}
                      onChange={setBdStrictureType}
                      options={[
                        { value: "Benign striktür", label: "Benign striktür" },
                        { value: "Postoperatif", label: "Postoperatif" },
                        { value: "Kronik pankreatit ilişkili", label: "Kronik pankreatit ilişkili" },
                      ]}
                    />
                  </div>

                  <div className={cx(bdCause.includes("PSC") ? "" : "opacity-50 pointer-events-none")}>
                    <FieldLabel>PSC patern</FieldLabel>
                    <Select
                      value={bdPsc}
                      onChange={(v) => setBdPsc(v as Tri)}
                      options={[
                        { value: "NO", label: "Yok" },
                        { value: "YES", label: "Var" },
                      ]}
                    />
                  </div>

                  <div className={cx(bdCause.includes("Malign") ? "" : "opacity-50 pointer-events-none")}>
                    <FieldLabel>Kitle şüphesi</FieldLabel>
                    <Select
                      value={bdMassSuspect}
                      onChange={(v) => setBdMassSuspect(v as Tri)}
                      options={[
                        { value: "UNK", label: "Bilinmiyor" },
                        { value: "NO", label: "Yok" },
                        { value: "YES", label: "Var" },
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card title="AI Çıktı" right={<span className="text-xs text-gray-500">(Demo) Kural tabanlı</span>}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border bg-white p-3">
                <div className="text-sm font-semibold">Rapor Dili</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {computed.reportLines.length ? computed.reportLines.map((x, i) => <li key={i}>{x}</li>) : <li>—</li>}
                </ul>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <div className="text-sm font-semibold">Ayırıcı Tanı</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {computed.diffDx.length ? computed.diffDx.map((x, i) => <li key={i}>{x}</li>) : <li>—</li>}
                </ul>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <div className="text-sm font-semibold">Öneriler</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {computed.recs.length ? computed.recs.map((x, i) => <li key={i}>{x}</li>) : <li>—</li>}
                </ul>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <div className="text-sm font-semibold">Acil / Uyarı</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {computed.urgent.map((x, i) => <li key={`u-${i}`}>{x}</li>)}
                  {computed.warnings.map((x, i) => <li key={`w-${i}`}>{x}</li>)}
                  {!computed.urgent.length && !computed.warnings.length && <li>—</li>}
                </ul>
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              ⚠️ Klinik karar destek amaçlıdır; klinik/laboratuvar ve önceki tetkiklerle korelasyon esastır.
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
