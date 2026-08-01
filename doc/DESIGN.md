# Design System

## Theme

Premium light AI product workspace inspired by Linear, Vercel, Notion AI, Raycast, and Arc Browser.

## Color

| Token | Value | Usage |
| --- | --- | --- |
| `--bg` | `#FFFFFF` | Main page background |
| `--surface` | `#FFFFFF` | Cards and panels |
| `--surface-soft` | `#E3F2FD` | Soft selected/section accents only |
| `--border` | `#E5E7EB` | Dividers and card borders |
| `--text` | `#111827` | Primary text |
| `--text-secondary` | `#4B5563` | Secondary text |
| `--text-muted` | `#6B7280` | Helper and muted labels |
| `--accent` | `#2196F3` | Primary actions |
| `--accent-soft` | `#90CAF9` | Hover, selected chips, subtle highlights |
| `--danger` | `#DC2626` | Errors |
| `--success` | `#059669` | Success states |
| `--warning` | `#D97706` | Warnings |

## Typography

- Family: Plus Jakarta Sans
- Headings: bold, tight tracking, clear hierarchy
- Body: comfortable line-height, readable secondary text
- Mono: system mono for tokens, paths, and code snippets

## Shape and elevation

- Corner radius: 16-20px for cards, 12px for inputs, full-pill only for chips
- Borders: 1px `#E5E7EB`
- Shadows: soft and restrained (`0 8px 24px rgba(17,24,39,0.06)`)
- Glass: rare and subtle, never a default treatment

## Motion

- Fast fade/slide/scale transitions with Motion
- Prefer 150-250ms state feedback
- Honor `prefers-reduced-motion`

## Layout

- Clean workspace shell with generous whitespace
- Progressive wizard on home
- Document workspace with sidebar + reader on desktop
- Single-column collapse under 768px

## Avoid

- Generic admin templates
- Material Design look
- Bootstrap aesthetics
- Neon cyberpunk
- Heavy gradients
- Oversaturated accents
- Visual clutter
