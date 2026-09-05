import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { DISCARD_UNSAVED_MESSAGE, useUnsavedChanges } from '@/lib/unsaved-changes'

export function LogoutButton() {
  const { logout } = useAuth()
  const { hasUnsavedChanges } = useUnsavedChanges()
  const navigate = useNavigate()

  async function handleLogout() {
    // Asked before logout, not after: clearing the session is what discards the
    // work, so a confirmation that came later would have nothing left to save.
    if (hasUnsavedChanges && !window.confirm(DISCARD_UNSAVED_MESSAGE)) return
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout}>
      <LogOut className="size-4" />
      Sair
    </Button>
  )
}
