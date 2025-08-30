import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@client/components/ui/card";
import { Button } from "@client/components/ui/button";
import { Plus } from "lucide-react";

export default function CustomerTab() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            👥 Customers
          </CardTitle>
          <CardDescription>
            Manage customer information and locations (Coming soon in Step 12)
          </CardDescription>
        </div>
        <Button disabled>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-muted-foreground">
          <p>Customer management will be available after Step 12 APIs are implemented.</p>
        </div>
      </CardContent>
    </Card>
  );
}