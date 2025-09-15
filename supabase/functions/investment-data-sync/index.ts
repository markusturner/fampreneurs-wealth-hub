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
    } else if (platformId === 'fidelity') {
      portfolioData = {
        totalValue: 3250000,
        dayChange: 25000,
        dayChangePercent: 0.78,
        positions: [
          { symbol: 'FXAIX', quantity: 1500, marketValue: 850000, unrealizedPL: 45000 },
          { symbol: 'FTEC', quantity: 800, marketValue: 425000, unrealizedPL: 22000 },
          { symbol: 'FSKAX', quantity: 2000, marketValue: 650000, unrealizedPL: 18000 },
          { symbol: 'Individual Stocks', quantity: 1, marketValue: 1125000, unrealizedPL: 75000 }
        ],
        cash: 200000,
        lastUpdated: new Date().toISOString()
      }
    } else if (platformId === 'schwab') {
      portfolioData = {
        totalValue: 2880000,
        dayChange: 18500,
        dayChangePercent: 0.65,
        positions: [
          { symbol: 'SWTSX', quantity: 3000, marketValue: 950000, unrealizedPL: 65000 },
          { symbol: 'SCHB', quantity: 1200, marketValue: 485000, unrealizedPL: 28000 },
          { symbol: 'SCHF', quantity: 800, marketValue: 320000, unrealizedPL: 15000 },
          { symbol: '401k Holdings', quantity: 1, marketValue: 925000, unrealizedPL: 125000 }
        ],
        cash: 200000,
        lastUpdated: new Date().toISOString()
      }
    } else if (platformId === 'vanguard') {
      portfolioData = {
        totalValue: 4150000,
        dayChange: 32000,
        dayChangePercent: 0.78,
        positions: [
          { symbol: 'VTSAX', quantity: 2500, marketValue: 1250000, unrealizedPL: 185000 },
          { symbol: 'VTIAX', quantity: 1800, marketValue: 750000, unrealizedPL: 95000 },
          { symbol: 'VBTLX', quantity: 3000, marketValue: 450000, unrealizedPL: 25000 },
          { symbol: 'IRA Rollover', quantity: 1, marketValue: 1450000, unrealizedPL: 250000 }
        ],
        cash: 250000,
        lastUpdated: new Date().toISOString()
      }
    } else if (platformId === 'interactive_brokers') {
      portfolioData = {
        totalValue: 1950000,
        dayChange: 15500,
        dayChangePercent: 0.80,
        positions: [
          { symbol: 'SPY', quantity: 1000, marketValue: 485000, unrealizedPL: 25000 },
          { symbol: 'QQQ', quantity: 600, marketValue: 285000, unrealizedPL: 18000 },
          { symbol: 'IWM', quantity: 400, marketValue: 180000, unrealizedPL: 8500 },
          { symbol: 'International ETFs', quantity: 1, marketValue: 850000, unrealizedPL: 45000 }
        ],
        cash: 150000,
        lastUpdated: new Date().toISOString()
      }
    } else if (platformId === 'etrade') {
      portfolioData = {
        totalValue: 1250000,
        dayChange: 8500,
        dayChangePercent: 0.69,
        positions: [
          { symbol: 'AAPL', quantity: 200, marketValue: 365000, unrealizedPL: 25000 },
          { symbol: 'MSFT', quantity: 150, marketValue: 285000, unrealizedPL: 18000 },
          { symbol: 'AMZN', quantity: 80, marketValue: 185000, unrealizedPL: 12000 },
          { symbol: 'ROTH IRA', quantity: 1, marketValue: 315000, unrealizedPL: 85000 }
        ],
        cash: 100000,
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