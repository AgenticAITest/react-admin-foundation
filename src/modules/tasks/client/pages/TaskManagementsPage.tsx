
import React from 'react';
import { DataPagination } from '../../../../client/components/console/DataPagination';
import Authorized from '../../../../client/components/auth/Authorized';
import { Button } from '../../../../client/components/ui/button';
import { Plus } from 'lucide-react';

const Task ManagementsPage = () => {
  const columns = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "description", 
      header: "Description",
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }: any) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          row.getValue("isActive") 
            ? "bg-green-100 text-green-800" 
            : "bg-red-100 text-red-800"
        }`}>
          {row.getValue("isActive") ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }: any) => {
        return new Date(row.getValue("createdAt")).toLocaleDateString();
      },
    },
  ];

  return (
    <Authorized permissions={["tasks.task management.view"]}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Task Managements</h1>
          <Authorized permissions={["tasks.task management.add"]}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Task Management
            </Button>
          </Authorized>
        </div>
        
        <DataPagination
          endpoint="/api/tasks/task managements"
          columns={columns}
          searchable={true}
          filterable={true}
        />
      </div>
    </Authorized>
  );
};

export default Task ManagementsPage;