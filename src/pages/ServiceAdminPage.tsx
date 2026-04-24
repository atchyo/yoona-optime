import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { drugMatches, interactionRules } from "../data/demoData";
import { syncDrugCatalog } from "../services/drugSearch";
import { supabase } from "../services/supabaseClient";
import type { DrugSource } from "../types";

interface CatalogCount {
  source: Extract<DrugSource, "mfds_permit" | "mfds_easy" | "mfds_health">;
  label: string;
  count: number;
}

const catalogSources: CatalogCount[] = [
  { source: "mfds_health", label: "건강기능식품정보", count: 0 },
  { source: "mfds_permit", label: "의약품 허가정보", count: 0 },
  { source: "mfds_easy", label: "e약은요", count: 0 },
];

export function ServiceAdminPage(): ReactElement {
  const [catalogCounts, setCatalogCounts] = useState<CatalogCount[]>(catalogSources);
  const [statusMessage, setStatusMessage] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    void loadCatalogCounts();
  }, []);

  async function loadCatalogCounts(): Promise<void> {
    if (!supabase) {
      setCatalogCounts([
        { source: "mfds_health", label: "건강기능식품정보", count: 0 },
        { source: "mfds_permit", label: "의약품 허가정보", count: drugMatches.length },
        { source: "mfds_easy", label: "e약은요", count: 0 },
      ]);
      return;
    }

    const client = supabase;
    const nextCounts = await Promise.all(
      catalogSources.map(async (item) => {
        const { count, error } = await client
          .from("drug_catalog_items")
          .select("id", { count: "exact", head: true })
          .eq("source", item.source);

        if (error) {
          return { ...item, count: 0 };
        }

        return { ...item, count: count || 0 };
      }),
    );

    setCatalogCounts(nextCounts);
  }

  async function handleSync(): Promise<void> {
    setIsSyncing(true);
    setStatusMessage("공식 DB 인덱스를 보강하는 중입니다.");
    try {
      const summaries = await syncDrugCatalog();
      await loadCatalogCounts();
      const total = summaries.reduce((sum, summary) => sum + summary.upsertedCount, 0);
      setStatusMessage(`보강 완료: ${total.toLocaleString("ko-KR")}건 확인`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "약 DB 보강 중 문제가 발생했습니다.");
    } finally {
      setIsSyncing(false);
    }
  }

  const totalCatalogCount = catalogCounts.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="admin-layout">
      <section className="card">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">Service Admin</p>
            <h2>약 DB 연동 상태</h2>
            <p className="muted">
              검색은 Supabase에 동기화된 공식 DB 인덱스를 먼저 사용하고, 필요할 때 API 보강을 시도합니다.
            </p>
          </div>
          <button className="primary-button" disabled={isSyncing || !supabase} onClick={handleSync} type="button">
            {isSyncing ? "동기화 중" : "DB 보강"}
          </button>
        </div>
        <div className="stat-grid">
          <div className="stat-card"><span>공식 DB 인덱스</span><strong>{totalCatalogCount.toLocaleString("ko-KR")}</strong></div>
          <div className="stat-card"><span>규칙</span><strong>{interactionRules.length}</strong></div>
          <div className="stat-card"><span>AI 비용</span><strong>0원</strong></div>
        </div>
        <div className="catalog-source-grid">
          {catalogCounts.map((item) => (
            <div className="catalog-source-card" key={item.source}>
              <span>{item.label}</span>
              <strong>{item.count.toLocaleString("ko-KR")}건</strong>
            </div>
          ))}
        </div>
        {statusMessage && <p className="form-note">{statusMessage}</p>}
      </section>
    </div>
  );
}
