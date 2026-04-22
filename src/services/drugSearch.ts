import { supabase } from "./supabaseClient";
import type { DrugDatabaseMatch } from "../types";

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
