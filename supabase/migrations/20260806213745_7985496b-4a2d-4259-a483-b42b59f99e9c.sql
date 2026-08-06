UPDATE public.notifications
SET title = replace(replace(title, 'The Family Business Accelerator', 'The Private Estate Accelerator'), 'Family Business Accelerator', 'The Private Estate Accelerator'),
    message = replace(replace(message, 'The Family Business Accelerator', 'The Private Estate Accelerator'), 'Family Business Accelerator', 'The Private Estate Accelerator')
WHERE title ILIKE '%Business Accelerator%' OR message ILIKE '%Business Accelerator%';