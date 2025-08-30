'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dataset } from '@/types';
import { formatDate } from '@/lib/utils';

interface DatasetsTableProps {
  datasets: Dataset[];
}

export function DatasetsTable({ datasets }: DatasetsTableProps) {
  if (datasets.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">No datasets yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first dataset to store test data for your prompts.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Datasets ({datasets.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {datasets.map((dataset) => (
              <TableRow key={dataset.id}>
                <TableCell className="font-medium">
                  <a 
                    href={`/datasets/${dataset.id}`}
                    className="hover:underline"
                  >
                    {dataset.name}
                  </a>
                </TableCell>
                <TableCell className="max-w-xs">
                  <p className="truncate text-muted-foreground">
                    {dataset.description || 'No description'}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {(dataset as any).itemCount || 0}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(dataset.updatedAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}