"use client";

import React, { useMemo, useState } from "react";

type YesNoUnknown = "Var" | "Yok" | "Bilinmiyor";
type Modality = "BT" | "MR" | "BT+MR";

type CTContrast = "Kontrastsız" | "Kontrastlı" | "Bilinmiyor";
type MRDynamic = "Dinamik var" | "Dinamiksiz" | "Bilinmiyor";

type LiverDensity = "Hipodens" | "İzodens" | "Hiperdens" | "Bilinmiyor";
type CTEnhPattern =
  | "Belirsiz"
  | "Periferik nodüler"
  | "Homojen erken"
  | "Heterojen"
  | "Halka tarzı (rim)"
  | "Progressif santral"
  | "Non-enhancing"
  | "Bilinmiyor";

type MRT1 = "Hipo" | "İzo" | "Hiper" | "Bilinmiyor";
type MRT2 = "Hipo" | "İzo" | "Hiper" | "Bilinmiyor";
type DWI = "Restriksiyon var" | "Restriksiyon yok" | "Bilinmiyor";

type FinalFormat = "Olasılık dili" | "Öneri dili";

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

function uniqPush(arr: string[], v: string) {
  if (!v) return;
  if (!arr.includes(v)) arr.push(v);
}

function sentenceize(txt: string) {
  const t = (txt || "").trim();
  if (!t) return "";
  // tek cümle gibi davran, nokta yoksa ekle
  if (/[.!?]$/.test(t)) return t;
  return t + ".";
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

export default function LiverPage() {
  // ===== 1) İnceleme & Klinik =====
  const [modality, setModality] = useState<Modality>("BT");
  const showCT = modality === "BT" || modality === "BT+MR";
  const showMR = modality === "MR" || modality === "BT+MR";

  const [ctContrast, setCtContrast] = useState<CTContrast>("Bilinmiyor");
  const [mrDynamic, setMrDynamic] = useState<MRDynamic>("Bilinmiyor");

  const [malignancyHx, setMalignancyHx] = useState<YesNoUnknown>("Bilinmiyor");
  const [cirrhosis, setCirrhosis] = useState<YesNoUnknown>("Bilinmiyor");
  const [feverInf, setFeverInf] = useState<YesNoUnknown>("Bilinmiyor");
  const [jaundiceCholestasis, setJaundiceCholestasis] =
    useState<YesNoUnknown>("Bilinmiyor");

  // ===== 2) Karaciğer =====
  const [liverLesion, setLiverLesion] = useState<YesNoUnknown>("Yok");
  const [fattyLiver, setFattyLiver] = useState<YesNoUnknown>("Bilinmiyor");
  const [vascularInvasion, setVascularInvasion] =
    useState<YesNoUnknown>("Bilinmiyor");
  const [lesionCount, setLesionCount] = useState<"Tek" | "Çoklu">("Tek");
  const [segment, setSegment] = useState<string>("S7");
  const [maxSizeMm, setMaxSizeMm] = useState<number>(18);
  const [margin, setMargin] = useState<"Düzgün" | "Düzensiz" | "Bilinmiyor">(
    "Düzgün"
  );

  // CT lezyon
  const [ctDensity, setCtDensity] = useState<LiverDensity>("Hipodens");
  const [ctEnhPattern, setCtEnhPattern] = useState<CTEnhPattern>("Belirsiz");
  const [ctFillIn, setCtFillIn] = useState<YesNoUnknown>("Bilinmiyor");
  const [ctWashout, setCtWashout] = useState<YesNoUnknown>("Bilinmiyor");

  // MR lezyon (dinamik olmasa bile baz ddx için)
  const [mrT1, setMrT1] = useState<MRT1>("Bilinmiyor");
  const [mrT2, setMrT2] = useState<MRT2>("Bilinmiyor");
  const [mrDwi, setMrDwi] = useState<DWI>("Bilinmiyor");
  const [mrArterialHyper, setMrArterialHyper] =
    useState<YesNoUnknown>("Bilinmiyor");
  const [mrWashout, setMrWashout] = useState<YesNoUnknown>("Bilinmiyor");
  const [mrCapsule, setMrCapsule] = useState<YesNoUnknown>("Bilinmiyor");
  const [mrHBP, setMrHBP] = useState<
    "Hipointens" | "İzointens" | "Hiperintens" | "Bilinmiyor"
  >("Bilinmiyor");

  // ===== 3) Safra Kesesi =====
  const [gbPath, setGbPath] = useState<YesNoUnknown>("Yok");
  const [gbDx, setGbDx] = useState<
    | "Kolesistolitiazis (taş)"
    | "Biliyer çamur"
    | "Akut kolesistit"
    | "Kronik kolesistit"
    | "Polip"
    | "Porcelain GB"
    | "Emfizematöz kolesistit"
    | "GB kitle şüphesi"
  >("Kolesistolitiazis (taş)");
  const [gbWall, setGbWall] = useState<YesNoUnknown>("Bilinmiyor");
  const [gbPeriFluid, setGbPeriFluid] = useState<YesNoUnknown>("Bilinmiyor");
  const [gbDistension, setGbDistension] = useState<YesNoUnknown>("Bilinmiyor");
  const [gbMurphy, setGbMurphy] = useState<YesNoUnknown>("Bilinmiyor");
  const [gbGas, setGbGas] = useState<YesNoUnknown>("Yok");
  const [gbPolypMm, setGbPolypMm] = useState<number>(6);
  const [gbComplication, setGbComplication] = useState<
    "Yok" | "Perforasyon şüphesi" | "Gangren/nekroz şüphesi" | "Bilinmiyor"
  >("Yok");

  // ===== 4) Safra Yolları =====
  const [bdPath, setBdPath] = useState<YesNoUnknown>("Yok");
  const [bdCause, setBdCause] = useState<
    | "Belirsiz"
    | "Koledok taşı"
    | "Benign striktür"
    | "Malign obstrüksiyon"
    | "PSC paterni"
    | "Kolangit şüphesi"
    | "Pankreatit ile ilişkili"
    | "Stent/operasyon sonrası"
  >("Belirsiz");
  const [bdDilatation, setBdDilatation] = useState<YesNoUnknown>("Bilinmiyor");
  const [bdLevel, setBdLevel] = useState<
    "İntrahepatik" | "Ekstrahepatik" | "Her ikisi" | "Bilinmiyor"
  >("Bilinmiyor");
  const [bdCholangitis, setBdCholangitis] =
    useState<YesNoUnknown>("Bilinmiyor");
  const [bdMassSusp, setBdMassSusp] = useState<YesNoUnknown>("Bilinmiyor");

  // ===== Ek bulgular (manuel) =====
  const [incidentalText, setIncidentalText] = useState<string>("");

  // ===== Final format =====
  const [finalFormat, setFinalFormat] = useState<FinalFormat>("Olasılık dili");

  // ===== Reset =====
  const resetAll = () => {
    setModality("BT");
    setCtContrast("Bilinmiyor");
    setMrDynamic("Bilinmiyor");
    setMalignancyHx("Bilinmiyor");
    setCirrhosis("Bilinmiyor");
    setFeverInf("Bilinmiyor");
    setJaundiceCholestasis("Bilinmiyor");

    setLiverLesion("Yok");
    setFattyLiver("Bilinmiyor");
    setVascularInvasion("Bilinmiyor");
    setLesionCount("Tek");
    setSegment("S7");
    setMaxSizeMm(18);
    setMargin("Düzgün");
    setCtDensity("Hipodens");
    setCtEnhPattern("Belirsiz");
    setCtFillIn("Bilinmiyor");
    setCtWashout("Bilinmiyor");

    setMrT1("Bilinmiyor");
    setMrT2("Bilinmiyor");
    setMrDwi("Bilinmiyor");
    setMrArterialHyper("Bilinmiyor");
    setMrWashout("Bilinmiyor");
    setMrCapsule("Bilinmiyor");
    setMrHBP("Bilinmiyor");

    setGbPath("Yok");
    setGbDx("Kolesistolitiazis (taş)");
    setGbWall("Bilinmiyor");
    setGbPeriFluid("Bilinmiyor");
    setGbDistension("Bilinmiyor");
    setGbMurphy("Bilinmiyor");
    setGbGas("Yok");
    setGbPolypMm(6);
    setGbComplication("Yok");

    setBdPath("Yok");
    setBdCause("Belirsiz");
    setBdDilatation("Bilinmiyor");
    setBdLevel("Bilinmiyor");
    setBdCholangitis("Bilinmiyor");
    setBdMassSusp("Bilinmiyor");

    setIncidentalText("");
    setFinalFormat("Olasılık dili");
  };

  // ===== AI Motor (CANLI) =====
  const output = useMemo(() => {
    // containers
    const reportLines: string[] = []; // rapor dili (yalnız patoloji varsa)
    const advTests: string[] = []; // ileri inceleme + sekanslar
    const recs: string[] = []; // öneriler
    const warnings: string[] = []; // acil/uyarı

    const ddx = {
      liver: { high: [] as string[], mid: [] as string[] },
      gb: { high: [] as string[], mid: [] as string[] },
      bd: { high: [] as string[], mid: [] as string[] },
    };

    const hasLiver = liverLesion === "Var";
    const hasGB = gbPath === "Var";
    const hasBD = bdPath === "Var";

    const ctNoPhase =
      showCT && (ctContrast === "Bilinmiyor" || ctContrast === "Kontrastsız");
    const ctHasContrast = showCT && ctContrast === "Kontrastlı";
    const mrNoDyn = showMR && (mrDynamic === "Bilinmiyor" || mrDynamic === "Dinamiksiz");
    const mrHasDyn = showMR && mrDynamic === "Dinamik var";

    // -------- KARACİĞER RAPOR + DDX --------
    if (hasLiver) {
      const base =
        `Karaciğerde ${segment} düzeyinde ${lesionCount === "Tek" ? "tek odak" : "çoklu odak"} ` +
        `${Math.max(1, Math.round(maxSizeMm))} mm boyutlu, ${margin === "Bilinmiyor" ? "sınır özellikleri değerlendirilemeyen" : margin.toLowerCase() + " sınırlı"} lezyon izlenmektedir.`;

      // BT bulgusu metni
      if (showCT) {
        const ctParts: string[] = [];
        if (ctDensity !== "Bilinmiyor") ctParts.push(`Nonkontrast densite: ${ctDensity.toLowerCase()}`);
        if (ctContrast === "Kontrastsız") {
          ctParts.push("Kontrast uygulanmamıştır");
        } else if (ctContrast === "Kontrastlı") {
          if (ctEnhPattern && ctEnhPattern !== "Bilinmiyor")
            ctParts.push(`Kontrastlanma paterni: ${ctEnhPattern}`);
          if (ctFillIn !== "Bilinmiyor") ctParts.push(`Geç dolum (fill-in): ${ctFillIn.toLowerCase()}`);
          if (ctWashout !== "Bilinmiyor") ctParts.push(`Washout: ${ctWashout.toLowerCase()}`);
        } else {
          // bilinmiyor
          ctParts.push("Kontrast faz bilgisi bilinmiyor");
        }

        reportLines.push(
          base + (ctParts.length ? " " + ctParts.join(", ") + "." : "")
        );
      }

      // MR bulgusu metni (dinamik yoksa bile T1/T2/DWI ile)
      if (showMR) {
        const mrParts: string[] = [];
        if (mrT1 !== "Bilinmiyor") mrParts.push(`T1: ${mrT1.toLowerCase()}`);
        if (mrT2 !== "Bilinmiyor") mrParts.push(`T2: ${mrT2.toLowerCase()}`);
        if (mrDwi !== "Bilinmiyor")
          mrParts.push(`DWI: ${mrDwi === "Restriksiyon var" ? "restriksiyon mevcut" : mrDwi === "Restriksiyon yok" ? "restriksiyon izlenmedi" : "bilinmiyor"}`);
        if (mrHasDyn) {
          if (mrArterialHyper !== "Bilinmiyor") mrParts.push(`Arteriyel hiper: ${mrArterialHyper.toLowerCase()}`);
          if (mrWashout !== "Bilinmiyor") mrParts.push(`Washout: ${mrWashout.toLowerCase()}`);
          if (mrCapsule !== "Bilinmiyor") mrParts.push(`Kapsül: ${mrCapsule.toLowerCase()}`);
          if (mrHBP !== "Bilinmiyor") mrParts.push(`HBP: ${mrHBP.toLowerCase()}`);
        } else {
          mrParts.push("Dinamik faz/HBP bilgisi yok");
        }

        // BT zaten yazıldıysa MR'yi ek cümle gibi yaz
        reportLines.push(
          `MR sinyal özellikleri: ${mrParts.join(", ")}.`
        );
      }

      // risk/zemin
      if (cirrhosis === "Var") uniqPush(warnings, "Siroz/kronik KC zemininde malignite riski artmıştır.");
      if (malignancyHx === "Var") uniqPush(recs, "Malignite öyküsü varlığında metastaz lehine değerlendirme ve önceki tetkiklerle karşılaştırma önerilir.");
      if (vascularInvasion === "Var") uniqPush(warnings, "Vasküler invazyon şüphesi: acil hepatobiliyer değerlendirme önerilir.");

      // ---- KARACİĞER BAZ DDX (BT kontrast yok/bilinmiyor) ----
      if (ctNoPhase && showCT) {
        if (ctDensity === "Hipodens") {
          uniqPush(ddx.liver.high, "Basit kist");
          uniqPush(ddx.liver.high, "Hemangiom (özellikle küçük lezyonlarda)");
          if (fattyLiver === "Var") uniqPush(ddx.liver.high, "Fokal yağ sparing / yağlanma paterni (zemine göre)");
          uniqPush(ddx.liver.mid, "Metastaz");
          if (feverInf === "Var") uniqPush(ddx.liver.mid, "Abse (klinik/lab ile)");
          if (cirrhosis === "Var") uniqPush(ddx.liver.mid, "HCC (siroz zemininde; dinamik karakterizasyon şart)");
          uniqPush(recs, "Kontrast faz bilgisi yok/kontrastsız BT: lezyon karakterizasyonu için dinamik KC MR (tercihen HBP) veya multipazik KC BT önerilir.");
        }
        if (ctDensity === "İzodens") {
          uniqPush(ddx.liver.high, "Küçük hemangiom/FNH (BT’de izodens kalabilir)");
          uniqPush(ddx.liver.mid, "Metastaz");
          if (cirrhosis === "Var") uniqPush(ddx.liver.mid, "HCC");
          uniqPush(recs, "İzodens lezyonlarda BT duyarlılığı sınırlı olabilir; dinamik KC MR ile karakterizasyon önerilir.");
        }
        if (ctDensity === "Hiperdens") {
          uniqPush(ddx.liver.high, "Hemorajik kist");
          uniqPush(ddx.liver.mid, "Hipervasküler metastaz");
          if (cirrhosis === "Var") uniqPush(ddx.liver.mid, "HCC");
          uniqPush(ddx.liver.mid, "Hepatik adenom");
          uniqPush(recs, "Hiperdens lezyonlarda dinamik kontrast paterni ayırıcı tanı için kritiktir; multipazik BT/dinamik MR önerilir.");
        }
      }

      // ---- KARACİĞER Patern bazlı rafine ddx (BT kontrastlıysa) ----
      if (ctHasContrast && showCT) {
        // hemangiom paterni
        const hemangLike =
          ctEnhPattern === "Periferik nodüler" && (ctFillIn === "Var" || ctFillIn === "Bilinmiyor");
        if (hemangLike) {
          uniqPush(ddx.liver.high, "Hemangiom");
          uniqPush(ddx.liver.mid, "FNH");
          uniqPush(recs, "Tipik hemangiom paterni varsa (periferik nodüler + progresif dolum), takip/karşılaştırma klinik ile planlanabilir.");
        }

        // HCC paterni (siroz + washout)
        const hccLike =
          (ctWashout === "Var") && (cirrhosis === "Var" || cirrhosis === "Bilinmiyor");
        if (hccLike) {
          uniqPush(ddx.liver.high, "HCC");
          uniqPush(ddx.liver.mid, "Displastik nodül / rejeneratif nodül");
          uniqPush(recs, "LI-RADS yaklaşımı + AFP/hepatoloji korelasyonu önerilir.");
          uniqPush(warnings, "Washout paterni malignite lehine olabilir; acil klinik korelasyon ve ileri karakterizasyon önerilir.");
        }

        // rim enhancement → metastaz/abse
        if (ctEnhPattern === "Halka tarzı (rim)") {
          uniqPush(ddx.liver.high, "Metastaz");
          if (feverInf === "Var") uniqPush(ddx.liver.high, "Abse");
          uniqPush(ddx.liver.mid, "Kolanjiokarsinom (periferik)");
          uniqPush(recs, "Rim kontrastlanan lezyonlarda klinik (ateş/lab) ve DWI/kontrastlı MR ile ayırım önerilir.");
        }
      }

      // ---- MR BAZ DDX (dinamik olmasa bile T1/T2/DWI kombinasyonları) ----
      // Bu kısım senin istediğin “MR tarafında geniş baz ddx” çekirdeği:
      if (showMR && mrNoDyn) {
        // T2 hiper + DWI restr yok → kist/hemangiom
        if (mrT2 === "Hiper" && mrDwi === "Restriksiyon yok") {
          uniqPush(ddx.liver.high, "Basit kist");
          uniqPush(ddx.liver.high, "Hemangiom");
          uniqPush(ddx.liver.mid, "Biliyer hamartom (çoklu küçük ise)");
        }

        // T2 hiper + DWI restr var → abse / malignite / kolanjiokarsinom
        if (mrT2 === "Hiper" && mrDwi === "Restriksiyon var") {
          if (feverInf === "Var") uniqPush(ddx.liver.high, "Abse (klinik/lab ile güçlü)");
          uniqPush(ddx.liver.mid, "Metastaz (sellüler lezyonlarda)");
          uniqPush(ddx.liver.mid, "Kolanjiokarsinom (klinik/kolestaz ile)");
          uniqPush(recs, "DWI restriksiyonu olan lezyonlarda klinik-lab korelasyonu + kontrastlı dinamik MR önerilir.");
        }

        // T1 hiper → hemorajik/proteinöz içerik, adenoma, HCC vb (zemine göre)
        if (mrT1 === "Hiper") {
          uniqPush(ddx.liver.mid, "Hemorajik/proteinöz içerikli kist");
          uniqPush(ddx.liver.mid, "Hepatik adenom (özellikle T1 hiper komponent olabilir)");
          if (cirrhosis === "Var") uniqPush(ddx.liver.mid, "HCC (siroz zemininde)");
          uniqPush(recs, "T1 hiper lezyonlarda yağ/kan ürünleri ayrımı için in-out phase ve SWI/T2* sekansları faydalıdır.");
        }

        // T2 düşük + DWI restr var → bazı maligniteler/fibrotik lezyonlar (temkinli)
        if (mrT2 === "Hipo" && mrDwi === "Restriksiyon var") {
          uniqPush(ddx.liver.mid, "Hiposellüler fibrotik lezyon / metastaz varyantları (klinikle)");
          uniqPush(ddx.liver.mid, "Kolanjiokarsinom (fibrotik komponent)");
        }

        // genel ileri tetkik önerisi
        uniqPush(recs, "Dinamik bilgi yoksa: lezyon karakterizasyonu için hepatobiliyer kontrastlı (HBP) dinamik KC MR önerilir.");
      }

      // ---- MR DİNAMİK VARSA rafine ddx (opsiyonel ama faydalı) ----
      if (showMR && mrHasDyn) {
        // FNH: arteriyel hiper + HBP hiper/izo + washout yok
        const fnhLike =
          mrArterialHyper === "Var" &&
          (mrWashout === "Yok" || mrWashout === "Bilinmiyor") &&
          (mrHBP === "Hiperintens" || mrHBP === "İzointens");
        if (fnhLike) {
          uniqPush(ddx.liver.high, "FNH");
          uniqPush(ddx.liver.mid, "Adenom");
          uniqPush(recs, "FNH lehine bulgularda klinik uygun ise takip/karşılaştırma planlanabilir.");
        }

        // HCC: arteriyel hiper + washout + (kapsül)
        const mrHccLike = mrArterialHyper === "Var" && mrWashout === "Var";
        if (mrHccLike) {
          uniqPush(ddx.liver.high, "HCC");
          uniqPush(ddx.liver.mid, "Adenom / hipervasküler metastaz");
          uniqPush(recs, "LI-RADS kriterleri ile evreleme + AFP/hepatoloji korelasyonu önerilir.");
          uniqPush(warnings, "Dinamik MR’da arteriyel hiper + washout paterni malignite lehine olabilir.");
        }

        // Hemangiom: T2 hiper + periferik/progresif dolum (bu sayfada patern alanı yok → temel öneri)
        if (mrT2 === "Hiper" && mrArterialHyper === "Bilinmiyor") {
          uniqPush(ddx.liver.mid, "Hemangiom (dinamik paterni ile doğrulanır)");
        }
      }

      // ---- İleri inceleme (sekanslar) ----
      // karaciğer lezyonu varsa, “hangi tetkikler + sekanslar” kutusu için:
      uniqPush(advTests, "Dinamik KC MR (tercihen hepatobiliyer kontrast: gadoxetate) önerilir: T1 in/out phase, T2 (HASTE/SSFSE), DWI (b=0/400/800), Dinamik arteriyel-portal-geç faz, HBP (20 dk), gerekirse T2* / SWI.");
      if (showCT) uniqPush(advTests, "Multipazik KC BT (arteriyel + portal venöz + geç faz) alternatif olabilir (klinik uygunluk/radyasyon göz önüne alınarak).");
    }

    // -------- SAFRA KESESİ RAPOR + DDX --------
    if (hasGB) {
      // rapor dili: sadece patoloji varsa yaz
      const gbLines: string[] = [];
      gbLines.push(`Safra kesesinde ${gbDx.toLowerCase()} ile uyumlu görünüm mevcuttur.`);
      if (gbWall !== "Bilinmiyor") gbLines.push(`Duvar kalınlaşması: ${gbWall.toLowerCase()}.`);
      if (gbPeriFluid !== "Bilinmiyor") gbLines.push(`Perikolesistik sıvı: ${gbPeriFluid.toLowerCase()}.`);
      if (gbDistension !== "Bilinmiyor") gbLines.push(`Distansiyon: ${gbDistension.toLowerCase()}.`);
      if (gbGas !== "Yok") gbLines.push(`Duvar/lümende gaz izlenmektedir (emfizematöz kolesistit lehine).`);
      if (gbDx === "Polip") gbLines.push(`Polip boyutu: ~${Math.max(1, Math.round(gbPolypMm))} mm.`);
      if (gbComplication !== "Yok" && gbComplication !== "Bilinmiyor") gbLines.push(`${gbComplication}.`);

      reportLines.push(gbLines.join(" "));

      // ddx
      if (gbDx === "Kolesistolitiazis (taş)" || gbDx === "Biliyer çamur") {
        uniqPush(ddx.gb.high, "Kolesistolitiazis / biliyer çamur");
        uniqPush(ddx.gb.mid, "Akut kolesistit (klinik ile)");
      }
      if (gbDx === "Akut kolesistit") {
        uniqPush(ddx.gb.high, "Akut kolesistit");
        uniqPush(ddx.gb.mid, "Gangrenöz/komplike kolesistit");
        if (gbGas === "Var") uniqPush(ddx.gb.high, "Emfizematöz kolesistit");
        uniqPush(warnings, "Akut kolesistit şüphesinde acil klinik değerlendirme önerilir.");
      }
      if (gbDx === "Polip") {
        uniqPush(ddx.gb.high, "GB polipi");
        uniqPush(ddx.gb.mid, "Adenom / malignite (boyut/zemine göre)");
        if (gbPolypMm >= 10) uniqPush(warnings, "≥10 mm poliplerde malignite riski artar; cerrahi/gastroenteroloji değerlendirmesi önerilir.");
      }
      if (gbDx === "GB kitle şüphesi") {
        uniqPush(ddx.gb.high, "GB malignitesi");
        uniqPush(ddx.gb.mid, "Xantogranülomatöz kolesistit");
        uniqPush(warnings, "GB kitle şüphesinde hızlı ileri inceleme ve klinik korelasyon önerilir.");
      }

      // öneriler
      if (gbDx === "Akut kolesistit" || gbWall === "Var" || gbPeriFluid === "Var" || gbMurphy === "Var") {
        uniqPush(recs, "Akut kolesistit açısından klinik (Murphy), lab ve USG korelasyonu önerilir; komplikasyon şüphesinde kontrastlı BT/MR düşünülebilir.");
      } else {
        uniqPush(recs, "Safra kesesi bulguları için klinik korelasyon ve önceki tetkiklerle karşılaştırma önerilir.");
      }

      // ileri inceleme (sekanslar / tetkik)
      uniqPush(advTests, "Safra kesesi için: hedeflenmiş USG (taş/mobilite, duvar, Murphy) ve komplikasyon şüphesinde kontrastlı BT/MR değerlendirilebilir.");
    }

    // -------- SAFRA YOLLARI RAPOR + DDX --------
    if (hasBD) {
      const bdLines: string[] = [];
      bdLines.push("Safra yollarında patoloji mevcuttur.");
      if (bdDilatation !== "Bilinmiyor") bdLines.push(`Dilatatasyon: ${bdDilatation.toLowerCase()}.`);
      if (bdLevel !== "Bilinmiyor") bdLines.push(`Seviye: ${bdLevel.toLowerCase()}.`);
      if (bdCause) bdLines.push(`Olası neden: ${bdCause}.`);
      if (bdCholangitis === "Var") bdLines.push("Kolangit lehine eşlikçi bulgular olabilir.");
      if (bdMassSusp === "Var") bdLines.push("Obstrüksiyona neden olabilecek kitle lezyonu açısından ileri değerlendirme önerilir.");

      reportLines.push(bdLines.join(" "));

      // ddx (yüksek/orta)
      if (bdDilatation === "Var" || jaundiceCholestasis === "Var") {
        uniqPush(ddx.bd.high, "Obstrüktif kolestaz");
        uniqPush(ddx.bd.high, "Klinik/biyokimyasal kolestaz ile uyumlu obstrüksiyon");
      }
      if (bdCause === "Koledok taşı") {
        uniqPush(ddx.bd.high, "Koledok taşı (koledokolitiazis)");
        uniqPush(ddx.bd.mid, "Benign striktür");
      }
      if (bdCause === "Benign striktür") {
        uniqPush(ddx.bd.high, "Benign striktür");
        uniqPush(ddx.bd.mid, "Postoperatif/postinflamatuvar değişiklik");
      }
      if (bdCause === "Malign obstrüksiyon") {
        uniqPush(ddx.bd.high, "Malign obstrüksiyon");
        uniqPush(ddx.bd.mid, "Periampuller tümör / kolanjiokarsinom / pankreas başı kitle");
        uniqPush(warnings, "Malign obstrüksiyon şüphesinde hızlı ileri inceleme önerilir.");
      }
      if (bdCause === "PSC paterni") {
        uniqPush(ddx.bd.high, "Primer sklerozan kolanjit (PSC)");
        uniqPush(ddx.bd.mid, "Kolanjiokarsinom (PSC zemininde risk artışı)");
        uniqPush(recs, "PSC şüphesinde MRCP ile duktal patern değerlendirmesi ve gastroenteroloji takibi önerilir.");
      }
      if (bdCholangitis === "Var" || bdCause === "Kolangit şüphesi") {
        uniqPush(ddx.bd.high, "Akut kolanjit");
        uniqPush(warnings, "Akut kolanjit şüphesinde acil klinik değerlendirme (ateş, ağrı, ikter) ve sepsis riski açısından izlem önerilir.");
      }

      // öneriler (MRCP/ERCP akıllandırma)
      if (bdDilatation === "Var" || jaundiceCholestasis === "Var") {
        uniqPush(recs, "Obstrüksiyon seviyesi/nedeni için MRCP önerilir; klinik uygunlukta ERCP hem tanısal hem terapötik olabilir.");
      }
      if (bdCause === "Koledok taşı") {
        uniqPush(recs, "Koledok taşı şüphesinde MRCP ile doğrulama; klinik/lab ile uyumlu ise ERCP planlanması önerilir.");
      }
      if (bdMassSusp === "Var" || bdCause === "Malign obstrüksiyon") {
        uniqPush(recs, "Kitle şüphesinde kontrastlı üst abdomen BT/MR + gerekirse EUS değerlendirmesi önerilir.");
      }

      // ileri inceleme (sekanslar)
      uniqPush(advTests, "MRCP (sekans önerisi): 3D heavily T2 (MRCP), kalın slab T2, T2 HASTE/SSFSE, DWI, gerekirse kontrastlı dinamik (arteriyel/portal/geç) ve HBP (karaciğer lezyonu eşlik ediyorsa).");
    }

    // -------- Patoloji yoksa rapor satırı üretme --------
    // raporLines zaten yalnız patoloji/pozitif bulgu varken doluyor.

    // -------- Ek bulgular (manuel) entegrasyonu --------
    const inc = incidentalText.trim();
    if (inc) {
      // “Ek bulgular:” diye ayrı cümle halinde rapora ekle
      reportLines.push(`Ek bulgular/insidental: ${sentenceize(inc)}`);
    }

    // -------- Final tek cümle (yalnız patoloji olanları + ek bulgu) --------
    const finalPieces: string[] = [];

    if (hasLiver) {
      if (finalFormat === "Olasılık dili") {
        // olasılık dili: “... benign/malign ayrımı için ...”
        let s = `Karaciğerde ${segment} düzeyinde lezyon izlenmekte olup`;
        if (ddx.liver.high.length) s += ` öncelikle ${ddx.liver.high[0]} lehine`;
        s += `, kesin karakterizasyon için dinamik KC MR (tercihen HBP) önerilir`;
        finalPieces.push(sentenceize(s));
      } else {
        finalPieces.push(
          sentenceize(
            `Karaciğerde ${segment} düzeyindeki lezyon için dinamik KC MR (HBP) ile karakterizasyon önerilir`
          )
        );
      }
    }

    if (hasGB) {
      if (finalFormat === "Olasılık dili") {
        finalPieces.push(sentenceize(`Safra kesesi bulguları ${gbDx.toLowerCase()} ile uyumludur`));
      } else {
        finalPieces.push(sentenceize("Safra kesesi bulguları klinik/lab ile korele edilmelidir"));
      }
    }

    if (hasBD) {
      if (finalFormat === "Olasılık dili") {
        finalPieces.push(sentenceize("Safra yollarında obstrüksiyon/kolestaz lehine bulgular mevcuttur"));
      } else {
        finalPieces.push(sentenceize("Safra yolları için MRCP ile obstrüksiyon seviyesi/nedeni değerlendirilmesi önerilir"));
      }
    }

    if (inc) {
      finalPieces.push(sentenceize(`Ek bulgu: ${inc}`));
    }

    const finalSentence = finalPieces.join(" ");

    // -------- İleri inceleme kutusu (unique) --------
    const advUnique = Array.from(new Set(advTests));
    const recUnique = Array.from(new Set(recs));
    const warnUnique = Array.from(new Set(warnings));

    // -------- Ayırıcı tanı: organ bazlı + yüksek/orta sadece ilgili organlar --------
    const organDdxBlocks: Array<{
      title: string;
      high: string[];
      mid: string[];
      show: boolean;
    }> = [
      {
        title: "Karaciğer",
        high: ddx.liver.high,
        mid: ddx.liver.mid,
        show: hasLiver && (ddx.liver.high.length + ddx.liver.mid.length > 0),
      },
      {
        title: "Safra Kesesi",
        high: ddx.gb.high,
        mid: ddx.gb.mid,
        show: hasGB && (ddx.gb.high.length + ddx.gb.mid.length > 0),
      },
      {
        title: "Safra Yolları",
        high: ddx.bd.high,
        mid: ddx.bd.mid,
        show: hasBD && (ddx.bd.high.length + ddx.bd.mid.length > 0),
      },
    ];

    // -------- “Tam çıktı” (kopyalama için) --------
    const reportText =
      reportLines.length > 0
        ? reportLines.map((x) => `• ${x}`).join("\n")
        : "• Patoloji lehine belirgin bulgu seçilmedi / rapor satırı oluşturulmadı.";

    const ddxText = organDdxBlocks
      .filter((b) => b.show)
      .map((b) => {
        const lines: string[] = [];
        lines.push(`${b.title}`);
        if (b.high.length) lines.push(`  Yüksek olasılık: ${b.high.join(", ")}`);
        if (b.mid.length) lines.push(`  Orta olasılık: ${b.mid.join(", ")}`);
        return lines.join("\n");
      })
      .join("\n\n");

    const recText = recUnique.length
      ? recUnique.map((x) => `• ${x}`).join("\n")
      : "• (Öneri yok)";

    const warnText = warnUnique.length
      ? warnUnique.map((x) => `• ${x}`).join("\n")
      : "• (Acil/uyarı yok)";

    const advText = advUnique.length
      ? advUnique.map((x) => `• ${x}`).join("\n")
      : "• (İleri inceleme önerisi yok)";

    const fullText =
      `Bulgular (Rapor Dili)\n${reportText}\n\n` +
      `Ayırıcı Tanı (Organ bazlı)\n${ddxText || "• (Ayırıcı tanı üretilmedi)"}\n\n` +
      `Öneriler\n${recText}\n\n` +
      `Acil / Uyarı\n${warnText}\n\n` +
      `İleri İnceleme (Tetkik + Sekans)\n${advText}\n\n` +
      `Final Rapor (Tek cümle)\n${finalSentence || "(final cümle oluşmadı)"}`;

    return {
      reportLines,
      organDdxBlocks,
      recs: recUnique,
      warnings: warnUnique,
      adv: advUnique,
      finalSentence,
      reportText,
      ddxText,
      recText,
      warnText,
      advText,
      fullText,
    };
  }, [
    modality,
    showCT,
    showMR,
    ctContrast,
    mrDynamic,
    malignancyHx,
    cirrhosis,
    feverInf,
    jaundiceCholestasis,
    liverLesion,
    fattyLiver,
    vascularInvasion,
    lesionCount,
    segment,
    maxSizeMm,
    margin,
    ctDensity,
    ctEnhPattern,
    ctFillIn,
    ctWashout,
    mrT1,
    mrT2,
    mrDwi,
    mrArterialHyper,
    mrWashout,
    mrCapsule,
    mrHBP,
    gbPath,
    gbDx,
    gbWall,
    gbPeriFluid,
    gbDistension,
    gbMurphy,
    gbGas,
    gbPolypMm,
    gbComplication,
    bdPath,
    bdCause,
    bdDilatation,
    bdLevel,
    bdCholangitis,
    bdMassSusp,
    incidentalText,
    finalFormat,
  ]);

  const leftCard = "rounded-2xl border border-neutral-200 bg-white shadow-sm";
  const label = "text-sm font-medium text-neutral-800";
  const help = "text-xs text-neutral-500";

  const panelCard = "rounded-2xl border border-neutral-200 bg-white shadow-sm p-4";
  const sectionTitle = "text-base font-semibold text-neutral-900";
  const subTitle = "text-sm font-semibold text-neutral-800";

  const showCTPattern = showCT && ctContrast === "Kontrastlı";
  const showMRDynFields = showMR && mrDynamic === "Dinamik var";

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">
              Abdomen AI Yardımcı Ajan (v1) — Karaciğer + Safra (BT/MR/BT+MR)
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              Formu doldurdukça <span className="font-semibold">AI Çıktı paneli canlı güncellenir</span>.
              (Demo / kural tabanlı)
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => copyText(output.fullText)}
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              Tam Çıktıyı Kopyala
            </button>
            <button
              onClick={resetAll}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100"
            >
              Sıfırla
            </button>
          </div>
        </div>

        {/* Layout */}
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          {/* LEFT */}
          <div className="space-y-4">
            {/* 1) İnceleme & Klinik */}
            <div className={cx(leftCard, "p-4")}>
              <div className="mb-3 flex items-center justify-between">
                <div className={sectionTitle}>1) İnceleme & Klinik Zemin</div>
                <div className="text-xs text-neutral-500">
                  İpucu: Modality’ye göre ilgili alanlar görünür/gizlenir.
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className={label}>İnceleme tipi</div>
                  <select
                    className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                    value={modality}
                    onChange={(e) => setModality(e.target.value as Modality)}
                  >
                    <option value="BT">BT</option>
                    <option value="MR">MR</option>
                    <option value="BT+MR">BT+MR</option>
                  </select>
                  <div className={help}>BT+MR seçilirse iki modalite birlikte değerlendirilir.</div>
                </div>

                {showCT ? (
                  <div>
                    <div className={label}>BT kontrast durumu</div>
                    <select
                      className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                      value={ctContrast}
                      onChange={(e) => setCtContrast(e.target.value as CTContrast)}
                    >
                      <option value="Bilinmiyor">Bilinmiyor</option>
                      <option value="Kontrastsız">Kontrastsız</option>
                      <option value="Kontrastlı">Kontrastlı</option>
                    </select>
                    <div className={help}>
                      Kontrastsız seçilirse kontrast paterni soruları gizlenir.
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-500">
                    BT seçili değil → BT alanları gizli
                  </div>
                )}

                {showMR ? (
                  <div>
                    <div className={label}>MR dinamik/HBP durumu</div>
                    <select
                      className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                      value={mrDynamic}
                      onChange={(e) => setMrDynamic(e.target.value as MRDynamic)}
                    >
                      <option value="Bilinmiyor">Bilinmiyor</option>
                      <option value="Dinamiksiz">Dinamiksiz</option>
                      <option value="Dinamik var">Dinamik var</option>
                    </select>
                    <div className={help}>
                      Dinamiksiz seçilirse arteriyel/washout/HBP alanları gizlenir.
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-500">
                    MR seçili değil → MR alanları gizli
                  </div>
                )}

                <div>
                  <div className={label}>Malignite öyküsü</div>
                  <select
                    className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                    value={malignancyHx}
                    onChange={(e) => setMalignancyHx(e.target.value as YesNoUnknown)}
                  >
                    <option>Bilinmiyor</option>
                    <option>Yok</option>
                    <option>Var</option>
                  </select>
                </div>

                <div>
                  <div className={label}>Siroz / kronik KC</div>
                  <select
                    className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                    value={cirrhosis}
                    onChange={(e) => setCirrhosis(e.target.value as YesNoUnknown)}
                  >
                    <option>Bilinmiyor</option>
                    <option>Yok</option>
                    <option>Var</option>
                  </select>
                </div>

                <div>
                  <div className={label}>Ateş / enfeksiyon</div>
                  <select
                    className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                    value={feverInf}
                    onChange={(e) => setFeverInf(e.target.value as YesNoUnknown)}
                  >
                    <option>Bilinmiyor</option>
                    <option>Yok</option>
                    <option>Var</option>
                  </select>
                </div>

                <div>
                  <div className={label}>Sarılık / kolestaz</div>
                  <select
                    className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                    value={jaundiceCholestasis}
                    onChange={(e) => setJaundiceCholestasis(e.target.value as YesNoUnknown)}
                  >
                    <option>Bilinmiyor</option>
                    <option>Yok</option>
                    <option>Var</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2) Karaciğer */}
            <div className={cx(leftCard, "p-4")}>
              <div className="mb-3 flex items-center justify-between">
                <div className={sectionTitle}>2) Karaciğer (Parankim & Lezyon)</div>
                <div className="text-xs text-neutral-500">Lezyon=Var seçilince detay açılır.</div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className={label}>Karaciğerde lezyon</div>
                  <select
                    className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                    value={liverLesion}
                    onChange={(e) => setLiverLesion(e.target.value as YesNoUnknown)}
                  >
                    <option>Yok</option>
                    <option>Var</option>
                    <option>Bilinmiyor</option>
                  </select>
                </div>

                <div>
                  <div className={label}>Yağlı karaciğer</div>
                  <select
                    className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                    value={fattyLiver}
                    onChange={(e) => setFattyLiver(e.target.value as YesNoUnknown)}
                  >
                    <option>Bilinmiyor</option>
                    <option>Yok</option>
                    <option>Var</option>
                  </select>
                </div>
              </div>

              {liverLesion === "Var" ? (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <div className={label}>Lezyon sayısı</div>
                      <select
                        className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                        value={lesionCount}
                        onChange={(e) => setLesionCount(e.target.value as "Tek" | "Çoklu")}
                      >
                        <option>Tek</option>
                        <option>Çoklu</option>
                      </select>
                    </div>
                    <div>
                      <div className={label}>Segment</div>
                      <select
                        className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                        value={segment}
                        onChange={(e) => setSegment(e.target.value)}
                      >
                        {["S1", "S2", "S3", "S4a", "S4b", "S5", "S6", "S7", "S8"].map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div className={label}>En büyük boyut (mm)</div>
                      <input
                        type="number"
                        className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                        value={maxSizeMm}
                        onChange={(e) => setMaxSizeMm(Number(e.target.value))}
                        min={1}
                      />
                    </div>

                    <div>
                      <div className={label}>Sınır</div>
                      <select
                        className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                        value={margin}
                        onChange={(e) => setMargin(e.target.value as any)}
                      >
                        <option>Düzgün</option>
                        <option>Düzensiz</option>
                        <option>Bilinmiyor</option>
                      </select>
                    </div>

                    <div>
                      <div className={label}>Vasküler invazyon</div>
                      <select
                        className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                        value={vascularInvasion}
                        onChange={(e) => setVascularInvasion(e.target.value as YesNoUnknown)}
                      >
                        <option>Bilinmiyor</option>
                        <option>Yok</option>
                        <option>Var</option>
                      </select>
                    </div>
                  </div>

                  {/* CT sub */}
                  {showCT ? (
                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                      <div className="mb-2 text-sm font-semibold text-neutral-800">
                        BT (Karaciğer)
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <div className={label}>Nonkontrast densite</div>
                          <select
                            className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                            value={ctDensity}
                            onChange={(e) => setCtDensity(e.target.value as LiverDensity)}
                          >
                            <option>Hipodens</option>
                            <option>İzodens</option>
                            <option>Hiperdens</option>
                            <option>Bilinmiyor</option>
                          </select>
                        </div>

                        {showCTPattern ? (
                          <>
                            <div>
                              <div className={label}>Kontrastlanma paterni</div>
                              <select
                                className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                                value={ctEnhPattern}
                                onChange={(e) => setCtEnhPattern(e.target.value as CTEnhPattern)}
                              >
                                <option value="Belirsiz">Belirsiz</option>
                                <option value="Periferik nodüler">Periferik nodüler</option>
                                <option value="Homojen erken">Homojen erken</option>
                                <option value="Heterojen">Heterojen</option>
                                <option value="Halka tarzı (rim)">Halka tarzı (rim)</option>
                                <option value="Progressif santral">Progressif santral</option>
                                <option value="Non-enhancing">Non-enhancing</option>
                                <option value="Bilinmiyor">Bilinmiyor</option>
                              </select>
                            </div>

                            <div>
                              <div className={label}>Geç dolum (fill-in)</div>
                              <select
                                className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                                value={ctFillIn}
                                onChange={(e) => setCtFillIn(e.target.value as YesNoUnknown)}
                              >
                                <option>Bilinmiyor</option>
                                <option>Yok</option>
                                <option>Var</option>
                              </select>
                            </div>

                            <div>
                              <div className={label}>Washout</div>
                              <select
                                className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                                value={ctWashout}
                                onChange={(e) => setCtWashout(e.target.value as YesNoUnknown)}
                              >
                                <option>Bilinmiyor</option>
                                <option>Yok</option>
                                <option>Var</option>
                              </select>
                            </div>

                            <div className="md:col-span-2 text-xs text-neutral-500">
                              Kontrastlı BT seçili. Patern verisi ayırıcı tanıyı rafine eder.
                            </div>
                          </>
                        ) : (
                          <div className="md:col-span-1 rounded-xl border border-dashed border-neutral-300 bg-white p-3 text-sm text-neutral-500">
                            BT kontrastlı değil → patern alanları gizli (baz ddx yine üretilecek).
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* MR sub */}
                  {showMR ? (
                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                      <div className="mb-2 text-sm font-semibold text-neutral-800">
                        MR (Karaciğer)
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div>
                          <div className={label}>T1</div>
                          <select
                            className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                            value={mrT1}
                            onChange={(e) => setMrT1(e.target.value as MRT1)}
                          >
                            <option>Bilinmiyor</option>
                            <option>Hipo</option>
                            <option>İzo</option>
                            <option>Hiper</option>
                          </select>
                        </div>
                        <div>
                          <div className={label}>T2</div>
                          <select
                            className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                            value={mrT2}
                            onChange={(e) => setMrT2(e.target.value as MRT2)}
                          >
                            <option>Bilinmiyor</option>
                            <option>Hipo</option>
                            <option>İzo</option>
                            <option>Hiper</option>
                          </select>
                        </div>
                        <div>
                          <div className={label}>DWI</div>
                          <select
                            className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                            value={mrDwi}
                            onChange={(e) => setMrDwi(e.target.value as DWI)}
                          >
                            <option>Bilinmiyor</option>
                            <option>Restriksiyon yok</option>
                            <option>Restriksiyon var</option>
                          </select>
                        </div>

                        {showMRDynFields ? (
                          <>
                            <div>
                              <div className={label}>Arteriyel hiper</div>
                              <select
                                className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                                value={mrArterialHyper}
                                onChange={(e) => setMrArterialHyper(e.target.value as YesNoUnknown)}
                              >
                                <option>Bilinmiyor</option>
                                <option>Yok</option>
                                <option>Var</option>
                              </select>
                            </div>
                            <div>
                              <div className={label}>Washout</div>
                              <select
                                className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                                value={mrWashout}
                                onChange={(e) => setMrWashout(e.target.value as YesNoUnknown)}
                              >
                                <option>Bilinmiyor</option>
                                <option>Yok</option>
                                <option>Var</option>
                              </select>
                            </div>
                            <div>
                              <div className={label}>Kapsül</div>
                              <select
                                className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                                value={mrCapsule}
                                onChange={(e) => setMrCapsule(e.target.value as YesNoUnknown)}
                              >
                                <option>Bilinmiyor</option>
                                <option>Yok</option>
                                <option>Var</option>
                              </select>
                            </div>

                            <div className="md:col-span-3">
                              <div className={label}>HBP (hepatobiliyer faz)</div>
                              <select
                                className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                                value={mrHBP}
                                onChange={(e) => setMrHBP(e.target.value as any)}
                              >
                                <option>Bilinmiyor</option>
                                <option>Hipointens</option>
                                <option>İzointens</option>
                                <option>Hiperintens</option>
                              </select>
                              <div className={help}>Dinamik/HBP var ise ddx rafine edilir (FNH/HCC vb).</div>
                            </div>
                          </>
                        ) : (
                          <div className="md:col-span-3 rounded-xl border border-dashed border-neutral-300 bg-white p-3 text-sm text-neutral-500">
                            Dinamik/HBP yok → yine de T1/T2/DWI kombinasyonlarından “baz ddx” üretilecektir.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-500">
                  Lezyon “Var” seçilirse karaciğer detay alanları açılır.
                </div>
              )}
            </div>

            {/* 3) Safra Kesesi */}
            <div className={cx(leftCard, "p-4")}>
              <div className="mb-3 flex items-center justify-between">
                <div className={sectionTitle}>3) Safra Kesesi (Var/Yok → Detay)</div>
                <div className="text-xs text-neutral-500">Var seçilince sub-seçimler açılır.</div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className={label}>Safra kesesinde patoloji</div>
                  <select
                    className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                    value={gbPath}
                    onChange={(e) => setGbPath(e.target.value as YesNoUnknown)}
                  >
                    <option>Yok</option>
                    <option>Var</option>
                    <option>Bilinmiyor</option>
                  </select>
                </div>

                {gbPath === "Var" ? (
                  <div>
                    <div className={label}>Ön tanı / sık patoloji</div>
                    <select
                      className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                      value={gbDx}
                      onChange={(e) => setGbDx(e.target.value as any)}
                    >
                      <option>Kolesistolitiazis (taş)</option>
                      <option>Biliyer çamur</option>
                      <option>Akut kolesistit</option>
                      <option>Kronik kolesistit</option>
                      <option>Polip</option>
                      <option>Porcelain GB</option>
                      <option>Emfizematöz kolesistit</option>
                      <option>GB kitle şüphesi</option>
                    </select>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-500">
                    Patoloji=Var değil → detay gizli
                  </div>
                )}
              </div>

              {gbPath === "Var" ? (
                <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="mb-2 text-sm font-semibold text-neutral-800">Detay bulgular</div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <div className={label}>Duvar kalınlaşması</div>
                      <select
                        className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                        value={gbWall}
                        onChange={(e) => setGbWall(e.target.value as YesNoUnknown)}
                      >
                        <option>Bilinmiyor</option>
                        <option>Yok</option>
                        <option>Var</option>
                      </select>
                    </div>
                    <div>
                      <div className={label}>Perikolesistik sıvı</div>
                      <select
                        className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                        value={gbPeriFluid}
                        onChange={(e) => setGbPeriFluid(e.target.value as YesNoUnknown)}
                      >
                        <option>Bilinmiyor</option>
                        <option>Yok</option>
                        <option>Var</option>
                      </select>
                    </div>
                    <div>
                      <div className={label}>Distansiyon</div>
                      <select
                        className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                        value={gbDistension}
                        onChange={(e) => setGbDistension(e.target.value as YesNoUnknown)}
                      >
                        <option>Bilinmiyor</option>
                        <option>Yok</option>
                        <option>Var</option>
                      </select>
                    </div>

                    <div>
                      <div className={label}>Murphy (klinik)</div>
                      <select
                        className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                        value={gbMurphy}
                        onChange={(e) => setGbMurphy(e.target.value as YesNoUnknown)}
                      >
                        <option>Bilinmiyor</option>
                        <option>Yok</option>
                        <option>Var</option>
                      </select>
                    </div>
                    <div>
                      <div className={label}>Duvar/lümende gaz</div>
                      <select
                        className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                        value={gbGas}
                        onChange={(e) => setGbGas(e.target.value as any)}
                      >
                        <option value="Yok">Yok</option>
                        <option value="Var">Var</option>
                      </select>
                    </div>

                    <div>
                      <div className={label}>Polip boyutu (mm)</div>
                      <input
                        type="number"
                        className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                        value={gbPolypMm}
                        onChange={(e) => setGbPolypMm(Number(e.target.value))}
                        min={1}
                      />
                      <div className={help}>Sadece polip senaryosunda anlamlı.</div>
                    </div>

                    <div className="md:col-span-3">
                      <div className={label}>Komplikasyon</div>
                      <select
                        className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                        value={gbComplication}
                        onChange={(e) => setGbComplication(e.target.value as any)}
                      >
                        <option>Yok</option>
                        <option>Bilinmiyor</option>
                        <option>Perforasyon şüphesi</option>
                        <option>Gangren/nekroz şüphesi</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* 4) Safra Yolları */}
            <div className={cx(leftCard, "p-4")}>
              <div className="mb-3 flex items-center justify-between">
                <div className={sectionTitle}>4) Safra Yolları (Var/Yok → Detay)</div>
                <div className="text-xs text-neutral-500">Var seçilince sub-seçimler açılır.</div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className={label}>Safra yollarında patoloji</div>
                  <select
                    className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                    value={bdPath}
                    onChange={(e) => setBdPath(e.target.value as YesNoUnknown)}
                  >
                    <option>Yok</option>
                    <option>Var</option>
                    <option>Bilinmiyor</option>
                  </select>
                </div>

                {bdPath === "Var" ? (
                  <div>
                    <div className={label}>Olası neden</div>
                    <select
                      className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                      value={bdCause}
                      onChange={(e) => setBdCause(e.target.value as any)}
                    >
                      <option>Belirsiz</option>
                      <option>Koledok taşı</option>
                      <option>Benign striktür</option>
                      <option>Malign obstrüksiyon</option>
                      <option>PSC paterni</option>
                      <option>Kolangit şüphesi</option>
                      <option>Pankreatit ile ilişkili</option>
                      <option>Stent/operasyon sonrası</option>
                    </select>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-500">
                    Patoloji=Var değil → detay gizli
                  </div>
                )}
              </div>

              {bdPath === "Var" ? (
                <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="mb-2 text-sm font-semibold text-neutral-800">Detay bulgular</div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <div className={label}>Dilatatasyon</div>
                      <select
                        className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                        value={bdDilatation}
                        onChange={(e) => setBdDilatation(e.target.value as YesNoUnknown)}
                      >
                        <option>Bilinmiyor</option>
                        <option>Yok</option>
                        <option>Var</option>
                      </select>
                    </div>
                    <div>
                      <div className={label}>Seviye</div>
                      <select
                        className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                        value={bdLevel}
                        onChange={(e) => setBdLevel(e.target.value as any)}
                      >
                        <option>Bilinmiyor</option>
                        <option>İntrahepatik</option>
                        <option>Ekstrahepatik</option>
                        <option>Her ikisi</option>
                      </select>
                    </div>
                    <div>
                      <div className={label}>Kolangit şüphesi</div>
                      <select
                        className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                        value={bdCholangitis}
                        onChange={(e) => setBdCholangitis(e.target.value as YesNoUnknown)}
                      >
                        <option>Bilinmiyor</option>
                        <option>Yok</option>
                        <option>Var</option>
                      </select>
                    </div>

                    <div>
                      <div className={label}>Kitle şüphesi</div>
                      <select
                        className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                        value={bdMassSusp}
                        onChange={(e) => setBdMassSusp(e.target.value as YesNoUnknown)}
                      >
                        <option>Bilinmiyor</option>
                        <option>Yok</option>
                        <option>Var</option>
                      </select>
                    </div>

                    <div className="md:col-span-2 rounded-xl border border-dashed border-neutral-300 bg-white p-3 text-xs text-neutral-500">
                      İpucu: Patoloji=Var + kolestaz/dilatasyon varsa önerilerde MRCP/ERCP otomatik güçlenir.
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Ek bulgular */}
            <div className={cx(leftCard, "p-4")}>
              <div className="mb-2 flex items-center justify-between">
                <div className={sectionTitle}>
                  Ek Bulgular / İnsidental / Kesit alanına giren diğer bulgular
                </div>
                <div className="text-xs text-neutral-500">Yazdığın metin rapora ve final cümleye entegre olur.</div>
              </div>
              <textarea
                className="mt-1 w-full rounded-2xl border border-neutral-300 bg-white px-3 py-3 text-sm"
                rows={4}
                value={incidentalText}
                onChange={(e) => setIncidentalText(e.target.value)}
                placeholder="Örn: Sağ böbrekte 12 mm basit kist. Sol adrenal 8 mm yağ içerikli adenom ile uyumlu..."
              />
              <div className={help}>Buraya yazılan metin “Ek bulgular/insidental” olarak ayrı cümlede eklenir.</div>
            </div>
          </div>

          {/* RIGHT: Sticky AI Panel */}
          <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:overflow-auto">
            <div className={cx(panelCard, "space-y-3")}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-lg font-bold text-neutral-900">AI Çıktı</div>
                  <div className="text-xs text-neutral-500">(Canlı) Kural tabanlı</div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => copyText(output.reportText)}
                    className="rounded-xl bg-neutral-900 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
                  >
                    Raporu Kopyala
                  </button>
                  <button
                    onClick={() => copyText(output.fullText)}
                    className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-900 hover:bg-neutral-100"
                  >
                    Tam Çıktıyı Kopyala
                  </button>
                </div>
              </div>

              {/* Bulgular */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-3">
                <div className={subTitle}>Bulgular (Rapor Dili)</div>
                <div className="mt-2 text-sm text-neutral-800">
                  {output.reportLines.length ? (
                    <ul className="list-disc space-y-1 pl-5">
                      {output.reportLines.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-neutral-500">
                      Patoloji lehine seçili bulgu yok → rapor satırı oluşturulmadı.
                    </div>
                  )}
                </div>
              </div>

              {/* Ayırıcı tanı */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-3">
                <div className={subTitle}>Ayırıcı Tanı (Organ bazlı)</div>

                <div className="mt-2 space-y-3 text-sm">
                  {output.organDdxBlocks.filter((b) => b.show).length === 0 ? (
                    <div className="text-neutral-500">Ayırıcı tanı üretilmedi.</div>
                  ) : (
                    output.organDdxBlocks
                      .filter((b) => b.show)
                      .map((b) => (
                        <div key={b.title} className="rounded-xl border border-neutral-100 bg-neutral-50 p-2">
                          <div className="font-semibold text-neutral-900">{b.title}</div>
                          {b.high.length ? (
                            <div className="mt-1">
                              <div className="text-xs font-semibold text-neutral-700">Yüksek olasılık</div>
                              <ul className="list-disc space-y-0.5 pl-5">
                                {b.high.map((x, i) => (
                                  <li key={i}>{x}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {b.mid.length ? (
                            <div className="mt-1">
                              <div className="text-xs font-semibold text-neutral-700">Orta olasılık</div>
                              <ul className="list-disc space-y-0.5 pl-5">
                                {b.mid.map((x, i) => (
                                  <li key={i}>{x}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Öneriler */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-3">
                <div className={subTitle}>Öneriler</div>
                <div className="mt-2 text-sm text-neutral-800">
                  {output.recs.length ? (
                    <ul className="list-disc space-y-1 pl-5">
                      {output.recs.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-neutral-500">(Öneri yok)</div>
                  )}
                </div>
              </div>

              {/* Acil/Uyarı */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-3">
                <div className={subTitle}>Acil / Uyarı</div>
                <div className="mt-2 text-sm text-neutral-800">
                  {output.warnings.length ? (
                    <ul className="list-disc space-y-1 pl-5">
                      {output.warnings.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-neutral-500">(Acil/uyarı yok)</div>
                  )}
                </div>
              </div>

              {/* İleri inceleme + sekans */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-3">
                <div className={subTitle}>İleri İnceleme (Tetkik + Sekans)</div>
                <div className="mt-2 text-sm text-neutral-800">
                  {output.adv.length ? (
                    <ul className="list-disc space-y-1 pl-5">
                      {output.adv.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-neutral-500">(İleri inceleme önerisi yok)</div>
                  )}
                </div>
              </div>

              {/* Final rapor */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className={subTitle}>Final Rapor (Tek cümle)</div>
                  <div className="flex items-center gap-2">
                    <select
                      className="rounded-xl border border-neutral-300 bg-white px-2 py-1 text-xs"
                      value={finalFormat}
                      onChange={(e) => setFinalFormat(e.target.value as FinalFormat)}
                    >
                      <option>Olasılık dili</option>
                      <option>Öneri dili</option>
                    </select>
                    <button
                      onClick={() => copyText(output.finalSentence || "")}
                      className="rounded-xl bg-neutral-900 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
                    >
                      Kopyala
                    </button>
                  </div>
                </div>

                <div className="mt-2 rounded-xl border border-neutral-200 bg-neutral-50 p-2 text-sm text-neutral-800">
                  {output.finalSentence ? output.finalSentence : "(Final cümle oluşmadı)"}
                </div>

                <div className="mt-2 text-xs text-neutral-500">
                  Not: Bu modül klinik karar desteği amaçlıdır; klinik/laboratuvar ve önceki tetkiklerle korelasyon esastır.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer hint */}
        <div className="mt-6 text-xs text-neutral-500">
          İpucu: “BT kontrast durumu = Kontrastsız/Bilinmiyor” olsa bile karaciğer lezyonu için baz ayırıcı tanı üretilir.
          MR dinamik olmasa bile T1/T2/DWI kombinasyonları baz ddx oluşturur.
        </div>
      </div>
    </div>
  );
}
