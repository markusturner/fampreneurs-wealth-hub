import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
      }
    )

    // Get the user from the JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      throw new Error('Invalid user token')
    }

    console.log('Reprocessing bank statements for user:', user.id)

    // Get all uploaded statements for this user
    const { data: statements, error: statementsError } = await supabase
      .from('bank_statement_uploads')
      .select('*')
      .eq('user_id', user.id)
      .eq('file_type', 'csv')
      .eq('processing_status', 'completed')

    if (statementsError) {
      throw new Error(`Failed to fetch statements: ${statementsError.message}`)
    }

    console.log(`Found ${statements?.length || 0} statements to reprocess`)

    let totalUpdated = 0
    let totalProcessed = 0

    for (const statement of statements || []) {
      console.log(`Processing statement: ${statement.filename}`)
      
      try {
        // Download the CSV file from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('bank-statements')
          .download(statement.storage_path || statement.file_path)

        if (downloadError) {
          console.error(`Failed to download ${statement.filename}:`, downloadError)
          continue
        }

        // Convert blob to text
        const csvContent = await fileData.text()
        
        // Parse CSV with enhanced payee logic
        const parsedTransactions = parseCSV(csvContent)
        console.log(`Parsed ${parsedTransactions.length} transactions from ${statement.filename}`)

        // Get existing transactions for this statement
        const { data: existingTransactions, error: existingError } = await supabase
          .from('bank_statement_transactions')
          .select('*')
          .eq('bank_statement_id', statement.id)

        if (existingError) {
          console.error(`Failed to get existing transactions:`, existingError)
          continue
        }

        // Update transactions that still have generic descriptions
        for (let i = 0; i < Math.min(parsedTransactions.length, existingTransactions?.length || 0); i++) {
          const existing = existingTransactions![i]
          const parsed = parsedTransactions[i]
          
          totalProcessed++

          // Only update if current description is generic (indicating it wasn't manually edited)
          if (existing.description === 'Unknown Transaction' || 
              existing.description === 'Transaction' || 
              existing.description === 'Bank Transaction' ||
              existing.description.startsWith('Transaction ')) {
            
            const { error: updateError } = await supabase
              .from('bank_statement_transactions')
              .update({
                description: parsed.description,
                category: parsed.category
              })
              .eq('id', existing.id)

            if (updateError) {
              console.error(`Failed to update transaction ${existing.id}:`, updateError)
            } else {
              totalUpdated++
              console.log(`Updated transaction: ${existing.description} -> ${parsed.description}`)
            }
          }
        }

      } catch (error) {
        console.error(`Error processing statement ${statement.filename}:`, error)
      }
    }

    console.log(`Reprocessing complete. Updated ${totalUpdated} out of ${totalProcessed} transactions`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully reprocessed ${statements?.length || 0} statements`,
        totalUpdated,
        totalProcessed
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in reprocess-bank-statements:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

// Enhanced CSV parsing function with payee prioritization
function parseCSV(csvContent: string): any[] {
  const lines = csvContent.trim().split('\n')
  if (lines.length < 2) return []

  // Parse header to find column indices
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim())
  console.log('CSV Headers:', headers)

  // Enhanced payee column detection - this is the priority
  let payeeIdx = -1
  const payeeColumns = [
    'payee', 'merchant', 'vendor', 'business name', 'business_name',
    'merchant name', 'merchant_name', 'counterparty', 'beneficiary',
    'recipient', 'sender', 'company', 'store', 'establishment'
  ]
  
  for (const payeeCol of payeeColumns) {
    payeeIdx = headers.findIndex(h => h.includes(payeeCol))
    if (payeeIdx !== -1) {
      console.log(`Found payee column: ${headers[payeeIdx]} at index ${payeeIdx}`)
      break
    }
  }

  // Find other essential columns
  const dateIdx = headers.findIndex(h => 
    h.includes('date') || h.includes('transaction date') || h.includes('posted')
  )
  const amountIdx = headers.findIndex(h => 
    h.includes('amount') || h.includes('value') || h.includes('sum')
  )
  const descriptionIdx = headers.findIndex(h => 
    h.includes('description') || h.includes('memo') || h.includes('note') || 
    h.includes('detail') || h.includes('narrative')
  )
  const typeIdx = headers.findIndex(h => 
    h.includes('type') || h.includes('transaction type') || h.includes('kind')
  )

  console.log(`Column indices - Date: ${dateIdx}, Amount: ${amountIdx}, Payee: ${payeeIdx}, Description: ${descriptionIdx}, Type: ${typeIdx}`)

  const transactions = []

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i])
    if (row.length === 0) continue

    try {
      const date = parseDate(row[dateIdx] || '')
      if (!date) continue

      const amount = parseAmount(row[amountIdx] || '0')
      
      // PRIORITY 1: Use payee column if available and not empty
      let description = ''
      if (payeeIdx !== -1 && row[payeeIdx] && row[payeeIdx].trim()) {
        description = cleanPayeeName(row[payeeIdx].trim())
        console.log(`Using payee column: "${row[payeeIdx]}" -> "${description}"`)
      }
      // PRIORITY 2: Fall back to description column
      else if (descriptionIdx !== -1 && row[descriptionIdx] && row[descriptionIdx].trim()) {
        description = extractMerchantName(row[descriptionIdx].trim())
        console.log(`Using description column: "${row[descriptionIdx]}" -> "${description}"`)
      }
      // PRIORITY 3: Generic fallback
      else {
        description = amount > 0 ? 'Income Transaction' : 'Expense Transaction'
        console.log(`Using generic fallback: "${description}"`)
      }

      const type = amount > 0 ? 'credit' : 'debit'
      const category = categorizeTransaction(description)

      transactions.push({
        date,
        description,
        amount: Math.abs(amount),
        type,
        category
      })

    } catch (error) {
      console.error(`Error parsing row ${i}:`, error, row)
      continue
    }
  }

  console.log(`Successfully parsed ${transactions.length} transactions`)
  return transactions
}

function parseCSVLine(line: string): string[] {
  const result = []
  let current = ''
  let inQuotes = false
  let i = 0

  while (i < line.length) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i += 2
        continue
      }
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
    i++
  }

  result.push(current.trim())
  return result.map(field => field.replace(/^"|"$/g, ''))
}

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null
  
  const cleanDateStr = dateStr.trim()
  const formats = [
    /^\d{4}-\d{2}-\d{2}$/,     // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/,   // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/,     // MM-DD-YYYY
    /^\d{1,2}\/\d{1,2}\/\d{4}$/, // M/D/YYYY
    /^\d{2}\/\d{2}\/\d{2}$/,   // MM/DD/YY
  ]

  for (const format of formats) {
    if (format.test(cleanDateStr)) {
      const date = new Date(cleanDateStr)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]
      }
    }
  }

  try {
    const date = new Date(cleanDateStr)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  } catch (error) {
    // Ignore parsing errors
  }

  return null
}

function parseAmount(amountStr: string): number {
  if (!amountStr) return 0
  
  const cleanAmount = amountStr
    .replace(/[$,£€¥]/g, '')
    .replace(/[()]/g, '')
    .trim()
  
  const amount = parseFloat(cleanAmount)
  return isNaN(amount) ? 0 : amount
}

function cleanPayeeName(payee: string): string {
  if (!payee) return 'Unknown Payee'
  
  // Remove common prefixes and suffixes
  let cleaned = payee
    .replace(/^(DEBIT|CREDIT|ACH|WIRE|CHECK|ATM|POS|ONLINE)\s+/i, '')
    .replace(/\s+(DEBIT|CREDIT|PURCHASE|WITHDRAWAL|DEPOSIT)$/i, '')
    .replace(/\s+\d{4,}$/, '') // Remove trailing numbers like card numbers
    .replace(/\s+[A-Z]{2,3}\s*$/, '') // Remove trailing state codes
    .trim()

  // Extract meaningful merchant name
  return extractMerchantName(cleaned)
}

function extractMerchantName(description: string): string {
  if (!description) return 'Unknown Transaction'
  
  // Remove dates and times
  let cleaned = description
    .replace(/\d{2}\/\d{2}\/\d{4}/g, '')
    .replace(/\d{2}-\d{2}-\d{4}/g, '')
    .replace(/\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?/gi, '')
    
  // Remove transaction IDs and reference numbers
  cleaned = cleaned
    .replace(/\b\d{10,}\b/g, '')
    .replace(/REF\s*#?\s*\d+/gi, '')
    .replace(/TRANS\s*#?\s*\d+/gi, '')
    .replace(/ID\s*#?\s*\d+/gi, '')
    
  // Remove common banking prefixes
  cleaned = cleaned
    .replace(/^(DEBIT|CREDIT|ACH|WIRE|CHECK|ATM|POS|ONLINE|CARD)\s+/gi, '')
    .replace(/^(PURCHASE|WITHDRAWAL|DEPOSIT|TRANSFER|PAYMENT)\s+/gi, '')
    
  // Clean up extra whitespace and get first meaningful part
  const parts = cleaned.trim().split(/\s+/).filter(part => part.length > 2)
  if (parts.length === 0) return 'Transaction'
  
  // Take first 1-3 meaningful words
  const meaningfulParts = parts.slice(0, 3)
  return meaningfulParts.join(' ').substring(0, 50)
}

function categorizeTransaction(description: string): string {
  const desc = description.toLowerCase()
  
  // Food & Dining
  if (desc.includes('restaurant') || desc.includes('cafe') || desc.includes('coffee') || 
      desc.includes('pizza') || desc.includes('food') || desc.includes('dining') ||
      desc.includes('starbucks') || desc.includes('mcdonalds')) {
    return 'Food & Dining'
  }
  
  // Shopping
  if (desc.includes('amazon') || desc.includes('walmart') || desc.includes('target') || 
      desc.includes('store') || desc.includes('shop') || desc.includes('retail')) {
    return 'Shopping'
  }
  
  // Gas & Transportation
  if (desc.includes('gas') || desc.includes('fuel') || desc.includes('shell') || 
      desc.includes('exxon') || desc.includes('bp') || desc.includes('uber') || 
      desc.includes('lyft') || desc.includes('taxi')) {
    return 'Transportation'
  }
  
  // Bills & Utilities
  if (desc.includes('electric') || desc.includes('water') || desc.includes('phone') || 
      desc.includes('internet') || desc.includes('utility') || desc.includes('bill')) {
    return 'Bills & Utilities'
  }
  
  // Healthcare
  if (desc.includes('medical') || desc.includes('pharmacy') || desc.includes('doctor') || 
      desc.includes('hospital') || desc.includes('health')) {
    return 'Healthcare'
  }
  
  return 'Other'
}