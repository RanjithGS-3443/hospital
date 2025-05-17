
"use server";

import { suggestServices, type SuggestServicesInput, type SuggestServicesOutput } from '@/ai/flows/suggest-services';

export async function getAISuggestions(input: SuggestServicesInput): Promise<SuggestServicesOutput> {
  try {
    // Basic input sanitization/validation could be added here if needed,
    // though Zod in the flow itself provides schema validation.
    if (!input.name || !input.contactDetails || !input.appointmentDetails) {
      throw new Error("All patient information fields are required for AI suggestions.");
    }
    
    // The language field is optional in SuggestServicesInput and will be handled by the flow if present.
    const result = await suggestServices(input);
    return result;
  } catch (error) {
    console.error("Error getting AI suggestions:", error);
    // Return a structured error or re-throw. For client handling, a structured error is better.
    // For now, re-throwing to be caught by the client's try-catch.
    // A more user-friendly message might be better than exposing raw error messages.
    if (error instanceof Error) {
        throw new Error(`Failed to get AI suggestions: ${error.message}`);
    }
    throw new Error("An unknown error occurred while fetching AI suggestions.");
  }
}
