import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  compareMatches,
  compactTextList,
  dedupeMatches,
  DrugCatalogRow,
  DrugMatch,
  escapeLikePattern,
  extractItems,
  fetchDataGoKrJson,
  looksLikeSupplementQuery,
  normalizeItems,
  normalizeName,
  parseIngredients,
} from "../_shared/drugCatalog.ts";

interface CatalogSearchRow {
  source: string;
  source_record_id: string;
  category: "drug" | "supplement";
  product_name: string;
  manufacturer: string | null;
  ingredients: Array<{ name: string; amount?: string }>;
  dosage_form: string | null;
  efficacy: string | null;
  usage: string | null;
  warnings: string[];
  interactions: string[];
  search_text: string;
  search_compact: string;
}

interface HealthFunctionalFoodListItem {
  id: string;
  productName: string;
  manufacturer?: string;
  statementNo?: string;
}

let healthFunctionalFoodCache:
  | { expiresAt: number; items: HealthFunctionalFoodListItem[] }
  | null = null;
const HEALTH_FUNCTIONAL_FOOD_PAGE_SIZE = 500;
const HEALTH_FUNCTIONAL_FOOD_MAX_PAGES = 20;
const HEALTH_FUNCTIONAL_FOOD_CACHE_TTL_MS = 1000 * 60 * 30;
const RESULT_LIMIT = 50;
const CATALOG_QUERY_LIMIT = 180;
const CATALOG_TOKEN_QUERY_LIMIT = 180;
const CATALOG_SELECT_COLUMNS =
  "source, source_record_id, category, product_name, manufacturer, ingredients, dosage_form, efficacy, usage, warnings, interactions, search_text, search_compact";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const { query } = await req.json();
  if (!query || typeof query !== "string") {
    return jsonResponse({ error: "query is required" }, 400);
  }

  const trimmedQuery = query.trim();
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const catalogMatches = await searchCatalog(adminClient, trimmedQuery);
  if (catalogMatches.length >= 8) {
    return jsonResponse({ matches: catalogMatches.slice(0, RESULT_LIMIT) });
  }

  const mfdsPermitMatches = await searchMfdsPermit(trimmedQuery);
  const mfdsEasyMatches = await searchMfdsEasyDrug(trimmedQuery);
  const healthFunctionalFoodMatches =
    looksLikeSupplementQuery(trimmedQuery) || mfdsPermitMatches.length + mfdsEasyMatches.length < 2
      ? await searchHealthFunctionalFood(trimmedQuery)
      : [];
  const rxNormMatches = await searchRxNorm(trimmedQuery);

  const liveMatches = dedupeMatches([
    ...mfdsPermitMatches,
    ...mfdsEasyMatches,
    ...healthFunctionalFoodMatches,
    ...rxNormMatches,
  ]);

  if (liveMatches.length) {
    await upsertLiveMatchesToCatalog(adminClient, liveMatches);
  }

  const matches = dedupeMatches([...catalogMatches, ...liveMatches])
    .sort((a, b) => compareMatches(trimmedQuery, a, b))
    .slice(0, RESULT_LIMIT);

  return jsonResponse({ matches });
});

async function searchCatalog(
  adminClient: ReturnType<typeof createClient>,
  query: string,
): Promise<DrugMatch[]> {
  const rawLike = escapeLikePattern(query);
  const compactLike = escapeLikePattern(normalizeName(query));
  const tokens = buildSearchTokens(query);
  if (!rawLike && !compactLike) return [];

  if (tokens.length > 1) {
    const rowMap = new Map<string, CatalogSearchRow>();
    const prioritizedTokens = prioritizeTokens(tokens);

    for (const token of prioritizedTokens) {
      let request = adminClient
        .from("drug_catalog_items")
        .select(CATALOG_SELECT_COLUMNS)
        .ilike("search_compact", `%${token}%`);

      if (looksLikeSupplementQuery(query)) {
        request = request.eq("category", "supplement");
      }

      const { data } = await request.limit(CATALOG_TOKEN_QUERY_LIMIT).returns<CatalogSearchRow[]>();

      (data || []).forEach((row) => rowMap.set(`${row.source}:${row.source_record_id}`, row));

      const exactRows = Array.from(rowMap.values()).filter((row) =>
        tokens.every((candidate) => row.search_compact.includes(candidate)),
      );

      if (exactRows.length) {
        return exactRows
          .map((row) => toCatalogMatch(query, row))
          .sort((left, right) => compareMatches(query, left, right))
          .slice(0, RESULT_LIMIT);
      }
    }

    const tokenRows = Array.from(rowMap.values());
    const tokenMatchedRows = tokenRows.filter((row) =>
      tokens.every((token) => row.search_compact.includes(token)),
    );

    if (tokenMatchedRows.length) {
      return tokenMatchedRows
        .map((row) => toCatalogMatch(query, row))
        .sort((left, right) => compareMatches(query, left, right));
    }

    const partialRows = tokenRows
      .filter((row) => tokens.some((token) => row.search_compact.includes(token)))
      .sort((left, right) => scoreCatalogRow(query, tokens, right) - scoreCatalogRow(query, tokens, left));

    if (partialRows.length) {
      return partialRows
        .map((row) => toCatalogMatch(query, row))
        .sort((left, right) => compareMatches(query, left, right))
        .slice(0, RESULT_LIMIT);
    }
  }

  const filters = [];
  if (rawLike) filters.push(`search_text.ilike.%${rawLike}%`);
  if (compactLike) filters.push(`search_compact.ilike.%${compactLike}%`);
  tokens.forEach((token) => {
    filters.push(`search_compact.ilike.%${token}%`);
  });
  if (!filters.length) return [];

  let request = adminClient
    .from("drug_catalog_items")
    .select(CATALOG_SELECT_COLUMNS);

  if (looksLikeSupplementQuery(query)) {
    request = request.eq("category", "supplement");
  }

  const { data, error } = await request.or(filters.join(",")).limit(CATALOG_QUERY_LIMIT).returns<CatalogSearchRow[]>();

  if (error || !data?.length) return [];

  const tokenMatchedRows =
    tokens.length > 1
      ? data.filter((row) => tokens.every((token) => row.search_compact.includes(token)))
      : data;
  const rows = tokenMatchedRows.length ? tokenMatchedRows : data;

  return rows
    .map((row) => toCatalogMatch(query, row))
    .sort((left, right) => compareMatches(query, left, right));
}

function buildSearchTokens(query: string): string[] {
  return Array.from(
    new Set(
      query
        .split(/[\s,./()[\]\-_/]+/)
        .map((token) => normalizeName(token))
        .filter((token) => token.length >= 2),
    ),
  ).slice(0, 6);
}

function prioritizeTokens(tokens: string[]): string[] {
  return [...tokens]
    .sort((left, right) => right.length - left.length || tokens.indexOf(left) - tokens.indexOf(right))
    .slice(0, 4);
}

function scoreCatalogRow(query: string, tokens: string[], row: CatalogSearchRow): number {
  const product = normalizeName(row.product_name || "");
  const manufacturer = normalizeName(row.manufacturer || "");
  const compact = row.search_compact || "";
  const tokenScore = tokens.reduce((score, token) => {
    if (product.includes(token)) return score + 5;
    if (manufacturer.includes(token)) return score + 4;
    if (compact.includes(token)) return score + 2;
    return score;
  }, 0);
  const supplementScore = looksLikeSupplementQuery(query) && row.category === "supplement" ? 3 : 0;
  const sourceScore = row.source === "mfds_health" ? 1.5 : row.source === "mfds_permit" ? 1 : 0;
  return tokenScore + supplementScore + sourceScore;
}

function toCatalogMatch(query: string, row: CatalogSearchRow): DrugMatch {
  const exactBonus =
    normalizeName(row.product_name) === normalizeName(query)
      ? 0.07
      : normalizeName(row.product_name).startsWith(normalizeName(query))
        ? 0.04
        : 0;

  const categoryBonus =
    looksLikeSupplementQuery(query) && row.category === "supplement" ? 0.03 : 0;

  return {
    id: `${row.source}-${row.source_record_id}`,
    source: row.source,
    productName: row.product_name,
    manufacturer: row.manufacturer || undefined,
    ingredients: row.ingredients || [],
    dosageForm: row.dosage_form || undefined,
    efficacy: row.efficacy || undefined,
    usage: row.usage || undefined,
    warnings: row.warnings || [],
    interactions: row.interactions || [],
    confidence: Math.min(0.98, baseConfidenceBySource(row.source) + exactBonus + categoryBonus),
  };
}

function baseConfidenceBySource(source: string): number {
  switch (source) {
    case "mfds_permit":
      return 0.9;
    case "mfds_easy":
      return 0.78;
    case "mfds_health":
      return 0.84;
    case "rxnorm":
      return 0.66;
    default:
      return 0.55;
  }
}

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
      numOfRows: "10",
      pageNo: "1",
    },
  );
  const items = normalizeItems(extractItems(payload));

  return items.map((item: Record<string, string>, index: number) => ({
    id: `mfds_permit-${item.ITEM_SEQ || index}`,
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
      numOfRows: "10",
      pageNo: "1",
    },
  );
  const items = normalizeItems(extractItems(payload));

  return items.map((item: Record<string, string>, index: number) => ({
    id: `mfds_easy-${item.itemSeq || index}`,
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

async function searchHealthFunctionalFood(query: string): Promise<DrugMatch[]> {
  const serviceKey = Deno.env.get("DATA_GO_KR_SERVICE_KEY");
  if (!serviceKey) return [];

  const items = await loadHealthFunctionalFoodIndex(serviceKey);
  const normalizedQuery = normalizeName(query);

  return items
    .filter((item) => {
      const normalizedProductName = normalizeName(item.productName);
      const normalizedManufacturer = normalizeName(item.manufacturer || "");
      return (
        normalizedProductName.includes(normalizedQuery) ||
        normalizedManufacturer.includes(normalizedQuery)
      );
    })
    .map((item) => ({
      id: item.id,
      source: "mfds_health",
      productName: item.productName,
      manufacturer: item.manufacturer,
      ingredients: [],
      warnings: [],
      interactions: [],
      confidence: 0.62,
    }))
    .sort((left, right) => compareMatches(query, left, right))
    .slice(0, RESULT_LIMIT);
}

async function searchRxNorm(query: string): Promise<DrugMatch[]> {
  if (/[가-힣]/.test(query)) return [];

  const url = new URL("https://rxnav.nlm.nih.gov/REST/approximateTerm.json");
  url.searchParams.set("term", query);
  url.searchParams.set("maxEntries", "5");
  const response = await fetch(url);
  if (!response.ok) return [];
  const payload = await response.json();
  const candidates = (payload?.approximateGroup?.candidate || []).filter(
    (candidate: Record<string, string>) => Number(candidate.score || 0) >= 55,
  );

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

async function upsertLiveMatchesToCatalog(
  adminClient: ReturnType<typeof createClient>,
  matches: DrugMatch[],
): Promise<void> {
  const rows = matches
    .filter((match) => match.source === "mfds_permit" || match.source === "mfds_easy" || match.source === "mfds_health")
    .map(toCatalogRowFromMatch);

  if (!rows.length) return;

  await adminClient.from("drug_catalog_items").upsert(rows, {
    onConflict: "source,source_record_id",
  });
}

function toCatalogRowFromMatch(match: DrugMatch): DrugCatalogRow {
  const sourceRecordId = match.id.replace(/^[^-]+-/, "");
  const category = match.source === "mfds_health" ? "supplement" : "drug";
  const searchText = [
    match.productName,
    match.manufacturer || "",
    ...match.ingredients.map((item) => [item.name, item.amount].filter(Boolean).join(" ")),
    match.efficacy || "",
    match.usage || "",
    ...match.warnings,
    ...match.interactions,
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    source: match.source,
    source_record_id: sourceRecordId,
    category,
    product_name: match.productName,
    normalized_product_name: normalizeName(match.productName),
    manufacturer: match.manufacturer || null,
    normalized_manufacturer: normalizeName(match.manufacturer || ""),
    ingredients: match.ingredients,
    dosage_form: match.dosageForm || null,
    efficacy: match.efficacy || null,
    usage: match.usage || null,
    warnings: match.warnings,
    interactions: match.interactions,
    search_text: searchText,
    search_compact: normalizeName(searchText),
    source_payload: {},
    last_synced_at: new Date().toISOString(),
  };
}

async function loadHealthFunctionalFoodIndex(
  serviceKey: string,
): Promise<HealthFunctionalFoodListItem[]> {
  if (healthFunctionalFoodCache && healthFunctionalFoodCache.expiresAt > Date.now()) {
    return healthFunctionalFoodCache.items;
  }

  const items: HealthFunctionalFoodListItem[] = [];

  for (let pageNo = 1; pageNo <= HEALTH_FUNCTIONAL_FOOD_MAX_PAGES; pageNo += 1) {
    const payload = await fetchDataGoKrJson(
      "https://apis.data.go.kr/1471000/HtfsInfoService03/getHtfsList01",
      "ServiceKey",
      serviceKey,
      {
        type: "json",
        numOfRows: String(HEALTH_FUNCTIONAL_FOOD_PAGE_SIZE),
        pageNo: String(pageNo),
      },
    );

    const pageItems = normalizeItems(extractItems(payload));
    if (!pageItems.length) break;

    pageItems.forEach((item: Record<string, string>, index: number) => {
      const productName = pickText(item, [
        "PRDUCT",
        "PRDLST_NM",
        "PRDLST_NAME",
        "PRDUCT_NM",
        "PRODUCT_NM",
        "ITEM_NAME",
        "itemName",
      ]);
      if (!productName) return;

      items.push({
        id: `mfds_health-${
          pickText(item, [
            "STTEMNT_NO",
            "PRDLST_REPORT_NO",
            "PRDLST_MNF_MANAGE_NO",
            "GU_PRDLST_MNF_MANAGE_NO",
            "LCNS_NO",
          ]) || `${pageNo}-${index}`
        }`,
        productName,
        manufacturer: pickText(item, ["ENTRPS", "BSSH_NM", "ENTP_NM", "ENTP_NAME", "MANUFACTURER"]),
        statementNo: pickText(item, [
          "STTEMNT_NO",
          "PRDLST_REPORT_NO",
          "PRDLST_MNF_MANAGE_NO",
          "GU_PRDLST_MNF_MANAGE_NO",
          "LCNS_NO",
        ]),
      });
    });

    if (pageItems.length < HEALTH_FUNCTIONAL_FOOD_PAGE_SIZE) {
      break;
    }
  }

  healthFunctionalFoodCache = {
    expiresAt: Date.now() + HEALTH_FUNCTIONAL_FOOD_CACHE_TTL_MS,
    items,
  };

  return items;
}

function pickText(item: Record<string, string>, candidates: string[]): string {
  const entries = Object.entries(item || {});
  for (const candidate of candidates) {
    const exactValue = item[candidate];
    if (exactValue !== undefined && exactValue !== null && String(exactValue).trim()) {
      return String(exactValue).trim();
    }

    const normalizedCandidate = candidate.toLowerCase();
    const matchedEntry = entries.find(([key]) => key.toLowerCase() === normalizedCandidate);
    if (matchedEntry?.[1] !== undefined && matchedEntry[1] !== null && String(matchedEntry[1]).trim()) {
      return String(matchedEntry[1]).trim();
    }
  }
  return "";
}
