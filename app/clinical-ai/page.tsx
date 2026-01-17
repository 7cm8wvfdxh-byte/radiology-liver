import ClinicalAIClient from "./ClinicalAIClient";
import { loadAllPathologies, getPathologyById } from "@/medical/loadPathologies";

type SearchParams = Record<string, string | string[] | undefined>;

// Next.js 15/16: searchParams bazı projelerde Promise gelebiliyor → async + await ile güvenli
export default async function Page(props: { searchParams: Promise<SearchParams> | SearchParams }) {
  const sp = (props.searchParams instanceof Promise) ? await props.searchParams : props.searchParams;

  const idParam = sp?.id;
  const id = Array.isArray(idParam) ? idParam[0] : (idParam || "");

  const all = loadAllPathologies();
  const allIds = all.map((p) => p.id);

  const selectedId = id && allIds.includes(id) ? id : (allIds[0] || "acute-appendicitis");

  const pathology = getPathologyById(selectedId);

  return (
    <ClinicalAIClient
      allIds={allIds}
      selectedId={selectedId}
      pathology={pathology}
    />
  );
}
