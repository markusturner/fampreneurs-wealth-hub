# Markus AI Voice Call (sounds like you)

Members tap a "Call Markus" button and talk out loud with Markus, and he answers in your existing Markus voice from ElevenLabs.

## What you need to do
1. Connect your ElevenLabs account to the app when asked.
2. Tell me the name of your Markus voice so I use the right one.

## What gets built
- A "Call Markus" button on the Markus AI page (phone, tablet and computer).
- A live call screen with a talking animation, mute and hang up buttons.
- Markus uses the same knowledge, rules and personality he has in chat now.
- Markus remembers the member's past chats before the call starts, so he picks up where they left off.
- Each call's written transcript is saved to the same private Markus history, so chat also remembers the call.
- Same access rules as chat (Lite and VIP limits stay the same).

## Technical details
- ElevenLabs Conversational AI agent using the user's existing ElevenLabs Markus voice ID, started through a server function that issues a short-lived token (key never in the browser).
- Agent system prompt mirrors the existing Markus persona; knowledge pulled from the existing approved Markus knowledge search.
- Token function loads the member's recent ai_chat_history and passes a summary as the agent prompt override, so calls do not start fresh.
- Transcripts stored in existing ai_chat_history tied to the user.

## Part 2: Knowledge Base and Projects in Markus AI
- Add a "Projects" section on every Markus AI page (Welcome, Coach Markus, phone Markus AI page) using the same projects the full AI Chat page already has, so folders match everywhere.
- Add a "Knowledge Base" section where each member can upload their own files (PDF, Word, text) or paste notes. Markus reads these when answering, in chat and on voice calls.
- Files can be added to a whole account or to one project, so a project only uses its own files.
- Each member's files stay private to them.

### Technical details
- Reuse existing chat_projects; new user_knowledge_files table plus a private storage bucket, RLS scoped to the owner.
- Chat and voice prompt builders pull short excerpts from the member's files (and project files when a project is open).
