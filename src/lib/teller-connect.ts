// Teller Connect loader - loads teller-connect.js from Teller's CDN and opens
// the bank-linking window. Mirrors how the old Plaid link flow worked.
import { supabase } from '@/integrations/supabase/client'

export const TELLER_APPLICATION_ID = 'app_pr23ur1i79tq045oi0000'
export const TELLER_ENVIRONMENT = 'development'

interface TellerConnectConfig {
  applicationId: string
  environment: string
  certificatePublicKeyPath?: string
  onSuccess: (enrollment: { accessToken: string; user: { id: string } }) => void
  onFailure: (failure: { code: string; message: string }) => void
  onExit?: () => void
}

interface TellerConnectHandle {
  open: () => void
}

let scriptLoaded = false
let scriptLoading: Promise<void> | null = null

function loadTellerScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve()
  if (scriptLoading) return scriptLoading
  scriptLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-teller-connect]') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => {
        scriptLoaded = true
        resolve()
      })
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdn.teller.io/connect/2.0.0/teller-connect.js'
    script.async = true
    script.setAttribute('data-teller-connect', 'true')
    script.onload = () => {
      scriptLoaded = true
      resolve()
    }
    script.onerror = () => reject(new Error('Failed to load Teller Connect'))
    document.head.appendChild(script)
  })
  return scriptLoading
}

/**
 * Opens the Teller bank-linking window.
 * On success the access token is sent to the teller-enroll backend function,
 * which saves the accounts under the signed-in user.
 */
export async function openTellerConnect(
  onSuccess: (result: { accountsSaved: number; message: string }) => void,
  onError: (message: string) => void,
): Promise<void> {
  try {
    await loadTellerScript()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      onError('Please sign in to connect your accounts')
      return
    }

    const TellerConnect = (window as any).TellerConnect
    if (!TellerConnect) {
      onError('Bank connection is not ready, please try again')
      return
    }

    const handle: TellerConnectHandle = TellerConnect.setup({
      applicationId: TELLER_APPLICATION_ID,
      environment: TELLER_ENVIRONMENT,
      certificatePublicKeyPath: '/teller-public-key.pem',
      onSuccess: async (enrollment: { accessToken: string; user: { id: string } }) => {
        try {
          const { data, error } = await supabase.functions.invoke('teller-enroll', {
            body: { access_token: enrollment.accessToken, teller_user_id: enrollment.user?.id },
            headers: { Authorization: `Bearer ${session.access_token}` },
          })

          if (error) {
            console.error('teller-enroll error:', error)
            onError('Failed to save your connected accounts')
            return
          }

          onSuccess({ accountsSaved: data?.accounts_saved ?? 0, message: data?.message ?? 'Accounts connected' })
        } catch (err) {
          console.error('Error enrolling Teller accounts:', err)
          onError('Failed to save your connected accounts')
        }
      },
      onFailure: (failure: { code: string; message: string }) => {
        console.error('Teller connect failure:', failure)
        onError(failure?.message || 'Bank connection was not completed')
      },
      onExit: () => {
        // User closed the window without finishing
      },
    })

    handle.open()
  } catch (err) {
    console.error('Error opening Teller Connect:', err)
    onError('Could not open the bank connection window')
  }
}
