import { useCallback, useState } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";

interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

export function FileDropZone({ onFileSelect, isProcessing }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  return (
    <div
      onDragOver={handleDrag}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 transition-all duration-200 ${
        isDragging
          ? "border-accent bg-accent/5 scale-[1.01]"
          : "border-border hover:border-accent/50 hover:bg-muted/30"
      } ${isProcessing ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
      onClick={() => {
        if (!isProcessing) {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".pdf,.docx";
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) onFileSelect(file);
          };
          input.click();
        }
      }}
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-12 w-12 text-accent animate-spin" />
          <div className="text-center">
            <p className="text-base font-medium text-foreground">Processing contract...</p>
            <p className="text-sm text-muted-foreground mt-1">
              Extracting text and analyzing with AI
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
            <Upload className="h-8 w-8 text-accent" />
          </div>
          <div className="text-center">
            <p className="text-base font-medium text-foreground">
              Drop your contract here, or click to browse
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Supports PDF and DOCX files
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            <span>Max 20MB per file</span>
          </div>
        </>
      )}
    </div>
  );
}
