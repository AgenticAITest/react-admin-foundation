import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@client/components/ui/card";
import { Button } from "@client/components/ui/button";
import { Badge } from "@client/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@client/components/ui/table";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@client/provider/AuthProvider";
import axios from "axios";

interface Product {
  id: number;
  tenantId: string;
  sku: string;
  name: string;
  description?: string;
  inventoryTypeId: number;
  packageTypeId: number;
  unitOfMeasure: string;
  weight?: number;
  dimensions?: string;
  minStockLevel: number;
  maxStockLevel?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  inventoryType?: {
    name: string;
  };
  packageType?: {
    name: string;
  };
}

interface InventoryType {
  id: number;
  name: string;
}

interface PackageType {
  id: number;
  name: string;
}

export default function InventoryTab() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryTypes, setInventoryTypes] = useState<InventoryType[]>([]);
  const [packageTypes, setPackageTypes] = useState<PackageType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      const response = await axios.get("/api/master/products", {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: 1, limit: 50, sort: "name", order: "asc" }
      });
      setProducts(response.data.data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchInventoryTypes = async () => {
    try {
      const response = await axios.get("/api/master/inventory-types", {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: 1, limit: 100 }
      });
      setInventoryTypes(response.data.data || []);
    } catch (error) {
      console.error("Error fetching inventory types:", error);
    }
  };

  const fetchPackageTypes = async () => {
    try {
      const response = await axios.get("/api/master/package-types", {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: 1, limit: 100 }
      });
      setPackageTypes(response.data.data || []);
    } catch (error) {
      console.error("Error fetching package types:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchProducts(), fetchInventoryTypes(), fetchPackageTypes()]);
      setLoading(false);
    };
    fetchData();
  }, [token]);

  const getInventoryTypeName = (id: number) => {
    const type = inventoryTypes.find(t => t.id === id);
    return type?.name || "Unknown";
  };

  const getPackageTypeName = (id: number) => {
    const type = packageTypes.find(t => t.id === id);
    return type?.name || "Unknown";
  };

  const getWeightDisplay = (weight?: number, unitOfMeasure?: string) => {
    if (!weight || !unitOfMeasure) return "N/A";
    return `${weight} ${unitOfMeasure}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            📦 Inventory Items
          </CardTitle>
          <CardDescription>
            Manage your inventory master data
          </CardDescription>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Inventory Item
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Size/Weight</TableHead>
              <TableHead>Min Stock</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.sku}</TableCell>
                <TableCell>{product.name}</TableCell>
                <TableCell>{getInventoryTypeName(product.inventoryTypeId)}</TableCell>
                <TableCell>{getPackageTypeName(product.packageTypeId)}</TableCell>
                <TableCell>{getWeightDisplay(product.weight, product.unitOfMeasure)}</TableCell>
                <TableCell>{product.minStockLevel}</TableCell>
                <TableCell>No Expiry</TableCell>
                <TableCell>
                  <Badge variant={product.isActive ? "default" : "secondary"}>
                    {product.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}