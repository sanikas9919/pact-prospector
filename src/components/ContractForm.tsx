import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";

export interface ProjectPhase {
  name: string;
  duration: string;
  description?: string | null;
}

export interface ContractData {
  contract_period: { start_date: string | null; end_date: string | null };
  contract_type: string | null;
  total_contract_value: string | null;
  billing_cycle: string | null;
  billing_amount: string | null;
  scope_of_work: string | null;
  project_phases: ProjectPhase[] | null;
}

interface ContractFormProps {
  data: ContractData;
  onChange: (data: ContractData) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function ContractForm({ data, onChange, onSave, isSaving }: ContractFormProps) {
  const update = (key: keyof ContractData, value: any) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Start Date</Label>
          <Input
            type="date"
            value={data.contract_period.start_date || ""}
            onChange={(e) =>
              update("contract_period", {
                ...data.contract_period,
                start_date: e.target.value || null,
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">End Date</Label>
          <Input
            type="date"
            value={data.contract_period.end_date || ""}
            onChange={(e) =>
              update("contract_period", {
                ...data.contract_period,
                end_date: e.target.value || null,
              })
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Contract Type</Label>
        <Select
          value={data.contract_type || ""}
          onValueChange={(v) => update("contract_type", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Time & Material">Time & Material</SelectItem>
            <SelectItem value="Fixed Price">Fixed Price</SelectItem>
            <SelectItem value="Fixed Time">Fixed Time</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Total Contract Value</Label>
          <Input
            value={data.total_contract_value || ""}
            onChange={(e) => update("total_contract_value", e.target.value || null)}
            placeholder="e.g. $500,000"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Billing Amount</Label>
          <Input
            value={data.billing_amount || ""}
            onChange={(e) => update("billing_amount", e.target.value || null)}
            placeholder="e.g. $50,000/month"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Billing Cycle</Label>
        <Select
          value={data.billing_cycle || ""}
          onValueChange={(v) => update("billing_cycle", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select billing cycle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Monthly">Monthly</SelectItem>
            <SelectItem value="Quarterly">Quarterly</SelectItem>
            <SelectItem value="Milestone-based">Milestone-based</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Scope of Work</Label>
        <Textarea
          rows={6}
          value={data.scope_of_work || ""}
          onChange={(e) => update("scope_of_work", e.target.value || null)}
          placeholder="AI-generated summary of scope of work..."
          className="resize-none"
        />
      </div>

      <Button onClick={onSave} disabled={isSaving} className="w-full sm:w-auto">
        {isSaving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Save Contract
      </Button>
    </div>
  );
}
