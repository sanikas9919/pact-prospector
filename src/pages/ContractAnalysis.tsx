import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  DollarSign,
  Users,
  Loader2,
  RefreshCw,
  Briefcase,
  Scale,
  Truck,
} from "lucide-react";

type RiskItem = { severity: string; title: string; description: string };
type FinancialExposure = {
  risk_level: string;
  total_exposure_estimate: string;
  key_factors: string[];
  mitigation_summary: string;
};
type RoleSummaries = {
  finance_team: string;
  legal_team: string;
  delivery_team: string;
};
type AnalysisData = {
  legal_risks: RiskItem[];
  payment_delay_flags: RiskItem[];
  financial_exposure: FinancialExposure;
  role_summaries: RoleSummaries;
};

const severityColor: Record<string, string> = {
  high: "bg-destructive/15 text-destructive border-destructive/30",
  medium: "bg-warning/15 text-warning border-warning/30",
  low: "bg-success/15 text-success border-success/30",
};

const severityLabel: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export default function ContractAnalysis() {
  const { id } = useParams<{ id: string }>();
  const [contract, setContract] = useState<any>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    const [contractRes, analysisRes] = await Promise.all([
      supabase.from("contracts").select("*").eq("id", id).single(),
      supabase.from("contract_analyses").select("*").eq("contract_id", id).maybeSingle(),
    ]);

    if (contractRes.data) setContract(contractRes.data);
    if (analysisRes.data) {
      setAnalysis({
        legal_risks: analysisRes.data.legal_risks as unknown as RiskItem[],
        payment_delay_flags: analysisRes.data.payment_delay_flags as unknown as RiskItem[],
        financial_exposure: analysisRes.data.financial_exposure as unknown as FinancialExposure,
        role_summaries: analysisRes.data.role_summaries as unknown as RoleSummaries,
      });
    }
    setLoading(false);
  };

  const runAnalysis = async () => {
    if (!contract) return;
    setAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-contract", {
        body: { contract },
      });

      if (error) throw error;

      // Upsert into DB
      const { error: dbError } = await supabase
        .from("contract_analyses")
        .upsert(
          {
            contract_id: id!,
            legal_risks: data.legal_risks,
            payment_delay_flags: data.payment_delay_flags,
            financial_exposure: data.financial_exposure,
            role_summaries: data.role_summaries,
          },
          { onConflict: "contract_id" }
        );

      if (dbError) throw dbError;

      setAnalysis(data);
      toast.success("Analysis complete!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to analyze contract");
    } finally {
      setAnalyzing(false);
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
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link to={`/contract/${id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Contract
            </Button>
          </Link>
          <Button onClick={runAnalysis} disabled={analyzing} size="sm">
            {analyzing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {analysis ? "Re-analyze" : "Run Analysis"}
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Contract Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {contract.uploaded_file_name}
          </p>
        </div>

        {!analysis ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h2 className="text-lg font-semibold mb-2">No analysis yet</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Click "Run Analysis" to detect risks, flag payment issues, predict financial exposure, and generate role-based summaries.
            </p>
            <Button onClick={runAnalysis} disabled={analyzing}>
              {analyzing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Shield className="mr-2 h-4 w-4" />
              )}
              Run AI Analysis
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Legal Risks */}
            <AnalysisSection
              icon={Shield}
              title="Legal Risks"
              iconColor="text-destructive"
            >
              <div className="space-y-3">
                {analysis.legal_risks.map((risk, i) => (
                  <RiskCard key={i} item={risk} />
                ))}
              </div>
            </AnalysisSection>

            {/* Payment Delay Flags */}
            <AnalysisSection
              icon={AlertTriangle}
              title="Payment Delay Flags"
              iconColor="text-warning"
            >
              <div className="space-y-3">
                {analysis.payment_delay_flags.map((flag, i) => (
                  <RiskCard key={i} item={flag} />
                ))}
              </div>
            </AnalysisSection>

            {/* Financial Exposure */}
            <AnalysisSection
              icon={DollarSign}
              title="Financial Exposure"
              iconColor="text-accent"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Risk Level:</span>
                    <Badge className={severityColor[analysis.financial_exposure.risk_level] || ""}>
                      {severityLabel[analysis.financial_exposure.risk_level] || analysis.financial_exposure.risk_level}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Exposure:</span>
                    <span className="text-sm font-semibold text-foreground">
                      {analysis.financial_exposure.total_exposure_estimate}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Key Factors</p>
                  <ul className="space-y-1">
                    {analysis.financial_exposure.key_factors.map((f, i) => (
                      <li key={i} className="text-sm text-foreground flex items-start gap-2">
                        <span className="text-accent mt-1">•</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Mitigation Summary</p>
                  <p className="text-sm text-foreground">{analysis.financial_exposure.mitigation_summary}</p>
                </div>
              </div>
            </AnalysisSection>

            {/* Role-Based Summaries */}
            <AnalysisSection
              icon={Users}
              title="Role-Based Summaries"
              iconColor="text-info"
            >
              <div className="grid gap-4 md:grid-cols-3">
                <RoleSummaryCard
                  icon={Briefcase}
                  role="Finance Team"
                  summary={analysis.role_summaries.finance_team}
                />
                <RoleSummaryCard
                  icon={Scale}
                  role="Legal Team"
                  summary={analysis.role_summaries.legal_team}
                />
                <RoleSummaryCard
                  icon={Truck}
                  role="Delivery Team"
                  summary={analysis.role_summaries.delivery_team}
                />
              </div>
            </AnalysisSection>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function AnalysisSection({
  icon: Icon,
  title,
  iconColor,
  children,
}: {
  icon: any;
  title: string;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`h-5 w-5 ${iconColor}`} />
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function RiskCard({ item }: { item: RiskItem }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-muted/20 p-3 border border-border/50">
      <Badge className={`mt-0.5 shrink-0 text-[10px] ${severityColor[item.severity] || ""}`}>
        {severityLabel[item.severity] || item.severity}
      </Badge>
      <div>
        <p className="text-sm font-medium text-foreground">{item.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
      </div>
    </div>
  );
}

function RoleSummaryCard({
  icon: Icon,
  role,
  summary,
}: {
  icon: any;
  role: string;
  summary: string;
}) {
  const handleCopy = () => {
    navigator.clipboard.writeText(`${role}:\n${summary}`);
    toast.success(`${role} summary copied!`);
  };

  return (
    <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold">{role}</h3>
        </div>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleCopy}>
          Copy
        </Button>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{summary}</p>
    </div>
  );
}
