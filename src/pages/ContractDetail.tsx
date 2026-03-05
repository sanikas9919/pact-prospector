import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { ContractTypeBadge } from "@/components/ContractTypeBadge";
import { exportToExcel, generateExecutionSummary } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  Clock,
  RotateCcw,
} from "lucide-react";

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [previousRevision, setPreviousRevision] = useState<any>(null);
  const [reExtracting, setReExtracting] = useState(false);

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
        .select("*")
        .or(`id.eq.${parentId},parent_contract_id.eq.${parentId}`)
        .order("revision_number", { ascending: true });
      setRevisions(revs || []);

      // Find previous revision for diff
      if (revs && data.revision_number > 0) {
        const prevRev = revs.find(
          (r: any) => r.revision_number === data.revision_number - 1
        );
        setPreviousRevision(prevRev || null);
      } else {
        setPreviousRevision(null);
      }
    }
    setLoading(false);
  };

  const handleCopyScope = () => {
    if (!contract) return;
    const summary = generateExecutionSummary(contract);
    navigator.clipboard.writeText(summary);
    toast.success("Execution summary copied to clipboard!");
  };

  const handleReExtract = async () => {
    if (!contract) return;
    setReExtracting(true);
    try {
      // Fetch the stored document text by re-reading scope + all fields as context
      // We'll send existing data to re-format via AI
      const fieldsText = [
        contract.scope_of_work,
        `Total contract value: ${contract.total_contract_value}`,
        `Billing amount: ${contract.billing_amount}`,
        `Billing cycle: ${contract.billing_cycle}`,
        `Contract type: ${contract.contract_type}`,
        `Start date: ${contract.start_date}`,
        `End date: ${contract.end_date}`,
        contract.project_phases ? `Project phases: ${JSON.stringify(contract.project_phases)}` : "",
      ].filter(Boolean).join("\n");

      const { data, error } = await supabase.functions.invoke("extract-contract", {
        body: { text: fieldsText },
      });

      if (error) throw error;

      // Update the contract in DB
      const { error: updateErr } = await supabase
        .from("contracts")
        .update({
          total_contract_value: data.total_contract_value ?? contract.total_contract_value,
          billing_amount: data.billing_amount ?? contract.billing_amount,
          billing_cycle: data.billing_cycle ?? contract.billing_cycle,
          contract_type: data.contract_type ?? contract.contract_type,
          start_date: data.contract_period?.start_date ?? contract.start_date,
          end_date: data.contract_period?.end_date ?? contract.end_date,
          scope_of_work: data.scope_of_work ?? contract.scope_of_work,
          project_phases: data.project_phases ?? contract.project_phases,
        } as any)
        .eq("id", contract.id);

      if (updateErr) throw updateErr;

      toast.success("Contract re-extracted with updated formatting!");
      fetchContract(); // Refresh
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Re-extraction failed");
    } finally {
      setReExtracting(false);
    }
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
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReExtract}
              disabled={reExtracting}
            >
              <RotateCcw className={`mr-2 h-4 w-4 ${reExtracting ? "animate-spin" : ""}`} />
              {reExtracting ? "Re-extracting…" : "Re-extract"}
            </Button>
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
              value={`${contract.start_date || "Not specified"} → ${contract.end_date || "Ongoing"}`}
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

        {/* Project Phases */}
        <ProjectPhasesSection
          phases={contract.project_phases as any[] | null}
          previousPhases={previousRevision?.project_phases as any[] | null}
          hasRevision={!!previousRevision}
        />

        {/* Revision Changes */}
        {previousRevision && (
          <RevisionChanges current={contract} previous={previousRevision} />
        )}

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

const COMPARE_FIELDS = [
  { key: "total_contract_value", label: "Total Contract Value" },
  { key: "billing_cycle", label: "Billing Cycle" },
  { key: "billing_amount", label: "Billing Amount" },
  { key: "start_date", label: "Start Date" },
  { key: "end_date", label: "End Date" },
  { key: "contract_type", label: "Contract Type" },
  { key: "scope_of_work", label: "Scope of Work" },
];

function RevisionChanges({ current, previous }: { current: any; previous: any }) {
  const changes = COMPARE_FIELDS.filter(
    (f) => (current[f.key] || "") !== (previous[f.key] || "")
  );

  if (changes.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <GitBranch className="h-5 w-5 text-accent" />
          <h2 className="text-base font-semibold">Changes from Rev {previous.revision_number}</h2>
        </div>
        <p className="text-sm text-muted-foreground">No field changes detected between revisions.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <GitBranch className="h-5 w-5 text-accent" />
        <h2 className="text-base font-semibold">
          Changes from Rev {previous.revision_number} → Rev {current.revision_number}
        </h2>
      </div>
      <div className="space-y-4">
        {changes.map((field) => (
          <div key={field.key} className="rounded-lg border border-border overflow-hidden">
            <div className="bg-muted/40 px-4 py-2">
              <span className="text-xs font-semibold text-foreground">{field.label}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
              <div className="px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Previous (Rev {previous.revision_number})</p>
                <p className="text-sm text-muted-foreground line-through whitespace-pre-wrap">
                  {previous[field.key] || "—"}
                </p>
              </div>
              <div className="px-4 py-3 bg-accent/5">
                <p className="text-[10px] uppercase tracking-wider text-accent mb-1">Current (Rev {current.revision_number})</p>
                <p className="text-sm text-foreground font-medium whitespace-pre-wrap">
                  {current[field.key] || "—"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Phase {
  name: string;
  duration: string;
  description?: string | null;
}

function ProjectPhasesSection({
  phases,
  previousPhases,
  hasRevision,
}: {
  phases: Phase[] | null;
  previousPhases: Phase[] | null;
  hasRevision: boolean;
}) {
  if (!phases || phases.length === 0) return null;

  // Build a map of previous phases by name for diff
  const prevMap = new Map<string, Phase>();
  if (previousPhases) {
    previousPhases.forEach((p) => prevMap.set(p.name, p));
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-accent" />
        <h2 className="text-base font-semibold">Project Timeline</h2>
      </div>
      <div className="space-y-3">
        {phases.map((phase, i) => {
          const prev = prevMap.get(phase.name);
          const isNew = hasRevision && !prev;
          const durationChanged = hasRevision && prev && prev.duration !== phase.duration;

          return (
            <div
              key={i}
              className={`flex items-center gap-4 rounded-lg border p-4 ${
                isNew
                  ? "border-success/40 bg-success/5"
                  : durationChanged
                  ? "border-warning/40 bg-warning/5"
                  : "border-border bg-muted/30"
              }`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{phase.name}</p>
                  {isNew && (
                    <Badge variant="outline" className="text-[10px] bg-success/15 text-success border-success/30">
                      NEW
                    </Badge>
                  )}
                  {durationChanged && (
                    <Badge variant="outline" className="text-[10px] bg-warning/15 text-warning border-warning/30">
                      CHANGED
                    </Badge>
                  )}
                </div>
                {phase.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{phase.description}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-medium text-foreground">{phase.duration}</p>
                {durationChanged && prev && (
                  <p className="text-xs text-muted-foreground line-through">{prev.duration}</p>
                )}
              </div>
            </div>
          );
        })}

        {/* Show removed phases from previous revision */}
        {hasRevision && previousPhases && previousPhases
          .filter((p) => !phases.find((c) => c.name === p.name))
          .map((removed, i) => (
            <div
              key={`removed-${i}`}
              className="flex items-center gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 opacity-60"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive text-sm font-bold shrink-0">
                ✕
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-muted-foreground line-through">{removed.name}</p>
                  <Badge variant="outline" className="text-[10px] bg-destructive/15 text-destructive border-destructive/30">
                    REMOVED
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-through">{removed.duration}</p>
            </div>
          ))}
      </div>
    </div>
  );
}
