import { drugMatches } from "../data/demoData";
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
      // Fall through to local demo matches so the app remains usable without deployed functions.
    }
  }

  const normalized = trimmed.toLocaleLowerCase("ko-KR");
  const matches = drugMatches.filter((match) => {
    const haystack = [
      match.productName,
      match.manufacturer,
      ...match.ingredients.map((ingredient) => ingredient.name),
    ]
      .join(" ")
      .toLocaleLowerCase("ko-KR");
    return haystack.includes(normalized) || normalized.includes(match.productName.toLocaleLowerCase("ko-KR").slice(0, 4));
  });

  return matches.length ? matches : drugMatches.slice(0, 3).map((match) => ({ ...match, confidence: Math.max(0.45, match.confidence - 0.2) }));
}
