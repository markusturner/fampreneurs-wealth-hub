UPDATE public.markus_knowledge_sources
SET config = config || jsonb_build_object('since', to_char((now() - interval '3 years') AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'sales_titles', coalesce(config->'sales_titles', '[]'::jsonb), 'cursor', null),
    last_success_at = NULL
WHERE platform = 'fathom';