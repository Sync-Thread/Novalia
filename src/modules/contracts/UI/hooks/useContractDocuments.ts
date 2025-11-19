import { useState, useEffect } from "react";
import { supabase } from "../../../../core/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export interface ContractDocument {
  id: string;
  contractId: string;
  s3Key: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  version: number;
  uploadedAt: string;
  userId: string;
}

export function useContractDocuments(contractId: string | null) {
  const [documents, setDocuments] = useState<ContractDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contractId) {
      setDocuments([]);
      return;
    }

    const fetchDocuments = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from("contract_documents")
          .select("*")
          .eq("contract_id", contractId)
          .order("uploaded_at", { ascending: false });

        if (fetchError) {
          console.error("Error fetching contract documents:", fetchError);
          setError(fetchError.message);
          return;
        }

        const mapped: ContractDocument[] = (data || []).map((row: any) => ({
          id: row.id,
          contractId: row.contract_id,
          s3Key: row.s3_key,
          fileName: row.file_name,
          contentType: row.content_type,
          fileSize: row.file_size,
          version: row.version,
          uploadedAt: row.uploaded_at,
          userId: row.user_id,
        }));

        setDocuments(mapped);
      } catch (err) {
        console.error("Error in useContractDocuments:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();

    // Subscribe to realtime changes
    console.log(`🔔 Setting up realtime subscription for contract ${contractId}`);
    const channel = supabase
      .channel(`contract_documents:${contractId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contract_documents",
          filter: `contract_id=eq.${contractId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log("📄 Realtime document change received:", payload.eventType, payload);

          if (payload.eventType === "INSERT") {
            const newDoc: ContractDocument = {
              id: payload.new.id,
              contractId: payload.new.contract_id,
              s3Key: payload.new.s3_key,
              fileName: payload.new.file_name,
              contentType: payload.new.content_type,
              fileSize: payload.new.file_size,
              version: payload.new.version,
              uploadedAt: payload.new.uploaded_at,
              userId: payload.new.user_id,
            };
            console.log("➕ Adding new document to list:", newDoc.id);
            setDocuments((prev) => [newDoc, ...prev]);
          } else if (payload.eventType === "DELETE") {
            console.log("➖ Removing document from list:", payload.old.id);
            setDocuments((prev) => prev.filter((doc) => doc.id !== payload.old.id));
          } else if (payload.eventType === "UPDATE") {
            console.log("✏️ Updating document in list:", payload.new.id);
            setDocuments((prev) =>
              prev.map((doc) =>
                doc.id === payload.new.id
                  ? {
                      id: payload.new.id,
                      contractId: payload.new.contract_id,
                      s3Key: payload.new.s3_key,
                      fileName: payload.new.file_name,
                      contentType: payload.new.content_type,
                      fileSize: payload.new.file_size,
                      version: payload.new.version,
                      uploadedAt: payload.new.uploaded_at,
                      userId: payload.new.user_id,
                    }
                  : doc
              )
            );
          }
        }
      )
      .subscribe((status) => {
        console.log("🔔 Realtime subscription status:", status);
      });

    return () => {
      console.log(`🔕 Removing realtime subscription for contract ${contractId}`);
      supabase.removeChannel(channel);
    };
  }, [contractId]);

  return { documents, loading, error };
}

// Helper function to get document count for a contract (can be used in list views)
export async function getContractDocumentCount(contractId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("contract_documents")
      .select("*", { count: "exact", head: true })
      .eq("contract_id", contractId);

    if (error) {
      console.error("Error counting documents:", error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error("Error in getContractDocumentCount:", err);
    return 0;
  }
}
