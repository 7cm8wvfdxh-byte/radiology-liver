import fs from "fs";
import path from "path";
import { normalizePathologyJson } from "./normalize";
import { Pathology } from "./pathologySchema";

const PATHOLOGY_DIR = path.join(process.cwd(), "medical", "pathologies");

export function listPathologyIds(): string[] {
  if (!fs.existsSync(PATHOLOGY_DIR)) return [];
  const files = fs.readdirSync(PATHOLOGY_DIR).filter((f) => f.endsWith(".json"));
  return files.map((f) => f.replace(/\.json$/i, "")).sort();
}

export function getPathologyById(id: string): Pathology | null {
  try {
    const file = path.join(PATHOLOGY_DIR, `${id}.json`);
    if (!fs.existsSync(file)) return null;
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    return normalizePathologyJson(raw);
  } catch {
    return null;
  }
}

export function loadAllPathologies(): Pathology[] {
  return listPathologyIds()
    .map((id) => getPathologyById(id))
    .filter(Boolean) as Pathology[];
}
