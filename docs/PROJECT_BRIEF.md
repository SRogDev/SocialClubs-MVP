# SocialClubs-MVP — Project Brief

> Full project context in one file. Hand this to ANOTHER AI (GPT, etc.) for planning
> and ideation, then bring the refined specs back. Keep this file accurate — it is the handoff doc.
> For the current timeline see `STATUS.md`. For how to work in this repo see `AGENTS.md`.

## One-liner
SocialClubs is Roger's private-community platform — mid major reform: 'repensando las comunidades en la era IA'.

## Problem & audience
Communities run on generic chat tools; the AI era demands rethinking what a community app is — but nobody has productized it well for small communities.

## Product (what it is / is not)
A private-community platform designed to be used TOGETHER WITH Polygrow ('una app de Polygrow para quienes hacen comunidades') but standalone-capable. Community data feeds Polygrow as the business-information core. Currently mid-reform: the old club-agent architecture goes away.

## Key decisions (locked)
- Standalone-first, Polygrow-enhanced via clean seams (APIs/events/MCP).
- Do NOT rebuild agent infra internally — remove the club-agent architecture.
- Design thread: 'repensando las comunidades en la era IA'.

## Stack
Next.js (to be confirmed in the reform plan).

## Business model
Not locked — part of the reform plan.

## Open questions
- The full reform plan (open, in the dedicated side chat).
- Which seams to Polygrow are actually valuable vs speculative.
