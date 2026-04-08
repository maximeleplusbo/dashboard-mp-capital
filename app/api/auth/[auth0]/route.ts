// app/api/auth/[auth0]/route.ts
import { auth0 } from '@/lib/auth0'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  return auth0.middleware(request)
}