"use client";

import React, { useMemo, useRef, useState } from "react";

type YesNo = "Yok" | "Var";
type UYN = "Bilinmiyor" | "Yok" | "Var";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-300 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="font-semibold">{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
  hint,
  disabled,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div className={cx("flex flex-col gap-1", disabled && "opacity-60")}>
      <div className="text-sm font-medium text-neutral-800">{label}</div>
      {children}
      {hint ? <div className="text-xs text-neutral-500 leading-snug">{hint}</div> : null}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  disabled?: boolean;
}) {
  return (
    <select
      className="h-10 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      className="h-10 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      className="min-h-[110px] w-full resize-y rounded-2xl border border-neutral-300 bg-white p-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-neutral-200"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function Pill({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-full border px-3 py-1 text-xs transition",
        active
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
      )}
    >
      {children}
    </button>
  );
}

function CopyButton({
  text,
  label = "Kopyala",
  copiedLabel = "Kopyalandı",
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
}) {
  const [ok, setOk] = useState(false);

  return (
    <button
      type="button"
      className={cx(
        "h-10 rounded-xl border px-4 text-sm font-medium transition",
        ok
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800"
      )}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 900);
        } catch {
          // noop
        }
      }}
      title="Panoya kopyalar"
    >
      {ok ? copiedLabel : label}
    </button>
  );
}

function addUnique(arr: string[], item: string) {
  if (!item) return;
  if (!arr.includes(item)) arr.push(item);
}

function normalizeSentence(s: string) {
  const t = (s || "").trim();
  if (!t) return "";
  const endsWithPunct = /[.!?…]$/.test(t);
  return endsWithPunct ? t : `${t}.`;
}

export default function LiverPage() {
  const outputRef = useRef<HTMLDivElement | null>(null);

  const [mode, setMode] = useState<"Var/Yok → Detay" | "Rapor dili + öneri">("Var/Yok → Detay");

  // Manuel ek bulgular
  const [extraFindings, setExtraFindings] = useState("");

  // İnceleme tipi
  const [examType, setExamType] = useState<"BT" | "MR" | "BT+MR">("BT");
  const showCT = examType === "BT" || examType === "BT+MR";
  const showMR = examType === "MR" || examType === "BT+MR";

  // BT kontrast durumu
  const [ctContrast, setCtContrast] = useState<"Kontrastsız" | "Kontrastlı (dinamik)" | "Bilinmiyor">(
    "Bilinmiyor"
  );
  const isCtNonContrast = ctContrast === "Kontrastsız";

  // MR dinamik durumu
  const [mrDynamic, setMrDynamic] = useState<"Dinamiksiz" | "Dinamik (arteryel/portal/geç)" | "Bilinmiyor">(
    "Bilinmiyor"
  );
  const isMrNoDynamic = mrDynamic === "Dinamiksiz";

  // Klinik
  const [malignHx, setMalignHx] = useState<UYN>("Bilinmiyor");
  const [cirrhosis, setCirrhosis] = useState<UYN>("Bilinmiyor");
  const [feverInf, setFeverInf] = useState<UYN>("Bilinmiyor");
  const [jaundiceChol, setJaundiceChol] = useState<UYN>("Bilinmiyor");

  // Karaciğer
  const [liverLesion, setLiverLesion] = useState<YesNo>("Yok");
  const [fattyLiver, setFattyLiver] = useState<UYN>("Bilinmiyor");
  const [lesionCount, setLesionCount] = useState<"Tek" | "Çok" | "Bilinmiyor">("Tek");
  const [largestMm, setLargestMm] = useState("18");
  const [segment, setSegment] = useState<"Bilinmiyor" | "S1" | "S2" | "S3" | "S4" | "S5" | "S6" | "S7" | "S8">(
    "S7"
  );
  const [margin, setMargin] = useState<"Düzgün" | "Düzensiz" | "Bilinmiyor">("Düzgün");
  const [vascularInv, setVascularInv] = useState<UYN>("Bilinmiyor");

  // BT (karaciğer)
  const [ctDensity, setCtDensity] = useState<"Hipodens" | "İzodens" | "Hiperdens" | "Bilinmiyor">("Hipodens");
  const [ctEnhPattern, setCtEnhPattern] = useState<
    "Periferik nodüler" | "Homojen" | "Halka (rim)" | "Heterojen" | "Arteryel hiper" | "Bilinmiyor"
  >("Periferik nodüler");
  const [ctFillIn, setCtFillIn] = useState<UYN>("Var");
  const [ctWashout, setCtWashout] = useState<UYN>("Yok");

  // MR (karaciğer)
  const [mrT1, setMrT1] = useState<"Hipo" | "İzo" | "Hiper" | "Bilinmiyor">("Bilinmiyor");
  const [mrT2, setMrT2] = useState<"Hipo" | "İzo" | "Hiper" | "Bilinmiyor">("Bilinmiyor");
  const [dwiRestrict, setDwiRestrict] = useState<UYN>("Bilinmiyor");
  const [mrEnhPattern, setMrEnhPattern] = useState<
    "Arteryel hiper" | "Periferik nodüler" | "Halka (rim)" | "Homojen" | "Heterojen" | "Bilinmiyor"
  >("Bilinmiyor");
  const [mrWashout, setMrWashout] = useState<UYN>("Bilinmiyor");
  const [hbPhase, setHbPhase] = useState<"Yapılmadı" | "Hipointens" | "İzointens" | "Hiperintens" | "Bilinmiyor">(
    "Bilinmiyor"
  );

  // Safra kesesi
  const [gbPath, setGbPath] = useState<YesNo>("Yok");
  const [gbDx, setGbDx] = useState<
    | "Kolesistolitiazis (taş)"
    | "Akut kolesistit"
    | "Kronik kolesistit"
    | "Polip"
    | "Kitle (şüpheli)"
    | "Bilier çamur"
    | "Porcelain GB"
    | "Adenomiyomatozis"
    | "Bilinmiyor"
  >("Kolesistolitiazis (taş)");
  const [gbWallThick, setGbWallThick] = useState<UYN>("Bilinmiyor");
  const [gbPeriFluid, setGbPeriFluid] = useState<UYN>("Bilinmiyor");
  const [gbDistension, setGbDistension] = useState<UYN>("Bilinmiyor");
  const [murphy, setMurphy] = useState<"Bilinmiyor" | "Negatif" | "Pozitif">("Bilinmiyor");
  const [gbGas, setGbGas] = useState<YesNo>("Yok");
  const [polypMm, setPolypMm] = useState("6");
  const [gbComp, setGbComp] = useState<"Yok" | "Perforasyon şüphesi" | "Ampiyem" | "Gangren" | "Bilinmiyor">(
    "Yok"
  );

  // Safra yolları
  const [bdPath, setBdPath] = useState<YesNo>("Yok");
  const [bdCause, setBdCause] = useState<
    "Belirsiz" | "Koledok taşı" | "Benign striktür" | "Malign obstrüksiyon" | "Kolanjit" | "PSC (şüpheli)" | "İatrojenik"
  >("Belirsiz");
  const [bdDil, setBdDil] = useState<UYN>("Bilinmiyor");
  const [bdLevel, setBdLevel] = useState<"Bilinmiyor" | "İntrahepatik" | "Ekstrahepatik" | "Her ikisi">(
    "Bilinmiyor"
  );
  const [cholangitis, setCholangitis] = useState<YesNo>("Yok");
  const [bdStone, setBdStone] = useState<YesNo>("Yok");
  const [bdStricture, setBdStricture] = useState<"Bilinmiyor" | "Benign striktür" | "Malign striktür" | "Yok">(
    "Bilinmiyor"
  );
  const [pscPattern, setPscPattern] = useState<YesNo>("Yok");
  const [bdMassSuspect, setBdMassSuspect] = useState<UYN>("Bilinmiyor");

  // Final format
  const [finalFormat, setFinalFormat] = useState<"Olasılık dili" | "Öneri dili" | "Nötr">("Olasılık dili");

  const outputs = useMemo(() => {
    const hasLiver = liverLesion === "Var";
    const hasGB = gbPath === "Var";
    const hasBD = bdPath === "Var";

    const report: string[] = [];
    const reportExtraBucket: string[] = []; // Ek bulgular burada ayrıca tutulacak

    const ddx = {
      liver: { high: [] as string[], mid: [] as string[] },
      gb: { high: [] as string[], mid: [] as string[] },
      bd: { high: [] as string[], mid: [] as string[] },
    };

    const rec: string[] = [];
    const advanced: string[] = [];
    const alerts: string[] = [];

    const sizeTxt = largestMm?.trim() ? `${largestMm.trim()} mm` : "ölçülemeyen";
    const segTxt = segment !== "Bilinmiyor" ? segment : "ilgili segment";
    const marginAvoid = margin === "Bilinmiyor";
    const marginTxt =
      margin === "Düzgün"
        ? "düzgün sınırlı"
        : margin === "Düzensiz"
        ? "düzensiz sınırlı"
        : "sınır özellikleri belirsiz";
    const multiTxt = lesionCount === "Çok" ? "Çoklu lezyon lehine." : "";

    // ===== KARACİĞER =====
    if (hasLiver) {
      const baseSentence = `Karaciğerde ${segTxt} düzeyinde ${sizeTxt} boyutlu ${marginAvoid ? "" : marginTxt} lezyon izlenmektedir.`;
      report.push(baseSentence.replace(/\s+/g, " ").trim());
      if (multiTxt) report.push(multiTxt);
      if (fattyLiver === "Var") report.push(`Hepatik steatoz ile uyumlu görünüm izlenmektedir.`);

      if (showCT) {
        if (ctContrast === "Kontrastsız") {
          report.push(`Kontrastsız BT'de lezyon densitesi: ${ctDensity.toLowerCase()}.`);
          addUnique(advanced, `Lezyon karakterizasyonu için kontrastlı multipazik KC BT veya dinamik KC MR önerilir.`);
        } else if (ctContrast === "Kontrastlı (dinamik)") {
          report.push(
            `BT'de lezyon nonkontrast densitesi ${ctDensity.toLowerCase()}, kontrastlanma paterni ${ctEnhPattern.toLowerCase()} olarak izlenmektedir.`
          );
          if (ctFillIn !== "Bilinmiyor") report.push(`Geç dolum (fill-in): ${ctFillIn.toLowerCase()}.`);
          if (ctWashout !== "Bilinmiyor") report.push(`Washout: ${ctWashout.toLowerCase()}.`);
        }
      }

      if (showMR) {
        const base = `MR'da lezyon T1: ${mrT1}, T2: ${mrT2}, DWI kısıtlılığı: ${dwiRestrict}.`;
        if (mrDynamic === "Dinamiksiz") {
          report.push(base + ` Dinamik seri izlenmemiştir.`);
          addUnique(advanced, `Dinamik karakterizasyon için arteriyel-portal-geç faz içeren dinamik KC MR önerilir.`);
        } else if (mrDynamic === "Dinamik (arteryel/portal/geç)") {
          report.push(
            base + ` Dinamik kontrast paterni: ${mrEnhPattern}, washout: ${mrWashout}, HBP: ${hbPhase}.`
          );
        }
      }

      const highHccRisk = cirrhosis === "Var";
      if (highHccRisk) {
        addUnique(
          alerts,
          `Siroz/kronik KC zemininde HCC riski artmıştır; lezyonlar LI-RADS yaklaşımı ile değerlendirilmelidir.`
        );
        addUnique(rec, `AFP ve hepatoloji korelasyonu önerilir.`);
      }

      const hemLikeCT =
        showCT &&
        ctContrast === "Kontrastlı (dinamik)" &&
        ctEnhPattern === "Periferik nodüler" &&
        (ctFillIn === "Var" || ctFillIn === "Bilinmiyor") &&
        ctWashout === "Yok";

      const hemLikeMR =
        showMR &&
        mrT2 === "Hiper" &&
        (mrEnhPattern === "Periferik nodüler" || mrEnhPattern === "Bilinmiyor") &&
        (mrWashout === "Yok" || mrWashout === "Bilinmiyor");

      if (hemLikeCT || hemLikeMR) {
        addUnique(ddx.liver.high, "Hemangiom");
        addUnique(ddx.liver.mid, "Atipik hemangiom");
        addUnique(
          rec,
          `Tipik hemangiom paterni varsa önceki tetkiklerle karşılaştırma; şüphede dinamik MR (gerekirse HBP) ile doğrulama.`
        );
      }

      const fnhLike =
        showMR &&
        mrDynamic === "Dinamik (arteryel/portal/geç)" &&
        mrEnhPattern === "Arteryel hiper" &&
        (mrWashout === "Yok" || mrWashout === "Bilinmiyor") &&
        hbPhase === "Hiperintens";

      if (fnhLike) {
        addUnique(ddx.liver.high, "FNH");
        addUnique(ddx.liver.mid, "FNH-benzeri nodül");
        addUnique(rec, `FNH lehine bulgular varsa klinik korelasyon; tipikse izlem/öncekiyle karşılaştırma.`);
      }

      const hccLike =
        (showCT &&
          ctContrast === "Kontrastlı (dinamik)" &&
          ctEnhPattern === "Arteryel hiper" &&
          ctWashout === "Var") ||
        (showMR &&
          mrDynamic === "Dinamik (arteryel/portal/geç)" &&
          mrEnhPattern === "Arteryel hiper" &&
          mrWashout === "Var");

      if (hccLike && highHccRisk) {
        addUnique(ddx.liver.high, "HCC");
        addUnique(rec, `LI-RADS raporlama + uygun ise MDT değerlendirmesi önerilir.`);
        addUnique(alerts, `Arteryel hiper + washout paterni sirotik zeminde HCC lehinedir; öncelikli değerlendirme önerilir.`);
      } else if (hccLike) {
        addUnique(ddx.liver.mid, "HCC (zemine göre değişken olasılık)");
        addUnique(ddx.liver.mid, "Hiper-vasküler metastaz");
        addUnique(rec, `Zemine göre malignite riski; kontrastlı multipazik BT / dinamik MR ile karakterizasyon önerilir.`);
      }

      const rimLike =
        (showCT && ctContrast === "Kontrastlı (dinamik)" && ctEnhPattern === "Halka (rim)") ||
        (showMR && mrEnhPattern === "Halka (rim)");

      if (rimLike) {
        addUnique(ddx.liver.mid, "Metastaz (rim-enhancing)");
        if (feverInf === "Var" || dwiRestrict === "Var") {
          addUnique(ddx.liver.high, "Abse / enfekte koleksiyon");
          addUnique(alerts, `Enfeksiyon/abse olasılığı: klinik + CRP/WBC korelasyonu ve yakın takip önerilir.`);
          addUnique(rec, `Uygunsa klinik/cerrahi konsültasyon ve uygun tedavi planı; görüntüleme ile takip.`);
        }
      }

      if (vascularInv === "Var") {
        addUnique(
          alerts,
          `Vasküler invazyon lehine bulgular: malignite olasılığı belirgin artar; acil hepatobiliyer/onkoloji değerlendirmesi önerilir.`
        );
      }

      addUnique(
        advanced,
        `Dinamik KC MR önerilecekse: aksiyel T2 (SSFSE/HASTE), T2 FS, T1 in/out-of-phase, DWI (b0/400/800) + ADC, prekontrast T1 FS, dinamik arteriyel/portal/denge, geç faz; uygun ise hepatobiliyer faz (gadoxetic asit) + MRCP eklenebilir.`
      );
      addUnique(
        advanced,
        `Multipazik KC BT önerilecekse: nonkontrast + arteriyel + portal venöz + (gerektiğinde) geç faz; lezyon boyut/segment ve vasküler ilişki raporlanır.`
      );
    }

    // ===== SAFRA KESESİ =====
    if (hasGB) {
      const parts: string[] = [];
      parts.push(`Safra kesesinde ${gbDx.toLowerCase()} ile uyumlu görünüm mevcuttur.`);
      if (gbWallThick === "Var") parts.push(`Duvar kalınlaşması eşlik etmektedir.`);
      if (gbPeriFluid === "Var") parts.push(`Perikolesistik sıvı izlenmektedir.`);
      if (gbDistension === "Var") parts.push(`Distansiyon mevcuttur.`);
      if (murphy === "Pozitif") parts.push(`Klinik Murphy pozitifliği ile uyumlu olabilir.`);
      if (gbGas === "Var") parts.push(`Duvar/lümende gaz izlenmesi (emfizemli kolesistit?) açısından dikkat.`);
      if (gbDx === "Polip" && polypMm?.trim()) parts.push(`Polip boyutu ~${polypMm.trim()} mm.`);
      if (gbComp !== "Yok") parts.push(`Komplikasyon: ${gbComp}.`);
      report.push(parts.join(" "));

      if (gbDx.includes("taş") || gbDx.includes("çamur")) {
        addUnique(ddx.gb.high, "Kolesistolitiazis / bilier çamur");
        if (gbWallThick === "Var" || gbPeriFluid === "Var" || gbDistension === "Var" || murphy === "Pozitif") {
          addUnique(ddx.gb.high, "Akut kolesistit");
          addUnique(alerts, `Akut kolesistit lehine eşlikçi bulgular olabilir; klinik korelasyon ve acil cerrahi değerlendirme düşünülebilir.`);
          addUnique(rec, `Klinik uygunsa cerrahi konsültasyon; hedeflenmiş USG ile korelasyon önerilir.`);
        } else {
          addUnique(ddx.gb.mid, "Semptomsuz taş");
          addUnique(rec, `Semptom varsa USG ile doğrulama ve klinik/cerrahi değerlendirme önerilir.`);
        }
      }

      if (gbDx === "Polip") {
        const n = Number(polypMm);
        addUnique(ddx.gb.high, "Safra kesesi polipi");
        if (!Number.isNaN(n)) {
          if (n >= 10) {
            addUnique(alerts, `≥10 mm polip: malignite riski artar; cerrahi değerlendirme önerilir.`);
            addUnique(rec, `≥10 mm polipte cerrahi konsültasyon; risk faktörleriyle birlikte karar.`);
          } else if (n >= 6) {
            addUnique(rec, `6–9 mm polipte risk faktörlerine göre USG takip (örn: 6–12 ay) önerilebilir.`);
          } else {
            addUnique(rec, `<6 mm polipte düşük risk; uygun aralıklarla USG takip düşünülebilir.`);
          }
        }
      }

      if (gbDx.includes("kitle") || gbDx.includes("Porcelain")) {
        addUnique(ddx.gb.high, "Safra kesesi malignitesi olasılığı");
        addUnique(rec, `Kontrastlı abdomen BT/MR ile lokal invazyon/lenf nodu değerlendirmesi + cerrahi/onkoloji konsültasyonu önerilir.`);
        addUnique(alerts, `Safra kesesi malignitesi şüphesi: öncelikli değerlendirme önerilir.`);
      }

      addUnique(
        advanced,
        `Safra kesesi/akut kolesistit için: hedeflenmiş USG (duvar kalınlığı, Murphy, perikolesistik sıvı), gerekirse kontrastlı BT; komplike olguda MR/MRCP düşünülebilir.`
      );
    }

    // ===== SAFRA YOLLARI =====
    if (hasBD) {
      const parts: string[] = [];
      parts.push(`Safra yollarında patoloji mevcuttur.`);
      if (bdDil === "Var") parts.push(`Dilatas­yon izlenmektedir (${bdLevel.toLowerCase()}).`);
      if (bdStone === "Var") parts.push(`Koledok taşı ile uyumlu görünüm mevcuttur.`);
      if (bdStricture !== "Yok" && bdStricture !== "Bilinmiyor") parts.push(`Striktür: ${bdStricture.toLowerCase()}.`);
      if (pscPattern === "Var") parts.push(`PSC paterni düşündüren segmenter daralma-genişleme olabilir.`);
      if (cholangitis === "Var") parts.push(`Kolanjit lehine bulgular olabilir.`);
      if (bdMassSuspect === "Var") parts.push(`Kitle/obstrüksiyon odağı açısından şüpheli bulgular mevcuttur.`);
      parts.push(`Olası neden: ${bdCause}.`);
      report.push(parts.join(" "));

      if (bdStone === "Var" || bdCause === "Koledok taşı") {
        addUnique(ddx.bd.high, "Koledok taşı (koledokolitiazis)");
        addUnique(ddx.bd.mid, "Papilla düzeyi taş/çamur");
        addUnique(rec, `Klinik-lab kolestaz ile korelasyon; uygun ise ERCP planlaması düşünülebilir.`);
        addUnique(advanced, `MRCP: 3D heavily T2 (MRCP), aksiyel T2 FS, DWI; taş/striktür/obstrüksiyon seviyesi için önerilir.`);
      }

      if (bdDil === "Var" && bdStone !== "Var" && bdCause === "Belirsiz") {
        addUnique(ddx.bd.high, "Obstrüktif kolestaz");
        addUnique(ddx.bd.mid, "Benign striktür");
        addUnique(ddx.bd.mid, "Malign obstrüksiyon (periampuller/kolanjiokarsinom/pankreas başı)");
        addUnique(rec, `Obstrüksiyon seviyesini belirlemek için MRCP önerilir; kitle şüphesinde kontrastlı BT/MR ile değerlendirme.`);
      }

      if (bdStricture === "Malign striktür" || bdMassSuspect === "Var" || bdCause === "Malign obstrüksiyon") {
        addUnique(ddx.bd.high, "Malign obstrüksiyon (kolanjiokarsinom / periampuller / pankreas başı)");
        addUnique(rec, `Kontrastlı pankreas protokol BT veya üst abdomen MR ile kitle ve damar invazyonu değerlendirmesi; MDT önerilir.`);
        addUnique(alerts, `Malign obstrüksiyon şüphesi: öncelikli değerlendirme ve hızlı ileri tetkik önerilir.`);
        addUnique(advanced, `Üst abdomen MR önerilecekse: MRCP (3D T2), T1 FS, T2 FS, DWI, dinamik kontrast (arteriyel/portal/geç), gerekirse gecikmiş faz.`);
      }

      if (cholangitis === "Var") {
        addUnique(ddx.bd.high, "Akut kolanjit (klinik ile)");
        addUnique(alerts, `Kolanjit şüphesi: ateş-sarılık-ağrı ve laboratuvar ile acil klinik değerlendirme gerekir.`);
        addUnique(rec, `Acil klinik/lab korelasyonu; uygun olguda drenaj (ERCP/PTC) gereksinimi açısından değerlendirme.`);
      }

      if (pscPattern === "Var") {
        addUnique(ddx.bd.high, "Primer sklerozan kolanjit (PSC) olasılığı");
        addUnique(rec, `MRCP ile tipik multifokal daralma-genişleme paterninin doğrulanması + hepatoloji/gastroenteroloji korelasyonu önerilir.`);
      }
    }

    if (!hasLiver && !hasGB && !hasBD) {
      report.push(`Karaciğer, safra kesesi ve safra yollarında belirgin patoloji lehine bulgu izlenmemektedir.`);
      addUnique(rec, `Klinik/laboratuvar ve önceki tetkiklerle korelasyon önerilir.`);
    }

    if (jaundiceChol === "Var") {
      addUnique(rec, `Kolestaz/sarılık varlığında: LFT (AST/ALT/ALP/GGT), bilirubin fraksiyonları ve klinik korelasyon önerilir.`);
      if (bdPath === "Var") addUnique(rec, `Obstrüksiyon düşünülüyorsa MRCP ile seviye/neden değerlendirilmesi önerilir.`);
    }

    if (malignHx === "Var" && hasLiver) {
      addUnique(ddx.liver.mid, "Metastaz");
      addUnique(rec, `Malignite öyküsü varlığında metastaz açısından klinik korelasyon ve sistemik tarama/önceki tetkiklerle karşılaştırma önerilir.`);
    }

    // Ek bulgular ayrı başlık için
    const extra = normalizeSentence(extraFindings);
    if (extra) {
      reportExtraBucket.push(extra);
    }

    // Final tek cümle
    const shortBits: string[] = [];
    if (hasLiver) {
      if (finalFormat === "Olasılık dili") shortBits.push(`Karaciğerde ${segTxt} düzeyinde ${sizeTxt} lezyon (karakterizasyon gerekli)`);
      else if (finalFormat === "Öneri dili") shortBits.push(`Karaciğerde ${segTxt} düzeyinde ${sizeTxt} lezyon; dinamik kontrastlı BT/MR ile karakterizasyon önerilir`);
      else shortBits.push(`Karaciğerde ${segTxt} düzeyinde ${sizeTxt} lezyon izlenmektedir`);
    }
    if (hasGB) {
      if (finalFormat === "Olasılık dili") shortBits.push(`safra kesesinde ${gbDx.toLowerCase()} ile uyumlu görünüm`);
      else if (finalFormat === "Öneri dili") shortBits.push(`safra kesesi patolojisi için klinik/USG korelasyonu önerilir`);
      else shortBits.push(`safra kesesinde patoloji izlenmektedir`);
    }
    if (hasBD) {
      if (finalFormat === "Olasılık dili") shortBits.push(`safra yollarında obstrüksiyon/kolestaz lehine bulgular`);
      else if (finalFormat === "Öneri dili") shortBits.push(`safra yolları için MRCP (gerekirse ERCP) ile ileri değerlendirme önerilir`);
      else shortBits.push(`safra yollarında patoloji izlenmektedir`);
    }

    let finalSentence =
      shortBits.length === 0
        ? `Karaciğer, safra kesesi ve safra yollarında belirgin patoloji lehine bulgu izlenmemektedir.`
        : `${shortBits.join("; ")}.`;

    if (extra) {
      finalSentence = `${finalSentence} Ek bulgu: ${extra}`;
    }

    return {
      reportLines: report,
      reportExtraBucket,
      ddx,
      rec: Array.from(new Set(rec)),
      advanced: Array.from(new Set(advanced)),
      alerts: Array.from(new Set(alerts)),
      finalSentence,
    };
  }, [
    extraFindings,
    finalFormat,

    examType,
    showCT,
    showMR,
    ctContrast,
    mrDynamic,

    malignHx,
    cirrhosis,
    feverInf,
    jaundiceChol,

    liverLesion,
    fattyLiver,
    lesionCount,
    largestMm,
    segment,
    margin,
    vascularInv,

    ctDensity,
    ctEnhPattern,
    ctFillIn,
    ctWashout,

    mrT1,
    mrT2,
    dwiRestrict,
    mrEnhPattern,
    mrWashout,
    hbPhase,

    gbPath,
    gbDx,
    gbWallThick,
    gbPeriFluid,
    gbDistension,
    murphy,
    gbGas,
    polypMm,
    gbComp,

    bdPath,
    bdCause,
    bdDil,
    bdLevel,
    cholangitis,
    bdStone,
    bdStricture,
    pscPattern,
    bdMassSuspect,
  ]);

  const ddxText = useMemo(() => {
    const chunks: string[] = [];
    const block = (title: string, high: string[], mid: string[]) => {
      if (high.length === 0 && mid.length === 0) return;
      chunks.push(`${title}`);
      if (high.length) {
        chunks.push(`  Yüksek olasılık:`);
        high.forEach((x) => chunks.push(`   • ${x}`));
      }
      if (mid.length) {
        chunks.push(`  Orta olasılık:`);
        mid.forEach((x) => chunks.push(`   • ${x}`));
      }
      chunks.push("");
    };

    block("Karaciğer", outputs.ddx.liver.high, outputs.ddx.liver.mid);
    block("Safra Kesesi", outputs.ddx.gb.high, outputs.ddx.gb.mid);
    block("Safra Yolları", outputs.ddx.bd.high, outputs.ddx.bd.mid);

    return chunks.length ? chunks.join("\n").trim() : "—";
  }, [outputs.ddx]);

  // Hastane formatlı “Raporu Kopyala”
  const reportOnlyToCopy = useMemo(() => {
    const lines: string[] = [];

    lines.push("BULGULAR:");
    if (outputs.reportLines.length) outputs.reportLines.forEach((l) => lines.push(`- ${l}`));
    else lines.push("- Belirgin patoloji lehine bulgu izlenmemektedir.");
    lines.push("");

    if (outputs.reportExtraBucket.length) {
      lines.push("EK BULGULAR:");
      outputs.reportExtraBucket.forEach((x) => lines.push(`- ${x}`));
      lines.push("");
    }

    lines.push("SONUÇ:");
    lines.push(outputs.finalSentence);
    lines.push("");

    lines.push("ÖNERİLER:");
    if (outputs.rec.length) outputs.rec.forEach((x) => lines.push(`- ${x}`));
    else lines.push("- —");

    return lines.join("\n");
  }, [outputs.reportLines, outputs.reportExtraBucket, outputs.finalSentence, outputs.rec]);

  // Tam çıktı
  const allTextToCopy = useMemo(() => {
    const lines: string[] = [];

    lines.push("=== BULGULAR ===");
    outputs.reportLines.forEach((l) => lines.push(`• ${l}`));
    if (!outputs.reportLines.length) lines.push("• Belirgin patoloji lehine bulgu izlenmemektedir.");
    lines.push("");

    if (outputs.reportExtraBucket.length) {
      lines.push("=== EK BULGULAR ===");
      outputs.reportExtraBucket.forEach((x) => lines.push(`• ${x}`));
      lines.push("");
    }

    lines.push("=== AYIRICI TANI (ORGAN BAZLI) ===");
    lines.push(ddxText === "—" ? "—" : ddxText);
    lines.push("");

    lines.push("=== ÖNERİLER ===");
    if (outputs.rec.length) outputs.rec.forEach((x) => lines.push(`• ${x}`));
    else lines.push("—");
    lines.push("");

    lines.push("=== İLERİ İNCELEME (SEKANS DAHİL) ===");
    if (outputs.advanced.length) outputs.advanced.forEach((x) => lines.push(`• ${x}`));
    else lines.push("—");
    lines.push("");

    lines.push("=== ACİL / UYARI ===");
    if (outputs.alerts.length) outputs.alerts.forEach((x) => lines.push(`• ${x}`));
    else lines.push("—");
    lines.push("");

    lines.push("=== SONUÇ (TEK CÜMLE) ===");
    lines.push(outputs.finalSentence);

    return lines.join("\n");
  }, [outputs.reportLines, outputs.reportExtraBucket, outputs.rec, outputs.advanced, outputs.alerts, outputs.finalSentence, ddxText]);

  function resetAll() {
    setMode("Var/Yok → Detay");
    setExtraFindings("");

    setExamType("BT");
    setCtContrast("Bilinmiyor");
    setMrDynamic("Bilinmiyor");

    setMalignHx("Bilinmiyor");
    setCirrhosis("Bilinmiyor");
    setFeverInf("Bilinmiyor");
    setJaundiceChol("Bilinmiyor");

    setLiverLesion("Yok");
    setFattyLiver("Bilinmiyor");
    setLesionCount("Tek");
    setLargestMm("18");
    setSegment("S7");
    setMargin("Düzgün");
    setVascularInv("Bilinmiyor");

    setCtDensity("Hipodens");
    setCtEnhPattern("Periferik nodüler");
    setCtFillIn("Var");
    setCtWashout("Yok");

    setMrT1("Bilinmiyor");
    setMrT2("Bilinmiyor");
    setDwiRestrict("Bilinmiyor");
    setMrEnhPattern("Bilinmiyor");
    setMrWashout("Bilinmiyor");
    setHbPhase("Bilinmiyor");

    setGbPath("Yok");
    setGbDx("Kolesistolitiazis (taş)");
    setGbWallThick("Bilinmiyor");
    setGbPeriFluid("Bilinmiyor");
    setGbDistension("Bilinmiyor");
    setMurphy("Bilinmiyor");
    setGbGas("Yok");
    setPolypMm("6");
    setGbComp("Yok");

    setBdPath("Yok");
    setBdCause("Belirsiz");
    setBdDil("Bilinmiyor");
    setBdLevel("Bilinmiyor");
    setCholangitis("Yok");
    setBdStone("Yok");
    setBdStricture("Bilinmiyor");
    setPscPattern("Yok");
    setBdMassSuspect("Bilinmiyor");

    setFinalFormat("Olasılık dili");
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-4 flex flex-col gap-2">
          <div className="text-center text-2xl font-semibold">Abdomen AI Yardımcı Ajan (v1) — Karaciğer + Safra</div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Pill active={mode === "Var/Yok → Detay"} onClick={() => setMode("Var/Yok → Detay")}>
              Var/Yok → Detay
            </Pill>
            <Pill active={mode === "Rapor dili + öneri"} onClick={() => setMode("Rapor dili + öneri")}>
              Rapor dili + öneri
            </Pill>
            <Pill active={examType === "BT"} onClick={() => setExamType("BT")}>
              BT
            </Pill>
            <Pill active={examType === "MR"} onClick={() => setExamType("MR")}>
              MR
            </Pill>
            <Pill active={examType === "BT+MR"} onClick={() => setExamType("BT+MR")}>
              BT+MR
            </Pill>
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              className="h-10 rounded-xl border border-neutral-900 bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800"
              onClick={() => {
                outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              Çıktıya Git
            </button>

            <button
              type="button"
              className="h-10 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
              onClick={resetAll}
            >
              Sıfırla
            </button>
          </div>

          <div className="text-center text-xs text-neutral-500">
            ✅ Canlı çıktı: alanları değiştirdikçe rapor/ayırıcı tanı/öneriler otomatik güncellenir.
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          {/* LEFT */}
          <div className="lg:col-span-7 xl:col-span-8 grid gap-4">
            <Section title="1) İnceleme & Klinik Zemin">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="İnceleme tipi" hint="BT seçilirse MR alanları gizlenir; MR seçilirse BT alanları gizlenir.">
                  <Select value={examType} onChange={(v) => setExamType(v as any)} options={["BT", "MR", "BT+MR"]} />
                </Field>

                <Field label="Malignite öyküsü">
                  <Select value={malignHx} onChange={(v) => setMalignHx(v as any)} options={["Bilinmiyor", "Yok", "Var"]} />
                </Field>

                {showCT && (
                  <Field label="BT kontrast durumu" hint="Kontrastsız BT seçilirse kontrast patern soruları gizlenir.">
                    <Select value={ctContrast} onChange={(v) => setCtContrast(v as any)} options={["Bilinmiyor", "Kontrastsız", "Kontrastlı (dinamik)"]} />
                  </Field>
                )}

                {showMR && (
                  <Field label="MR dinamik seri" hint="Dinamiksiz seçilirse dinamik patern soruları gizlenir.">
                    <Select value={mrDynamic} onChange={(v) => setMrDynamic(v as any)} options={["Bilinmiyor", "Dinamiksiz", "Dinamik (arteryel/portal/geç)"]} />
                  </Field>
                )}

                <Field label="Siroz / kronik KC">
                  <Select value={cirrhosis} onChange={(v) => setCirrhosis(v as any)} options={["Bilinmiyor", "Yok", "Var"]} />
                </Field>

                <Field label="Ateş / enfeksiyon">
                  <Select value={feverInf} onChange={(v) => setFeverInf(v as any)} options={["Bilinmiyor", "Yok", "Var"]} />
                </Field>

                <Field label="Sarılık / kolestaz">
                  <Select value={jaundiceChol} onChange={(v) => setJaundiceChol(v as any)} options={["Bilinmiyor", "Yok", "Var"]} />
                </Field>
              </div>
            </Section>

            <Section title="2) Karaciğer (Parankim & Lezyon)">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Karaciğerde lezyon">
                  <Select value={liverLesion} onChange={(v) => setLiverLesion(v as any)} options={["Yok", "Var"]} />
                </Field>

                <Field label="Yağlı karaciğer">
                  <Select value={fattyLiver} onChange={(v) => setFattyLiver(v as any)} options={["Bilinmiyor", "Yok", "Var"]} />
                </Field>

                <Field label="Lezyon sayısı" disabled={liverLesion !== "Var"}>
                  <Select value={lesionCount} onChange={(v) => setLesionCount(v as any)} options={["Tek", "Çok", "Bilinmiyor"]} disabled={liverLesion !== "Var"} />
                </Field>

                <Field label="Segment" disabled={liverLesion !== "Var"}>
                  <Select value={segment} onChange={(v) => setSegment(v as any)} options={["Bilinmiyor", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"]} disabled={liverLesion !== "Var"} />
                </Field>

                <Field label="En büyük boyut (mm)" disabled={liverLesion !== "Var"}>
                  <Input value={largestMm} onChange={setLargestMm} placeholder="örn: 18" disabled={liverLesion !== "Var"} />
                </Field>

                <Field label="Sınır" disabled={liverLesion !== "Var"}>
                  <Select value={margin} onChange={(v) => setMargin(v as any)} options={["Düzgün", "Düzensiz", "Bilinmiyor"]} disabled={liverLesion !== "Var"} />
                </Field>

                <Field label="Vasküler invazyon" disabled={liverLesion !== "Var"}>
                  <Select value={vascularInv} onChange={(v) => setVascularInv(v as any)} options={["Bilinmiyor", "Yok", "Var"]} disabled={liverLesion !== "Var"} />
                </Field>
              </div>

              {showCT && (
                <div className="mt-4 rounded-2xl border border-neutral-200 p-4">
                  <div className="mb-3 text-sm font-semibold">BT (Karaciğer)</div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="Nonkontrast densite" disabled={liverLesion !== "Var"}>
                      <Select value={ctDensity} onChange={(v) => setCtDensity(v as any)} options={["Hipodens", "İzodens", "Hiperdens", "Bilinmiyor"]} disabled={liverLesion !== "Var"} />
                    </Field>

                    <Field
                      label="Kontrastlanma paterni"
                      disabled={liverLesion !== "Var" || isCtNonContrast || ctContrast === "Bilinmiyor"}
                      hint={
                        isCtNonContrast ? "Kontrastsız BT → patern soruları kapalı." : ctContrast === "Bilinmiyor" ? "Kontrast durumu bilinmiyor → patern sınırlı yorumlanır." : undefined
                      }
                    >
                      <Select
                        value={ctEnhPattern}
                        onChange={(v) => setCtEnhPattern(v as any)}
                        options={["Periferik nodüler", "Homojen", "Halka (rim)", "Heterojen", "Arteryel hiper", "Bilinmiyor"]}
                        disabled={liverLesion !== "Var" || isCtNonContrast || ctContrast === "Bilinmiyor"}
                      />
                    </Field>

                    <Field label="Geç dolum (fill-in)" disabled={liverLesion !== "Var" || isCtNonContrast || ctContrast === "Bilinmiyor"}>
                      <Select value={ctFillIn} onChange={(v) => setCtFillIn(v as any)} options={["Bilinmiyor", "Yok", "Var"]} disabled={liverLesion !== "Var" || isCtNonContrast || ctContrast === "Bilinmiyor"} />
                    </Field>

                    <Field label="Washout" disabled={liverLesion !== "Var" || isCtNonContrast || ctContrast === "Bilinmiyor"}>
                      <Select value={ctWashout} onChange={(v) => setCtWashout(v as any)} options={["Bilinmiyor", "Yok", "Var"]} disabled={liverLesion !== "Var" || isCtNonContrast || ctContrast === "Bilinmiyor"} />
                    </Field>
                  </div>
                </div>
              )}

              {showMR && (
                <div className="mt-4 rounded-2xl border border-neutral-200 p-4">
                  <div className="mb-3 text-sm font-semibold">MR (Karaciğer)</div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="T1 sinyal" disabled={liverLesion !== "Var"}>
                      <Select value={mrT1} onChange={(v) => setMrT1(v as any)} options={["Bilinmiyor", "Hipo", "İzo", "Hiper"]} disabled={liverLesion !== "Var"} />
                    </Field>

                    <Field label="T2 sinyal" disabled={liverLesion !== "Var"}>
                      <Select value={mrT2} onChange={(v) => setMrT2(v as any)} options={["Bilinmiyor", "Hipo", "İzo", "Hiper"]} disabled={liverLesion !== "Var"} />
                    </Field>

                    <Field label="DWI kısıtlılığı" disabled={liverLesion !== "Var"}>
                      <Select value={dwiRestrict} onChange={(v) => setDwiRestrict(v as any)} options={["Bilinmiyor", "Yok", "Var"]} disabled={liverLesion !== "Var"} />
                    </Field>

                    <Field
                      label="Dinamik kontrast paterni"
                      disabled={liverLesion !== "Var" || isMrNoDynamic || mrDynamic === "Bilinmiyor"}
                      hint={
                        isMrNoDynamic ? "Dinamiksiz MR → patern soruları kapalı." : mrDynamic === "Bilinmiyor" ? "Dinamik durumu bilinmiyor → patern sınırlı yorumlanır." : undefined
                      }
                    >
                      <Select
                        value={mrEnhPattern}
                        onChange={(v) => setMrEnhPattern(v as any)}
                        options={["Bilinmiyor", "Arteryel hiper", "Periferik nodüler", "Halka (rim)", "Homojen", "Heterojen"]}
                        disabled={liverLesion !== "Var" || isMrNoDynamic || mrDynamic === "Bilinmiyor"}
                      />
                    </Field>

                    <Field label="Washout" disabled={liverLesion !== "Var" || isMrNoDynamic || mrDynamic === "Bilinmiyor"}>
                      <Select value={mrWashout} onChange={(v) => setMrWashout(v as any)} options={["Bilinmiyor", "Yok", "Var"]} disabled={liverLesion !== "Var" || isMrNoDynamic || mrDynamic === "Bilinmiyor"} />
                    </Field>

                    <Field label="Hepatobiliyer faz (HBP)" hint="Gadoxetic asit yoksa 'Yapılmadı' seç." disabled={liverLesion !== "Var"}>
                      <Select value={hbPhase} onChange={(v) => setHbPhase(v as any)} options={["Bilinmiyor", "Yapılmadı", "Hipointens", "İzointens", "Hiperintens"]} disabled={liverLesion !== "Var"} />
                    </Field>
                  </div>
                </div>
              )}
            </Section>

            <Section title="3) Safra Kesesi (Var/Yok → Detay)">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Safra kesesinde patoloji">
                  <Select value={gbPath} onChange={(v) => setGbPath(v as any)} options={["Yok", "Var"]} />
                </Field>

                {gbPath === "Var" && (
                  <Field label="Ön tanı / sık patoloji">
                    <Select
                      value={gbDx}
                      onChange={(v) => setGbDx(v as any)}
                      options={[
                        "Kolesistolitiazis (taş)",
                        "Akut kolesistit",
                        "Kronik kolesistit",
                        "Polip",
                        "Kitle (şüpheli)",
                        "Bilier çamur",
                        "Porcelain GB",
                        "Adenomiyomatozis",
                        "Bilinmiyor",
                      ]}
                    />
                  </Field>
                )}
              </div>

              {gbPath === "Var" && (
                <div className="mt-4 rounded-2xl border border-neutral-200 p-4">
                  <div className="mb-3 text-sm font-semibold">Detay bulgular</div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Field label="Duvar kalınlaşması">
                      <Select value={gbWallThick} onChange={(v) => setGbWallThick(v as any)} options={["Bilinmiyor", "Yok", "Var"]} />
                    </Field>
                    <Field label="Perikolesistik sıvı">
                      <Select value={gbPeriFluid} onChange={(v) => setGbPeriFluid(v as any)} options={["Bilinmiyor", "Yok", "Var"]} />
                    </Field>
                    <Field label="Distansiyon">
                      <Select value={gbDistension} onChange={(v) => setGbDistension(v as any)} options={["Bilinmiyor", "Yok", "Var"]} />
                    </Field>
                    <Field label="Murphy (klinik)">
                      <Select value={murphy} onChange={(v) => setMurphy(v as any)} options={["Bilinmiyor", "Negatif", "Pozitif"]} />
                    </Field>
                    <Field label="Duvar/lümende gaz">
                      <Select value={gbGas} onChange={(v) => setGbGas(v as any)} options={["Yok", "Var"]} />
                    </Field>
                    <Field label="Polip boyutu (mm)" disabled={gbDx !== "Polip"}>
                      <Input value={polypMm} onChange={setPolypMm} disabled={gbDx !== "Polip"} />
                    </Field>
                    <Field label="Perforasyon/komplikasyon">
                      <Select value={gbComp} onChange={(v) => setGbComp(v as any)} options={["Yok", "Perforasyon şüphesi", "Ampiyem", "Gangren", "Bilinmiyor"]} />
                    </Field>
                  </div>
                </div>
              )}
            </Section>

            <Section title="4) Safra Yolları (Var/Yok → Detay)">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Safra yollarında patoloji">
                  <Select value={bdPath} onChange={(v) => setBdPath(v as any)} options={["Yok", "Var"]} />
                </Field>

                {bdPath === "Var" && (
                  <Field label="Olası neden">
                    <Select value={bdCause} onChange={(v) => setBdCause(v as any)} options={["Belirsiz", "Koledok taşı", "Benign striktür", "Malign obstrüksiyon", "Kolanjit", "PSC (şüpheli)", "İatrojenik"]} />
                  </Field>
                )}
              </div>

              {bdPath === "Var" && (
                <div className="mt-4 rounded-2xl border border-neutral-200 p-4">
                  <div className="mb-3 text-sm font-semibold">Detay bulgular</div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Field label="Dilatas­yon">
                      <Select value={bdDil} onChange={(v) => setBdDil(v as any)} options={["Bilinmiyor", "Yok", "Var"]} />
                    </Field>
                    <Field label="Seviye">
                      <Select value={bdLevel} onChange={(v) => setBdLevel(v as any)} options={["Bilinmiyor", "İntrahepatik", "Ekstrahepatik", "Her ikisi"]} />
                    </Field>
                    <Field label="Kolanjit şüphesi">
                      <Select value={cholangitis} onChange={(v) => setCholangitis(v as any)} options={["Yok", "Var"]} />
                    </Field>
                    <Field label="Koledok taşı">
                      <Select value={bdStone} onChange={(v) => setBdStone(v as any)} options={["Yok", "Var"]} />
                    </Field>
                    <Field label="Striktür tipi">
                      <Select value={bdStricture} onChange={(v) => setBdStricture(v as any)} options={["Bilinmiyor", "Yok", "Benign striktür", "Malign striktür"]} />
                    </Field>
                    <Field label="PSC patern">
                      <Select value={pscPattern} onChange={(v) => setPscPattern(v as any)} options={["Yok", "Var"]} />
                    </Field>
                    <Field label="Kitle şüphesi">
                      <Select value={bdMassSuspect} onChange={(v) => setBdMassSuspect(v as any)} options={["Bilinmiyor", "Yok", "Var"]} />
                    </Field>
                  </div>
                </div>
              )}
            </Section>

            <Section title="Ek Bulgular / İnsidental / Kesit alanına giren diğer bulgular" right={<div className="text-xs text-neutral-500">Serbest metin</div>}>
              <TextArea
                value={extraFindings}
                onChange={setExtraFindings}
                placeholder="Örn: Sağ böbrek alt polde 6 mm nonobstrüktif taş. Dalakta 8 mm hipodens lezyon (kist lehine). Akciğer bazallerinde bant atelektazi..."
              />
              <div className="mt-2 text-xs text-neutral-500">
                Bu alan <b>EK BULGULAR</b> başlığına düşer ve SONUÇ cümlesine de kısa şekilde entegre edilir.
              </div>
            </Section>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="lg:sticky lg:top-4 grid gap-4">
              <div ref={outputRef} />

              <Section
                title="AI Çıktı"
                right={
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <CopyButton text={reportOnlyToCopy} label="Raporu Kopyala" copiedLabel="Rapor Kopyalandı" />
                    <CopyButton text={allTextToCopy} label="Tam Çıktıyı Kopyala" copiedLabel="Tam Çıktı Kopyalandı" />
                    <div className="text-xs text-neutral-500">(Canlı)</div>
                  </div>
                }
              >
                <div className="grid gap-4">
                  <Card title="Bulgular (Rapor Dili)">
                    <ul className="list-disc space-y-2 pl-5 text-sm">
                      {outputs.reportLines.map((l, i) => (
                        <li key={i}>{l}</li>
                      ))}
                    </ul>
                  </Card>

                  {outputs.reportExtraBucket.length ? (
                    <Card title="Ek Bulgular">
                      <ul className="list-disc space-y-2 pl-5 text-sm">
                        {outputs.reportExtraBucket.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </Card>
                  ) : null}

                  <Card title="Ayırıcı Tanı (Organ bazlı)">
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed">{ddxText}</pre>
                  </Card>

                  <Card title="Öneriler">
                    {outputs.rec.length ? (
                      <ul className="list-disc space-y-2 pl-5 text-sm">
                        {outputs.rec.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-neutral-500">—</div>
                    )}
                  </Card>

                  <Card title="İleri İnceleme (sekans dahil)">
                    {outputs.advanced.length ? (
                      <ul className="list-disc space-y-2 pl-5 text-sm">
                        {outputs.advanced.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-neutral-500">—</div>
                    )}
                  </Card>

                  <Card title="Acil / Uyarı">
                    {outputs.alerts.length ? (
                      <ul className="list-disc space-y-2 pl-5 text-sm">
                        {outputs.alerts.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-neutral-500">—</div>
                    )}
                  </Card>

                  <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold">Sonuç (Tek Cümle)</div>
                      <div className="flex items-center gap-2">
                        <select
                          className="h-10 rounded-xl border border-neutral-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
                          value={finalFormat}
                          onChange={(e) => setFinalFormat(e.target.value as any)}
                        >
                          <option>Olasılık dili</option>
                          <option>Öneri dili</option>
                          <option>Nötr</option>
                        </select>
                        <CopyButton text={outputs.finalSentence} label="Sonucu Kopyala" copiedLabel="Sonuç Kopyalandı" />
                      </div>
                    </div>
                    <div className="rounded-xl border border-neutral-300 bg-white p-3 text-sm">{outputs.finalSentence}</div>

                    <div className="mt-2 text-xs text-neutral-500">
                      ✅ Canlı çıktı: alanları değiştirdikçe rapor/ayırıcı tanı/öneriler otomatik güncellenir.
                    </div>
                  </div>
                </div>
              </Section>

              <div className="text-xs text-neutral-500">
                ⚠️ Klinik karar destek amaçlıdır; klinik/laboratuvar ve önceki tetkiklerle korelasyon esastır.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
