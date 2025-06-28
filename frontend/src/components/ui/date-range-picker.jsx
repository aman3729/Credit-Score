import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

// Import the DayPicker component from react-day-picker
import { DayPicker } from "react-day-picker"

// Import styles for the DayPicker
import "react-day-picker/dist/style.css"

// Import utility functions
import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

/**
 * DateRange type definition
 * @typedef {Object} DateRange
 * @property {Date} [from]
 * @property {Date} [to]
 */

/**
 * DateRangePicker component for selecting a date range
 * @param {Object} props - Component props
 * @param {string} [props.className] - Additional CSS classes
 * @param {DateRange} [props.date] - Selected date range
 * @param {function} [props.onDateChange] - Callback when date range changes
 * @param {Object} [props.rest] - Additional props passed to DayPicker
 */
export function DateRangePicker({
  className,
  date,
  onDateChange,
  ...rest
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelect = (range) => {
    if (onDateChange) {
      onDateChange(range);
    }
    // Close the popover when a date range is selected
    if (range?.from && range?.to) {
      setIsOpen(false);
    }
  };
  
  // Format the selected date range for display
  const formatSelectedDate = () => {
    if (!date?.from) return 'Pick a date range';
    
    const fromStr = format(date.from, 'MMM dd, yyyy');
    
    if (!date.to) return fromStr;
    
    const toStr = format(date.to, 'MMM dd, yyyy');
    return `${fromStr} - ${toStr}`;
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span>{formatSelectedDate()}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <DayPicker
            mode="range"
            defaultMonth={date?.from || new Date()}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
            className="rounded-md border bg-white p-3"
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-sm font-medium",
              nav: "space-x-1 flex items-center",
              nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
              row: "flex w-full mt-2",
              cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
              day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground",
              day_outside: "text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-50",
              day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
              day_hidden: "invisible"
            }}
            components={{
              IconLeft: ({ ...props }) => <span className="h-4 w-4">❮</span>,
              IconRight: ({ ...props }) => <span className="h-4 w-4">❯</span>,
            }}
            {...rest}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
