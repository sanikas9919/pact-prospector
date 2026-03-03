import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { ContractTypeBadge } from "@/components/ContractTypeBadge";
import { exportToExcel, generateExecutionSummary } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Copy,
  Calendar,
  DollarSign,
  RefreshCw,
  FileText,
  ClipboardList,
  Shield,
  GitBranch,
} from "lucide-react";

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [revisions, setRevisions] = useState<any[]>([]);

  useEffect(() => {
    if (id) fetchContract();
  }, [id]);

  const fetchContract = async () => {
    const { data, error } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", id)
      .single();
    if (!error && data) {
      setContract(data);
      // Fetch all revisions in the same family
      const parentId = (data as any).parent_contract_id || data.id;
      const { data: revs } = await supabase
        .from("contracts")
        .select("id, uploaded_file_name, revision_number, created_at")
        .or(`id.eq.${parentId},parent_contract_id.eq.${parentId}`)
        .order("revision_number", { ascending: true });
      setRevisions(revs || []);
    }
    setLoading(false);
  };

  const handleCopyScope = () => {
    if (!contract) return;
    const summary = generateExecutionSummary(contract);
    navigator.clipboard.writeText(summary);
    toast.success("Execution summary copied to clipboard!");
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (!contract) {
    return (
      <AppLayout>
        <div className="text-center py-24">
          <p className="text-muted-foreground">Contract not found</p>
          <Link to="/" className="mt-4 inline-block">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        {/* Back + Actions */}
        <div className="flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToExcel([contract], contract.uploaded_file_name)}
            >
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
            <Button size="sm" onClick={handleCopyScope}>
              <Copy className="mr-2 h-4 w-4" />
              Generate Execution Summary
            </Button>
            <Link to={`/contract/${id}/analysis`}>
              <Button size="sm" variant="secondary">
                <Shield className="mr-2 h-4 w-4" />
                AI Analysis
              </Button>
            </Link>
          </div>
        </div>

        {/* Header Card */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">
                  {contract.uploaded_file_name}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Uploaded {new Date(contract.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <ContractTypeBadge type={contract.contract_type} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 mt-6">
            <DetailItem
              icon={Calendar}
              label="Contract Period"
              value={`${contract.start_date || "TBD"} → ${contract.end_date || "TBD"}`}
            />
            <DetailItem
              icon={DollarSign}
              label="Total Value"
              value={contract.total_contract_value || "Not specified"}
            />
            <DetailItem
              icon={RefreshCw}
              label="Billing Cycle"
              value={contract.billing_cycle || "Not specified"}
            />
            <DetailItem
              icon={DollarSign}
              label="Billing Amount"
              value={contract.billing_amount || "Not specified"}
            />
          </div>
        </div>

        {/* Scope of Work */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="h-5 w-5 text-accent" />
            <h2 className="text-base font-semibold">Scope of Work</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {contract.scope_of_work || "No scope of work available."}
          </p>
        </div>

        {/* Revision History */}
        {revisions.length > 1 && (
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <GitBranch className="h-5 w-5 text-accent" />
              <h2 className="text-base font-semibold">Revision History</h2>
            </div>
            <div className="space-y-2">
              {revisions.map((rev) => (
                <Link
                  key={rev.id}
                  to={`/contract/${rev.id}`}
                  className={`flex items-center justify-between rounded-lg p-3 transition-colors ${
                    rev.id === id
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-muted/30 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={rev.id === id ? "default" : "outline"} className="text-xs">
                      Rev {rev.revision_number}
                    </Badge>
                    <span className="text-sm font-medium">{rev.uploaded_file_name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(rev.created_at).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-muted/30 p-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
