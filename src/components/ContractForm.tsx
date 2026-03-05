import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Clock, X } from "lucide-react";
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
            placeholder="e.g. ₹5 L or ₹1.25 Cr"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Billing Amount</Label>
          <Input
            value={data.billing_amount || ""}
            onChange={(e) => update("billing_amount", e.target.value || null)}
            placeholder="e.g. ₹50,000/month"
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

      {/* Project Phases */}
      {data.project_phases && data.project_phases.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Project Timeline / Phases
            </Label>
          </div>
          <div className="space-y-2">
            {data.project_phases.map((phase, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex-1 grid gap-2 sm:grid-cols-3">
                  <Input
                    value={phase.name}
                    onChange={(e) => {
                      const phases = [...data.project_phases!];
                      phases[i] = { ...phases[i], name: e.target.value };
                      update("project_phases", phases);
                    }}
                    placeholder="Phase name"
                    className="text-sm"
                  />
                  <Input
                    value={phase.duration}
                    onChange={(e) => {
                      const phases = [...data.project_phases!];
                      phases[i] = { ...phases[i], duration: e.target.value };
                      update("project_phases", phases);
                    }}
                    placeholder="Duration"
                    className="text-sm"
                  />
                  <Input
                    value={phase.description || ""}
                    onChange={(e) => {
                      const phases = [...data.project_phases!];
                      phases[i] = { ...phases[i], description: e.target.value || null };
                      update("project_phases", phases);
                    }}
                    placeholder="Description (optional)"
                    className="text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const phases = data.project_phases!.filter((_, idx) => idx !== i);
                    update("project_phases", phases.length ? phases : null);
                  }}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
