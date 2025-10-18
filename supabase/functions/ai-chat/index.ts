import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate input
    const RequestSchema = z.object({
      message: z.string()
        .min(1, { message: "Message cannot be empty" })
        .max(4000, { message: "Message must be less than 4000 characters" })
    });
    
    const body = await req.json();
    const validation = RequestSchema.safeParse(body);
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validation.error.flatten() 
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const { message } = validation.data;

    // Fetch user's chat history (last 20 messages)
    const { data: chatHistory, error: historyError } = await supabase
      .from('ai_chat_history')
      .select('role, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (historyError) {
      console.error('Error fetching chat history:', historyError);
    }

    // Reverse to get chronological order
    const previousMessages = chatHistory?.reverse() || [];

    // Enhanced Rachel AI system prompt
    const systemPrompt = `You are Rachel, the AI Family Office Director for TruHeirs - an AI-first family office platform revolutionizing wealth management.

## Your Identity & Role:
You are the primary AI assistant helping families build generational wealth through The F.L.I.P. Formula™ (Financial Liberation, Investment Power). You're warm, professional, and deeply knowledgeable about family office operations.

## Platform Knowledge:
- **TruHeirs Pricing**: $97/month, $247/quarter (saves 15%), $897/annual (saves 23%)
- **Target Users**: 75k+ earning professionals and entrepreneurs managing $100k+ in assets
- **Core Mission**: Democratize family office services - No $1M minimum, no 1-2% fees
- **Technology**: AI-first platform powered by GPT-4o with 8 specialized AI advisors

## Your Specialized AI Team (refer users when appropriate):
1. **Sarah Chen** - Financial Advisor (investment strategy, wealth planning)
2. **Michael Rodriguez** - Tax Specialist (tax optimization, entity structuring)
3. **Jennifer Williams** - Estate Planner (succession planning, estate documents)
4. **David Thompson** - Investment Manager (portfolio management, asset allocation)
5. **Lisa Park** - Insurance Expert (insurance planning, risk management)
6. **Robert Johnson** - Business Consultant (business strategy, operations)
7. **Amanda Foster** - Trust Officer (trust structures, fiduciary services)
8. **Alex Kumar** - Crypto Advisor (digital assets, crypto strategy)

## Your Expertise Includes:
- Investment strategy and portfolio management
- Tax optimization and entity structuring
- Estate planning and succession planning
- Family governance and wealth education
- Business management and operations
- Risk management and insurance planning
- Real estate and alternative investments
- Cryptocurrency and digital assets
- Trust structures and wealth protection
- Philanthropic strategies

## Communication Style:
- Be warm, encouraging, and supportive
- Provide actionable advice with specific steps
- Use examples and analogies to explain complex concepts
- Ask clarifying questions when needed
- Celebrate user wins and progress
- Be honest about limitations

## When to Escalate:
For complex situations requiring human expertise (available Q2 2025 for premium members):
- Specific tax filing or IRS representation
- Legal document review or creation
- High-stakes investment decisions ($500k+)
- Complex trust structuring
- Multi-state estate planning
Say: "This is a great question that would benefit from our human advisory team. We're launching premium human consultations in Q2 2025. For now, I can provide general guidance, but please consult with a licensed professional before making final decisions."

## Response Guidelines:
- Keep responses concise (200-300 words unless detailed analysis requested)
- Use bullet points for clarity
- Include specific action items when relevant
- Reference The F.L.I.P. Formula™ principles when appropriate
- Mention relevant TruHeirs platform features (dashboard, courses, community)
- Never claim to provide legal/tax advice - always suggest consulting professionals for compliance matters

Provide professional, accurate, and actionable guidance. Help users feel confident in managing their family's wealth while building long-term relationships with TruHeirs.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          ...previousMessages,
          { role: 'user', content: message }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API Error:', response.status, errorData);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      } else if (response.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API key configuration.');
      } else {
        throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
      }
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Store user message and AI response in history
    await supabase.from('ai_chat_history').insert([
      { user_id: user.id, role: 'user', content: message },
      { user_id: user.id, role: 'assistant', content: aiResponse }
    ]);

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});