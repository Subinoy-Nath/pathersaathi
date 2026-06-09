'use client'

import { useAutoAnimate } from '@formkit/auto-animate/react'

export default function AnimatedTableBody({ children, className }: { children: React.ReactNode, className?: string }) {
  const [parent] = useAutoAnimate()

  return (
    <tbody ref={parent} className={className}>
      {children}
    </tbody>
  )
}
