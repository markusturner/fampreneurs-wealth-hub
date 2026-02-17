

## Sidebar Background Color by Theme

Update the sidebar to use different background colors depending on the active theme:

- **Dark mode**: `#0D0424` (very dark purple)
- **Light mode**: `#290a52` (dark purple)

### Technical Changes

**File: `src/components/layout/AppSidebar.tsx`**
- Remove the current inline `style={{ backgroundColor: 'hsl(240 5.9% 10%)' }}` from the `<aside>` element
- Replace with a CSS class that uses theme-aware variables

**File: `src/index.css`**
- In the `:root` (light mode) block, set `--sidebar-background` to the HSL equivalent of `#290a52` (which is `262 86% 18%`)
- In the `.dark` block, set `--sidebar-background` to the HSL equivalent of `#0D0424` (which is `262 87% 8%`)

**File: `src/components/layout/AppSidebar.tsx`**
- Update the aside to use `bg-sidebar` (Tailwind class mapped to `--sidebar-background`) instead of inline styles, while keeping the forced dark text color and `dark` class for child component styling

