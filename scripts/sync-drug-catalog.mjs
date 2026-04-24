#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

const SOURCE_ORDER = ["mfds_health", "mfds_permit", "mfds_easy"];
const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_PAGE_LIMIT = 10;
const UPSERT_CHUNK_SIZE = 200;

const SOURCE_CONFIGS = {
  mfds_permit: {
    label: "MFDS drug permit",
    baseUrl: "https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07/getDrugPrdtPrmsnInq07",
    serviceKeyName: "serviceKey",
    mapRow: mapPermitRow,
  },
  mfds_easy: {
    label: "MFDS e-yak",
    baseUrl: "https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList",
    serviceKeyName: "ServiceKey",
    mapRow: mapEasyRow,
  },
  mfds_health: {
    label: "MFDS health functional food",
    baseUrl: "https://apis.data.go.kr/1471000/HtfsInfoService03/getHtfsList01",
    serviceKeyName: "ServiceKey",
    mapRow: mapHealthRow,
  },
};

async function main() {
  loadLocalEnvFile(".env.sync");
  loadLocalEnvFile(".env.sync.local");

  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dataGoKrServiceKey = process.env.DATA_GO_KR_SERVICE_KEY;

  if (!supabaseUrl) throw new Error("SUPABASE_URL or VITE_SUPABASE_URL is required.");
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required.");
  if (!dataGoKrServiceKey) throw new Error("DATA_GO_KR_SERVICE_KEY is required.");

  const sources = resolveSources(options.source);
  const pageSize = clampNumber(options.pageSize, DEFAULT_PAGE_SIZE, 20, 500);
  const startPage = clampNumber(options.startPage, 1, 1, 1000000);
  const pageLimit = options.allPages
    ? Number.POSITIVE_INFINITY
    : clampNumber(options.pages, DEFAULT_PAGE_LIMIT, 1, 1000000);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const source of sources) {
    await syncSource(supabase, {
      dataGoKrServiceKey,
      dryRun: options.dryRun,
      pageLimit,
      pageSize,
      resetSource: options.resetSource,
      source,
      startPage,
    });
  }
}

function loadLocalEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseArgs(args) {
  return args.reduce(
    (options, arg) => {
      if (arg === "--help" || arg === "-h") return { ...options, help: true };
      if (arg === "--all-pages") return { ...options, allPages: true };
      if (arg === "--dry-run") return { ...options, dryRun: true };
      if (arg === "--reset-source") return { ...options, resetSource: true };
      if (arg.startsWith("--source=")) return { ...options, source: arg.slice("--source=".length) };
      if (arg.startsWith("--pages=")) return { ...options, pages: Number(arg.slice("--pages=".length)) };
      if (arg.startsWith("--page-size=")) {
        return { ...options, pageSize: Number(arg.slice("--page-size=".length)) };
      }
      if (arg.startsWith("--start-page=")) {
        return { ...options, startPage: Number(arg.slice("--start-page=".length)) };
      }
      throw new Error(`Unknown option: ${arg}`);
    },
    {
      allPages: false,
      dryRun: false,
      help: false,
      pages: DEFAULT_PAGE_LIMIT,
      pageSize: DEFAULT_PAGE_SIZE,
      resetSource: false,
      source: "all",
      startPage: 1,
    },
  );
}

function resolveSources(source) {
  if (!source || source === "all") return SOURCE_ORDER;
  if (!SOURCE_CONFIGS[source]) {
    throw new Error(`Unknown source: ${source}. Use one of: all, ${SOURCE_ORDER.join(", ")}`);
  }
  return [source];
}

function printHelp() {
  console.log(`Usage:
  npm run sync:drug-catalog -- [options]

Options:
  --source=all|mfds_health|mfds_permit|mfds_easy
  --pages=10
  --all-pages
  --start-page=1
  --page-size=100
  --reset-source
  --dry-run

Required environment variables:
  SUPABASE_URL or VITE_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  DATA_GO_KR_SERVICE_KEY
`);
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

async function syncSource(
  supabase,
  { dataGoKrServiceKey, dryRun, pageLimit, pageSize, resetSource, source, startPage },
) {
  const config = SOURCE_CONFIGS[source];
  let runId = null;
  let fetchedTotal = 0;
  let upsertedTotal = 0;
  let totalCount = Number.POSITIVE_INFINITY;
  let pageNo = startPage;
  let pagesRead = 0;
  let reachedEnd = false;

  console.log(`\n[${source}] ${config.label}`);
  console.log(
    `[${source}] startPage=${startPage}, pageSize=${pageSize}, pages=${
      Number.isFinite(pageLimit) ? pageLimit : "all"
    }, dryRun=${dryRun}`,
  );

  try {
    if (!dryRun) {
      const { data, error } = await supabase
        .from("drug_catalog_sync_runs")
        .insert({ source, status: "running" })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      runId = data.id;
    }

    if (resetSource && !dryRun) {
      const { error } = await supabase.from("drug_catalog_items").delete().eq("source", source);
      if (error) throw new Error(error.message);
      console.log(`[${source}] removed existing catalog rows`);
    }

    while (pagesRead < pageLimit) {
      const payload = await fetchDataGoKrJson(
        config.baseUrl,
        config.serviceKeyName,
        dataGoKrServiceKey,
        {
          type: "json",
          pageNo: String(pageNo),
          numOfRows: String(pageSize),
        },
      );
      const items = normalizeItems(extractItems(payload));
      if (!items.length) {
        console.log(`[${source}] page ${pageNo}: no rows, stopping`);
        reachedEnd = true;
        break;
      }

      totalCount = extractTotalCount(payload) || totalCount;
      const mappedRows = items
        .map((item, index) => config.mapRow(item, (pageNo - 1) * pageSize + index))
        .filter(Boolean);
      const rows = dedupeCatalogRows(mappedRows);

      if (!rows.length) {
        console.warn(`[${source}] page ${pageNo}: mapped 0 rows. sample keys: ${sampleKeys(items[0])}`);
      }
      if (mappedRows.length > rows.length) {
        console.warn(
          `[${source}] page ${pageNo}: removed ${mappedRows.length - rows.length} duplicate catalog rows`,
        );
      }

      if (!dryRun && rows.length) {
        await upsertRows(supabase, rows);
      }

      fetchedTotal += items.length;
      upsertedTotal += rows.length;
      pagesRead += 1;

      const totalLabel = Number.isFinite(totalCount) ? `/${totalCount}` : "";
      console.log(
        `[${source}] page ${pageNo}: fetched ${items.length}, upserted ${rows.length}, total ${fetchedTotal}${totalLabel}`,
      );

      if (items.length < pageSize || fetchedTotal >= totalCount) {
        reachedEnd = true;
        break;
      }
      pageNo += 1;
    }

    if (!dryRun && runId) {
      const { error } = await supabase
        .from("drug_catalog_sync_runs")
        .update({
          status: "completed",
          fetched_count: fetchedTotal,
          upserted_count: upsertedTotal,
          finished_at: new Date().toISOString(),
        })
        .eq("id", runId);
      if (error) throw new Error(error.message);
    }

    const nextPage = reachedEnd ? null : pageNo;
    console.log(
      `[${source}] done: fetched=${fetchedTotal}, upserted=${upsertedTotal}, nextPage=${nextPage}`,
    );
  } catch (error) {
    if (!dryRun && runId) {
      await supabase
        .from("drug_catalog_sync_runs")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : String(error),
          finished_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }
    throw error;
  }
}

async function upsertRows(supabase, rows) {
  for (let index = 0; index < rows.length; index += UPSERT_CHUNK_SIZE) {
    const chunk = rows.slice(index, index + UPSERT_CHUNK_SIZE);
    const { error } = await supabase
      .from("drug_catalog_items")
      .upsert(chunk, { onConflict: "source,source_record_id" });
    if (error) throw new Error(error.message);
  }
}

function dedupeCatalogRows(rows) {
  return Array.from(
    rows
      .reduce((seen, row) => {
        seen.set(`${row.source}:${row.source_record_id}`, row);
        return seen;
      }, new Map())
      .values(),
  );
}

async function fetchDataGoKrJson(baseUrl, serviceKeyName, serviceKey, params) {
  const keyCandidates = Array.from(new Set([serviceKey, safeDecode(serviceKey)])).filter(Boolean);

  for (const key of keyCandidates) {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([name, value]) => {
      url.searchParams.set(name, value);
    });
    url.searchParams.set(serviceKeyName, key);

    const response = await fetch(url);
    if (!response.ok) continue;

    const payload = await response.json().catch(() => ({}));
    const resultCode = String(
      payload?.response?.header?.resultCode || payload?.header?.resultCode || "",
    );

    if (resultCode && resultCode !== "00") continue;
    return payload;
  }

  return {};
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeItems(items) {
  if (!items) return [];
  if (Array.isArray(items)) return items.flatMap((item) => normalizeItemEntry(item));
  if (Array.isArray(items.item)) return items.item.flatMap((item) => normalizeItemEntry(item));
  if (items.item) return normalizeItemEntry(items.item);
  if (typeof items === "object") return [items];
  return [];
}

function normalizeItemEntry(item) {
  if (!item) return [];
  if (Array.isArray(item)) return item.flatMap((entry) => normalizeItemEntry(entry));
  if (typeof item === "object" && item.item) return normalizeItems(item.item);
  if (typeof item === "object") return [item];
  return [];
}

function extractItems(payload) {
  return payload?.response?.body?.items || payload?.body?.items;
}

function extractTotalCount(payload) {
  return Number(payload?.response?.body?.totalCount || payload?.body?.totalCount || 0);
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s\-_/()[\].,]/g, "");
}

function compactTextList(values) {
  return values
    .flatMap((value) => String(value || "").split(/\n+/))
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseIngredients(value) {
  return String(value || "")
    .split(/[,\n;]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => ({ name: part }));
}

function parseFunctionalClaims(value) {
  const cleaned = String(value || "")
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

function pickText(item, candidates) {
  const entries = Object.entries(item || {});
  for (const candidate of candidates) {
    const exactValue = item?.[candidate];
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

function sampleKeys(item) {
  return Object.keys(item || {}).slice(0, 20).join(", ") || "none";
}

function buildSearchText({ productName, manufacturer, ingredients, efficacy, usage, warnings, interactions }) {
  return [
    productName,
    manufacturer || "",
    ...(ingredients || []).map((item) => [item.name, item.amount].filter(Boolean).join(" ")),
    efficacy || "",
    usage || "",
    ...(warnings || []),
    ...(interactions || []),
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapPermitRow(item, index) {
  const productName = item.ITEM_NAME?.trim();
  if (!productName) return null;

  return buildCatalogRow({
    source: "mfds_permit",
    sourceRecordId: item.ITEM_SEQ || `permit-${index}`,
    category: "drug",
    productName,
    manufacturer: item.ENTP_NAME?.trim() || null,
    ingredients: parseIngredients(item.MAIN_ITEM_INGR || item.MAIN_INGR || ""),
    dosageForm: item.CHART?.trim() || null,
    efficacy: item.EE_DOC_DATA?.trim() || null,
    usage: item.UD_DOC_DATA?.trim() || null,
    warnings: compactTextList([item.NB_DOC_DATA]),
    interactions: [],
    payload: item,
  });
}

function mapEasyRow(item, index) {
  const productName = item.itemName?.trim();
  if (!productName) return null;

  return buildCatalogRow({
    source: "mfds_easy",
    sourceRecordId: item.itemSeq || `easy-${index}`,
    category: "drug",
    productName,
    manufacturer: item.entpName?.trim() || null,
    ingredients: [],
    dosageForm: null,
    efficacy: item.efcyQesitm?.trim() || null,
    usage: item.useMethodQesitm?.trim() || null,
    warnings: compactTextList([item.atpnWarnQesitm, item.atpnQesitm, item.seQesitm]),
    interactions: compactTextList([item.intrcQesitm]),
    payload: item,
  });
}

function mapHealthRow(item, index) {
  const productName = pickText(item, [
    "PRDUCT",
    "PRDLST_NM",
    "PRDLST_NAME",
    "PRDUCT_NM",
    "PRODUCT_NM",
    "ITEM_NAME",
    "itemName",
  ]);
  if (!productName) return null;

  const statementNo = pickText(item, [
    "STTEMNT_NO",
    "PRDLST_REPORT_NO",
    "PRDLST_MNF_MANAGE_NO",
    "GU_PRDLST_MNF_MANAGE_NO",
    "LCNS_NO",
  ]);
  const manufacturer = pickText(item, ["ENTRPS", "BSSH_NM", "ENTP_NM", "ENTP_NAME", "MANUFACTURER"]);
  const efficacy = pickText(item, ["MAIN_FNCTN", "PRIMARY_FNCLTY", "FNCLTY_CN", "HF_FNCLTY_MTRAL_CN"]);
  const usage = pickText(item, ["SRV_USE", "NTK_MTHD", "DAY_INTK_MTHD", "INTAKE_MTHD", "USE_METHOD"]);
  const standard = pickText(item, ["BASE_STANDARD", "STDR_STND", "STANDARD", "RAWMTRL_NM"]);
  const dosageForm = pickText(item, ["SUNGSANG", "DISPOS", "SHAP", "DOSAGE_FORM"]);
  const warning = pickText(item, [
    "INTAKE_HINT1",
    "IFTKN_ATNT_MATR_CN",
    "INTAKE_HINT",
    "CAUTION",
    "ATNT_MATR_CN",
  ]);
  const storage = pickText(item, ["PRSRV_PD", "CSTDY_MTHD", "STORAGE_METHOD"]);
  const distribution = pickText(item, ["DISTB_PD", "POG_DAYCNT", "EXPIRATION_DATE"]);

  return buildCatalogRow({
    source: "mfds_health",
    sourceRecordId: statementNo || `health-${index}`,
    category: "supplement",
    productName,
    manufacturer: manufacturer || null,
    ingredients: parseFunctionalClaims(efficacy || standard),
    dosageForm: dosageForm || null,
    efficacy: efficacy || null,
    usage: usage || null,
    warnings: compactTextList([warning, storage, distribution]),
    interactions: [],
    payload: item,
  });
}

function buildCatalogRow(input) {
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

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
