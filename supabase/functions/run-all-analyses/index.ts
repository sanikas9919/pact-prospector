import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all contracts that don't have an analysis yet
    const { data: contracts, error: fetchErr } = await supabase
      .from("contracts")
      .select("*, contract_analyses(id)")
      .is("contract_analyses.id", null);

    if (fetchErr) throw fetchErr;

    const pending = (contracts || []).filter(
      (c: any) => !c.contract_analyses || c.contract_analyses.length === 0
    );

    if (pending.length === 0) {
      return new Response(
        JSON.stringify({ message: "All contracts already analyzed", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { id: string; status: string; error?: string }[] = [];

    for (const contract of pending) {
      try {
        const contractSummary = `
Contract Type: ${contract.contract_type || "Unknown"}
Contract Period: ${contract.start_date || "?"} to ${contract.end_date || "?"}
Total Value: ${contract.total_contract_value || "Not specified"}
Billing Cycle: ${contract.billing_cycle || "Not specified"}
Billing Amount: ${contract.billing_amount || "Not specified"}
Scope of Work: ${contract.scope_of_work || "Not available"}
File: ${contract.uploaded_file_name || "Unknown"}
        `.trim();

        const systemPrompt = `You are an expert contract risk analyst. Analyze the provided contract data and produce four analyses. Be specific, actionable, and concise.

RULES:
- Base analysis ONLY on the provided contract data.
- If data is insufficient for a particular analysis, say so explicitly.
- Be specific about risks, don't be generic.
- Return structured data via the provided function.

For legal_risks: Identify 2-5 specific legal risks. Each risk should have a severity (high/medium/low), title, and description.
For payment_delay_flags: Identify 2-4 factors that could cause payment delays. Each flag should have a severity (high/medium/low), title, and description.
For financial_exposure: Provide overall risk_level (high/medium/low), total_exposure_estimate, key_factors (2-4 items), and a mitigation_summary.
For role_summaries: Generate concise summaries for finance_team, legal_team, and delivery_team. Each 3-5 sentences.`;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Analyze this contract:\n\n${contractSummary}` },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "submit_analysis",
                  description: "Submit the full contract analysis results.",
                  parameters: {
                    type: "object",
                    properties: {
                      legal_risks: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            severity: { type: "string", enum: ["high", "medium", "low"] },
                            title: { type: "string" },
                            description: { type: "string" },
                          },
                          required: ["severity", "title", "description"],
                          additionalProperties: false,
                        },
                      },
                      payment_delay_flags: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            severity: { type: "string", enum: ["high", "medium", "low"] },
                            title: { type: "string" },
                            description: { type: "string" },
                          },
                          required: ["severity", "title", "description"],
                          additionalProperties: false,
                        },
                      },
                      financial_exposure: {
                        type: "object",
                        properties: {
                          risk_level: { type: "string", enum: ["high", "medium", "low"] },
                          total_exposure_estimate: { type: "string" },
                          key_factors: { type: "array", items: { type: "string" } },
                          mitigation_summary: { type: "string" },
                        },
                        required: ["risk_level", "total_exposure_estimate", "key_factors", "mitigation_summary"],
                        additionalProperties: false,
                      },
                      role_summaries: {
                        type: "object",
                        properties: {
                          finance_team: { type: "string" },
                          legal_team: { type: "string" },
                          delivery_team: { type: "string" },
                        },
                        required: ["finance_team", "legal_team", "delivery_team"],
                        additionalProperties: false,
                      },
                    },
                    required: ["legal_risks", "payment_delay_flags", "financial_exposure", "role_summaries"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "submit_analysis" } },
          }),
        });

        if (!response.ok) {
          throw new Error(`AI gateway error: ${response.status}`);
        }

        const data = await response.json();
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall) throw new Error("AI did not return structured data");

        const analysis = JSON.parse(toolCall.function.arguments);

        const { error: insertErr } = await supabase.from("contract_analyses").upsert({
          contract_id: contract.id,
          legal_risks: analysis.legal_risks,
          payment_delay_flags: analysis.payment_delay_flags,
          financial_exposure: analysis.financial_exposure,
          role_summaries: analysis.role_summaries,
        }, { onConflict: "contract_id" });

        if (insertErr) throw insertErr;

        results.push({ id: contract.id, status: "success" });
      } catch (err: any) {
        console.error(`Failed for contract ${contract.id}:`, err);
        results.push({ id: contract.id, status: "error", error: err.message });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${results.length} contracts`,
        processed: results.filter((r) => r.status === "success").length,
        failed: results.filter((r) => r.status === "error").length,
        details: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("run-all-analyses error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
