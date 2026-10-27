import { useLayoutEffect } from 'react'
import gsap from 'gsap'

export function useGSAP(callback, config = {}) {
  const { scope, dependencies = [] } = config

  useLayoutEffect(() => {
    let cleanup
    const context = gsap.context(() => {
      cleanup = callback()
    }, scope)

    return () => {
      if (typeof cleanup === 'function') {
        cleanup()
      }
      context.revert()
    }
  }, dependencies)
}
