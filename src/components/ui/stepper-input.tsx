import * as React from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface StepperInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange'
> {
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}

export const StepperInput = React.forwardRef<
  HTMLInputElement,
  StepperInputProps
>(
  (
    { className, value, onValueChange, min = 0, max, step = 1, ...props },
    ref,
  ) => {
    const handleIncrement = () => {
      const newValue = value + step
      if (max !== undefined && newValue > max) return
      onValueChange(newValue)
    }

    const handleDecrement = () => {
      const newValue = value - step
      if (min !== undefined && newValue < min) return
      onValueChange(newValue)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Force integer constraint on StepperInput as requested globally for quantities
      const cleanVal = e.target.value.replace(/\D/g, '')
      const val = parseInt(cleanVal, 10)
      if (isNaN(val)) {
        if (cleanVal === '') onValueChange(0) // or handled by parent
        return
      }
      onValueChange(val)
    }

    return (
      <div className={cn('flex items-center space-x-1', className)}>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handleDecrement}
          disabled={min !== undefined && value <= min}
          type="button"
        >
          <Minus className="h-3 w-3" />
          <span className="sr-only">Decrease</span>
        </Button>
        <Input
          ref={ref}
          type="number"
          value={value}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (['.', ',', 'e', 'E', '+', '-'].includes(e.key))
              e.preventDefault()
          }}
          className="h-8 w-16 px-1 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          min={min}
          max={max}
          step={step}
          {...props}
        />
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handleIncrement}
          disabled={max !== undefined && value >= max}
          type="button"
        >
          <Plus className="h-3 w-3" />
          <span className="sr-only">Increase</span>
        </Button>
      </div>
    )
  },
)
StepperInput.displayName = 'StepperInput'
