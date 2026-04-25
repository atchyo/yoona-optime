export interface DrugMatch {
  id: string;
  source: string;
  productName: string;
  manufacturer?: string;
  ingredients: Array<{ name: string; amount?: string }>;
  dosageForm?: string;
  efficacy?: string;
  usage?: string;
  warnings: string[];
  interactions: string[];
  confidence: number;
}

export interface DrugCatalogRow {
  source: string;
  source_record_id: string;
  category: "drug" | "supplement";
  product_name: string;
  normalized_product_name: string;
  manufacturer: string | null;
  normalized_manufacturer: string;
  ingredients: Array<{ name: string; amount?: string }>;
  dosage_form: string | null;
  efficacy: string | null;
  usage: string | null;
  warnings: string[];
  interactions: string[];
  search_text: string;
  search_compact: string;
  source_payload: Record<string, unknown>;
  last_synced_at?: string;
}

export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s\-_/()[\].,]/g, "")
    .replace(/vitamind3|비타민디3/g, "비타민d3")
    .replace(/vitamind|비타민디/g, "비타민d")
    .replace(/omega3|오메가쓰리/g, "오메가3");
}

export function compactTextList(values: Array<string | undefined | null>): string[] {
  return values
    .flatMap((value) => String(value || "").split(/\n+/))
    .map((value) => value.trim())
    .filter(Boolean);
}

export function parseIngredients(value: string): Array<{ name: string; amount?: string }> {
  return value
    .split(/[,\n;]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => ({ name: part }));
}

export function parseFunctionalClaims(value: string): Array<{ name: string; amount?: string }> {
  const cleaned = value
    .replace(/<[^>]+>/g, " ")
    .replace(/[\r\n]+/g, " ")
    .trim();

  if (!cleaned) return [];

  return cleaned
    .split(/[,.·]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1)
    .slice(0, 6)
    .map((part) => ({ name: part }));
}

export function normalizeItems(items: unknown): Array<Record<string, string>> {
  if (!items) return [];
  if (Array.isArray(items)) {
    return items.flatMap((item) => normalizeItemEntry(item));
  }
  if (Array.isArray((items as { item?: unknown[] }).item)) {
    return (items as { item: unknown[] }).item.flatMap((item) => normalizeItemEntry(item));
  }
  if ((items as { item?: unknown }).item) {
    return normalizeItemEntry((items as { item: unknown }).item);
  }
  return [items as Record<string, string>];
}

function normalizeItemEntry(item: unknown): Array<Record<string, string>> {
  if (!item) return [];
  if (Array.isArray(item)) return item.flatMap((entry) => normalizeItemEntry(entry));
  if (typeof item === "object" && (item as { item?: unknown }).item) {
    return normalizeItems((item as { item: unknown }).item);
  }
  if (typeof item === "object") return [item as Record<string, string>];
  return [];
}

export function extractItems(payload: unknown): unknown {
  const body =
    (payload as { response?: { body?: { items?: unknown } } })?.response?.body ||
    (payload as { body?: { items?: unknown } })?.body;

  return body?.items;
}

export function extractTotalCount(payload: unknown): number {
  const rawValue =
    (payload as { response?: { body?: { totalCount?: string | number } } })?.response?.body
      ?.totalCount ||
    (payload as { body?: { totalCount?: string | number } })?.body?.totalCount ||
    0;

  return Number(rawValue || 0);
}

export async function fetchDataGoKrJson(
  baseUrl: string,
  serviceKeyName: string,
  serviceKey: string,
  params: Record<string, string>,
): Promise<unknown> {
  const keyCandidates = Array.from(new Set([serviceKey, safeDecode(serviceKey)]).values()).filter(Boolean);

  for (const key of keyCandidates) {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([name, value]) => {
      url.searchParams.set(name, value);
    });
    url.searchParams.set(serviceKeyName, key);

    const response = await fetch(url);
    if (!response.ok) continue;

    const payload = await response.json();
    const resultCode = String(
      (payload as { response?: { header?: { resultCode?: string } } })?.response?.header?.resultCode ||
        (payload as { header?: { resultCode?: string } })?.header?.resultCode ||
        "",
    );

    if (resultCode && resultCode !== "00") continue;
    return payload;
  }

  return {};
}

export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function buildSearchText(args: {
  productName: string;
  manufacturer?: string | null;
  ingredients?: Array<{ name: string; amount?: string }>;
  efficacy?: string | null;
  usage?: string | null;
  warnings?: string[];
  interactions?: string[];
}): string {
  return [
    args.productName,
    args.manufacturer || "",
    ...(args.ingredients || []).map((item) => [item.name, item.amount].filter(Boolean).join(" ")),
    args.efficacy || "",
    args.usage || "",
    ...(args.warnings || []),
    ...(args.interactions || []),
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchPriority(query: string, productName: string): number {
  const normalizedQuery = normalizeName(query);
  const normalizedProductName = normalizeName(productName);

  if (!normalizedQuery || !normalizedProductName) return 0;
  if (normalizedProductName === normalizedQuery) return 5;
  if (normalizedProductName.startsWith(normalizedQuery)) return 4;
  if (normalizedProductName.includes(normalizedQuery)) return 3;
  if (normalizedQuery.split(/\s+/).every((token) => normalizedProductName.includes(token))) return 2;
  return 1;
}

export function compareMatches(query: string, left: DrugMatch, right: DrugMatch): number {
  const scoreGap = matchPriority(query, right.productName) - matchPriority(query, left.productName);
  if (scoreGap !== 0) return scoreGap;
  return right.confidence - left.confidence;
}

export function looksLikeSupplementQuery(query: string): boolean {
  return /(비타민|오메가|마그네슘|유산균|프로바이오틱|루테인|아연|칼슘|철분|밀크씨슬|홍삼|크릴|비오틴|콜라겐|코큐텐|코엔자임|글루코사민|msm|vitamin|omega|probiotic|magnesium|lutein|zinc|calcium|iron|collagen)/i.test(
    query,
  );
}

export function dedupeMatches(matches: DrugMatch[]): DrugMatch[] {
  const result = new Map<string, DrugMatch>();

  matches.forEach((match) => {
    const key = normalizeName(match.productName);
    if (!key) return;

    const current = result.get(key);
    if (!current) {
      result.set(key, match);
      return;
    }

    result.set(key, mergeDuplicateMatch(current, match));
  });

  return Array.from(result.values());
}

function mergeDuplicateMatch(current: DrugMatch, incoming: DrugMatch): DrugMatch {
  const preferred = incoming.confidence > current.confidence ? incoming : current;
  const fallback = preferred === incoming ? current : incoming;

  return {
    ...preferred,
    ingredients: mergeIngredients(current.ingredients, incoming.ingredients),
    warnings: mergeStrings(current.warnings, incoming.warnings),
    interactions: mergeStrings(current.interactions, incoming.interactions),
    dosageForm: preferred.dosageForm || fallback.dosageForm,
    efficacy: preferred.efficacy || fallback.efficacy,
    usage: preferred.usage || fallback.usage,
    confidence: Math.max(current.confidence, incoming.confidence),
  };
}

function mergeIngredients(
  left: DrugMatch["ingredients"],
  right: DrugMatch["ingredients"],
): DrugMatch["ingredients"] {
  const map = new Map<string, DrugMatch["ingredients"][number]>();
  [...left, ...right].forEach((ingredient) => {
    const key = `${normalizeName(ingredient.name)}:${normalizeName(ingredient.amount || "")}`;
    if (!map.has(key)) map.set(key, ingredient);
  });
  return Array.from(map.values());
}

function mergeStrings(left: string[], right: string[]): string[] {
  return Array.from(new Set([...left, ...right].filter(Boolean)));
}

export function escapeLikePattern(value: string): string {
  return value.replace(/[,%_]/g, "");
}
