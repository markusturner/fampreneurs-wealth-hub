import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Transaction {
  id: string
  description: string
  amount: number
  type: string
}

interface CategorizedTransaction {
  id: string
  category: string
  confidence: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { transactions } = await req.json() as { transactions: Transaction[] }

    if (!transactions || transactions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No transactions provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // AI categorization logic using OpenAI-style categorization
    const categorizedTransactions: CategorizedTransaction[] = transactions.map(transaction => {
      const description = transaction.description.toLowerCase()
      const amount = Math.abs(transaction.amount)
      
      let category = 'Other'
      let confidence = 0.5

      // Food & Dining
      if (description.includes('restaurant') || description.includes('food') || 
          description.includes('cafe') || description.includes('pizza') ||
          description.includes('starbucks') || description.includes('mcdonald') ||
          description.includes('grocery') || description.includes('supermarket')) {
        category = 'Food & Dining'
        confidence = 0.9
      }
      // Transportation
      else if (description.includes('gas') || description.includes('fuel') ||
               description.includes('uber') || description.includes('lyft') ||
               description.includes('parking') || description.includes('metro') ||
               description.includes('taxi') || description.includes('bus')) {
        category = 'Transportation'
        confidence = 0.85
      }
      // Shopping
      else if (description.includes('amazon') || description.includes('target') ||
               description.includes('walmart') || description.includes('store') ||
               description.includes('shop') || description.includes('retail')) {
        category = 'Shopping'
        confidence = 0.8
      }
      // Utilities
      else if (description.includes('electric') || description.includes('water') ||
               description.includes('internet') || description.includes('phone') ||
               description.includes('cable') || description.includes('utility')) {
        category = 'Utilities'
        confidence = 0.9
      }
      // Healthcare
      else if (description.includes('medical') || description.includes('doctor') ||
               description.includes('pharmacy') || description.includes('hospital') ||
               description.includes('health') || description.includes('dental')) {
        category = 'Healthcare'
        confidence = 0.85
      }
      // Income
      else if (transaction.type === 'income' || transaction.type === 'credit' ||
               description.includes('salary') || description.includes('payroll') ||
               description.includes('deposit') || description.includes('payment received')) {
        category = 'Income'
        confidence = 0.9
      }
      // Entertainment
      else if (description.includes('movie') || description.includes('netflix') ||
               description.includes('spotify') || description.includes('game') ||
               description.includes('entertainment') || description.includes('theater')) {
        category = 'Entertainment'
        confidence = 0.8
      }
      // Business Expenses
      else if (description.includes('office') || description.includes('business') ||
               description.includes('software') || description.includes('subscription') ||
               description.includes('service') || amount > 500) {
        category = 'Business'
        confidence = 0.7
      }

      return {
        id: transaction.id,
        category,
        confidence
      }
    })

    return new Response(
      JSON.stringify({ 
        categorizedTransactions,
        processedCount: transactions.length,
        message: 'Transactions categorized successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in ai-categorize-transactions:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to categorize transactions',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})