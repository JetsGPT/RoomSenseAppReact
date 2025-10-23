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
    <div className="flex items-center gap-3 py-2">
      {Icon && (
        <div className="flex-shrink-0 w-5 h-5 text-muted-foreground">
          <Icon size={20} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-base text-foreground font-medium truncate">
          {value || 'N/A'}
        </p>
      </div>
    </div>
  )
}
