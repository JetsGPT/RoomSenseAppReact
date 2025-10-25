import React from 'react'
import { Card } from '@/components/ui/card'

export function InfoBlock({ title, children, className = "" }) {
  return (
    <Card className={`p-6 ${className}`}>
      <h3 className="font-heading text-lg font-medium text-foreground mb-4">
        {title}
      </h3>
      <div className="space-y-3">
        {children}
      </div>
    </Card>
  )
}

export function InfoItem({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-4 py-3 px-4 rounded-xl bg-accent/20 hover:bg-accent/30 transition-all duration-200">
      {Icon && (
        <div className="flex-shrink-0 w-6 h-6 text-primary rounded-full bg-primary/10 p-1">
          <Icon size={16} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-base text-foreground font-semibold truncate">
          {value || 'N/A'}
        </p>
      </div>
    </div>
  )
}
