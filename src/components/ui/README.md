# UI Components

This folder contains the app's shared, low-level interface components. They provide consistent styling and accessible behavior for controls and layout patterns. Most components wrap Radix UI, with a few using other focused libraries. Import them by name from this folder, for example `@/components/ui/button`.

## Components

| File | What it provides |
| --- | --- |
| `accordion.tsx` | Expandable sections for showing and hiding related content. |
| `alert-dialog.tsx` | A modal confirmation dialog for important or destructive actions. |
| `alert.tsx` | Inline alert messages and status notices. |
| `aspect-ratio.tsx` | A container that keeps its content at a chosen aspect ratio. |
| `avatar.tsx` | User or entity images with fallback initials or content. |
| `badge.tsx` | Compact labels for statuses, categories, and counts. |
| `breadcrumb.tsx` | A navigational trail showing the current location. |
| `button.tsx` | Styled buttons with variants and sizes. |
| `calendar.tsx` | A date-picker calendar built on React Day Picker. |
| `card.tsx` | Basic card building blocks for grouped content. |
| `carousel.tsx` | A horizontally navigable carousel built on Embla. |
| `chart.tsx` | Shared chart containers and visual defaults for Recharts. |
| `checkbox.tsx` | An accessible checkbox control. |
| `collapsible.tsx` | A disclosure control for collapsible content. |
| `command.tsx` | Command-menu primitives for searchable actions and options. |
| `context-menu.tsx` | A menu opened from a context or right-click action. |
| `dialog.tsx` | Modal dialog primitives for focused content and actions. |
| `drawer.tsx` | A panel that slides in from an edge of the screen. |
| `dropdown-menu.tsx` | A menu of actions or options anchored to a trigger. |
| `form.tsx` | Form field wrappers and validation-message components. |
| `hover-card.tsx` | A preview panel shown when a trigger is hovered or focused. |
| `input-otp.tsx` | A segmented input for one-time passcodes. |
| `input.tsx` | The shared styled text input. |
| `label.tsx` | Accessible labels for form controls. |
| `menubar.tsx` | Menu bar controls for grouped application actions. |
| `navigation-menu.tsx` | Structured navigation menus and links. |
| `pagination.tsx` | Controls for moving between pages of results. |
| `popover.tsx` | A small floating panel attached to a trigger. |
| `progress.tsx` | A visual indicator of task or loading progress. |
| `radio-group.tsx` | A group of mutually exclusive choices. |
| `resizable.tsx` | Resizable panels and their handles. |
| `scroll-area.tsx` | A scrollable region with styled scrollbars. |
| `select.tsx` | A searchable or standard dropdown selection control. |
| `separator.tsx` | A horizontal or vertical visual divider. |
| `sheet.tsx` | A dialog-style side panel for secondary content. |
| `sidebar.tsx` | Building blocks for application sidebars. |
| `skeleton.tsx` | Placeholder shapes for content that is loading. |
| `slider.tsx` | A slider control for choosing numeric values. |
| `sonner.tsx` | The shared toast-notification host and configuration. |
| `switch.tsx` | An accessible on/off toggle. |
| `table.tsx` | Styled table elements for structured data. |
| `tabs.tsx` | Tab controls and their associated content panels. |
| `textarea.tsx` | The shared multiline text input. |
| `toggle-group.tsx` | A set of related toggle buttons. |
| `toggle.tsx` | A button with pressed and unpressed states. |
| `tooltip.tsx` | Tooltip provider, trigger, and content primitives. |

## Usage Notes

- Prefer these shared components to keep interaction behavior and styling consistent.
- Check a component's exported props and variants before extending or replacing it.
- Add a new primitive here only when it is reusable; keep page-specific composition in the route that owns it.