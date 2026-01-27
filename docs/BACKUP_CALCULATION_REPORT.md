# Backup Calculation Report (PDF)

## Purpose
Provide a quantities-only, audit-ready backup calculation report for third-party review.
The report is designed to be human readable, legible, and traceable to takeoff inputs.

## Data Sources
- Latest calc run (takeoff lines, summary, timestamp)
- Project metadata (name, location, office, CMPD version)
- BOQ lines (descriptions only)
- DPWH classification (Part/Subcategory)

## Grouping Rules
- Group by DPWH Part -> Subcategory -> DPWH Item
- Quantities are derived from takeoff lines, not BOQ pricing

## Assumptions
- Assumptions are summarized (deduplicated, capped to 5 bullets)
- Waste and rounding settings are listed in the appendix

## Similar Item Summary
- Similar items are summarized by Trade
- Includes counts and total quantities per trade

## Location Summary
- Location tags (location:...) and station tags (station:...) are summarized
- Includes counts and quantity totals per location or station

## Export Locations
- Takeoff Workspace: "Export Backup Calculation PDF"
- BOQ Page: "Export Backup Calculation PDF"

## Change Log
- 2026-01-27: Initial spec for backup calculation PDF export
