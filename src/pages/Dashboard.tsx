import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { ContractTypeBadge } from "@/components/ContractTypeBadge";
import { exportToExcel } from "@/lib/export";
import { formatAmountInLakhsOrCr, parseAmount } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Download,
  Search,
  Upload,
  Eye,
  BarChart3,
  DollarSign,
  Calendar,
  Shield,
  Play,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [runningAgent, setRunningAgent] = useState(false);

  const handleRunAllAnalyses = async () => {
    setRunningAgent(true);
    try {
      const { data, error } = await supabase.functions.invoke("run-all-analyses");
      if (error) throw error;
      toast.success(`Processed ${data.processed} contracts (${data.failed} failed)`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Agent failed");
    } finally {
      setRunningAgent(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [contractsRes, analysesRes] = await Promise.all([
      supabase.from("contracts").select("*").order("created_at", { ascending: false }),
      supabase.from("contract_analyses").select("*"),
    ]);
    if (!contractsRes.error && contractsRes.data) setContracts(contractsRes.data);
    if (!analysesRes.error && analysesRes.data) setAnalyses(analysesRes.data);
    setLoading(false);
  };

  const filtered = contracts.filter((c) => {
    const matchesType = filterType === "all" || c.contract_type === filterType;
    const matchesSearch =
      !search ||
      c.uploaded_file_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.scope_of_work?.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const totalValue = contracts.reduce((sum, c) => sum + parseAmount(c.total_contract_value), 0);

  // Aggregate risk metrics
  const highRiskCount = analyses.reduce((sum, a) => {
    const legalHigh = (a.legal_risks as any[])?.filter((r: any) => r.severity === "high").length || 0;
    const paymentHigh = (a.payment_delay_flags as any[])?.filter((r: any) => r.severity === "high").length || 0;
    return sum + legalHigh + paymentHigh;
  }, 0);

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage and analyze your contract portfolio
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => exportToExcel(filtered)}
              disabled={filtered.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
            <Button
              variant="outline"
              onClick={handleRunAllAnalyses}
              disabled={runningAgent || contracts.length === 0}
            >
              {runningAgent ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Analyze All
            </Button>
            <Link to="/upload">
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload Contract
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={BarChart3}
            label="Total Contracts"
            value={contracts.length.toString()}
          />
          <StatCard
            icon={DollarSign}
            label="Portfolio Value"
            value={formatAmountInLakhsOrCr(totalValue)}
          />
          <StatCard
            icon={Calendar}
            label="Active Types"
            value={
              new Set(contracts.map((c) => c.contract_type).filter(Boolean)).size.toString()
            }
          />
          <StatCard
            icon={Shield}
            label="High Risks"
            value={highRiskCount.toString()}
            alert={highRiskCount > 0}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search contracts..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Time & Material">Time & Material</SelectItem>
              <SelectItem value="Fixed Price">Fixed Price</SelectItem>
              <SelectItem value="Fixed Time">Fixed Time</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground font-medium">No contracts found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Upload your first contract to get started
              </p>
              <Link to="/upload" className="mt-4">
                <Button variant="outline" size="sm">
                  <Upload className="mr-2 h-3.5 w-3.5" />
                  Upload
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold">File Name</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Value</TableHead>
                  <TableHead className="font-semibold">Billing</TableHead>
                  <TableHead className="font-semibold">Period</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="font-medium max-w-[200px] truncate">
                      <div className="flex items-center gap-2">
                        {c.uploaded_file_name}
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Rev {(c as any).revision_number ?? 0}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ContractTypeBadge type={c.contract_type} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatAmountInLakhsOrCr(c.total_contract_value)}
                    </TableCell>
                    <TableCell className="text-sm">{c.billing_cycle || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.start_date || "?"} → {c.end_date || "?"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/contract/${c.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className={`rounded-xl border bg-card p-5 flex items-center gap-4 ${alert ? "border-destructive/40" : "border-border"}`}>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${alert ? "bg-destructive/10" : "bg-accent/10"}`}>
        <Icon className={`h-5 w-5 ${alert ? "text-destructive" : "text-accent"}`} />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}
