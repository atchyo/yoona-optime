import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

interface DrugMatch {
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const { query } = await req.json();
  if (!query || typeof query !== "string") {
    return jsonResponse({ error: "query is required" }, 400);
  }

  const matches = [
    ...(await searchMfdsPermit(query)),
    ...(await searchMfdsEasyDrug(query)),
    ...(await searchRxNorm(query)),
  ]
    .sort((a, b) => compareMatches(query, a, b))
    .slice(0, 10);

  return jsonResponse({ matches });
});

async function searchMfdsPermit(query: string): Promise<DrugMatch[]> {
  const serviceKey = Deno.env.get("DATA_GO_KR_SERVICE_KEY");
  if (!serviceKey) return [];

  const payload = await fetchDataGoKrJson(
    "https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07/getDrugPrdtPrmsnInq07",
    "serviceKey",
    serviceKey,
    {
      type: "json",
      item_name: query,
      numOfRows: "5",
      pageNo: "1",
    },
  );
  const items = normalizeItems(extractItems(payload));

  return items.map((item: Record<string, string>, index: number) => ({
    id: `mfds-permit-${item.ITEM_SEQ || index}`,
    source: "mfds_permit",
    productName: item.ITEM_NAME || query,
    manufacturer: item.ENTP_NAME,
    ingredients: parseIngredients(item.MAIN_ITEM_INGR || item.MAIN_INGR || ""),
    dosageForm: item.CHART,
    efficacy: item.EE_DOC_DATA,
    usage: item.UD_DOC_DATA,
    warnings: compactTextList([item.NB_DOC_DATA]),
    interactions: [],
    confidence: 0.9,
  }));
}

async function searchMfdsEasyDrug(query: string): Promise<DrugMatch[]> {
  const serviceKey = Deno.env.get("DATA_GO_KR_SERVICE_KEY");
  if (!serviceKey) return [];

  const payload = await fetchDataGoKrJson(
    "https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList",
    "ServiceKey",
    serviceKey,
    {
      type: "json",
      itemName: query,
      numOfRows: "5",
      pageNo: "1",
    },
  );
  const items = normalizeItems(extractItems(payload));

  return items.map((item: Record<string, string>, index: number) => ({
    id: `mfds-easy-${item.itemSeq || index}`,
    source: "mfds_easy",
    productName: item.itemName || query,
    manufacturer: item.entpName,
    ingredients: [],
    dosageForm: undefined,
    efficacy: item.efcyQesitm,
    usage: item.useMethodQesitm,
    warnings: compactTextList([item.atpnWarnQesitm, item.atpnQesitm, item.seQesitm]),
    interactions: compactTextList([item.intrcQesitm]),
    confidence: 0.78,
  }));
}

async function searchRxNorm(query: string): Promise<DrugMatch[]> {
  if (/[가-힣]/.test(query)) return [];

  const url = new URL("https://rxnav.nlm.nih.gov/REST/approximateTerm.json");
  url.searchParams.set("term", query);
  url.searchParams.set("maxEntries", "5");
  const response = await fetch(url);
  if (!response.ok) return [];
  const payload = await response.json();
  const candidates = (payload?.approximateGroup?.candidate || []).filter((candidate: Record<string, string>) => {
    const score = Number(candidate.score || 0);
    return score >= 55;
  });

  return candidates.map((candidate: Record<string, string>) => ({
    id: `rxnorm-${candidate.rxcui}`,
    source: "rxnorm",
    productName: candidate.name || query,
    ingredients: [{ name: candidate.name || query }],
    warnings: [],
    interactions: [],
    confidence: Number(candidate.score || 0) / 100,
  }));
}

function normalizeItems(items: unknown): Array<Record<string, string>> {
  if (!items) return [];
  if (Array.isArray(items)) return items as Array<Record<string, string>>;
  if (Array.isArray((items as { item?: unknown[] }).item)) {
    return (items as { item: Array<Record<string, string>> }).item;
  }
  if ((items as { item?: unknown }).item) return [(items as { item: Record<string, string> }).item];
  return [];
}

function extractItems(payload: unknown): unknown {
  const body =
    (payload as { response?: { body?: { items?: unknown } } })?.response?.body ||
    (payload as { body?: { items?: unknown } })?.body;

  return body?.items;
}

async function fetchDataGoKrJson(
  baseUrl: string,
  serviceKeyName: string,
  serviceKey: string,
  params: Record<string, string>,
): Promise<unknown> {
  const keyCandidates = Array.from(
    new Set([serviceKey, safeDecode(serviceKey)]).values(),
  ).filter(Boolean);

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

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseIngredients(value: string): Array<{ name: string; amount?: string }> {
  return value
    .split(/[,\n;]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => ({ name: part }));
}

function compactTextList(values: Array<string | undefined>): string[] {
  return values.map((value) => value?.trim()).filter(Boolean) as string[];
}

function compareMatches(query: string, left: DrugMatch, right: DrugMatch): number {
  const scoreGap = matchPriority(query, right.productName) - matchPriority(query, left.productName);
  if (scoreGap !== 0) return scoreGap;
  return right.confidence - left.confidence;
}

function matchPriority(query: string, productName: string): number {
  const normalizedQuery = normalizeName(query);
  const normalizedProductName = normalizeName(productName);

  if (!normalizedQuery || !normalizedProductName) return 0;
  if (normalizedProductName === normalizedQuery) return 5;
  if (normalizedProductName.startsWith(normalizedQuery)) return 4;
  if (normalizedProductName.includes(normalizedQuery)) return 3;
  if (normalizedQuery.split(/\s+/).every((token) => normalizedProductName.includes(token))) return 2;
  return 1;
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[\s\-_/()[\].,]/g, "");
}
