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
  ].slice(0, 10);

  return jsonResponse({ matches });
});

async function searchMfdsPermit(query: string): Promise<DrugMatch[]> {
  const serviceKey = Deno.env.get("DATA_GO_KR_SERVICE_KEY");
  if (!serviceKey) return [];

  const url = new URL("https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07/getDrugPrdtPrmsnInq07");
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("type", "json");
  url.searchParams.set("item_name", query);
  url.searchParams.set("numOfRows", "5");

  const response = await fetch(url);
  if (!response.ok) return [];
  const payload = await response.json();
  const items = normalizeItems(payload?.body?.items);

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

  const url = new URL("https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList");
  url.searchParams.set("ServiceKey", serviceKey);
  url.searchParams.set("type", "json");
  url.searchParams.set("itemName", query);
  url.searchParams.set("numOfRows", "5");

  const response = await fetch(url);
  if (!response.ok) return [];
  const payload = await response.json();
  const items = normalizeItems(payload?.body?.items);

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
  const url = new URL("https://rxnav.nlm.nih.gov/REST/approximateTerm.json");
  url.searchParams.set("term", query);
  url.searchParams.set("maxEntries", "5");
  const response = await fetch(url);
  if (!response.ok) return [];
  const payload = await response.json();
  const candidates = payload?.approximateGroup?.candidate || [];

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
