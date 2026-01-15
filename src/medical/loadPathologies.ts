import acuteCholecystitis from "./pathologies/acute-cholecystitis.json";

export const PATHOLOGIES = [
  acuteCholecystitis
];

export function getPathologyById(id: string) {
  return PATHOLOGIES.find((p: any) => p.id === id);
}
