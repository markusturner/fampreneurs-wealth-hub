import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TransactionControlsProps {
  transactionsPerPage: number
  onTransactionsPerPageChange: (value: number) => void
  lastRefreshed?: Date
}

export function TransactionControls({ 
  transactionsPerPage, 
  onTransactionsPerPageChange, 
  lastRefreshed 
}: TransactionControlsProps) {
  return (
    <div className="flex items-center gap-3">
      {lastRefreshed && (
        <div className="text-xs text-muted-foreground">
          Last refreshed: {lastRefreshed.toLocaleTimeString()}
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <Label className="text-sm">Show</Label>
        <Select 
          value={transactionsPerPage.toString()} 
          onValueChange={(value) => onTransactionsPerPageChange(Number(value))}
        >
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <Label className="text-sm">per page</Label>
      </div>
    </div>
  )
}