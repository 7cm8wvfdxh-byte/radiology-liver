// scripts/normalize-pathologies.mjs
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const PATHOLOGY_DIR = path.join(ROOT, "medical", "pathologies");

/**
 * v1 DSL – ZORUNLU İSKELET
 */
const BASE_SCHEMA = {
  meta: {
    id: "",
    title: "",
    version: "v1",
    last_updated: new Date().toISOString().slice(0, 10),
  },

  summary: "",

  core: {
    definition: "",
    etiology: [],
    risk_factors: [],
    pathophysiology_short: "",
  },

  clinical: {
    symptoms: [],
    physical_exam: [],
    red_flags: [],
  },

  labs: {
    key_labs: [],
    notes: "",
  },

  imaging: {
    modalities: {
      USG: {
        when_to_image: "",
        main_findings: [],
        supportive_findings: [],
        complications: [],
        ddx: [],
        pitfalls: [],
        differentiate_from: [],
      },
      CT: {
        when_to_image: "",
        main_findings: [],
        supportive_findings: [],
        complications: [],
        ddx: [],
        pitfalls: [],
        differentiate_from: [],
      },
      MR: {
        when_to_image: "",
        main_findings: [],
        supportive_findings: [],
        complications: [],
        ddx: [],
        pitfalls: [],
        differentiate_from: [],
      },
    },
  },

  management: {
    first_line: "",
    when_to_escalate: "",
    complication_management: "",
    follow_up: "",
  },

  branches: {
    emergency: {},
    surgery: {},
    gastroenterology: {},
    radiology: {},
    infectious_disease: {},
    microbiology: {},
    biochemistry: {},
    pharmacology: {},
    urology: {},
    internal_medicine: {},
  },

  references: [],
};

/**
 * Deep merge (json bozmadan doldur)
 */
function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      if (target[key] === undefined) {
        target[key] = source[key];
      }
    }
  }
  return target;
}

function normalizeFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const json = JSON.parse(raw);

  const normalized = deepMerge(json, structuredClone(BASE_SCHEMA));

  // meta.id otomatik doldur
  if (!normalized.meta.id) {
    normalized.meta.id = path.basename(filePath).replace(".json", "");
  }

  // meta.title yoksa id’den üret
  if (!normalized.meta.title) {
    normalized.meta.title = normalized.meta.id
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  fs.writeFileSync(filePath, JSON.stringify(normalized, null, 2), "utf-8");
  console.log(`✓ Normalized: ${path.basename(filePath)}`);
}

/**
 * MAIN
 */
const files = fs
  .readdirSync(PATHOLOGY_DIR)
  .filter((f) => f.endsWith(".json"));

if (files.length === 0) {
  console.log("No pathology files found.");
  process.exit(0);
}

files.forEach((file) =>
  normalizeFile(path.join(PATHOLOGY_DIR, file))
);

console.log("All pathologies normalized (v1).");
