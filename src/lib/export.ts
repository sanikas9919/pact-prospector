import * as XLSX from "xlsx";
import { formatAmountInLakhsOrCr, orFallback } from "./utils";

interface ContractRow {
  id: string;
  uploaded_file_name: string;
  contract_type: string | null;
  start_date: string | null;
  end_date: string | null;
  total_contract_value: string | null;
  billing_cycle: string | null;
  billing_amount: string | null;
  scope_of_work: string | null;
  created_at: string;
}

export function exportToExcel(contracts: ContractRow[], filename = "contracts") {
  const rows = contracts.map((c) => ({
    "File Name": c.uploaded_file_name,
    "Contract Type": c.contract_type || "N/A",
    "Start Date": orFallback(c.start_date, "N/A"),
    "End Date": orFallback(c.end_date, "N/A"),
    "Total Value": formatAmountInLakhsOrCr(c.total_contract_value, "N/A"),
    "Billing Cycle": c.billing_cycle || "N/A",
    "Billing Amount": c.billing_amount || "N/A",
    "Scope of Work": c.scope_of_work || "N/A",
    "Uploaded At": new Date(c.created_at).toLocaleDateString(),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Contracts");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function generateExecutionSummary(contract: ContractRow): string {
  const lines = [
    "═══════════════════════════════════════════",
    "       EXECUTION SUMMARY",
    "═══════════════════════════════════════════",
    "",
    `📄 Contract: ${contract.uploaded_file_name}`,
    `📋 Type: ${contract.contract_type || "Not specified"}`,
    `📅 Period: ${orFallback(contract.start_date, "TBD")} → ${orFallback(contract.end_date, "TBD")}`,
    `💰 Value: ${formatAmountInLakhsOrCr(contract.total_contract_value, "Not specified")}`,
    `🔄 Billing: ${contract.billing_cycle || "N/A"} — ${contract.billing_amount || "N/A"}`,
    "",
    "───────────────────────────────────────────",
    "  SCOPE OF WORK",
    "───────────────────────────────────────────",
    "",
    contract.scope_of_work || "No scope of work available.",
    "",
    "═══════════════════════════════════════════",
    `Generated: ${new Date().toLocaleString()}`,
  ];
  return lines.join("\n");
}
