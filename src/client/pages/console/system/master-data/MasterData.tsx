import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@client/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@client/components/ui/card";
import InventoryTab from "./InventoryTab";
import InventoryTypeTab from "./InventoryTypeTab";
import PackageTypeTab from "./PackageTypeTab";
import SupplierTab from "./SupplierTab";
import CustomerTab from "./CustomerTab";
import NumberTab from "./NumberTab";

export default function MasterData() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Master Data</h1>
        <p className="text-muted-foreground">
          Manage inventory items, types, suppliers and customers
        </p>
      </div>

      <Tabs defaultValue="inventory" className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="inventory-types">Inventory Types</TabsTrigger>
          <TabsTrigger value="package-types">Package Types</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="numbering">Numbering</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <InventoryTab />
        </TabsContent>

        <TabsContent value="inventory-types">
          <InventoryTypeTab />
        </TabsContent>

        <TabsContent value="package-types">
          <PackageTypeTab />
        </TabsContent>

        <TabsContent value="suppliers">
          <SupplierTab />
        </TabsContent>

        <TabsContent value="customers">
          <CustomerTab />
        </TabsContent>

        <TabsContent value="numbering">
          <NumberTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}