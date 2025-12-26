import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { LucideIcon, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileNavCardProps {
  title: string
  icon: LucideIcon
  to: string
  description: string
  className?: string
  iconColor?: string
}

export function MobileNavCard({
  title,
  icon: Icon,
  to,
  description,
  className,
  iconColor = 'text-primary',
}: MobileNavCardProps) {
  return (
    <Link to={to} className="block group h-full">
      <Card
        className={cn(
          'h-full transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-md cursor-pointer',
          className,
        )}
      >
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center p-6 gap-4 h-full">
          <div className="p-3 rounded-xl bg-muted group-hover:bg-primary/10 transition-colors shrink-0">
            <Icon className={cn('w-8 h-8 transition-colors', iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg leading-tight truncate group-hover:text-primary transition-colors">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {description}
            </p>
          </div>
          <div className="hidden sm:block">
            <ArrowRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors translate-x-0 group-hover:translate-x-1 duration-200" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
