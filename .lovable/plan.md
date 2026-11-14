# Markus AI Voice Call (sounds like you)

Yes, this is possible. Members tap a "Call Markus" button and talk out loud with Markus, and he answers back in a voice cloned from yours.

## What you need to do
1. Make an ElevenLabs account (Creator plan or higher, needed for voice cloning).
2. Upload 1 to 3 minutes of clear recordings of yourself talking to make your voice clone.
3. Connect ElevenLabs to the app when asked.

## What gets built
- A "Call Markus" button on the Markus AI page (phone, tablet and computer).
- A live call screen with a talking animation, mute and hang up buttons.
- Markus uses the same knowledge, rules and personality he has in chat now.
- Markus remembers the member's past chats before the call starts, so he picks up where they left off.
- Each call's written transcript is saved to the same private Markus history, so chat also remembers the call.
- Same access rules as chat (Lite and VIP limits stay the same).

## Technical details
- ElevenLabs Conversational AI agent using the cloned voice ID, started through a server function that issues a short-lived token (key never in the browser).
- Agent system prompt mirrors the existing Markus persona; knowledge pulled from the existing approved Markus knowledge search.
- Token function loads the member's recent ai_chat_history and passes a summary as the agent prompt override, so calls do not start fresh.
- Transcripts stored in existing ai_chat_history tied to the user.
