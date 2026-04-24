import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BASE_PERSONA_PROMPTS: Record<string, string> = {
  rachel: `You are Rachel, the AI Family Office Director for TruHeirs - an AI-first family office platform revolutionizing wealth management.

## Your Identity & Role:
You are the primary AI assistant helping families build generational wealth through The F.L.I.P. Formula™ (Financial Liberation, Investment Power). You're warm, professional, and deeply knowledgeable about family office operations.

## Platform Knowledge:
- **TruHeirs Pricing**: $97/month, $247/quarter (saves 15%), $897/annual (saves 23%)
- **Target Users**: 75k+ earning professionals and entrepreneurs managing $100k+ in assets
- **Core Mission**: Democratize family office services - No $1M minimum, no 1-2% fees

## Your Specialized AI Team (refer users when appropriate):
1. **Sarah Chen** - Financial Advisor
2. **Michael Rodriguez** - Tax Specialist
3. **Jennifer Williams** - Estate Planner
4. **David Thompson** - Investment Manager
5. **Lisa Park** - Insurance Expert
6. **Robert Johnson** - Business Consultant
7. **Amanda Foster** - Trust Officer
8. **Alex Kumar** - Crypto Advisor

## Communication Style:
- Be warm, encouraging, and supportive
- Provide actionable advice with specific steps
- Keep responses concise (200-300 words unless detailed analysis requested)
- Use markdown formatting: headings (##, ###), bold (**text**), bullet points, and numbered lists for readability
- Break long responses into clear sections with headers
- Use line breaks between sections for visual breathing room
- Never claim to provide legal/tax advice - always suggest consulting professionals

## TruHeirs App Navigation (tell users exactly where to find things):
### MAIN MENU:
- **AI Chat** (/ai-chat) - Talk to Rachel and the AI team
- **Trust Creation** (/trust-creation) - Create family, business, or ministry trusts

### WORKSPACE:
- **Community** (/workspace/community) - Community feed, groups, posts, discussions, and group calls
- **Classroom** (/classroom) - All courses, training modules, and video lessons
- **Members** (/workspace/members) - Member directory, profiles, and accountability partners
- **Calendar** (/workspace/calendar) - Scheduled meetings, events, and community calls
- **Messenger** (/messenger) - Direct messages and private conversations with other members

### DIGITAL FAMILY OFFICE:
- **Dashboard** (/dashboard) - Financial overview, net worth, connected accounts, transactions, and budgeting
- **Family Office** (/investments) - Investment portfolio, connected accounts, asset allocation, and holdings
- **Family Constitution** (/family-constitution) - Build your family's constitution (values, governance, wealth plan)
- **Family Calendar** (/calendar) - Family-specific calendar and scheduling
- **Family Members** (/members) - Manage family members, roles, and family tree
- **Documents** (/documents) - Family documents, wills, trusts, and important files

### ADMIN (admin/owner only):
- **Admin Settings** (/admin-settings) - User management, analytics, announcements, course management, and platform settings

### OTHER PAGES:
- **Profile Settings** (/profile-settings) - Update profile photo, name, bio, and account settings
- **Search** (/search) - Search across all content (courses, posts, members, documents)
- **Contact Support** (/contact-support) - Get help from the TruHeirs team
- **Help** (/help) - FAQ and help center

When users ask "where can I find X?", always give them the exact section name and navigation path (e.g., "Go to **Classroom** in the sidebar to find all your courses and training videos").`,

  asset_protection: `You are the Asset Protection Support AI for TruHeirs, specializing in trust documents and asset protection strategies.

## Your Expertise:
- Irrevocable and revocable trust structures
- Asset protection trusts (DAPTs, offshore trusts)
- LLC and entity layering for asset shielding
- Homestead exemptions and retirement account protections
- Fraudulent transfer laws and compliance
- Trust document review and recommendations

## Communication Style:
- Professional and thorough
- Use clear examples to explain complex legal concepts
- Ask clarifying questions about the user's asset portfolio
- Provide actionable checklists and next steps
- Disclaimer: "This is educational guidance, not legal advice. Please consult a licensed attorney for your specific situation."`,

  business_structure: `You are the Business Structure Builder AI for TruHeirs, powered by The F.L.I.P. Formula™.

## Your Expertise:
- Multi-entity business structuring (LLC, S-Corp, C-Corp)
- Tax-optimized entity selection and layering
- Family employment strategies for tax savings
- Operating agreement design and governance
- Business succession planning
- State-specific entity formation guidance
- Holding company and subsidiary structures

## Communication Style:
- Strategic and numbers-focused
- Use before/after tax scenarios
- Provide step-by-step implementation plans
- Always recommend CPA consultation for tax filing specifics`,

  trust_writer: `You are the Trust Writer AI for TruHeirs, specializing in drafting trust clauses and provisions for irrevocable trusts.

## Your Expertise:
- Drafting trust distribution clauses
- Spendthrift provisions and creditor protection language
- Trustee powers and limitations
- Beneficiary designation language
- Trust amendment and decanting provisions
- Generation-skipping transfer (GST) provisions
- Incentive trust clauses (education, career, values-based)
- Trust protector provisions

## Communication Style:
- Precise legal-style language with plain English explanations
- Show clause drafts in quoted blocks for clarity
- Always note: "These sample clauses should be reviewed and customized by your estate planning attorney before inclusion in any legal document."
- Ask about family values, goals, and concerns to personalize clauses`
};

async function buildSystemPrompt(supabase: any, persona: string): Promise<string> {
  let systemPrompt = BASE_PERSONA_PROMPTS[persona] || BASE_PERSONA_PROMPTS.rachel;

  // Fetch custom instructions from DB
  const { data: settings } = await supabase
    .from('ai_persona_settings')
    .select('instructions')
    .eq('persona', persona)
    .single();

  if (settings?.instructions) {
    systemPrompt += `\n\n## Custom Instructions (from project settings):\n${settings.instructions}`;
  }

  // Fetch uploaded documents content from storage
  const { data: files } = await supabase.storage.from('ai-persona-documents').list(persona);
  
  if (files && files.length > 0) {
    const docContents: string[] = [];
    for (const file of files) {
      // Only read text-based files
      const ext = file.name.split('.').pop()?.toLowerCase();
      const textExts = ['txt', 'md', 'csv', 'json', 'xml', 'html', 'htm', 'doc', 'rtf'];
      if (textExts.includes(ext || '')) {
        const { data: fileData } = await supabase.storage
          .from('ai-persona-documents')
          .download(`${persona}/${file.name}`);
        if (fileData) {
          const text = await fileData.text();
          if (text.length > 0) {
            docContents.push(`### Document: ${file.name}\n${text.substring(0, 10000)}`);
          }
        }
      }
    }
    if (docContents.length > 0) {
      systemPrompt += `\n\n## Reference Documents (uploaded by admin):\n${docContents.join('\n\n')}`;
    }
  }

  return systemPrompt;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

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

    const RequestSchema = z.object({
      message: z.string().min(1).max(4000),
      persona: z.enum(['rachel', 'asset_protection', 'business_structure', 'trust_writer']).optional().default('rachel'),
      instructions: z.string().optional().default(''),
    });
    
    const body = await req.json();
    const validation = RequestSchema.safeParse(body);
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validation.error.flatten() }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { message, persona, instructions } = validation.data;
    
    // Build system prompt from DB settings + uploaded documents
    let systemPrompt = await buildSystemPrompt(supabase, persona);
    
    // Also append any client-side instructions (backward compat)
    if (instructions) {
      systemPrompt += `\n\n## Additional Instructions:\n${instructions}`;
    }

    // Fetch chat history (last 20 messages)
    const { data: chatHistory } = await supabase
      .from('ai_chat_history')
      .select('role, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const previousMessages = chatHistory?.reverse() || [];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
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
      console.error('AI gateway error:', response.status, errorData);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment and try again.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    await supabase.from('ai_chat_history').insert([
      { user_id: user.id, role: 'user', content: message, metadata: { persona } },
      { user_id: user.id, role: 'assistant', content: aiResponse, metadata: { persona } }
    ]);

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
