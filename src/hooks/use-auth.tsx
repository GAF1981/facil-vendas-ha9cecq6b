import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  signIn: (email: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string) => {
    // Magic link login for simplicity as per common supabase patterns when password isn't strictly required by prompt
    // However, prompt example used signInWithPassword. But user story didn't specify credentials.
    // I'll stick to a simple email/password flow or Magic Link.
    // Let's implement magic link (OTP) as it's easier to demo without setting up users manually,
    // OR just simple email/password if the user provided credentials.
    // The instructions example used signInWithPassword. I will use signInWithPassword (assuming users exist)
    // BUT since I can't create users easily without a signup form and the user story is about managing clients...
    // I'll implement signInWithPassword.

    // Actually, I'll use OTP (Magic Link) if password is empty, or Password if provided.
    // To keep it simple for this task, I'll allow "signIn" to take email and a hardcoded dev password or just implement a simple login page.
    // Wait, the interface in my plan only has email. I should probably add password.
    return {
      error: new Error(
        'Not implemented in context directly, use supabase client in Login Page',
      ),
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const value = {
    user,
    session,
    signIn,
    signOut,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
