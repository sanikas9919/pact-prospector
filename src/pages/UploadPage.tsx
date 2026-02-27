import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { FileDropZone } from "@/components/FileDropZone";
import { ContractForm, type ContractData } from "@/components/ContractForm";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

const emptyData: ContractData = {
  contract_period: { start_date: null, end_date: null },
  contract_type: null,
  total_contract_value: null,
  billing_cycle: null,
  billing_amount: null,
  scope_of_work: null,
};

export default function UploadPage() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extracted, setExtracted] = useState<ContractData | null>(null);
  const [fileName, setFileName] = useState("");

  const handleFileSelect = async (file: File) => {
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a PDF or DOCX file");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File size must be under 20MB");
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);
    setExtracted(null);

    try {
      // Extract text from the file
      const text = await extractTextFromFile(file);
      if (!text || text.trim().length < 50) {
        toast.error("Could not extract enough text from the document");
        setIsProcessing(false);
        return;
      }

      // Send to AI for structured extraction
      const { data, error } = await supabase.functions.invoke("extract-contract", {
        body: { text },
      });

      if (error) throw error;

      setExtracted({
        contract_period: data.contract_period || emptyData.contract_period,
        contract_type: data.contract_type,
        total_contract_value: data.total_contract_value,
        billing_cycle: data.billing_cycle,
        billing_amount: data.billing_amount,
        scope_of_work: data.scope_of_work,
      });

      toast.success("Contract analyzed successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to process contract");
    } finally {
      setIsProcessing(false);
    }
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    if (file.type === "application/pdf") {
      // Use pdf.js via CDN for client-side PDF text extraction
      const pdfjsLib = await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/+esm" as any);
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs";

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(" ") + "\n";
      }
      return text;
    } else {
      // DOCX: extract text using mammoth via CDN
      const mammoth = await import("https://cdn.jsdelivr.net/npm/mammoth@1.8.0/+esm" as any);
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    }
  };

  const handleSave = async () => {
    if (!extracted) return;
    setIsSaving(true);

    try {
      const { error } = await supabase.from("contracts").insert({
        start_date: extracted.contract_period.start_date,
        end_date: extracted.contract_period.end_date,
        contract_type: extracted.contract_type,
        total_contract_value: extracted.total_contract_value,
        billing_cycle: extracted.billing_cycle,
        billing_amount: extracted.billing_amount,
        scope_of_work: extracted.scope_of_work,
        uploaded_file_name: fileName,
      });

      if (error) throw error;

      toast.success("Contract saved successfully!");
      navigate("/");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save contract");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Upload Contract</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a PDF or DOCX contract to extract key details using AI
          </p>
        </div>

        <FileDropZone onFileSelect={handleFileSelect} isProcessing={isProcessing} />

        {extracted && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">
                Extracted from: {fileName}
              </span>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">Review & Edit</h2>
              <ContractForm
                data={extracted}
                onChange={setExtracted}
                onSave={handleSave}
                isSaving={isSaving}
              />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
