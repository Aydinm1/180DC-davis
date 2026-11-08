import 'server-only';
import type { InvestigationConfig } from './types';
// Admin-only starter content. Never import this module from a client component.
export const investigationTemplate: InvestigationConfig = {
  "overview": "## Spreadsheet investigation\n\nInvestigate in your own copy of the student workbook. Connect the badge-access, door-unlock and key-checkout records to identify a suspect.\n\nUse the four investigation stages in Workspace. Hints are optional: reveal the next hint whenever you need help. Previously opened hints remain available.\n\n## Final response\n\nEnter the suspect’s name and a couple of sentences explaining how you reached your conclusion. Identify the records or data that support it. A matching name sends your response for admin review; completion requires approval.\n\n## Before using the formulas\n\nThese examples start in **row 2**. Keep the original columns and add helper columns to the right.\n\nFill formulas through the complete dataset before filtering. Each formula should reference its own row. The `$` signs keep the crime-window references fixed.",
  "workbookUrl": "",
  "acceptedNames": [],
  "gradingGuidance": "[Admin answer-key workbook](https://docs.google.com/spreadsheets/d/1Ebgjz2xotm__ew85eX0e6oqY7QyO1SFMA8VItBx8l8k/edit)",
  "stages": [
    {
      "id": "18000000-0000-4000-8000-000000000001",
      "title": "Normalize the fields",
      "hints": [
        {
          "id": "18000000-0000-4000-8000-000000000002",
          "title": "Start with cleanup",
          "body": "Standardize Direction, Key Type, and Key ID before investigating. The other source fields are already consistent.",
          "optional": false
        },
        {
          "id": "18000000-0000-4000-8000-000000000003",
          "title": "Choose the functions",
          "body": "Use `TRIM` for extra spaces, `PROPER` for capitalization, and `SUBSTITUTE` to remove the checkout system’s `KEY-` prefix.",
          "optional": false
        },
        {
          "id": "18000000-0000-4000-8000-000000000004",
          "title": "Exact formulas",
          "body": "On **Badge Access Logs**, add column G, **Direction Normalized**:\n\n`=TRIM(PROPER(E2))`\n\nOn **Key Checkout Records**, add column H, **Key Type Normalized**:\n\n`=TRIM(PROPER(F2))`\n\nAdd column I, **Key ID Normalized**:\n\n`=SUBSTITUTE(B2,\"KEY-\",\"\")`\n\nFill each formula down through all source records.",
          "optional": false
        }
      ]
    },
    {
      "id": "18000000-0000-4000-8000-000000000005",
      "title": "Who entered the corridor?",
      "hints": [
        {
          "id": "18000000-0000-4000-8000-000000000006",
          "title": "Find the door",
          "body": "Find Archive Service Corridor in Door Directory and note its Door ID.\n\nAlternatively, use this formula in an empty working cell:\n\n`=XLOOKUP(\"Archive Service Corridor\",'Door Directory'!$B$2:$B$36,'Door Directory'!$A$2:$A$36,\"Not Found\")`",
          "optional": false
        },
        {
          "id": "18000000-0000-4000-8000-000000000007",
          "title": "Filter qualifying entries",
          "body": "On Badge Access Logs, filter:\n\n- Door ID, column D: the corridor’s ID.\n- Direction Normalized, column G: `Entry`.\n- Result, column F: `Granted`.",
          "optional": false
        },
        {
          "id": "18000000-0000-4000-8000-000000000008",
          "title": "Check the full date and time",
          "body": "Add column H, **Within Crime Window**:\n\n`=AND(B2>='Case File'!$B$9,B2<='Case File'!$B$10)`\n\nFill down and filter to **TRUE**. This includes both endpoints of the window.",
          "optional": false
        },
        {
          "id": "18000000-0000-4000-8000-000000000009",
          "title": "Look up the names",
          "body": "Add column I, **Name**:\n\n`=XLOOKUP(C2,PersonnelData[Badge ID],PersonnelData[Name],\"Not Found\")`\n\nFill down. Record the qualifying event IDs, timestamps, Badge IDs, and names in Investigation Workspace.",
          "optional": false
        }
      ]
    },
    {
      "id": "18000000-0000-4000-8000-000000000010",
      "title": "Which key opened the inner door?",
      "hints": [
        {
          "id": "18000000-0000-4000-8000-000000000011",
          "title": "Find the inner door",
          "body": "Find Inner Archives in Door Directory and note its Door ID.\n\nAlternatively, use this formula in an empty working cell:\n\n`=XLOOKUP(\"Inner Archives\",'Door Directory'!$B$2:$B$36,'Door Directory'!$A$2:$A$36,\"Not Found\")`",
          "optional": false
        },
        {
          "id": "18000000-0000-4000-8000-000000000012",
          "title": "Filter successful openings",
          "body": "On Door Unlock History, filter:\n\n- Door ID, column C: the inner door’s ID.\n- Action, column E: `Unlock`.\n- Result, column F: `Granted`.\n\n`Unlock` describes the attempted action. `Granted` confirms that it succeeded.",
          "optional": false
        },
        {
          "id": "18000000-0000-4000-8000-000000000013",
          "title": "Check the crime window",
          "body": "Add column G, **Within Crime Window**:\n\n`=AND(B2>='Case File'!$B$9,B2<='Case File'!$B$10)`\n\nBoth timestamp references must point to the same row.\n\nFill down and filter to **TRUE**. Record the remaining event IDs, timestamps, and Key IDs. Check whether the successful openings used the same physical key.",
          "optional": false
        }
      ]
    },
    {
      "id": "18000000-0000-4000-8000-000000000014",
      "title": "Who held that key?",
      "hints": [
        {
          "id": "18000000-0000-4000-8000-000000000015",
          "title": "Filter the physical key",
          "body": "On Key Checkout Records, filter **Key ID Normalized**, column I, to the key identified in Door Unlock History.\n\nThe same key has multiple checkout records, so matching Key ID alone does not identify its holder during the crime.",
          "optional": false
        },
        {
          "id": "18000000-0000-4000-8000-000000000016",
          "title": "Eliminate keys returned too early",
          "body": "For this method, establish who held the key throughout the crime window.\n\nAdd column J, **Returned By Window End?**:\n\n`=E2<='Case File'!$B$10`\n\nFill down and keep **FALSE**. These handovers ended after the window.",
          "optional": false
        },
        {
          "id": "18000000-0000-4000-8000-000000000017",
          "title": "Eliminate keys checked out too late",
          "body": "Add column K, **Checked Out By Window Start?**:\n\n`=D2<='Case File'!$B$9`\n\nFill down and keep **TRUE**.\n\nTogether, the filters establish:\n\n`Checked out ≤ window start`\n\n`Returned > window end`\n\nSomeone who checked out the key after the crime can pass the return test but fails the checkout test.",
          "optional": false
        },
        {
          "id": "18000000-0000-4000-8000-000000000018",
          "title": "Optional combined time test",
          "body": "Instead of two separate TRUE/FALSE columns, test both conditions in one helper:\n\n`=AND(D2<='Case File'!$B$9,E2>'Case File'!$B$10)`\n\nKeep **TRUE**.\n\nThis establishes possession throughout the window, covering both successful openings. It is stricter than testing possession only at the individual opening times and works for this case.",
          "optional": true
        },
        {
          "id": "18000000-0000-4000-8000-000000000019",
          "title": "Look up the holder’s name",
          "body": "Add column L, **Name**:\n\n`=XLOOKUP(C2,PersonnelData[Badge ID],PersonnelData[Name],\"Not Found\")`\n\nFill down. Compare the qualifying holder with your corridor-entry evidence. Check that their corridor entry preceded the first successful inner-door opening.",
          "optional": false
        }
      ]
    }
  ]
};
