import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  buildSearchText,
  compactTextList,
  DrugCatalogRow,
  extractItems,
  extractTotalCount,
  fetchDataGoKrJson,
  normalizeItems,
  normalizeName,
  parseFunctionalClaims,
  parseIngredients,
} from "../_shared/drugCatalog.ts";

type SyncSource = "mfds_permit" | "mfds_easy" | "mfds_health";

interface SyncOptions {
  source?: SyncSource;
  sources?: SyncSource[];
  reset?: boolean;
  pageSize?: number;
  maxPages?: number;
  startPage?: number;
  pageCount?: number;
}

const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_PAGE_COUNT = 15;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader || "" } } },
    );
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (authHeader) {
      const { data: userData, error: userError } = await anonClient.auth.getUser();
      if (userError || !userData.user) {
        return jsonResponse({ ok: false, error: "로그인 상태를 확인하지 못했습니다." });
      }

      const { data: memberData, error: memberError } = await adminClient
        .from("family_members")
        .select("role")
        .eq("user_id", userData.user.id)
        .in("role", ["owner", "manager"])
        .limit(1);

      if (memberError) return jsonResponse({ ok: false, error: memberError.message });
      if (!memberData?.length) {
        return jsonResponse({ ok: false, error: "가족대표 또는 가족관리자만 약 DB를 동기화할 수 있습니다." });
      }
    }

    const body = (await req.json().catch(() => ({}))) as SyncOptions;
    const source = sanitizeSource(body.source, body.sources);
    if (!source) {
      return jsonResponse({ ok: false, error: "source is required" });
    }
    const reset = Boolean(body.reset);
    const pageSize = clampNumber(body.pageSize, DEFAULT_PAGE_SIZE, 20, 500);
    const startPage = clampNumber(body.startPage, 1, 1, 100000);
    const pageCount = clampNumber(body.pageCount ?? body.maxPages, DEFAULT_PAGE_COUNT, 1, 50);
    const serviceKey = Deno.env.get("DATA_GO_KR_SERVICE_KEY");

    if (!serviceKey) {
      return jsonResponse({ ok: false, error: "DATA_GO_KR_SERVICE_KEY is not configured" });
    }

    const summary = await syncSource(adminClient, {
      serviceKey,
      source,
      reset,
      pageSize,
      startPage,
      pageCount,
    });

    return jsonResponse({ ok: true, ...summary });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error instanceof Error ? error.message : "동기화 중 알 수 없는 오류가 발생했습니다.",
    });
  }
});

function sanitizeSource(value?: SyncSource, sources?: SyncSource[]): SyncSource | null {
  const allowed: SyncSource[] = ["mfds_permit", "mfds_easy", "mfds_health"];
  if (value && allowed.includes(value)) return value;
  const first = (sources || []).find((item): item is SyncSource => allowed.includes(item));
  return first || null;
}

function clampNumber(value: number | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

async function syncSource(
  adminClient: ReturnType<typeof createClient>,
  options: {
    serviceKey: string;
    source: SyncSource;
    reset: boolean;
    pageSize: number;
    startPage: number;
    pageCount: number;
  },
) {
  const { data: runData, error: runError } = await adminClient
    .from("drug_catalog_sync_runs")
    .insert({
      source: options.source,
      status: "running",
    })
    .select("id")
    .single<{ id: string }>();

  if (runError || !runData) throw new Error(runError?.message || "동기화 기록을 만들지 못했습니다.");

  try {
    if (options.reset && options.startPage === 1) {
      const { error } = await adminClient.from("drug_catalog_items").delete().eq("source", options.source);
      if (error) throw new Error(error.message);
    }

    const result = await fetchCatalogRows(options);
    const chunks = chunkRows(result.rows, 200);

    for (const chunk of chunks) {
      const { error } = await adminClient
        .from("drug_catalog_items")
        .upsert(chunk, { onConflict: "source,source_record_id" });
      if (error) throw new Error(error.message);
    }

    const { error: finishError } = await adminClient
      .from("drug_catalog_sync_runs")
      .update({
        status: "completed",
        fetched_count: result.fetchedCount,
        upserted_count: result.rows.length,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runData.id);

    if (finishError) throw new Error(finishError.message);

    return {
      source: options.source,
      fetchedCount: result.fetchedCount,
      upsertedCount: result.rows.length,
      startPage: options.startPage,
      nextPage: result.nextPage,
      hasMore: result.hasMore,
      totalCount: result.totalCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "동기화 중 오류가 발생했습니다.";
    await adminClient
      .from("drug_catalog_sync_runs")
      .update({
        status: "failed",
        error_message: message,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runData.id);
    throw error;
  }
}

async function fetchCatalogRows(options: {
  serviceKey: string;
  source: SyncSource;
  pageSize: number;
  startPage: number;
  pageCount: number;
}): Promise<{
  fetchedCount: number;
  rows: DrugCatalogRow[];
  nextPage: number | null;
  hasMore: boolean;
  totalCount: number;
}> {
  switch (options.source) {
    case "mfds_permit":
      return fetchPagedSourceRows({
        ...options,
        baseUrl: "https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07/getDrugPrdtPrmsnInq07",
        serviceKeyName: "serviceKey",
        mapRow: mapPermitRow,
      });
    case "mfds_easy":
      return fetchPagedSourceRows({
        ...options,
        baseUrl: "https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList",
        serviceKeyName: "ServiceKey",
        mapRow: mapEasyRow,
      });
    case "mfds_health":
      return fetchPagedSourceRows({
        ...options,
        baseUrl: "https://apis.data.go.kr/1471000/HtfsInfoService03/getHtfsList01",
        serviceKeyName: "ServiceKey",
        mapRow: mapHealthRow,
      });
  }
}

async function fetchPagedSourceRows(options: {
  serviceKey: string;
  source: SyncSource;
  pageSize: number;
  startPage: number;
  pageCount: number;
  baseUrl: string;
  serviceKeyName: string;
  mapRow: (item: Record<string, string>, index: number) => DrugCatalogRow | null;
}): Promise<{
  fetchedCount: number;
  rows: DrugCatalogRow[];
  nextPage: number | null;
  hasMore: boolean;
  totalCount: number;
}> {
  const rows: DrugCatalogRow[] = [];
  let totalCount = Number.POSITIVE_INFINITY;
  let fetchedCount = 0;
  let lastFetchedPage = options.startPage - 1;
  let lastPageItemCount = 0;

  for (let pageNo = options.startPage; pageNo < options.startPage + options.pageCount; pageNo += 1) {
    const payload = await fetchDataGoKrJson(
      options.baseUrl,
      options.serviceKeyName,
      options.serviceKey,
      {
        type: "json",
        pageNo: String(pageNo),
        numOfRows: String(options.pageSize),
      },
    );

    const items = normalizeItems(extractItems(payload));
    if (!items.length) break;

    totalCount = extractTotalCount(payload) || totalCount;
    fetchedCount += items.length;
    lastFetchedPage = pageNo;
    lastPageItemCount = items.length;

    items.forEach((item, index) => {
      const row = options.mapRow(item, (pageNo - 1) * options.pageSize + index);
      if (row) rows.push(row);
    });

    if (fetchedCount >= totalCount || items.length < options.pageSize) {
      break;
    }
  }

  const total = Number.isFinite(totalCount) ? totalCount : fetchedCount;
  const hasMore =
    lastFetchedPage >= options.startPage &&
    lastPageItemCount === options.pageSize &&
    lastFetchedPage * options.pageSize < total;

  return {
    fetchedCount,
    rows,
    nextPage: hasMore ? lastFetchedPage + 1 : null,
    hasMore,
    totalCount: total,
  };
}

function mapPermitRow(item: Record<string, string>, index: number): DrugCatalogRow | null {
  const productName = item.ITEM_NAME?.trim();
  if (!productName) return null;

  const ingredients = parseIngredients(item.MAIN_ITEM_INGR || item.MAIN_INGR || "");
  const warnings = compactTextList([item.NB_DOC_DATA]);
  const interactions: string[] = [];
  const efficacy = item.EE_DOC_DATA?.trim() || null;
  const usage = item.UD_DOC_DATA?.trim() || null;
  const manufacturer = item.ENTP_NAME?.trim() || null;

  return buildCatalogRow({
    source: "mfds_permit",
    sourceRecordId: item.ITEM_SEQ || `permit-${index}`,
    category: "drug",
    productName,
    manufacturer,
    ingredients,
    dosageForm: item.CHART?.trim() || null,
    efficacy,
    usage,
    warnings,
    interactions,
    payload: item,
  });
}

function mapEasyRow(item: Record<string, string>, index: number): DrugCatalogRow | null {
  const productName = item.itemName?.trim();
  if (!productName) return null;

  const warnings = compactTextList([item.atpnWarnQesitm, item.atpnQesitm, item.seQesitm]);
  const interactions = compactTextList([item.intrcQesitm]);
  const efficacy = item.efcyQesitm?.trim() || null;
  const usage = item.useMethodQesitm?.trim() || null;
  const manufacturer = item.entpName?.trim() || null;

  return buildCatalogRow({
    source: "mfds_easy",
    sourceRecordId: item.itemSeq || `easy-${index}`,
    category: "drug",
    productName,
    manufacturer,
    ingredients: [],
    dosageForm: null,
    efficacy,
    usage,
    warnings,
    interactions,
    payload: item,
  });
}

function mapHealthRow(item: Record<string, string>, index: number): DrugCatalogRow | null {
  const productName = item.PRDUCT?.trim();
  if (!productName) return null;

  const efficacy = item.MAIN_FNCTN?.trim() || null;
  const usage = item.SRV_USE?.trim() || null;
  const warnings = compactTextList([item.INTAKE_HINT1, item.PRSRV_PD, item.DISTB_PD]);
  const manufacturer = item.ENTRPS?.trim() || null;
  const ingredients = parseFunctionalClaims(item.MAIN_FNCTN || item.BASE_STANDARD || "");

  return buildCatalogRow({
    source: "mfds_health",
    sourceRecordId: item.STTEMNT_NO || `health-${index}`,
    category: "supplement",
    productName,
    manufacturer,
    ingredients,
    dosageForm: item.SUNGSANG?.trim() || null,
    efficacy,
    usage,
    warnings,
    interactions: [],
    payload: item,
  });
}

function buildCatalogRow(input: {
  source: SyncSource;
  sourceRecordId: string;
  category: "drug" | "supplement";
  productName: string;
  manufacturer: string | null;
  ingredients: Array<{ name: string; amount?: string }>;
  dosageForm: string | null;
  efficacy: string | null;
  usage: string | null;
  warnings: string[];
  interactions: string[];
  payload: Record<string, string>;
}): DrugCatalogRow {
  const searchText = buildSearchText({
    productName: input.productName,
    manufacturer: input.manufacturer,
    ingredients: input.ingredients,
    efficacy: input.efficacy,
    usage: input.usage,
    warnings: input.warnings,
    interactions: input.interactions,
  });

  return {
    source: input.source,
    source_record_id: input.sourceRecordId,
    category: input.category,
    product_name: input.productName,
    normalized_product_name: normalizeName(input.productName),
    manufacturer: input.manufacturer,
    normalized_manufacturer: normalizeName(input.manufacturer || ""),
    ingredients: input.ingredients,
    dosage_form: input.dosageForm,
    efficacy: input.efficacy,
    usage: input.usage,
    warnings: input.warnings,
    interactions: input.interactions,
    search_text: searchText,
    search_compact: normalizeName(searchText),
    source_payload: input.payload,
    last_synced_at: new Date().toISOString(),
  };
}

function chunkRows(rows: DrugCatalogRow[], size: number): DrugCatalogRow[][] {
  const chunks: DrugCatalogRow[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}
