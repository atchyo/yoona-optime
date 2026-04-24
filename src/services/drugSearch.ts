import { supabase } from "./supabaseClient";
import type { DrugDatabaseMatch } from "../types";

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
    try {
      const { data, error } = await supabase.functions.invoke("drug-search", {
        body: { query: trimmed },
      });
      if (!error && Array.isArray(data?.matches) && data.matches.length > 0) {
        return data.matches as DrugDatabaseMatch[];
      }
    } catch {
      return [];
    }
  }

  return [];
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
