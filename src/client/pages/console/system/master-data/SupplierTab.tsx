import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@client/components/ui/card";
import { Button } from "@client/components/ui/button";
import { Plus } from "lucide-react";

export default function SupplierTab() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            🏭 Suppliers
          </CardTitle>
          <CardDescription>
            Manage supplier information and locations (Coming soon in Step 12)
          </CardDescription>
        </div>
        <Button disabled>
          <Plus className="h-4 w-4 mr-2" />
          Add Supplier
        </Button>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-muted-foreground">
          <p>Supplier management will be available after Step 12 APIs are implemented.</p>
        </div>
      </CardContent>
    </Card>
  );
}