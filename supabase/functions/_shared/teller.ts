// Shared Teller API helpers used by teller-enroll, teller-sync and teller-webhook.
// Teller authenticates with two layers:
//   1. HTTP Basic auth where the access token is the username and the password is empty
//   2. Mutual TLS (mTLS) using the app certificate + private key on the TLS connection
// https://teller.io/docs/api/authentication

const TELLER_API_BASE = 'https://api.teller.io'

export function getTellerHttpClient(): Deno.HttpClient {
  const cert = Deno.env.get('TELLER_CERTIFICATE')
  const key = Deno.env.get('TELLER_PRIVATE_KEY')
  if (!cert || !key) {
    throw new Error('Teller certificate or private key is not configured')
  }
  // The certificate must be the full certificate PEM ("BEGIN CERTIFICATE"),
  // and the private key the matching RSA private key PEM.
  return Deno.createHttpClient({
    certChain: cert,
    privateKey: key,
  } as any)
}

export function tellerAuthHeader(accessToken: string): string {
  return `Basic ${btoa(accessToken + ':')}`
}

/** GET a Teller API path with mTLS + Basic auth, with light retry on 429/502. */
export async function tellerFetch(accessToken: string, path: string): Promise<any> {
  const client = getTellerHttpClient()
  let attempt = 0
  const maxRetries = 3

  while (attempt < maxRetries) {
    let res: Response
    try {
      res = await fetch(`${TELLER_API_BASE}${path}`, {
        headers: {
          Authorization: tellerAuthHeader(accessToken),
          Accept: 'application/json',
        },
        client,
      } as any)
    } catch (err) {
      attempt++
      if (attempt >= maxRetries) {
        throw new Error(`Teller request failed: ${err?.message || err}`)
      }
      await new Promise((r) => setTimeout(r, attempt * 1500))
      continue
    }

    if (res.status === 429 || res.status === 502) {
      attempt++
      if (attempt >= maxRetries) {
        let body: any = null
        try {
          body = await res.json()
        } catch (_) {
          // ignore
        }
        throw new Error(`Teller API error ${res.status}: ${JSON.stringify(body || {})}`)
      }
      await new Promise((r) => setTimeout(r, attempt * 2000))
      continue
    }

    if (!res.ok) {
      let body: any = null
      try {
        body = await res.json()
      } catch (_) {
        // ignore
      }
      const message = body?.error?.message || body?.error?.code || `HTTP ${res.status}`
      throw new Error(`Teller API error: ${message}`)
    }

    return res.json()
  }

  throw new Error('Teller request failed after retries')
}

/** Map Teller's enriched category to the app's category names. */
export function mapTellerCategory(category: string | null | undefined, description: string): string {
  const desc = (description || '').toLowerCase()
  switch ((category || '').toLowerCase()) {
    case 'income':
      return 'Income'
    case 'dining':
    case 'bar':
      return 'Food & Dining'
    case 'groceries':
      return 'Groceries'
    case 'shopping':
      return 'Shopping'
    case 'transport':
    case 'transportation':
    case 'fuel':
      return 'Transportation'
    case 'utilities':
      return 'Utilities'
    case 'health':
      return 'Healthcare'
    case 'home':
      return 'Home'
    case 'entertainment':
    case 'sport':
      return 'Entertainment'
    case 'office':
    case 'software':
    case 'advertising':
      return 'Business'
    case 'education':
      return 'Education'
    case 'insurance':
      return 'Insurance'
    case 'loan':
      return 'Loans'
    case 'tax':
      return 'Taxes'
    case 'investment':
      return 'Investment'
    case 'charity':
      return 'Charity'
    case 'clothing':
      return 'Shopping'
    case 'electronics':
      return 'Shopping'
    case 'phone':
      return 'Utilities'
    case 'accommodation':
      return 'Home'
    default:
      // Fall back to keyword matching on the description
      if (desc.includes('salary') || desc.includes('payroll') || desc.includes('deposit')) return 'Income'
      if (desc.includes('gas') || desc.includes('uber') || desc.includes('lyft') || desc.includes('parking')) return 'Transportation'
      if (desc.includes('amazon') || desc.includes('target') || desc.includes('walmart') || desc.includes('retail')) return 'Shopping'
      if (desc.includes('electric') || desc.includes('water') || desc.includes('internet') || desc.includes('phone')) return 'Utilities'
      if (desc.includes('medical') || desc.includes('doctor') || desc.includes('pharmacy') || desc.includes('hospital')) return 'Healthcare'
      return 'Other'
  }
}

export interface TellerSyncResult {
  accounts_synced: number
  transactions_added: number
  errors: string[]
}

/**
 * Sync balances and the last 90 days of transactions for one user's Teller
 * accounts (all of them, or a single one by connected_accounts id).
 */
export async function syncUserTellerAccounts(
  sb: SupabaseClient,
  userId: string,
  accountId?: string,
): Promise<TellerSyncResult> {
  let query = sb
    .from('connected_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'teller')
  if (accountId) {
    query = query.eq('id', accountId)
  }
  const { data: accounts, error } = await query
  if (error) {
    throw new Error(`Failed to load Teller accounts: ${error.message}`)
  }
  if (!accounts || accounts.length === 0) {
    return { accounts_synced: 0, transactions_added: 0, errors: [] }
  }

  const result: TellerSyncResult = { accounts_synced: 0, transactions_added: 0, errors: [] }
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  for (const acct of accounts as any[]) {
    const token = acct.plaid_access_token
    if (!token) {
      result.errors.push(`${acct.account_name}: missing access token`)
      continue
    }
    try {
      // Balances
      const balances = await tellerFetch(token, `/accounts/${acct.external_account_id}/balances`)
      const balance = Number(balances.available ?? balances.ledger ?? 0) || 0

      // Transactions (last 90 days)
      const txns = await tellerFetch(
        token,
        `/accounts/${acct.external_account_id}/transactions?count=250&start_date=${startDate}`,
      )

      const inserts = (Array.isArray(txns) ? txns : []).map((t: any) => {
        const signed = Number(t.amount || 0)
        return {
          user_id: userId,
          account_id: acct.id,
          transaction_id: t.id,
          description: t.description,
          merchant_name: t.details?.counterparty?.name || null,
          // Teller signs amounts: negative = debit (money out), positive = credit (money in)
          amount: Math.abs(signed),
          transaction_type: signed < 0 ? 'credit' : 'debit',
          category: mapTellerCategory(t.details?.category, t.description || ''),
          transaction_date: (t.date || '').split('T')[0] || t.date,
          authorized_date: null,
          pending: t.status === 'pending',
          currency: acct.currency || 'USD',
          location: null,
          metadata: {
            teller_account_id: t.account_id,
            original_amount: t.amount,
            counterparty: t.details?.counterparty || null,
            teller_type: t.type || null,
          },
        }
      })

      if (inserts.length > 0) {
        const { error: insertError } = await sb
          .from('account_transactions')
          .upsert(inserts, { onConflict: 'transaction_id', ignoreDuplicates: false })
        if (insertError) {
          throw new Error(`Failed to save transactions: ${insertError.message}`)
        }
        result.transactions_added += inserts.length
      }

      await sb
        .from('connected_accounts')
        .update({ balance, last_sync: new Date().toISOString() })
        .eq('id', acct.id)

      result.accounts_synced++
    } catch (err) {
      result.errors.push(`${acct.account_name}: ${err?.message || err}`)
    }
  }

  return result
}
