#!/bin/bash
# ── Financial OS Setup ──────────────────────────────────
# Paste into your Claude Code terminal and run.
# Creates the folder, writes CLAUDE.md, drops the sync script.
# ────────────────────────────────────────────────────────

BASE="$HOME/Financial OS"

# 1. Folder structure
mkdir -p "$BASE/journals" "$BASE/documents" "$BASE/kubera"

# 2. Write the instruction file Claude reads on every session
cat > "$BASE/CLAUDE.md" << 'EOF'
# Financial OS — Instructions for Claude

## What's in This Folder
# journals/   → Daily transcripts from your morning audio journal
# documents/  → Asset documents (mortgage, vehicles, statements, insurance)
# kubera/     → Net worth snapshots from Kubera

## When I Ask a Financial Question
1. Check my current liquid position first — cash and accessible funds only
2. Search recent journal entries for any mention of this topic
3. Pull the relevant document from /documents/ if it applies
4. Give me a direct yes/no recommendation, then the reasoning

## Affordability Rule
"Can I afford this?" means: can I pay from liquid funds without
touching investments or going into debt? Answer on that basis —
not on total net worth.

## Values Check (for any discretionary purchase)
Before recommending, review my recent journals:
- Have I mentioned this before? Considered decision or impulse?
- Does it fit the lifestyle I've described wanting?
- Would I feel good about this in 30 days?

## Monthly Review (run on the 4th of the month)
1. Compare net worth to last month — what moved, and why?
2. What were the biggest spending themes in this month's journals?
3. Flag anything unusual or out of pattern
4. Note progress on any goals I've mentioned
5. Close with one paragraph I can actually act on

## Standing Rules
- Always separate business and personal finances in your analysis
- Never recommend liquidating long-term investments for lifestyle purchases
- Distinguish "you can afford this" from "this is a good idea" — give me both
- If I seem excited about something, slow me down and make me think it through
- Flag any single purchase over $[YOUR THRESHOLD] for a 24-hour review window
EOF

# 3. Drop the Day One sync script (update paths before using)
mkdir -p "$HOME/scripts"
cat > "$HOME/scripts/sync-journal.sh" << 'EOF'
#!/bin/bash
# Update the two paths below, then:
#   chmod +x ~/scripts/sync-journal.sh
#   crontab -e  →  paste: 0 7 * * * ~/scripts/sync-journal.sh

EXPORT="$HOME/path/to/DayOne/exports"  # ← update this
DEST="$HOME/Financial OS/journals"

mkdir -p "$DEST"
cp -r "$EXPORT"/. "$DEST/"
echo "Synced: $(date)" >> "$DEST/sync.log"
EOF

echo ""
echo "✓ Financial OS created at: $BASE"
echo "  ├── CLAUDE.md"
echo "  ├── journals/"
echo "  ├── documents/"
echo "  └── kubera/"
echo ""
echo "Next:"
echo "  1. Drop your documents into $BASE/documents/"
echo "  2. Export Kubera net worth to $BASE/kubera/"
echo "  3. Update paths in ~/scripts/sync-journal.sh"
echo "  4. Open $BASE in Claude Code and start asking"
