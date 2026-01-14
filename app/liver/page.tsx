"use client";

import React, { useMemo, useState } from "react";

type YesNo = "Yok" | "Var";
type UnknownYesNo = "Bilinmiyor" | "Yok" | "Var";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-300 bg-white p-5 shadow-sm">
      <div className="mb-4 font-semibold">{title}</div>
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
      {hint ? (
        <div className="text-xs text-neutral-500 leading-snug">{hint}</div>
      ) : null}
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
      onClick={onClick}
      className={cx(
        "rounded-full border px-3 py-1 text-xs transition",
        active
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
      )}
      type="button"
    >
      {children}
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
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
    >
      {ok ? "Kopyalandı" : "Kopyala"}
    </button>
  );
}

/** ---------------------------
 *   Ana Page
 *  --------------------------*/
export default function LiverPage() {
  // Üst kontrol / mod
  const [mode, setMode] = useState<"Var/Yok → Detay" | "Rapor dili + öneri">(
    "Var/Yok → Detay"
  );

  // 1) İnceleme & Klinik
  const [examType, setExamType] = useState<"BT" | "MR" | "BT+MR">("BT");
  const [ctContrast, setCtContrast] = useState<
    "Kontrastsız" | "Kontrastlı (dinamik)" | "Bilinmiyor"
  >("Bilinmiyor");
  const [mrDynamic, setMrDynamic] = useState<
    "Dinamiksiz" | "Dinamik (arteryel/portal/geç)" | "Bilinmiyor"
  >("Bilinmiyor");

  const [malignHx, setMalignHx] = useState<UnknownYesNo>("Bilinmiyor");
  const [cirrhosis, setCirrhosis] = useState<UnknownYesNo>("Bilinmiyor");
  const [feverInf, setFeverInf] = useState<UnknownYesNo>("Bilinmiyor");
  const [jaundiceChol, setJaundiceChol] = useState<UnknownYesNo>("Bilinmiyor");

  const strictCt = examType === "BT";
  const strictMr = examType === "MR";
  const both = examType === "BT+MR";

  const isCtNonContrast = ctContrast === "Kontrastsız";
  const isMrNoDynamic = mrDynamic === "Dinamiksiz";

  // 2) Karaciğer
  const [liverLesion, setLiverLesion] = useState<YesNo>("Yok");
  const [fattyLiver, setFattyLiver] = useState<UnknownYesNo>("Bilinmiyor");
  const [lesionCount, setLesionCount] = useState<"Tek" | "Çok" | "Bilinmiyor">(
    "Tek"
  );
  const [largestMm, setLargestMm] = useState("18");
  const [segment, setSegment] = useState<
    "Bilinmiyor" | "S1" | "S2" | "S3" | "S4" | "S5" | "S6" | "S7" | "S8"
  >("S7");
  const [margin, setMargin] = useState<
    "Düzgün" | "Düzensiz" | "Bilinmiyor"
  >("Düzgün");
  const [vascularInv, setVascularInv] = useState<UnknownYesNo>("Bilinmiyor");

  // BT özellikleri (lesion varsa)
  const [ctDensity, setCtDensity] = useState<
    "Hipodens" | "İzodens" | "Hiperdens" | "Bilinmiyor"
  >("Hipodens");
  const [ctEnhPattern, setCtEnhPattern] = useState<
    | "Periferik nodüler"
    | "Homojen"
    | "Halka (rim)"
    | "Heterojen"
    | "Arteryel hiper"
    | "Bilinmiyor"
  >("Periferik nodüler");
  const [ctFillIn, setCtFillIn] = useState<UnknownYesNo>("Var");
  const [ctWashout, setCtWashout] = useState<UnknownYesNo>("Yok");

  // MR özellikleri (lesion varsa)
  const [mrT1, setMrT1] = useState<
    "Hipo" | "İzo" | "Hiper" | "Bilinmiyor"
  >("Bilinmiyor");
  const [mrT2, setMrT2] = useState<
    "Hipo" | "İzo" | "Hiper" | "Bilinmiyor"
  >("Bilinmiyor");
  const [dwiRestrict, setDwiRestrict] = useState<UnknownYesNo>("Bilinmiyor");
  const [mrEnhPattern, setMrEnhPattern] = useState<
    | "Arteryel hiper"
    | "Periferik nodüler"
    | "Halka (rim)"
    | "Homojen"
    | "Heterojen"
    | "Bilinmiyor"
  >("Bilinmiyor");
  const [mrWashout, setMrWashout] = useState<UnknownYesNo>("Bilinmiyor");
  const [hbPhase, setHbPhase] = useState<
    "Yapılmadı" | "Hipointens" | "İzointens" | "Hiperintens" | "Bilinmiyor"
  >("Bilinmiyor");

  // 3) Safra kesesi
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
  const [gbWallThick, setGbWallThick] = useState<UnknownYesNo>("Bilinmiyor");
  const [gbPeriFluid, setGbPeriFluid] = useState<UnknownYesNo>("Bilinmiyor");
  const [gbDistension, setGbDistension] = useState<UnknownYesNo>("Bilinmiyor");
  const [murphy, setMurphy] = useState<"Bilinmiyor" | "Negatif" | "Pozitif">(
    "Bilinmiyor"
  );
  const [gbGas, setGbGas] = useState<YesNo>("Yok");
  const [polypMm, setPolypMm] = useState("6");
  const [gbComp, setGbComp] = useState<
    "Yok" | "Perforasyon şüphesi" | "Ampiyem" | "Gangren" | "Bilinmiyor"
  >("Yok");

  // 4) Safra yolları
  const [bdPath, setBdPath] = useState<YesNo>("Yok");
  const [bdCause, setBdCause] = useState<
    | "Belirsiz"
    | "Koledok taşı"
    | "Benign striktür"
    | "Malign obstrüksiyon"
    | "Kolanjit"
    | "PSC (şüpheli)"
    | "İatrojenik"
  >("Belirsiz");
  const [bdDil, setBdDil] = useState<UnknownYesNo>("Bilinmiyor");
  const [bdLevel, setBdLevel] = useState<
    "Bilinmiyor" | "İntrahepatik" | "Ekstrahepatik" | "Her ikisi"
  >("Bilinmiyor");
  const [cholangitis, setCholangitis] = useState<YesNo>("Yok");
  const [bdStone, setBdStone] = useState<YesNo>("Yok");
  const [bdStricture, setBdStricture] = useState<
    "Bilinmiyor" | "Benign striktür" | "Malign striktür" | "Yok"
  >("Bilinmiyor");
  const [pscPattern, setPscPattern] = useState<YesNo>("Yok");
  const [bdMassSuspect, setBdMassSuspect] = useState<UnknownYesNo>("Bilinmiyor");

  // ---------------------------
  // Değerlendir: AI Çıktı üretimi
  // ---------------------------
  const [evaluated, setEvaluated] = useState(false);

  const buildOutputs = useMemo(() => {
    // sadece patoloji var olan organlar rapor diline girsin
    const hasLiver = liverLesion === "Var";
    const hasGb = gbPath === "Var";
    const hasBd = bdPath === "Var";

    // yardımcı “if” metinleri
    const sizeTxt = largestMm ? `${largestMm} mm` : "ölçülemeyen";
    const segTxt = segment !== "Bilinmiyor" ? `${segment}` : "segmenti";
    const marginTxt =
      margin === "Düzgün"
        ? "düzgün sınırlı"
        : margin === "Düzensiz"
        ? "düzensiz sınırlı"
        : "sınır özellikleri belirsiz";

    // --- Rapor Dili (sadece VAR olanlar)
    const reportLines: string[] = [];

    if (hasLiver) {
      // modality-uyumlu kısa özet
      const modalityBits: string[] = [];
      if (strictCt || both) {
        if (ctContrast === "Kontrastsız") {
          modalityBits.push(
            `Kontrastsız BT'de ${segTxt} düzeyinde ${sizeTxt} lezyon izlenmektedir; densitesi ${ctDensity.toLowerCase()}.`
          );
        } else {
          modalityBits.push(
            `BT'de ${segTxt} düzeyinde ${sizeTxt} lezyon izlenmektedir; nonkontrast densite ${ctDensity.toLowerCase()}, kontrastlanma paterni ${ctEnhPattern.toLowerCase()}.`
          );
          if (ctFillIn !== "Bilinmiyor")
            modalityBits.push(`Geç dolum (fill-in): ${ctFillIn.toLowerCase()}.`);
          if (ctWashout !== "Bilinmiyor")
            modalityBits.push(`Washout: ${ctWashout.toLowerCase()}.`);
        }
      }
      if (strictMr || both) {
        const tBits = `MR'da T1: ${mrT1}, T2: ${mrT2}, DWI kısıtlılığı: ${dwiRestrict}.`;
        if (mrDynamic === "Dinamiksiz") {
          modalityBits.push(tBits + ` Dinamik kontrast serisi yok.`);
        } else {
          modalityBits.push(
            tBits +
              ` Dinamik kontrast paterni: ${mrEnhPattern}, washout: ${mrWashout}, HBP: ${hbPhase}.`
          );
        }
      }

      reportLines.push(
        `• Karaciğerde ${segTxt} düzeyinde ${sizeTxt} lezyon izlenmektedir (${marginTxt}). ` +
          (lesionCount === "Çok" ? "Çoklu lezyon lehine." : "") +
          (fattyLiver === "Var" ? " Yağlı karaciğer bulguları eşlik edebilir." : "")
      );
      reportLines.push(`• ${modalityBits.join(" ")}`.replace(/\s+/g, " ").trim());
      if (vascularInv === "Var") {
        reportLines.push(`• Vasküler invazyon lehine bulgular mevcuttur.`);
      }
    }

    if (hasGb) {
      const gbParts: string[] = [];
      gbParts.push(`• Safra kesesinde ${gbDx.toLowerCase()} ile uyumlu görünüm mevcuttur.`);
      if (gbWallThick === "Var") gbParts.push("Duvar kalınlaşması eşlik etmektedir.");
      if (gbPeriFluid === "Var") gbParts.push("Perikolesistik sıvı izlenmektedir.");
      if (gbDistension === "Var") gbParts.push("Distansiyon mevcuttur.");
      if (murphy === "Pozitif") gbParts.push("Klinik Murphy pozitifliği bildirilmektedir.");
      if (gbGas === "Var") gbParts.push("Duvar/lümende gaz izlenmesi (emfizemli değişiklik?) açısından dikkat.");
      if (gbDx === "Polip" && polypMm) gbParts.push(`Polip boyutu: ~${polypMm} mm.`);
      if (gbComp !== "Yok") gbParts.push(`Komplikasyon: ${gbComp}.`);

      reportLines.push(gbParts.join(" "));
    }

    if (hasBd) {
      const bdParts: string[] = [];
      bdParts.push(`• Safra yollarında patoloji mevcuttur.`);
      if (bdDil === "Var") bdParts.push(`Dilatas­yon izlenmektedir (${bdLevel.toLowerCase()}).`);
      if (bdStone === "Var") bdParts.push(`Koledok taşı ile uyumlu görünüm mevcuttur.`);
      if (bdStricture !== "Yok" && bdStricture !== "Bilinmiyor")
        bdParts.push(`Striktür: ${bdStricture.toLowerCase()}.`);
      if (pscPattern === "Var") bdParts.push(`PSC paterni düşündüren düzensizlik/segmenter daralma-genişleme olabilir.`);
      if (cholangitis === "Var") bdParts.push(`Kolanjit lehine bulgular mevcuttur.`);
      if (bdMassSuspect === "Var") bdParts.push(`Kitle/obstrüksiyon odağı açısından şüpheli bulgular mevcuttur.`);
      bdParts.push(`Olası neden: ${bdCause}.`);

      reportLines.push(bdParts.join(" "));
    }

    if (!hasLiver && !hasGb && !hasBd) {
      reportLines.push("• Karaciğer, safra kesesi ve safra yollarında belirgin patoloji lehine bulgu izlenmemektedir.");
    }

    // --- Ayırıcı Tanı (Organ bazlı, yüksek/orta)
    function liverDDX() {
      // kaba kural tabanlı
      const high: string[] = [];
      const mid: string[] = [];

      const cirrh = cirrhosis === "Var";
      const malign = malignHx === "Var";

      if (strictCt || both) {
        if (!isCtNonContrast) {
          if (ctEnhPattern === "Periferik nodüler" && ctFillIn === "Var") high.push("Hemangiom");
          if (ctEnhPattern === "Arteryel hiper" && (ctWashout === "Var" || cirrh)) high.push("HCC (özellikle siroz zemini)");
          if (ctEnhPattern === "Halka (rim)") mid.push("Metastaz");
          if (ctEnhPattern === "Halka (rim)") mid.push("Kolanjiyokarsinom (periferik)");
          if (ctEnhPattern === "Homojen" && ctDensity === "Hipodens") mid.push("Adenom");
          if (ctEnhPattern === "Homojen" && hbPhase === "Hipointens") mid.push("Adenom");
        } else {
          // kontrastsız ise kısıtlı DDX
          if (ctDensity === "Hiperdens") mid.push("Hematom / hiperdens metastaz / hipervasküler lezyon (kontrastla doğrula)");
          if (ctDensity === "Hipodens") mid.push("Kist / metastaz / HCC (kontrast veya MR ile karakterizasyon)");
        }
      }

      if (strictMr || both) {
        if (mrT2 === "Hiper" && mrT1 !== "Hiper" && hbPhase !== "Hipointens") high.push("Hemangiom (T2 parlak lezyon)");
        if (dwiRestrict === "Var") mid.push("Abse / malignite (DWI+klinik korelasyon)");
        if (mrDynamic !== "Dinamiksiz") {
          if (mrEnhPattern === "Arteryel hiper" && (mrWashout === "Var" || cirrh)) high.push("HCC");
          if (mrEnhPattern === "Periferik nodüler" && mrWashout === "Yok") high.push("Hemangiom");
          if (hbPhase === "Hipointens" && mrEnhPattern === "Arteryel hiper") mid.push("Adenom / HCC (zemine göre)");
          if (hbPhase === "Hiperintens") high.push("FNH");
        } else {
          // dinamiksiz MR
          if (mrT2 === "Hiper" && dwiRestrict !== "Var") mid.push("Hemangiom (dinamik/HBP ile desteklenebilir)");
          if (hbPhase === "Hiperintens") high.push("FNH");
        }
      }

      if (malign) {
        if (!mid.includes("Metastaz")) mid.unshift("Metastaz (malignite öyküsü ile)");
      }

      // tekrarları temizle
      const uniq = (arr: string[]) => Array.from(new Set(arr)).slice(0, 6);
      return { high: uniq(high), mid: uniq(mid) };
    }

    function gbDDX() {
      const high: string[] = [];
      const mid: string[] = [];

      if (gbDx.includes("taş")) high.push("Kolesistolitiazis");
      if (gbDx.includes("Akut kolesistit")) high.push("Akut kolesistit");
      if (gbWallThick === "Var" && gbPeriFluid === "Var") high.push("Akut kolesistit");
      if (gbGas === "Var") high.push("Emfizemli kolesistit");
      if (gbDx === "Polip") {
        high.push("Safra kesesi polipi");
        if (Number(polypMm) >= 10) mid.push("Neoplastik polip / erken malignite (>=10 mm)");
      }
      if (gbDx.includes("Kitle")) high.push("Safra kesesi malignitesi (şüpheli)");
      if (gbDx === "Adenomiyomatozis") high.push("Adenomiyomatozis");
      if (gbDx === "Bilier çamur") mid.push("Bilier çamur");
      if (gbDx === "Porcelain GB") high.push("Porcelain safra kesesi (malignite riski artabilir)");

      const uniq = (arr: string[]) => Array.from(new Set(arr)).slice(0, 6);
      return { high: uniq(high), mid: uniq(mid) };
    }

    function bdDDX() {
      const high: string[] = [];
      const mid: string[] = [];

      if (bdStone === "Var" || bdCause === "Koledok taşı") high.push("Koledok taşı / koledokolitiazis");
      if (bdDil === "Var" && jaundiceChol === "Var") high.push("Obstrüktif kolestaz");
      if (bdStricture === "Benign striktür") mid.push("Benign striktür (iatrojenik / inflamatuvar)");
      if (bdStricture === "Malign striktür" || bdCause === "Malign obstrüksiyon") high.push("Malign obstrüksiyon (kolanjiyokarsinom / pankreatik nedenler)");
      if (pscPattern === "Var" || bdCause === "PSC (şüpheli)") mid.push("PSC");
      if (cholangitis === "Var") high.push("Akut kolanjit");
      if (bdMassSuspect === "Var") high.push("Kitle/obstrüksiyon odağı (kolanjiyokarsinom vb.)");

      const uniq = (arr: string[]) => Array.from(new Set(arr)).slice(0, 6);
      return { high: uniq(high), mid: uniq(mid) };
    }

    const ddx = {
      liver: liverDDX(),
      gb: gbDDX(),
      bd: bdDDX(),
    };

    // --- Öneriler (daha güçlü)
    const rec: string[] = [];

    // karaciğer
    if (liverLesion === "Var") {
      if (cirrhosis === "Var") {
        rec.push("Siroz zemini varsa LI-RADS yaklaşımı ile sınıflama ve AFP/hepatoloji korelasyonu önerilir.");
      }
      if (strictCt || both) {
        if (ctContrast === "Kontrastsız") {
          rec.push("Kontrastsız BT ile karakterizasyon sınırlı: Uygunsa dinamik kontrastlı BT veya (tercihen) dinamik MR + HBP ile ileri değerlendirme önerilir.");
        } else {
          rec.push("Lezyon karakterizasyonu için patern/klinik zemin birlikte değerlendirilmelidir; önceki tetkiklerle karşılaştırma önerilir.");
        }
      }
      if (strictMr || both) {
        if (mrDynamic === "Dinamiksiz") {
          rec.push("Dinamik seri yoksa tanısal güç azalır: Uygunsa dinamik MR (arteryel/portal/geç) + HBP ile tamamlanması önerilir.");
        } else {
          rec.push("HBP (gadoxetic asit) bulguları FNH/adenom ayrımında yardımcıdır; atipik olguda multidisipliner karar önerilir.");
        }
      }
      if (vascularInv === "Var") {
        rec.push("Vasküler invazyon şüphesi varsa acil onkoloji/hepatobiliyer cerrahi değerlendirmesi ve evreleme önerilir.");
      }
    }

    // safra kesesi
    if (gbPath === "Var") {
      rec.push("Safra kesesi bulguları klinik (ağrı/ateş) ve laboratuvar (lökosit, CRP, kolestaz) ile korele edilmelidir.");
      if (gbDx.includes("Akut kolesistit") || (gbWallThick === "Var" && gbPeriFluid === "Var")) {
        rec.push("Akut kolesistit düşünülüyorsa USG korelasyonu ve komplikasyon (perforasyon/ampiyem) açısından yakın klinik takip önerilir.");
      }
      if (gbDx === "Polip") {
        rec.push("Polip boyutu ve risk faktörlerine göre takip: ≥10 mm veya hızlı büyüme varsa cerrahi görüş önerilir.");
      }
      if (gbGas === "Var") {
        rec.push("Duvar/lümende gaz varlığında emfizemli kolesistit olasılığı nedeniyle acil klinik değerlendirme önerilir.");
      }
    }

    // safra yolları
    if (bdPath === "Var") {
      rec.push("Safra yolu dilatasyonu varsa obstrüksiyon seviyesi/nedeni açısından MRCP ile değerlendirme önerilir.");
      if (bdStone === "Var" || bdCause === "Koledok taşı") {
        rec.push("Koledok taşı/obstrüksiyon şüphesinde klinik uygunluk halinde ERCP planlaması düşünülebilir (gastroenteroloji ile).");
      }
      if (bdCause === "Malign obstrüksiyon" || bdMassSuspect === "Var") {
        rec.push("Malign obstrüksiyon şüphesinde pankreas/periampuller bölge değerlendirmesi ve kontrastlı kesitsel görüntüleme + tümör konseyine yönlendirme önerilir.");
      }
      if (cholangitis === "Var") {
        rec.push("Kolanjit şüphesinde acil klinik/laboratuvar korelasyonu ve sepsis parametreleri açısından değerlendirme önerilir.");
      }
      if (pscPattern === "Var") {
        rec.push("PSC şüphesinde hepatoloji takibi ve seri MRCP ile takip/karşılaştırma önerilir.");
      }
    }

    // Acil/Uyarı
    const alert: string[] = [];
    if (feverInf === "Var" && (dwiRestrict === "Var" || cholangitis === "Var")) {
      alert.push("Enfeksiyon/sepsis riski açısından acil klinik değerlendirme önerilir.");
    }
    if (jaundiceChol === "Var" && bdPath === "Var") {
      alert.push("Obstrüktif kolestaz olasılığı: klinik + lab korelasyonu ve hızlı etiyoloji değerlendirmesi önerilir.");
    }
    if (vascularInv === "Var") {
      alert.push("Vasküler invazyon şüphesi: evreleme ve hızlı onkolojik değerlendirme önerilir.");
    }
    if (gbGas === "Var") {
      alert.push("Emfizemli kolesistit olasılığı: acil klinik değerlendirme önerilir.");
    }

    // Final tek cümle formatları
    const pathologySentenceCore: string[] = [];
    if (liverLesion === "Var") pathologySentenceCore.push(`Karaciğerde ${segTxt} düzeyinde ${sizeTxt} lezyon`);
    if (gbPath === "Var") pathologySentenceCore.push(`safra kesesinde ${gbDx.toLowerCase()}`);
    if (bdPath === "Var") {
      const bdShort = bdDil === "Var" ? `safra yollarında ${bdLevel.toLowerCase()} dilatasyon` : "safra yollarında patoloji";
      pathologySentenceCore.push(bdShort);
    }

    const coreJoined =
      pathologySentenceCore.length > 0
        ? pathologySentenceCore.join(", ") + " mevcuttur."
        : "Belirgin patoloji lehine bulgu izlenmemektedir.";

    const finalNeutral = coreJoined;
    const finalProb =
      pathologySentenceCore.length > 0
        ? coreJoined.replace("mevcuttur.", "izlenmekte olup") +
          " etiyoloji/karakterizasyon açısından klinik ve önceki tetkiklerle korelasyon önerilir."
        : coreJoined;
    const finalSuggest =
      pathologySentenceCore.length > 0
        ? coreJoined +
          " Uygunsa hedefe yönelik ileri değerlendirme (MRCP / dinamik MR / klinik-lab korelasyon) önerilir."
        : coreJoined;

    return {
      hasAnyPath: hasLiver || hasGb || hasBd,
      reportLines,
      ddx,
      rec,
      alert,
      final: {
        neutral: finalNeutral,
        prob: finalProb,
        suggest: finalSuggest,
      },
    };
  }, [
    liverLesion,
    gbPath,
    bdPath,
    examType,
    ctContrast,
    mrDynamic,
    malignHx,
    cirrhosis,
    feverInf,
    jaundiceChol,
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
    gbDx,
    gbWallThick,
    gbPeriFluid,
    gbDistension,
    murphy,
    gbGas,
    polypMm,
    gbComp,
    bdCause,
    bdDil,
    bdLevel,
    cholangitis,
    bdStone,
    bdStricture,
    pscPattern,
    bdMassSuspect,
    strictCt,
    strictMr,
    both,
    isCtNonContrast,
    isMrNoDynamic,
  ]);

  const [finalFormat, setFinalFormat] = useState<
    "Olasılık dili" | "Öneri dili" | "Nötr"
  >("Olasılık dili");

  const finalText = useMemo(() => {
    if (finalFormat === "Nötr") return buildOutputs.final.neutral;
    if (finalFormat === "Öneri dili") return buildOutputs.final.suggest;
    return buildOutputs.final.prob;
  }, [finalFormat, buildOutputs.final]);

  function resetAll() {
    setEvaluated(false);
    setMode("Var/Yok → Detay");

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

  // UI
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-4 flex flex-col gap-2">
          <div className="text-center text-2xl font-semibold">
            Abdomen AI Yardımcı Ajan (v1) — Karaciğer + Safra
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Pill active={mode === "Var/Yok → Detay"} onClick={() => setMode("Var/Yok → Detay")}>
              Var/Yok → Detay
            </Pill>
            <Pill active={mode === "Rapor dili + öneri"} onClick={() => setMode("Rapor dili + öneri")}>
              Rapor dili + öneri
            </Pill>
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              className="h-10 rounded-xl border border-neutral-900 bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800"
              onClick={() => setEvaluated(true)}
            >
              Değerlendir
            </button>
            <button
              type="button"
              className="h-10 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
              onClick={resetAll}
            >
              Sıfırla
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          {/* 1) İnceleme */}
          <Section title="1) İnceleme & Klinik Zemin">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="İnceleme tipi">
                <Select
                  value={examType}
                  onChange={(v) => setExamType(v as any)}
                  options={["BT", "MR", "BT+MR"]}
                />
              </Field>

              <Field label="Malignite öyküsü">
                <Select
                  value={malignHx}
                  onChange={(v) => setMalignHx(v as any)}
                  options={["Bilinmiyor", "Yok", "Var"]}
                />
              </Field>

              <Field
                label="BT kontrast durumu"
                hint="BT seçiliyse anlamlı. Kontrastsız seçilirse kontrast patern soruları gizlenir."
                disabled={!(strictCt || both)}
              >
                <Select
                  value={ctContrast}
                  onChange={(v) => setCtContrast(v as any)}
                  options={["Bilinmiyor", "Kontrastsız", "Kontrastlı (dinamik)"]}
                  disabled={!(strictCt || both)}
                />
              </Field>

              <Field
                label="MR dinamik seri"
                hint="MR seçiliyse anlamlı. Dinamiksiz seçilirse dinamik patern soruları gizlenir."
                disabled={!(strictMr || both)}
              >
                <Select
                  value={mrDynamic}
                  onChange={(v) => setMrDynamic(v as any)}
                  options={["Bilinmiyor", "Dinamiksiz", "Dinamik (arteryel/portal/geç)"]}
                  disabled={!(strictMr || both)}
                />
              </Field>

              <Field label="Siroz / kronik KC">
                <Select
                  value={cirrhosis}
                  onChange={(v) => setCirrhosis(v as any)}
                  options={["Bilinmiyor", "Yok", "Var"]}
                />
              </Field>

              <Field label="Ateş / enfeksiyon">
                <Select
                  value={feverInf}
                  onChange={(v) => setFeverInf(v as any)}
                  options={["Bilinmiyor", "Yok", "Var"]}
                />
              </Field>

              <Field label="Sarılık / kolestaz">
                <Select
                  value={jaundiceChol}
                  onChange={(v) => setJaundiceChol(v as any)}
                  options={["Bilinmiyor", "Yok", "Var"]}
                />
              </Field>
            </div>
          </Section>

          {/* 2) Karaciğer */}
          <Section title="2) Karaciğer (Parankim & Lezyon)">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Karaciğerde lezyon">
                <Select
                  value={liverLesion}
                  onChange={(v) => setLiverLesion(v as any)}
                  options={["Yok", "Var"]}
                />
              </Field>

              <Field label="Yağlı karaciğer">
                <Select
                  value={fattyLiver}
                  onChange={(v) => setFattyLiver(v as any)}
                  options={["Bilinmiyor", "Yok", "Var"]}
                />
              </Field>

              <Field label="Lezyon sayısı" disabled={liverLesion !== "Var"}>
                <Select
                  value={lesionCount}
                  onChange={(v) => setLesionCount(v as any)}
                  options={["Tek", "Çok", "Bilinmiyor"]}
                  disabled={liverLesion !== "Var"}
                />
              </Field>

              <Field label="Segment" disabled={liverLesion !== "Var"}>
                <Select
                  value={segment}
                  onChange={(v) => setSegment(v as any)}
                  options={[
                    "Bilinmiyor",
                    "S1",
                    "S2",
                    "S3",
                    "S4",
                    "S5",
                    "S6",
                    "S7",
                    "S8",
                  ]}
                  disabled={liverLesion !== "Var"}
                />
              </Field>

              <Field label="En büyük boyut (mm)" disabled={liverLesion !== "Var"}>
                <Input
                  value={largestMm}
                  onChange={setLargestMm}
                  placeholder="örn: 18"
                  disabled={liverLesion !== "Var"}
                />
              </Field>

              <Field label="Sınır" disabled={liverLesion !== "Var"}>
                <Select
                  value={margin}
                  onChange={(v) => setMargin(v as any)}
                  options={["Düzgün", "Düzensiz", "Bilinmiyor"]}
                  disabled={liverLesion !== "Var"}
                />
              </Field>

              <Field label="Vasküler invazyon" disabled={liverLesion !== "Var"}>
                <Select
                  value={vascularInv}
                  onChange={(v) => setVascularInv(v as any)}
                  options={["Bilinmiyor", "Yok", "Var"]}
                  disabled={liverLesion !== "Var"}
                />
              </Field>
            </div>

            {/* BT blok */}
            {(strictCt || both) && (
              <div className="mt-4 rounded-2xl border border-neutral-200 p-4">
                <div className="mb-3 text-sm font-semibold">BT</div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Nonkontrast densite" disabled={liverLesion !== "Var"}>
                    <Select
                      value={ctDensity}
                      onChange={(v) => setCtDensity(v as any)}
                      options={["Hipodens", "İzodens", "Hiperdens", "Bilinmiyor"]}
                      disabled={liverLesion !== "Var"}
                    />
                  </Field>

                  {/* Kontrastsız BT ise kontrast sorularını gizle */}
                  <Field
                    label="Kontrastlanma paterni"
                    disabled={liverLesion !== "Var" || isCtNonContrast || ctContrast === "Bilinmiyor"}
                    hint={
                      isCtNonContrast
                        ? "Kontrastsız BT seçili → kontrast patern soruları devre dışı."
                        : ctContrast === "Bilinmiyor"
                        ? "BT kontrast durumu bilinmiyor → patern sınırlı yorumlanır."
                        : undefined
                    }
                  >
                    <Select
                      value={ctEnhPattern}
                      onChange={(v) => setCtEnhPattern(v as any)}
                      options={[
                        "Periferik nodüler",
                        "Homojen",
                        "Halka (rim)",
                        "Heterojen",
                        "Arteryel hiper",
                        "Bilinmiyor",
                      ]}
                      disabled={liverLesion !== "Var" || isCtNonContrast || ctContrast === "Bilinmiyor"}
                    />
                  </Field>

                  <Field
                    label="Geç dolum (fill-in)"
                    disabled={liverLesion !== "Var" || isCtNonContrast || ctContrast === "Bilinmiyor"}
                  >
                    <Select
                      value={ctFillIn}
                      onChange={(v) => setCtFillIn(v as any)}
                      options={["Bilinmiyor", "Yok", "Var"]}
                      disabled={liverLesion !== "Var" || isCtNonContrast || ctContrast === "Bilinmiyor"}
                    />
                  </Field>

                  <Field
                    label="Washout"
                    disabled={liverLesion !== "Var" || isCtNonContrast || ctContrast === "Bilinmiyor"}
                  >
                    <Select
                      value={ctWashout}
                      onChange={(v) => setCtWashout(v as any)}
                      options={["Bilinmiyor", "Yok", "Var"]}
                      disabled={liverLesion !== "Var" || isCtNonContrast || ctContrast === "Bilinmiyor"}
                    />
                  </Field>
                </div>
              </div>
            )}

            {/* MR blok */}
            {(strictMr || both) && (
              <div className="mt-4 rounded-2xl border border-neutral-200 p-4">
                <div className="mb-3 text-sm font-semibold">MR</div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="T1 sinyal" disabled={liverLesion !== "Var"}>
                    <Select
                      value={mrT1}
                      onChange={(v) => setMrT1(v as any)}
                      options={["Bilinmiyor", "Hipo", "İzo", "Hiper"]}
                      disabled={liverLesion !== "Var"}
                    />
                  </Field>

                  <Field label="T2 sinyal" disabled={liverLesion !== "Var"}>
                    <Select
                      value={mrT2}
                      onChange={(v) => setMrT2(v as any)}
                      options={["Bilinmiyor", "Hipo", "İzo", "Hiper"]}
                      disabled={liverLesion !== "Var"}
                    />
                  </Field>

                  <Field label="DWI kısıtlılığı" disabled={liverLesion !== "Var"}>
                    <Select
                      value={dwiRestrict}
                      onChange={(v) => setDwiRestrict(v as any)}
                      options={["Bilinmiyor", "Yok", "Var"]}
                      disabled={liverLesion !== "Var"}
                    />
                  </Field>

                  <Field
                    label="Dinamik kontrast paterni"
                    disabled={liverLesion !== "Var" || isMrNoDynamic || mrDynamic === "Bilinmiyor"}
                    hint={
                      isMrNoDynamic
                        ? "Dinamiksiz MR seçili → dinamik patern soruları devre dışı."
                        : mrDynamic === "Bilinmiyor"
                        ? "MR dinamik durumu bilinmiyor → patern sınırlı yorumlanır."
                        : undefined
                    }
                  >
                    <Select
                      value={mrEnhPattern}
                      onChange={(v) => setMrEnhPattern(v as any)}
                      options={[
                        "Bilinmiyor",
                        "Arteryel hiper",
                        "Periferik nodüler",
                        "Halka (rim)",
                        "Homojen",
                        "Heterojen",
                      ]}
                      disabled={liverLesion !== "Var" || isMrNoDynamic || mrDynamic === "Bilinmiyor"}
                    />
                  </Field>

                  <Field
                    label="Washout"
                    disabled={liverLesion !== "Var" || isMrNoDynamic || mrDynamic === "Bilinmiyor"}
                  >
                    <Select
                      value={mrWashout}
                      onChange={(v) => setMrWashout(v as any)}
                      options={["Bilinmiyor", "Yok", "Var"]}
                      disabled={liverLesion !== "Var" || isMrNoDynamic || mrDynamic === "Bilinmiyor"}
                    />
                  </Field>

                  <Field
                    label="Hepatobiliyer faz (HBP)"
                    hint="Gadoxetic asit (HBP) yoksa 'Yapılmadı' seç."
                    disabled={liverLesion !== "Var"}
                  >
                    <Select
                      value={hbPhase}
                      onChange={(v) => setHbPhase(v as any)}
                      options={["Bilinmiyor", "Yapılmadı", "Hipointens", "İzointens", "Hiperintens"]}
                      disabled={liverLesion !== "Var"}
                    />
                  </Field>
                </div>
              </div>
            )}
          </Section>

          {/* 3) Safra kesesi */}
          <Section title="3) Safra Kesesi (Var/Yok → Detay)">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Safra kesesinde patoloji">
                <Select
                  value={gbPath}
                  onChange={(v) => setGbPath(v as any)}
                  options={["Yok", "Var"]}
                />
              </Field>

              <Field label="Ön tanı / sık patoloji" disabled={gbPath !== "Var"}>
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
                  disabled={gbPath !== "Var"}
                />
              </Field>
            </div>

            <div className="mt-4 rounded-2xl border border-neutral-200 p-4">
              <div className="mb-3 text-sm font-semibold">Detay bulgular</div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="Duvar kalınlaşması" disabled={gbPath !== "Var"}>
                  <Select
                    value={gbWallThick}
                    onChange={(v) => setGbWallThick(v as any)}
                    options={["Bilinmiyor", "Yok", "Var"]}
                    disabled={gbPath !== "Var"}
                  />
                </Field>

                <Field label="Perikolesistik sıvı" disabled={gbPath !== "Var"}>
                  <Select
                    value={gbPeriFluid}
                    onChange={(v) => setGbPeriFluid(v as any)}
                    options={["Bilinmiyor", "Yok", "Var"]}
                    disabled={gbPath !== "Var"}
                  />
                </Field>

                <Field label="Distansiyon" disabled={gbPath !== "Var"}>
                  <Select
                    value={gbDistension}
                    onChange={(v) => setGbDistension(v as any)}
                    options={["Bilinmiyor", "Yok", "Var"]}
                    disabled={gbPath !== "Var"}
                  />
                </Field>

                <Field label="Murphy (klinik)" disabled={gbPath !== "Var"}>
                  <Select
                    value={murphy}
                    onChange={(v) => setMurphy(v as any)}
                    options={["Bilinmiyor", "Negatif", "Pozitif"]}
                    disabled={gbPath !== "Var"}
                  />
                </Field>

                <Field
                  label="Polip boyutu (mm)"
                  disabled={gbPath !== "Var" || gbDx !== "Polip"}
                >
                  <Input
                    value={polypMm}
                    onChange={setPolypMm}
                    placeholder="örn: 6"
                    disabled={gbPath !== "Var" || gbDx !== "Polip"}
                  />
                </Field>

                <Field label="Duvar/lümende gaz" disabled={gbPath !== "Var"}>
                  <Select
                    value={gbGas}
                    onChange={(v) => setGbGas(v as any)}
                    options={["Yok", "Var"]}
                    disabled={gbPath !== "Var"}
                  />
                </Field>

                <Field label="Perforasyon/komplikasyon" disabled={gbPath !== "Var"}>
                  <Select
                    value={gbComp}
                    onChange={(v) => setGbComp(v as any)}
                    options={[
                      "Yok",
                      "Perforasyon şüphesi",
                      "Ampiyem",
                      "Gangren",
                      "Bilinmiyor",
                    ]}
                    disabled={gbPath !== "Var"}
                  />
                </Field>
              </div>
            </div>
          </Section>

          {/* 4) Safra yolları */}
          <Section title="4) Safra Yolları (Var/Yok → Detay)">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Safra yollarında patoloji">
                <Select
                  value={bdPath}
                  onChange={(v) => setBdPath(v as any)}
                  options={["Yok", "Var"]}
                />
              </Field>

              <Field label="Olası neden" disabled={bdPath !== "Var"}>
                <Select
                  value={bdCause}
                  onChange={(v) => setBdCause(v as any)}
                  options={[
                    "Belirsiz",
                    "Koledok taşı",
                    "Benign striktür",
                    "Malign obstrüksiyon",
                    "Kolanjit",
                    "PSC (şüpheli)",
                    "İatrojenik",
                  ]}
                  disabled={bdPath !== "Var"}
                />
              </Field>
            </div>

            <div className="mt-4 rounded-2xl border border-neutral-200 p-4">
              <div className="mb-3 text-sm font-semibold">Detay bulgular</div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="Dilatas­yon" disabled={bdPath !== "Var"}>
                  <Select
                    value={bdDil}
                    onChange={(v) => setBdDil(v as any)}
                    options={["Bilinmiyor", "Yok", "Var"]}
                    disabled={bdPath !== "Var"}
                  />
                </Field>

                <Field label="Seviye" disabled={bdPath !== "Var"}>
                  <Select
                    value={bdLevel}
                    onChange={(v) => setBdLevel(v as any)}
                    options={["Bilinmiyor", "İntrahepatik", "Ekstrahepatik", "Her ikisi"]}
                    disabled={bdPath !== "Var"}
                  />
                </Field>

                <Field label="Kolanjit şüphesi" disabled={bdPath !== "Var"}>
                  <Select
                    value={cholangitis}
                    onChange={(v) => setCholangitis(v as any)}
                    options={["Yok", "Var"]}
                    disabled={bdPath !== "Var"}
                  />
                </Field>

                <Field label="Koledok taşı" disabled={bdPath !== "Var"}>
                  <Select
                    value={bdStone}
                    onChange={(v) => setBdStone(v as any)}
                    options={["Yok", "Var"]}
                    disabled={bdPath !== "Var"}
                  />
                </Field>

                <Field label="Striktür tipi" disabled={bdPath !== "Var"}>
                  <Select
                    value={bdStricture}
                    onChange={(v) => setBdStricture(v as any)}
                    options={["Bilinmiyor", "Yok", "Benign striktür", "Malign striktür"]}
                    disabled={bdPath !== "Var"}
                  />
                </Field>

                <Field label="PSC patern" disabled={bdPath !== "Var"}>
                  <Select
                    value={pscPattern}
                    onChange={(v) => setPscPattern(v as any)}
                    options={["Yok", "Var"]}
                    disabled={bdPath !== "Var"}
                  />
                </Field>

                <Field label="Kitle şüphesi" disabled={bdPath !== "Var"}>
                  <Select
                    value={bdMassSuspect}
                    onChange={(v) => setBdMassSuspect(v as any)}
                    options={["Bilinmiyor", "Yok", "Var"]}
                    disabled={bdPath !== "Var"}
                  />
                </Field>
              </div>
            </div>
          </Section>

          {/* AI Çıktı */}
          <Section title="AI Çıktı">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs text-neutral-500">(Demo) Kural tabanlı</div>
              <div className="text-xs text-neutral-500">
                İpucu: Var/Yok seçimlerini değiştirip <b>Değerlendir</b>'e bas.
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* 1) Rapor dili */}
              <div className="rounded-2xl border border-neutral-200 p-4">
                <div className="mb-2 font-semibold">Rapor Dili</div>
                {!evaluated ? (
                  <div className="text-sm text-neutral-500">
                    Çıktı için <b>Değerlendir</b>'e bas.
                  </div>
                ) : (
                  <ul className="list-disc space-y-2 pl-5 text-sm">
                    {buildOutputs.reportLines.map((l, idx) => (
                      <li key={idx}>{l.replace(/^•\s*/, "")}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* 2) Ayırıcı tanı organ bazlı */}
              <div className="rounded-2xl border border-neutral-200 p-4">
                <div className="mb-2 font-semibold">Ayırıcı Tanı (Organ bazlı)</div>
                {!evaluated ? (
                  <div className="text-sm text-neutral-500">
                    Çıktı için <b>Değerlendir</b>'e bas.
                  </div>
                ) : (
                  <div className="space-y-4 text-sm">
                    {liverLesion === "Var" && (
                      <div>
                        <div className="font-semibold">Karaciğer</div>
                        <div className="mt-1">
                          <div className="font-medium">Yüksek olasılık</div>
                          <ul className="list-disc pl-5">
                            {(buildOutputs.ddx.liver.high.length
                              ? buildOutputs.ddx.liver.high
                              : ["(Belirsiz / veri kısıtlı)"]
                            ).map((x) => (
                              <li key={"lh-" + x}>{x}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="mt-2">
                          <div className="font-medium">Orta olasılık</div>
                          <ul className="list-disc pl-5">
                            {(buildOutputs.ddx.liver.mid.length
                              ? buildOutputs.ddx.liver.mid
                              : ["(Belirsiz / veri kısıtlı)"]
                            ).map((x) => (
                              <li key={"lm-" + x}>{x}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {gbPath === "Var" && (
                      <div>
                        <div className="font-semibold">Safra Kesesi</div>
                        <div className="mt-1">
                          <div className="font-medium">Yüksek olasılık</div>
                          <ul className="list-disc pl-5">
                            {(buildOutputs.ddx.gb.high.length
                              ? buildOutputs.ddx.gb.high
                              : ["(Belirsiz / veri kısıtlı)"]
                            ).map((x) => (
                              <li key={"gh-" + x}>{x}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="mt-2">
                          <div className="font-medium">Orta olasılık</div>
                          <ul className="list-disc pl-5">
                            {(buildOutputs.ddx.gb.mid.length
                              ? buildOutputs.ddx.gb.mid
                              : ["(Belirsiz / veri kısıtlı)"]
                            ).map((x) => (
                              <li key={"gm-" + x}>{x}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {bdPath === "Var" && (
                      <div>
                        <div className="font-semibold">Safra Yolları</div>
                        <div className="mt-1">
                          <div className="font-medium">Yüksek olasılık</div>
                          <ul className="list-disc pl-5">
                            {(buildOutputs.ddx.bd.high.length
                              ? buildOutputs.ddx.bd.high
                              : ["(Belirsiz / veri kısıtlı)"]
                            ).map((x) => (
                              <li key={"bh-" + x}>{x}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="mt-2">
                          <div className="font-medium">Orta olasılık</div>
                          <ul className="list-disc pl-5">
                            {(buildOutputs.ddx.bd.mid.length
                              ? buildOutputs.ddx.bd.mid
                              : ["(Belirsiz / veri kısıtlı)"]
                            ).map((x) => (
                              <li key={"bm-" + x}>{x}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {liverLesion !== "Var" && gbPath !== "Var" && bdPath !== "Var" && (
                      <div className="text-neutral-600">
                        Patoloji seçilmedi → ayırıcı tanı üretimi yok.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3) Öneriler */}
              <div className="rounded-2xl border border-neutral-200 p-4">
                <div className="mb-2 font-semibold">Öneriler</div>
                {!evaluated ? (
                  <div className="text-sm text-neutral-500">
                    Çıktı için <b>Değerlendir</b>'e bas.
                  </div>
                ) : (
                  <ul className="list-disc space-y-2 pl-5 text-sm">
                    {(buildOutputs.rec.length
                      ? buildOutputs.rec
                      : ["Klinik/laboratuvar ve önceki tetkiklerle korelasyon esastır."]
                    ).map((x, idx) => (
                      <li key={idx}>{x}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* 4) Acil/Uyarı */}
              <div className="rounded-2xl border border-neutral-200 p-4">
                <div className="mb-2 font-semibold">Acil / Uyarı</div>
                {!evaluated ? (
                  <div className="text-sm text-neutral-500">
                    Çıktı için <b>Değerlendir</b>'e bas.
                  </div>
                ) : (
                  <ul className="list-disc space-y-2 pl-5 text-sm">
                    {(buildOutputs.alert.length
                      ? buildOutputs.alert
                      : ["Acil uyarı gerektiren belirgin bir işaret seçilmedi."]
                    ).map((x, idx) => (
                      <li key={idx}>{x}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* 5) Final Tek Cümle */}
            <div className="mt-4 rounded-2xl border border-neutral-200 p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold">Final Rapor (Tek Cümle)</div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-neutral-600">Format</div>
                  <select
                    className="h-10 rounded-xl border border-neutral-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
                    value={finalFormat}
                    onChange={(e) => setFinalFormat(e.target.value as any)}
                    disabled={!evaluated}
                  >
                    <option>Olasılık dili</option>
                    <option>Öneri dili</option>
                    <option>Nötr</option>
                  </select>
                  <CopyButton text={evaluated ? finalText : ""} />
                </div>
              </div>

              <div className="rounded-xl border border-neutral-300 bg-white p-3 text-sm">
                {evaluated ? finalText : "Final cümle için Değerlendir'e bas."}
              </div>

              <div className="mt-2 text-xs text-neutral-500">
                ⚠️ Klinik karar destek amaçlıdır; klinik/laboratuvar ve önceki tetkiklerle korelasyon esastır.
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
