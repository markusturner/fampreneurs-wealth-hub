import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PortfolioData {
  stocks: number
  etfs: number
  crypto: number
  houseEquity: number
  business: number
  date: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { action, portfolioData, spreadsheetId, accessToken } = await req.json()

    if (!accessToken) {
      throw new Error('No access token provided')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user from the JWT token
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('Unauthorized')
    }

    switch (action) {
      case 'create_sheet':
        return await createPortfolioSheet(accessToken)
      
      case 'update_portfolio':
        return await updatePortfolioData(accessToken, spreadsheetId, portfolioData)
      
      case 'get_portfolio':
        return await getPortfolioData(accessToken, spreadsheetId)
      
      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('Error in Google Sheets integration:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function createPortfolioSheet(accessToken: string) {
  const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: 'Family Office Portfolio Tracker'
      },
      sheets: [
        {
          properties: {
            title: 'Portfolio Data'
          }
        }
      ]
    })
  })

  if (!createResponse.ok) {
    throw new Error('Failed to create spreadsheet')
  }

  const spreadsheet = await createResponse.json()
  const spreadsheetId = spreadsheet.spreadsheetId

  // Set up headers and sample data
  const headers = [
    ['Date', 'Stocks', 'ETFs', 'Crypto', 'House Equity', 'Business', 'Total Portfolio']
  ]

  const updateResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Portfolio Data!A1:G1?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: headers
      })
    }
  )

  if (!updateResponse.ok) {
    throw new Error('Failed to set up spreadsheet headers')
  }

  return new Response(
    JSON.stringify({ 
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      message: 'Portfolio tracking spreadsheet created successfully!'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function updatePortfolioData(accessToken: string, spreadsheetId: string, portfolioData: PortfolioData) {
  const total = portfolioData.stocks + portfolioData.etfs + portfolioData.crypto + 
                portfolioData.houseEquity + portfolioData.business

  const values = [[
    portfolioData.date,
    portfolioData.stocks,
    portfolioData.etfs,
    portfolioData.crypto,
    portfolioData.houseEquity,
    portfolioData.business,
    total
  ]]

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Portfolio Data!A:G:append?valueInputOption=RAW`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values
      })
    }
  )

  if (!response.ok) {
    throw new Error('Failed to update portfolio data')
  }

  return new Response(
    JSON.stringify({ message: 'Portfolio data updated successfully!' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getPortfolioData(accessToken: string, spreadsheetId: string) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Portfolio Data!A:G`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    }
  )

  if (!response.ok) {
    throw new Error('Failed to fetch portfolio data')
  }

  const data = await response.json()
  
  return new Response(
    JSON.stringify({ data: data.values || [] }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}