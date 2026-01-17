import { z } from "zod";

/** Item artık string veya ağırlıklı obje olabilir */
export const ItemSchema = z.union([
  z.string().min(1),
  z.object({
    text: z.string().min(1),
    w: z.number().min(1).max(5).default(1), // weight
  }),
]);

export const CardSchema = z.object({
  title: z.string().min(1),
  items: z.array(ItemSchema).default([]),
});

export const HowToDistinguishSchema = z.object({
  title: z.string().default("Nasıl ayırt ederiz?"),
  items: z
    .array(
      z.object({
        title: z.string().min(1),
        bullets: z.array(z.string().min(1)).default([]),
      })
    )
    .default([]),
});

export const SourceSchema = z.object({
  label: z.string().min(1),
  detail: z.string().default(""),
  url: z.string().url().optional(),
});

export const SPECIALTIES = [
  { id: "emergency", label: "Acil Tıp", keyword_hints: ["triage", "sepsis", "shock", "acute abdomen"] },
  { id: "family_medicine", label: "Aile Hekimliği", keyword_hints: ["primary care", "follow-up", "screening"] },
  { id: "internal_medicine", label: "İç Hastalıkları", keyword_hints: ["differential", "comorbidity", "workup"] },

  { id: "general_surgery", label: "Genel Cerrahi", keyword_hints: ["appendectomy", "laparoscopy", "perforation"] },
  { id: "urology", label: "Üroloji", keyword_hints: ["renal colic", "hydronephrosis", "hematuria"] },
  { id: "obgyn", label: "Kadın Doğum", keyword_hints: ["pregnancy", "PID", "ovarian torsion"] },

  { id: "cardiology", label: "Kardiyoloji", keyword_hints: ["ACS", "troponin", "ECG", "heart failure"] },
  { id: "pulmonology", label: "Göğüs Hastalıkları", keyword_hints: ["PE", "D-dimer", "hypoxemia"] },
  { id: "gastroenterology", label: "Gastroenteroloji", keyword_hints: ["GI bleed", "IBD", "hepatitis"] },
  { id: "infectious_disease", label: "Enfeksiyon", keyword_hints: ["bacteremia", "antibiotic", "culture"] },
  { id: "neurology", label: "Nöroloji", keyword_hints: ["stroke", "NIHSS", "seizure"] },
  { id: "dermatology", label: "Dermatoloji", keyword_hints: ["rash", "urticaria", "vasculitis"] },

  { id: "radiology", label: "Radyoloji", keyword_hints: ["CT", "USG", "MRI", "finding", "ddx"] },
  { id: "pathology", label: "Patoloji", keyword_hints: ["histology", "biopsy", "grading"] },
  { id: "microbiology", label: "Mikrobiyoloji", keyword_hints: ["Gram", "culture", "PCR", "susceptibility"] },
  { id: "biochemistry", label: "Biyokimya", keyword_hints: ["CRP", "procalcitonin", "LFT", "amylase"] },
  { id: "pharmacology", label: "Farmakoloji", keyword_hints: ["dose", "interaction", "contraindication", "PK/PD"] },
] as const;

export type SpecialtyId = (typeof SPECIALTIES)[number]["id"];
export const SpecialtyIdSchema = z.enum(SPECIALTIES.map((s) => s.id) as [SpecialtyId, ...SpecialtyId[]]);

export const SpecialtyNoteSchema = z.object({
  specialty: SpecialtyIdSchema,
  summary: z.string().default(""),
  keywords: z.array(z.string()).default([]),
});

export const ImagingBlockSchema = z.object({
  when_to_image: CardSchema.default({ title: "When to image / Endikasyon", items: [] }),
  main_findings: CardSchema.default({ title: "Ana bulgular", items: [] }),
  supportive_findings: CardSchema.default({ title: "Destekleyici bulgular", items: [] }),
  complications: CardSchema.default({ title: "Komplikasyonlar", items: [] }),
  pitfalls: CardSchema.default({ title: "Pitfalls / tuzaklar", items: [] }),
  ddx: CardSchema.default({ title: "DDx (Ayırıcı tanı)", items: [] }),
  how_to_distinguish: HowToDistinguishSchema.default({ title: "Nasıl ayırt ederiz?", items: [] }),
});

export const PathologySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),

  modalities: z.array(z.string()).default([]),
  branches: z.array(z.string()).default([]),

  summary: z.string().default(""),

  core: z.object({
    definition: CardSchema.default({ title: "Tanım", items: [] }),
    etiology: CardSchema.default({ title: "Etiyoloji", items: [] }),
    risk_factors: CardSchema.default({ title: "Risk faktörleri", items: [] }),
    pathophysiology_short: z.string().default(""),
  }).default({} as any),

  clinical: z.object({
    symptoms: CardSchema.default({ title: "Semptomlar", items: [] }),
    exam: CardSchema.default({ title: "Fizik muayene", items: [] }),
    red_flags: CardSchema.default({ title: "Acil kırmızı bayraklar", items: [] }),
    scores: CardSchema.default({ title: "Skor / sınıflama", items: [] }),
  }).default({} as any),

  labs: z.object({
    key_labs: CardSchema.default({ title: "Laboratuvar (key labs)", items: [] }),
    notes: CardSchema.default({ title: "Laboratuvar notları", items: [] }),
  }).default({} as any),

  imaging: z.object({
    by_modality: z.record(z.string(), ImagingBlockSchema).default({}),

    // legacy fallback
    when_to_image: CardSchema.default({ title: "When to image / Endikasyon", items: [] }),
    main_findings: CardSchema.default({ title: "Ana bulgular", items: [] }),
    supportive_findings: CardSchema.default({ title: "Destekleyici bulgular", items: [] }),
    complications: CardSchema.default({ title: "Komplikasyonlar", items: [] }),
    pitfalls: CardSchema.default({ title: "Pitfalls / tuzaklar", items: [] }),
    ddx: CardSchema.default({ title: "DDx (Ayırıcı tanı)", items: [] }),
    how_to_distinguish: HowToDistinguishSchema.default({ title: "Nasıl ayırt ederiz?", items: [] }),
  }).default({} as any),

  management: z.object({
    first_line: CardSchema.default({ title: "İlk yaklaşım (first line)", items: [] }),
    when_to_escalate: CardSchema.default({ title: "Ne zaman escalate?", items: [] }),
    complication_management: CardSchema.default({ title: "Komplikasyon yönetimi", items: [] }),
    follow_up: CardSchema.default({ title: "Takip / kontrol", items: [] }),
  }).default({} as any),

  specialties: z.array(SpecialtyNoteSchema).default([]),
  sources: z.array(SourceSchema).default([]),

  defaults: z.object({
    modality: z.string().optional(),
    specialty: z.string().optional(),
  }).default({}),
});

export type Pathology = z.infer<typeof PathologySchema>;
