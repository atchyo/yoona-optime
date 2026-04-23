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
    { source: "mfds_health", pageCount: 5 },
    { source: "mfds_permit", pageCount: 5 },
    { source: "mfds_easy", pageCount: 5 },
  ] as const;

  const summaries: DrugCatalogSyncSummary[] = [];

  for (const plan of sourcePlans) {
    let nextPage = 1;
    let hasMore = true;
    let fetchedTotal = 0;
    let upsertedTotal = 0;

    while (hasMore) {
      const { data, error } = await supabase.functions.invoke("sync-drug-catalog", {
        body: {
          source: plan.source,
          reset: false,
          startPage: nextPage,
          pageCount: plan.pageCount,
          pageSize: 100,
        },
      });

      if (error) {
        throw new Error(error.message || `${plan.source} 동기화에 실패했습니다.`);
      }

      if (!data || typeof data !== "object") {
        throw new Error(`${plan.source} 동기화 응답 형식이 올바르지 않습니다.`);
      }

      if ((data as { ok?: boolean; error?: string }).ok === false) {
        throw new Error((data as { error?: string }).error || `${plan.source} 동기화에 실패했습니다.`);
      }

      const summary = data as DrugCatalogSyncSummary & { ok?: boolean };
      fetchedTotal += Number(summary.fetchedCount || 0);
      upsertedTotal += Number(summary.upsertedCount || 0);
      hasMore = Boolean(summary.hasMore);
      nextPage = Number(summary.nextPage || 0);

      if (!hasMore || !nextPage) {
        summaries.push({
          source: plan.source,
          fetchedCount: fetchedTotal,
          upsertedCount: upsertedTotal,
          hasMore: false,
          nextPage: null,
          totalCount: summary.totalCount,
        });
        break;
      }

      if (fetchedTotal > 100000) {
        throw new Error(`${plan.source} 동기화가 예상보다 오래 걸려 중단했습니다.`);
      }
    }
  }

  return summaries;
}
