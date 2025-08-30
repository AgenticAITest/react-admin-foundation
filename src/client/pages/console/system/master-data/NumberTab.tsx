import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@client/components/ui/card";
import { Button } from "@client/components/ui/button";
import { Plus } from "lucide-react";

export default function NumberTab() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            🔢 Numbering
          </CardTitle>
          <CardDescription>
            Manage automatic numbering sequences and formats
          </CardDescription>
        </div>
        <Button disabled>
          <Plus className="h-4 w-4 mr-2" />
          Add Number Format
        </Button>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-muted-foreground">
          <p>Numbering sequence management is not yet implemented.</p>
        </div>
      </CardContent>
    </Card>
  );
}