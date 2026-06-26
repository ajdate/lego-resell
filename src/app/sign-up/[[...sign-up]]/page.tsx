'use client'
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src="/brickvalue-wordmark.png" alt="BrickValue" className="h-12 object-contain" />
        </div>
        <SignUp />
      </div>
    </div>
  )
}
