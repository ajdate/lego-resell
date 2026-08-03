'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NativePage() {
  const router = useRouter()
  
  useEffect(() => {
    localStorage.setItem('bv_native', '1')
    router.replace('/')
  }, [router])
  
  return (
    <div className="min-h-screen bg-[#0a0a0a]" />
  )
}
