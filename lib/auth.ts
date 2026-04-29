import { supabase } from './supabase'

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}

export const AuthServices = {

  // ==========================
  // ADMIN AUTH (OTP सुरक्षित)
  // ==========================

  async signInAdminWithOtp(email: string) {
    return await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${getBaseUrl()}/auth/callback?type=admin`,
      },
    })
  },

  // ==========================
  // USER AUTH
  // ==========================

  async signInWithPassword(email: string, password: string) {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    })
  },

  async signUp(email: string, password: string, fullName: string) {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${getBaseUrl()}/auth/callback`,
      },
    })
  },

  async signInWithGoogle() {
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${getBaseUrl()}/auth/callback`,
      },
    })
  },

  // ==========================
  // SESSION + ROLE
  // ==========================

  async getSession() {
    const { data, error } = await supabase.auth.getSession()
    return { session: data.session, error }
  },

  async getUserRole() {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .single()

    return { role: data?.role, error }
  },

  async isAdmin() {
    const { role } = await this.getUserRole()
    return role === 'admin'
  },

  // ==========================
  // LOGOUT
  // ==========================

  async signOut() {
    return await supabase.auth.signOut()
  },
}