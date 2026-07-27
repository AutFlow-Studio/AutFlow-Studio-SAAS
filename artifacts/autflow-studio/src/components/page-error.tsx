import { AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PageErrorProps {
  /** Short description shown to the user. */
  message?: string;
}

/**
 * Consistent full-page error card shown when an API query fails.
 * Includes a "Try again" button that reloads the current page.
 */
export function PageError({
  message = "Something went wrong loading this page.",
}: PageErrorProps) {
  return (
    <Card className="bg-card/40 backdrop-blur-sm border-border/50">
      <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <AlertCircle className="h-8 w-8 text-destructive/70" />
        <p className="text-sm font-medium text-destructive">{message}</p>
        <p className="text-xs text-muted-foreground">
          Please try again or refresh the page.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 mt-1"
          onClick={() => window.location.reload()}
        >
          <RefreshCw size={14} />
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
