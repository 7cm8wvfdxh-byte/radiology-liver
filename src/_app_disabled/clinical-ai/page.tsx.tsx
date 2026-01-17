import { getPathologyById } from "@/medical/loadPathologies";
import { evaluatePathology } from "@/medical/decisionEngine";

export default function ClinicalAIPage() {
  const pathology = getPathologyById("acute_cholecystitis");

  if (!pathology) return <div>Patoloji bulunamadı</div>;

  const result = evaluatePathology(pathology, {
    imagingFindings: [
      "Taş/sludge",
      "Duvar kalınlığı >= 3 mm",
      "Perikolesistik sıvı"
    ]
  });

  return (
    <div style={{ padding: 20 }}>
      <h1>Clinical AI Demo</h1>

      <p><b>Tanı:</b> {result.title}</p>
      <p><b>Olasılık:</b> {result.likelihood}</p>

      <p><b>Eşleşen Bulgular:</b></p>
      <ul>
        {result.matchedFindings.map((f: string, i: number) => (
          <li key={i}>{f}</li>
        ))}
      </ul>

      <p><b>USG Rapor Cümlesi:</b></p>
      <pre>{result.reportTemplates?.USG}</pre>
    </div>
  );
}
