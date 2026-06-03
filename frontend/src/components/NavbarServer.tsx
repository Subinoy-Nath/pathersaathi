import { createClient } from '@/utils/supabase/server'
import Navbar from './Navbar'

export default async function NavbarServer() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  let role = null
  
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
      
    role = profile?.role || null
  }

  return <Navbar user={user} role={role} />
}
