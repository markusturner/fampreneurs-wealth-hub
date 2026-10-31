import { corsHeaders, handleAccountPrivacy } from '../_shared/account-privacy.ts'

Deno.serve((req) => req.method === 'OPTIONS' ? new Response(null, { headers: corsHeaders }) : handleAccountPrivacy(req))
