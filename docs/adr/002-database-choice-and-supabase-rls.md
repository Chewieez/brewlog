# ADR 002: Relational PostgreSQL with Supabase & Row Level Security

## Status
Accepted

## Context
Coffee data is inherently relational: Beans belong to Roasters; Tasting Logs reference Beans, Recipes, Grinders, and Brewers. We need multi-user authentication, cloud sync across devices, and strict data security.

## Decision
We chose **Supabase (PostgreSQL)** with **Row Level Security (RLS)**:
- Built-in authentication (Email/Password, OAuth) with JWTs.
- RLS ensures users can only read and modify their own coffee stash, custom recipes, and tasting logs.
- Public presets (e.g. James Hoffmann V60, Kasuya 4:6, Inverted AeroPress, Flair 58) are globally accessible read-only.
- Automatic profile creation via a PostgreSQL trigger on user sign-up.

## Consequences
- Instant real-time capabilities and relational queries (e.g. average ratings grouped by origin country and brew method).
- Secure by default at the database layer.
