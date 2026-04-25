import { supabase } from "./supabaseClient";
import type { DrugDatabaseMatch } from "../types";

interface CatalogSearchRow {
  source: DrugDatabaseMatch["source"];
  source_record_id: string;
  category: "drug" | "supplement";
  product_name: string;
  manufacturer: string | null;
  ingredients: DrugDatabaseMatch["ingredients"] | null;
  dosage_form: string | null;
  efficacy: string | null;
  usage: string | null;
  warnings: string[] | null;
  interactions: string[] | null;
  search_text: string | null;
  search_compact: string | null;
}

const CATALOG_SELECT_COLUMNS =
  "source, source_record_id, category, product_name, manufacturer, ingredients, dosage_form, efficacy, usage, warnings, interactions, search_text, search_compact";
const DIRECT_RESULT_LIMIT = 20;
const TOKEN_QUERY_LIMIT = 120;

export interface DrugCatalogSyncSummary {
  source: string;
  fetchedCount: number;
  upsertedCount: number;
  startPage?: number;
  nextPage?: number | null;
  hasMore?: boolean;
  totalCount?: number;
}

export async function searchDrugDatabase(query: string): Promise<DrugDatabaseMatch[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  if (supabase) {
    const directMatches = await searchCatalogDirectly(trimmed).catch((error) => {
      console.warn("Direct catalog search failed", error);
      return [] as DrugDatabaseMatch[];
    });

    if (directMatches.length >= 8) {
      return directMatches.slice(0, DIRECT_RESULT_LIMIT);
    }

    const { data, error } = await supabase.functions.invoke("drug-search", {
      body: { query: trimmed },
    });

    if (error) {
      if (directMatches.length) return directMatches.slice(0, DIRECT_RESULT_LIMIT);
      console.warn("Drug search function failed", error);
      return [];
    }

    if (Array.isArray(data?.matches)) {
      return dedupeMatches([...directMatches, ...(data.matches as DrugDatabaseMatch[])])
        .sort((left, right) => compareMatches(trimmed, left, right))
        .slice(0, DIRECT_RESULT_LIMIT);
    }

    return directMatches.slice(0, DIRECT_RESULT_LIMIT);
  }

  return [];
}

async function searchCatalogDirectly(query: string): Promise<DrugDatabaseMatch[]> {
  if (!supabase) return [];

  const tokens = buildSearchTokens(query);
  if (tokens.length > 1) {
    const rowMap = new Map<string, CatalogSearchRow>();
    const prioritizedTokens = prioritizeTokens(tokens);

    for (const token of prioritizedTokens) {
      let request = supabase
        .from("drug_catalog_items")
        .select(CATALOG_SELECT_COLUMNS)
        .ilike("search_compact", `%${token}%`);

      if (looksLikeSupplementQuery(query)) {
        request = request.eq("category", "supplement");
      }

      const { data, error } = await request.limit(TOKEN_QUERY_LIMIT).returns<CatalogSearchRow[]>();

      if (error) throw new Error(error.message);
      (data || []).forEach((row) => rowMap.set(`${row.source}:${row.source_record_id}`, row));

      const exactRows = Array.from(rowMap.values()).filter((row) => {
        const compact = row.search_compact || "";
        return tokens.every((candidate) => compact.includes(candidate));
      });

      if (exactRows.length) {
        return dedupeMatches(exactRows.map((row) => mapCatalogRow(query, row)))
          .sort((left, right) => compareMatches(query, left, right))
          .slice(0, DIRECT_RESULT_LIMIT);
      }
    }

    const rows = Array.from(rowMap.values()).filter((row) => {
      const compact = row.search_compact || "";
      return tokens.every((token) => compact.includes(token));
    });

    if (rows.length) {
      return dedupeMatches(rows.map((row) => mapCatalogRow(query, row)))
        .sort((left, right) => compareMatches(query, left, right))
        .slice(0, DIRECT_RESULT_LIMIT);
    }

    const partialRows = Array.from(rowMap.values())
      .filter((row) => tokens.some((token) => (row.search_compact || "").includes(token)))
      .sort((left, right) => scoreCatalogRow(query, tokens, right) - scoreCatalogRow(query, tokens, left));

    if (partialRows.length) {
      return dedupeMatches(partialRows.map((row) => mapCatalogRow(query, row)))
        .sort((left, right) => compareMatches(query, left, right))
        .slice(0, DIRECT_RESULT_LIMIT);
    }
  }

  const compactQuery = normalizeName(query);
  const filters = [
    `search_text.ilike.%${query}%`,
    compactQuery && `search_compact.ilike.%${compactQuery}%`,
    ...tokens.map((token) => `search_compact.ilike.%${token}%`),
  ].filter(Boolean);

  if (!filters.length) return [];

  let request = supabase
    .from("drug_catalog_items")
    .select(CATALOG_SELECT_COLUMNS);

  if (looksLikeSupplementQuery(query)) {
    request = request.eq("category", "supplement");
  }

  const { data, error } = await request
    .or(filters.join(","))
    .limit(TOKEN_QUERY_LIMIT)
    .returns<CatalogSearchRow[]>();

  if (error) throw new Error(error.message);

  const rows =
    tokens.length > 1
      ? (data || []).filter((row) => tokens.every((token) => (row.search_compact || "").includes(token)))
      : data || [];

  return dedupeMatches(rows.map((row) => mapCatalogRow(query, row)))
    .sort((left, right) => compareMatches(query, left, right))
    .slice(0, DIRECT_RESULT_LIMIT);
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

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s\-_/()[\].,]/g, "")
    .replace(/vitamind3|비타민디3/g, "비타민d3")
    .replace(/vitamind|비타민디/g, "비타민d")
    .replace(/omega3|오메가쓰리/g, "오메가3");
}

function mapCatalogRow(query: string, row: CatalogSearchRow): DrugDatabaseMatch {
  const exactBonus =
    normalizeName(row.product_name) === normalizeName(query)
      ? 0.07
      : normalizeName(row.product_name).startsWith(normalizeName(query))
        ? 0.04
        : 0;
  const supplementBonus = looksLikeSupplementQuery(query) && row.category === "supplement" ? 0.03 : 0;

  return {
    id: `${row.source}-${row.source_record_id}`,
    source: row.source,
    productName: row.product_name,
    manufacturer: row.manufacturer || undefined,
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    dosageForm: row.dosage_form || undefined,
    efficacy: row.efficacy || undefined,
    usage: row.usage || undefined,
    warnings: row.warnings || [],
    interactions: row.interactions || [],
    confidence: Math.min(0.98, baseConfidence(row.source) + exactBonus + supplementBonus),
  };
}

function baseConfidence(source: DrugDatabaseMatch["source"]): number {
  if (source === "mfds_permit") return 0.9;
  if (source === "mfds_easy") return 0.78;
  if (source === "mfds_health") return 0.84;
  return 0.55;
}

function looksLikeSupplementQuery(query: string): boolean {
  return /비타민|오메가|마그네슘|칼슘|아연|유산균|프로바이오틱|영양제|건강|루테인|콜라겐|밀크씨슬/i.test(query);
}

function dedupeMatches(matches: DrugDatabaseMatch[]): DrugDatabaseMatch[] {
  const result = new Map<string, DrugDatabaseMatch>();

  matches.forEach((match) => {
    const normalizedProduct = normalizeName(match.productName);
    const normalizedManufacturer = normalizeName(match.manufacturer || "");
    const key = `${match.source}:${normalizedProduct}:${normalizedManufacturer || match.id}`;

    if (!result.has(key)) {
      result.set(key, match);
      return;
    }

    const current = result.get(key);
    if (current && match.confidence > current.confidence) {
      result.set(key, match);
    }
  });

  return Array.from(result.values());
}

function compareMatches(query: string, left: DrugDatabaseMatch, right: DrugDatabaseMatch): number {
  const normalizedQuery = normalizeName(query);
  return scoreMatch(normalizedQuery, right) - scoreMatch(normalizedQuery, left);
}

function scoreMatch(normalizedQuery: string, match: DrugDatabaseMatch): number {
  const product = normalizeName(match.productName);
  const manufacturer = normalizeName(match.manufacturer || "");
  let score = match.confidence;

  if (product === normalizedQuery) score += 0.5;
  else if (product.startsWith(normalizedQuery)) score += 0.3;
  else if (product.includes(normalizedQuery)) score += 0.18;
  if (manufacturer.includes(normalizedQuery)) score += 0.06;
  if (match.source === "mfds_health") score += 0.02;

  return score;
}

export async function syncDrugCatalog(): Promise<DrugCatalogSyncSummary[]> {
  if (!supabase) {
    throw new Error("Supabase가 연결되지 않았습니다.");
  }

  const sourcePlans = [
    { source: "mfds_health", pageCount: 2 },
    { source: "mfds_permit", pageCount: 1 },
    { source: "mfds_easy", pageCount: 1 },
  ] as const;

  const summaries: DrugCatalogSyncSummary[] = [];

  for (const plan of sourcePlans) {
    const { data, error } = await supabase.functions.invoke("sync-drug-catalog", {
      body: {
        source: plan.source,
        reset: false,
        startPage: 1,
        pageCount: plan.pageCount,
        pageSize: 100,
      },
    });

    if (error) {
      throw new Error(error.message || `${plan.source} 인덱스 보강에 실패했습니다.`);
    }

    if (!data || typeof data !== "object") {
      throw new Error(`${plan.source} 인덱스 보강 응답 형식이 올바르지 않습니다.`);
    }

    if ((data as { ok?: boolean; error?: string }).ok === false) {
      throw new Error((data as { error?: string }).error || `${plan.source} 인덱스 보강에 실패했습니다.`);
    }

    const summary = data as DrugCatalogSyncSummary & { ok?: boolean };
    summaries.push({
      source: plan.source,
      fetchedCount: Number(summary.fetchedCount || 0),
      upsertedCount: Number(summary.upsertedCount || 0),
      startPage: summary.startPage,
      nextPage: summary.nextPage,
      hasMore: summary.hasMore,
      totalCount: summary.totalCount,
    });
  }

  return summaries;
}
