'use client'

import dynamic from 'next/dynamic'

const InitialPageLoader = dynamic(
  () => import('@/components/InitialPageLoader').then(mod => ({ default: mod.InitialPageLoader })),
  { ssr: false }
)

export function ClientInitialLoader() {
  return <InitialPageLoader />
}
