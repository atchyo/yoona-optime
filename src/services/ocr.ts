export interface OcrProgress {
  status: string;
  progress: number;
}

export interface OcrResult {
  text: string;
  confidence: number;
}

export async function recognizeMedicationLabel(
  image: File | string,
  onProgress: (progress: OcrProgress) => void,
): Promise<OcrResult> {
  const { recognize } = await import("tesseract.js");
  const result = await recognize(image, "kor+eng", {
    logger: (message) => {
      const progress =
        typeof message.progress === "number" ? Math.round(message.progress * 100) : 0;
      onProgress({ status: message.status, progress });
    },
  });

  return {
    text: result.data.text.trim(),
    confidence: Math.round(result.data.confidence),
  };
}

export function extractDrugNameCandidates(rawText: string): string[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/[^\p{L}\p{N}\s.+/-]/gu, " ").replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 2);

  const medicineLike = lines.filter((line) =>
    /(정|캡슐|시럽|액|연질|mg|밀리그람|tablet|capsule|acetaminophen|tylenol|omega)/i.test(
      line,
    ),
  );

  return Array.from(new Set([...medicineLike, ...lines].slice(0, 8)));
}
