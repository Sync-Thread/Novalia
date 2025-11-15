import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../../core/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

/**
 * Hook to get document counts for multiple contracts efficiently with realtime updates
 */
export function useContractDocumentCounts(contractIds: string[]) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const contractIdsRef = useRef<string[]>(contractIds);

  // Update ref when contractIds change
  useEffect(() => {
    contractIdsRef.current = contractIds;
  }, [contractIds]);

  useEffect(() => {
    if (contractIds.length === 0) {
      setCounts({});
      return;
    }

    const fetchCounts = async () => {
      setLoading(true);

      try {
        // Fetch all documents for these contracts
        const { data, error } = await supabase
          .from("contract_documents")
          .select("contract_id")
          .in("contract_id", contractIds);

        if (error) {
          console.error("❌ Error fetching document counts:", error);
          setLoading(false);
          return;
        }

        // Count documents per contract
        const countMap: Record<string, number> = {};
        (data || []).forEach((row: { contract_id: string }) => {
          countMap[row.contract_id] = (countMap[row.contract_id] || 0) + 1;
        });

        // Ensure all contractIds have a count (even if 0)
        contractIds.forEach(id => {
          if (!(id in countMap)) {
            countMap[id] = 0;
          }
        });

        console.log("📊 Document counts loaded:", countMap);
        setCounts(countMap);
      } catch (err) {
        console.error("❌ Error in useContractDocumentCounts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();

    // Subscribe to realtime changes for all contracts
    console.log("🔔 Setting up realtime subscription for document counts");
    const channel = supabase
      .channel("contract_documents_counts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contract_documents",
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log("📊 Realtime count change received:", payload.eventType, payload);

          if (payload.eventType === "INSERT") {
            const contractId = payload.new.contract_id;
            // Use ref to get current contractIds to avoid stale closure
            if (contractIdsRef.current.includes(contractId)) {
              console.log(`➕ Incrementing count for contract ${contractId}`);
              setCounts((prev) => ({
                ...prev,
                [contractId]: (prev[contractId] || 0) + 1,
              }));
            }
          } else if (payload.eventType === "DELETE") {
            const contractId = payload.old.contract_id;
            if (contractIdsRef.current.includes(contractId)) {
              console.log(`➖ Decrementing count for contract ${contractId}`);
              setCounts((prev) => ({
                ...prev,
                [contractId]: Math.max(0, (prev[contractId] || 0) - 1),
              }));
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("🔔 Realtime subscription status:", status);
      });

    return () => {
      console.log("🔕 Removing realtime subscription for document counts");
      supabase.removeChannel(channel);
    };
  }, [contractIds.length, contractIds.join(",")]); // Re-run when contract IDs change

  return { counts, loading };
}
