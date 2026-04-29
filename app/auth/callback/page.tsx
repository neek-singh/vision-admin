'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthServices } from '@/lib/auth'

function AuthCallbackContent() {
    const router = useRouter()
    const params = useSearchParams()

    useEffect(() => {
        const handleAuth = async () => {
            const type = params.get('type')

            const isAdmin = await AuthServices.isAdmin()

            if (type === 'admin') {
                if (isAdmin) {
                    router.push('/admin')
                } else {
                    router.push('/dashboard')
                }
            } else {
                router.push('/dashboard')
            }
        }

        handleAuth()
    }, [router, params])

    return <p className="text-center py-10">Logging in...</p>
}

export default function AuthCallback() {
    return (
        <Suspense fallback={<p className="text-center py-10">Loading...</p>}>
            <AuthCallbackContent />
        </Suspense>
    )
}