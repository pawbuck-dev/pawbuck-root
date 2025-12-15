#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
    formatClinicalExamsForAI,
    formatLabResultsForAI,
    formatMedicationsForAI,
    formatVaccinationsForAI,
    getClinicalExams,
    getHealthSummary,
    getLabResults,
    getMedications,
    getVaccinations,
} from "./tools/index.js";

// Create server instance
const server = new Server(
  {
    name: "pawbuck-health",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_pet_vaccinations",
        description:
          "Get vaccination records for a pet. Returns all vaccinations including name, date, expiry, batch number, vet, and clinic information.",
        inputSchema: {
          type: "object" as const,
          properties: {
            pet_id: {
              type: "string",
              description: "The UUID of the pet to fetch vaccinations for",
            },
          },
          required: ["pet_id"],
        },
      },
      {
        name: "get_pet_medications",
        description:
          "Get medication records for a pet. Returns all medications including name, dosage, frequency, start/end dates, and purpose.",
        inputSchema: {
          type: "object" as const,
          properties: {
            pet_id: {
              type: "string",
              description: "The UUID of the pet to fetch medications for",
            },
          },
          required: ["pet_id"],
        },
      },
      {
        name: "get_pet_lab_results",
        description:
          "Get lab result records for a pet. Returns all lab tests including test type, date, lab name, and detailed results with values and reference ranges.",
        inputSchema: {
          type: "object" as const,
          properties: {
            pet_id: {
              type: "string",
              description: "The UUID of the pet to fetch lab results for",
            },
          },
          required: ["pet_id"],
        },
      },
      {
        name: "get_pet_clinical_exams",
        description:
          "Get clinical exam records for a pet. Returns all exams including type, date, vitals (weight, temperature, heart rate), findings, and notes.",
        inputSchema: {
          type: "object" as const,
          properties: {
            pet_id: {
              type: "string",
              description: "The UUID of the pet to fetch clinical exams for",
            },
          },
          required: ["pet_id"],
        },
      },
      {
        name: "get_pet_health_summary",
        description:
          "Get a comprehensive health summary for a pet. Returns all vaccinations, medications, lab results, and clinical exams in a single formatted response.",
        inputSchema: {
          type: "object" as const,
          properties: {
            pet_id: {
              type: "string",
              description: "The UUID of the pet to get health summary for",
            },
          },
          required: ["pet_id"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "get_pet_vaccinations": {
        const petId = (args as { pet_id: string }).pet_id;
        const vaccinations = await getVaccinations(petId);
        const formatted = formatVaccinationsForAI(vaccinations);
        return {
          content: [{ type: "text" as const, text: formatted }],
        };
      }

      case "get_pet_medications": {
        const petId = (args as { pet_id: string }).pet_id;
        const medications = await getMedications(petId);
        const formatted = formatMedicationsForAI(medications);
        return {
          content: [{ type: "text" as const, text: formatted }],
        };
      }

      case "get_pet_lab_results": {
        const petId = (args as { pet_id: string }).pet_id;
        const labResults = await getLabResults(petId);
        const formatted = formatLabResultsForAI(labResults);
        return {
          content: [{ type: "text" as const, text: formatted }],
        };
      }

      case "get_pet_clinical_exams": {
        const petId = (args as { pet_id: string }).pet_id;
        const exams = await getClinicalExams(petId);
        const formatted = formatClinicalExamsForAI(exams);
        return {
          content: [{ type: "text" as const, text: formatted }],
        };
      }

      case "get_pet_health_summary": {
        const petId = (args as { pet_id: string }).pet_id;
        const summary = await getHealthSummary(petId);
        return {
          content: [{ type: "text" as const, text: summary.fullSummary }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text" as const, text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("PawBuck Health MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
