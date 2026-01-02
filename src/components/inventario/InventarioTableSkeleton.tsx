import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function InventarioTableSkeleton() {
  return (
    <div className="rounded-md border bg-card overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <Table className="min-w-[1500px]">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[100px]">
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead className="w-[80px]">
                <Skeleton className="h-4 w-12" />
              </TableHead>
              <TableHead className="min-w-[200px]">
                <Skeleton className="h-4 w-32" />
              </TableHead>
              <TableHead className="w-[80px]">
                <Skeleton className="h-4 w-12" />
              </TableHead>
              <TableHead className="text-right">
                <Skeleton className="h-4 w-16 ml-auto" />
              </TableHead>
              <TableHead className="text-center p-0">
                <Skeleton className="h-12 w-full" />
              </TableHead>
              <TableHead className="text-center">
                <Skeleton className="h-8 w-24 mx-auto" />
              </TableHead>
              <TableHead className="text-center">
                <Skeleton className="h-8 w-24 mx-auto" />
              </TableHead>
              <TableHead className="text-center">
                <Skeleton className="h-8 w-24 mx-auto" />
              </TableHead>
              <TableHead className="text-center">
                <Skeleton className="h-8 w-24 mx-auto" />
              </TableHead>
              <TableHead className="text-center p-0">
                <Skeleton className="h-12 w-full" />
              </TableHead>
              <TableHead className="text-center">
                <Skeleton className="h-4 w-16 mx-auto" />
              </TableHead>
              <TableHead className="text-center">
                <Skeleton className="h-4 w-12 mx-auto" />
              </TableHead>
              <TableHead className="text-right">
                <Skeleton className="h-4 w-16 ml-auto" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-48" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16 ml-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12 mx-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12 mx-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12 mx-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12 mx-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12 mx-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12 mx-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12 mx-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12 mx-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
