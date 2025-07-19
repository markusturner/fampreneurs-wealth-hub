-- Update feedback_responses table to include all the new survey fields
ALTER TABLE feedback_responses 
DROP COLUMN IF EXISTS overall_satisfaction,
DROP COLUMN IF EXISTS program_effectiveness,
DROP COLUMN IF EXISTS ease_of_use,
DROP COLUMN IF EXISTS community_support,
DROP COLUMN IF EXISTS feature_usefulness,
DROP COLUMN IF EXISTS improvement_suggestions,
DROP COLUMN IF EXISTS additional_feedback;

ALTER TABLE feedback_responses
ADD COLUMN full_name TEXT,
ADD COLUMN current_module TEXT,
ADD COLUMN overall_experience_rating INTEGER CHECK (overall_experience_rating >= 1 AND overall_experience_rating <= 10),
ADD COLUMN experience_explanation TEXT,
ADD COLUMN coach_response_rating INTEGER CHECK (coach_response_rating >= 1 AND coach_response_rating <= 10),
ADD COLUMN improvement_suggestions TEXT,
ADD COLUMN retreat_interest TEXT,
ADD COLUMN additional_comments TEXT;