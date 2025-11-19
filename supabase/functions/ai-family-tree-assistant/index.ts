import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const familyTreeRequestSchema = z.object({
  familyText: z.string()
    .trim()
    .min(1, { message: "Family text cannot be empty" })
    .max(4000, { message: "Family text must be less than 4000 characters" }),
  assistanceType: z.enum(['expand', 'format', 'suggest'], {
    errorMap: () => ({ message: "Assistance type must be 'expand', 'format', or 'suggest'" })
  })
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!openAIApiKey) {
    return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('Authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate input
    const body = await req.json();
    const validationResult = familyTreeRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validationResult.error.errors 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { familyText, assistanceType } = validationResult.data;

    let systemPrompt = '';
    let userPrompt = '';

    switch (assistanceType) {
      case 'expand':
        systemPrompt = `You are a family tree assistant. Help expand incomplete family information by suggesting realistic family structures. Return the response in the same text format as the input, but expanded with likely missing relatives, relationships, and generations. Keep the original information intact and add logical extensions.

Format your response using:
- Person names on separate lines
- "married to [spouse name]" for marriages
- "children: [name1], [name2]" for children
- "parents: [parent1], [parent2]" for parents
- Use tree symbols like ├─, └─, │ for visual hierarchy`;
        userPrompt = `Please expand this family tree with logical additions:\n\n${familyText}`;
        break;

      case 'format':
        systemPrompt = `You are a family tree formatting assistant. Take unstructured family information and format it properly for family tree visualization. Use tree symbols and clear relationship indicators.

Format rules:
- Use ├─, └─, │ symbols for tree structure
- "married to [spouse name]" for marriages  
- "children: [name1], [name2]" for children
- "parents: [parent1], [parent2]" for parents
- Group by generations
- Keep all original names and relationships`;
        userPrompt = `Please format this family information into a proper family tree structure:\n\n${familyText}`;
        break;

      case 'suggest':
        systemPrompt = `You are a family tree assistant. Based on the partial family information provided, suggest what additional information might be missing and provide 3-5 specific suggestions for expanding the family tree. Don't generate the full tree, just suggest what could be added.`;
        userPrompt = `Based on this family tree, what additional family members or information should I consider adding?\n\n${familyText}`;
        break;
    }

    console.log('Processing family tree request for user:', user.id, 'type:', assistanceType);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('Generated family tree response for user:', user.id);

    return new Response(JSON.stringify({ 
      success: true, 
      response: aiResponse,
      assistanceType 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-family-tree-assistant function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
