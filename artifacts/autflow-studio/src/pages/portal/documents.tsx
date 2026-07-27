import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, ExternalLink, AlertCircle, Files } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Document {
  id: number;
  title: string;
  type: string;
  url: string | null;
  notes: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  contract: "Contract",
  invoice: "Invoice",
  report: "Report",
  proposal: "Proposal",
  brief: "Brief",
  other: "Document",
};

function isFileBacked(url: string | null | undefined): boolean {
  return !!url?.startsWith("/objects/");
}

function fileServeUrl(objectPath: string): string {
  return `/api/storage${objectPath}`;
}

export default function PortalDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/portal/documents", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setDocuments)
      .catch(() => setError("Unable to load documents."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-44" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground mt-1">Files and documents shared with you</p>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <AlertCircle size={32} />
          <p className="text-sm">{error}</p>
        </div>
      ) : documents.length === 0 ? (
        <Card className="bg-card/40 border-border/50">
          <CardContent className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
            <Files size={40} className="opacity-30" />
            <p className="text-sm">No documents have been shared with you yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const fileBacked = isFileBacked(doc.url);
            const href = fileBacked ? fileServeUrl(doc.url!) : doc.url;

            return (
              <Card key={doc.id} className="bg-card/40 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all group">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{doc.title}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                          {TYPE_LABELS[doc.type] ?? doc.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Added {format(parseISO(doc.createdAt), "MMM d, yyyy")}</span>
                        {doc.notes && <span className="truncate max-w-[200px]">{doc.notes}</span>}
                      </div>
                    </div>
                    {href && (
                      <a
                        href={href}
                        target={fileBacked ? "_self" : "_blank"}
                        rel="noreferrer"
                        download={fileBacked ? doc.title : undefined}
                        className="shrink-0 w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                        title={fileBacked ? "Download" : "Open link"}
                      >
                        {fileBacked ? <Download size={15} /> : <ExternalLink size={15} />}
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
