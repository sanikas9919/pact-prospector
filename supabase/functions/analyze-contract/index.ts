import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { contract } = await req.json();

    if (!contract) {
      return new Response(
        JSON.stringify({ error: "No contract data provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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

For legal_risks: Identify 2-5 specific legal risks (e.g., unclear termination clauses, IP ownership gaps, liability exposure, compliance gaps). Each risk should have a severity (high/medium/low), title, and description.

For payment_delay_flags: Identify 2-4 factors that could cause payment delays (e.g., milestone dependencies, unclear acceptance criteria, billing cycle mismatches). Each flag should have a severity (high/medium/low), title, and description.

For financial_exposure: Provide overall risk_level (high/medium/low), total_exposure_estimate, key_factors (2-4 items), and a mitigation_summary.

For role_summaries: Generate concise summaries tailored for three roles - finance_team, legal_team, and delivery_team. Each summary should be 3-5 sentences focused on what matters most to that role.`;

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
                      key_factors: {
                        type: "array",
                        items: { type: "string" },
                      },
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
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error("AI did not return structured data");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-contract error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
