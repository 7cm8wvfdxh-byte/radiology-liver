import { Pathology, PathologySchema, SPECIALTIES, SpecialtyId } from "./pathologySchema";

function asString(x: any, fallback = ""): string {
  if (typeof x === "string") return x;
  if (x == null) return fallback;
  return String(x);
}

function asStringArray(x: any): string[] {
  if (Array.isArray(x)) return x.filter(Boolean).map((v) => asString(v)).filter(Boolean);
  if (typeof x === "string") return x ? [x] : [];
  return [];
}

function uniq(arr: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of arr) {
    const t = (s || "").trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/** Card items: string[] veya {text,w}[] normalize edip tek tipe çeviriyoruz */
type NormItem = { text: string; w: number };
function normalizeItems(items: any): NormItem[] {
  if (!Array.isArray(items)) {
    if (typeof items === "string") return [{ text: items, w: 1 }];
    return [];
  }
  const out: NormItem[] = [];
  for (const it of items) {
    if (typeof it === "string") {
      const t = it.trim();
      if (t) out.push({ text: t, w: 1 });
    } else if (it && typeof it === "object") {
      const t = asString(it.text, "").trim();
      const w = Number(it.w ?? 1);
      if (t) out.push({ text: t, w: Number.isFinite(w) ? Math.min(5, Math.max(1, w)) : 1 });
    }
  }
  return out;
}

function normalizeCard(x: any, title: string) {
  if (Array.isArray(x)) return { title, items: normalizeItems(x) };
  if (typeof x === "string") return { title, items: normalizeItems([x]) };
  const t = asString(x?.title, title);
  const items = normalizeItems(x?.items ?? x);
  return { title: t, items };
}

function normalizeHowToDistinguish(x: any) {
  const title = asString(x?.title, "Nasıl ayırt ederiz?");
  const itemsRaw = Array.isArray(x?.items) ? x.items : [];
  const items = itemsRaw.map((it: any) => ({
    title: asString(it?.title, "Fark"),
    bullets: asStringArray(it?.bullets),
  }));
  return { title, items };
}

function normalizeSpecialties(raw: any): { specialty: SpecialtyId; summary: string; keywords: string[] }[] {
  const incoming: Record<string, { summary: string; keywords: string[] }> = {};
  if (Array.isArray(raw)) {
    for (const s of raw) {
      const sp = asString(s?.specialty, "").trim();
      if (!sp) continue;
      incoming[sp] = {
        summary: asString(s?.summary, ""),
        keywords: uniq(asStringArray(s?.keywords)),
      };
    }
  }
  return SPECIALTIES.map((sp) => {
    const existing = incoming[sp.id] || { summary: "", keywords: [] };
    const mergedKeywords = uniq([...(existing.keywords || []), ...(sp.keyword_hints || [])]);
    return { specialty: sp.id, summary: existing.summary || "", keywords: mergedKeywords };
  });
}

function normalizeSources(raw: any) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => ({
      label: asString(s?.label, ""),
      detail: asString(s?.detail, ""),
      url: typeof s?.url === "string" ? s.url : undefined,
    }))
    .filter((s) => !!s.label);
}

function normalizeImagingBlock(raw: any) {
  return {
    when_to_image: normalizeCard(raw?.when_to_image, "When to image / Endikasyon"),
    main_findings: normalizeCard(raw?.main_findings, "Ana bulgular"),
    supportive_findings: normalizeCard(raw?.supportive_findings, "Destekleyici bulgular"),
    complications: normalizeCard(raw?.complications, "Komplikasyonlar"),
    pitfalls: normalizeCard(raw?.pitfalls, "Pitfalls / tuzaklar"),
    ddx: normalizeCard(raw?.ddx, "DDx (Ayırıcı tanı)"),
    how_to_distinguish: normalizeHowToDistinguish(raw?.how_to_distinguish),
  };
}

export function normalizePathologyJson(raw: any): Pathology {
  const json = raw ?? {};
  const modalities = uniq(asStringArray(json.modalities)).length ? uniq(asStringArray(json.modalities)) : ["USG", "CT", "MR"];

  const legacyImaging = {
    when_to_image: normalizeCard(json.imaging?.when_to_image ?? json.when_to_image, "When to image / Endikasyon"),
    main_findings: normalizeCard(json.imaging?.main_findings ?? json.main_findings, "Ana bulgular"),
    supportive_findings: normalizeCard(json.imaging?.supportive_findings ?? json.supportive_findings, "Destekleyici bulgular"),
    complications: normalizeCard(json.imaging?.complications ?? json.complications, "Komplikasyonlar"),
    pitfalls: normalizeCard(json.imaging?.pitfalls ?? json.pitfalls, "Pitfalls / tuzaklar"),
    ddx: normalizeCard(json.imaging?.ddx ?? json.ddx, "DDx (Ayırıcı tanı)"),
    how_to_distinguish: normalizeHowToDistinguish(json.imaging?.how_to_distinguish ?? json.how_to_distinguish),
  };

  const byModalityRaw = json.imaging?.by_modality;
  const by_modality: Record<string, any> = {};

  if (byModalityRaw && typeof byModalityRaw === "object") {
    for (const m of modalities) {
      const block = (byModalityRaw[m] || byModalityRaw[m.toLowerCase()]) || null;
      by_modality[m] = normalizeImagingBlock(block || legacyImaging);
    }
  } else {
    for (const m of modalities) {
      by_modality[m] = normalizeImagingBlock(legacyImaging);
    }
  }

  const normalized = {
    id: asString(json.id, asString(json.slug, "")),
    title: asString(json.title, "Untitled"),
    aliases: asStringArray(json.aliases),
    tags: asStringArray(json.tags),

    modalities,
    branches: uniq(asStringArray(json.branches)),
    summary: asString(json.summary, ""),

    core: {
      definition: normalizeCard(json.core?.definition ?? json.definition, "Tanım"),
      etiology: normalizeCard(json.core?.etiology ?? json.etiology, "Etiyoloji"),
      risk_factors: normalizeCard(json.core?.risk_factors ?? json.risk_factors, "Risk faktörleri"),
      pathophysiology_short: asString(json.core?.pathophysiology_short ?? json.pathophysiology_short, ""),
    },

    clinical: {
      symptoms: normalizeCard(json.clinical?.symptoms ?? json.symptoms, "Semptomlar"),
      exam: normalizeCard(json.clinical?.exam ?? json.exam, "Fizik muayene"),
      red_flags: normalizeCard(json.clinical?.red_flags ?? json.red_flags, "Acil kırmızı bayraklar"),
      scores: normalizeCard(json.clinical?.scores ?? json.scores, "Skor / sınıflama"),
    },

    labs: {
      key_labs: normalizeCard(json.labs?.key_labs ?? json.key_labs, "Laboratuvar (key labs)"),
      notes: normalizeCard(json.labs?.notes ?? json.lab_notes ?? json.notes, "Laboratuvar notları"),
    },

    imaging: {
      by_modality,
      ...legacyImaging,
    },

    management: {
      first_line: normalizeCard(json.management?.first_line ?? json.first_line, "İlk yaklaşım (first line)"),
      when_to_escalate: normalizeCard(json.management?.when_to_escalate ?? json.when_to_escalate, "Ne zaman escalate?"),
      complication_management: normalizeCard(json.management?.complication_management ?? json.complication_management, "Komplikasyon yönetimi"),
      follow_up: normalizeCard(json.management?.follow_up ?? json.follow_up, "Takip / kontrol"),
    },

    specialties: normalizeSpecialties(json.specialties),
    sources: normalizeSources(json.sources),

    defaults: {
      modality: typeof json.defaults?.modality === "string" ? json.defaults.modality : undefined,
      specialty: typeof json.defaults?.specialty === "string" ? json.defaults.specialty : undefined,
    },
  };

  const parsed = PathologySchema.safeParse(normalized);
  if (!parsed.success) return normalized as Pathology;
  return parsed.data;
}
