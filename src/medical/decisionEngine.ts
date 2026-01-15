type Input = {
  imagingFindings?: string[];
};

export function evaluatePathology(pathology: any, input: Input) {
  const matched: string[] = [];

  const usgKey = pathology?.imaging?.USG?.key_findings ?? [];
  for (const f of usgKey) {
    if (input.imagingFindings?.includes(f)) matched.push(f);
  }

  const likelihood =
    matched.length >= 3 ? "Yüksek" :
    matched.length === 2 ? "Orta" :
    "Düşük";

  return {
    title: pathology.title,
    likelihood,
    matchedFindings: matched,
    recommendations: pathology.recommendations,
    reportTemplates: pathology.report_templates
  };
}
