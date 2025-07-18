import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AlpacaPosition {
  asset_id: string
  symbol: string
  qty: string
  market_value: string
  cost_basis: string
  unrealized_pl: string
  side: string
}

interface AlpacaAccount {
  portfolio_value: string
  buying_power: string
  cash: string
  long_market_value: string
  short_market_value: string
  equity: string
  last_equity: string
  multiplier: string
  currency: string
  status: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, platformId } = await req.json()

    if (!userId || !platformId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or platformId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the API connection details from financial_advisors table
    const { data: connections, error: connectionsError } = await supabaseClient
      .from('financial_advisors')
      .select('notes, bio')
      .eq('added_by', userId)
      .like('notes', `%${platformId}%`)
      .limit(1)

    if (connectionsError || !connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No API connection found for this platform' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const connection = connections[0]
    
    // For demo purposes, we'll simulate different API responses based on platform
    let portfolioData: any = {}

    if (platformId === 'alpaca') {
      // In a real implementation, you would use the stored API key to make actual API calls
      // For now, we'll simulate Alpaca API responses
      portfolioData = {
        totalValue: 2450000,
        dayChange: 12450,
        dayChangePercent: 0.51,
        positions: [
          { symbol: 'AAPL', quantity: 100, marketValue: 175000, unrealizedPL: 5000 },
          { symbol: 'MSFT', quantity: 50, marketValue: 85000, unrealizedPL: 2000 },
          { symbol: 'GOOGL', quantity: 25, marketValue: 125000, unrealizedPL: -1500 },
          { symbol: 'TSLA', quantity: 75, marketValue: 195000, unrealizedPL: 8000 }
        ],
        cash: 120000,
        lastUpdated: new Date().toISOString()
      }
    } else if (platformId === 'polygon') {
      portfolioData = {
        totalValue: 1850000,
        dayChange: 18500,
        dayChangePercent: 1.01,
        positions: [
          { symbol: 'SPY', quantity: 500, marketValue: 220000, unrealizedPL: 3000 },
          { symbol: 'QQQ', quantity: 300, marketValue: 165000, unrealizedPL: 4500 },
          { symbol: 'VTI', quantity: 200, marketValue: 145000, unrealizedPL: 2200 }
        ],
        cash: 95000,
        lastUpdated: new Date().toISOString()
      }
    } else if (platformId === 'coinbase') {
      portfolioData = {
        totalValue: 850000,
        dayChange: -15000,
        dayChangePercent: -1.73,
        positions: [
          { symbol: 'BTC', quantity: 12.5, marketValue: 650000, unrealizedPL: -10000 },
          { symbol: 'ETH', quantity: 125, marketValue: 180000, unrealizedPL: -5000 },
          { symbol: 'SOL', quantity: 1000, marketValue: 20000, unrealizedPL: 0 }
        ],
        cash: 0,
        lastUpdated: new Date().toISOString()
      }
    } else {
      // For manual connections, extract balance from bio
      const bioMatch = connection.bio?.match(/Balance: \$([0-9,]+)/)
      const balance = bioMatch ? parseInt(bioMatch[1].replace(/,/g, '')) : 100000
      
      portfolioData = {
        totalValue: balance,
        dayChange: Math.floor(balance * 0.005), // 0.5% daily change
        dayChangePercent: 0.5,
        positions: [],
        cash: balance * 0.1, // 10% cash
        lastUpdated: new Date().toISOString()
      }
    }

    // Store or update the portfolio data
    const { error: upsertError } = await supabaseClient
      .from('investment_portfolios')
      .upsert({
        user_id: userId,
        platform_id: platformId,
        total_value: portfolioData.totalValue,
        day_change: portfolioData.dayChange,
        day_change_percent: portfolioData.dayChangePercent,
        positions: portfolioData.positions,
        cash_balance: portfolioData.cash,
        last_updated: portfolioData.lastUpdated,
        updated_at: new Date().toISOString()
      })

    if (upsertError) {
      console.error('Error updating portfolio:', upsertError)
      return new Response(
        JSON.stringify({ error: 'Failed to update portfolio data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        portfolioData,
        message: `Successfully synced ${platformId} portfolio data`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in investment sync:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})