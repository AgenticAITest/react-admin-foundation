import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@client/components/ui/card";
import { Button } from "@client/components/ui/button";
import { Badge } from "@client/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@client/components/ui/table";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@client/provider/AuthProvider";
import axios from "axios";

interface InventoryType {
  id: number;
  tenantId: string;
  name: string;
  description?: string;
  category?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function InventoryTypeTab() {
  const { token } = useAuth();
  const [inventoryTypes, setInventoryTypes] = useState<InventoryType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInventoryTypes = async () => {
    try {
      const response = await axios.get("/api/master/inventory-types", {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: 1, limit: 50, sort: "name", order: "asc" }
      });
      setInventoryTypes(response.data.data || []);
    } catch (error) {
      console.error("Error fetching inventory types:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryTypes();
  }, [token]);

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
            🏷️ Inventory Types
          </CardTitle>
          <CardDescription>
            Manage inventory type categories used for classification
          </CardDescription>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Inventory Type
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventoryTypes.map((type) => (
              <TableRow key={type.id}>
                <TableCell className="font-medium">{type.name}</TableCell>
                <TableCell>{type.description || "N/A"}</TableCell>
                <TableCell>{type.category || "N/A"}</TableCell>
                <TableCell>
                  <Badge variant={type.isActive ? "default" : "secondary"}>
                    {type.isActive ? "Active" : "Inactive"}
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