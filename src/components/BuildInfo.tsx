import React from 'react'

// Provided by Vite define in vite.config.ts
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const __BUILD_TIME__: string

export const BuildInfo: React.FC = () => {
  return (
    <div className="text-center text-xs text-muted-foreground py-2" role="contentinfo">
      Build: {typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'dev'}
    </div>
  )
}

export default BuildInfo
