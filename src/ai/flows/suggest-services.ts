
'use server';

/**
 * @fileOverview An AI agent that suggests relevant services and information based on patient details.
 *
 * - suggestServices - A function that handles the service suggestion process.
 * - SuggestServicesInput - The input type for the suggestServices function.
 * - SuggestServicesOutput - The return type for the suggestServices function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestServicesInputSchema = z.object({
  name: z.string().describe("The patient's name."),
  contactDetails: z.string().describe("The patient's contact details (e.g., phone number, email)."),
  appointmentDetails: z.string().describe("Details about the patient's desired appointment or reason for visit."),
  language: z.string().optional().describe('The desired language for the AI response (e.g., "en-US", "kn-IN", "hi-IN"). Defaults to English if not provided.'),
});
export type SuggestServicesInput = z.infer<typeof SuggestServicesInputSchema>;

const SuggestServicesOutputSchema = z.object({
  suggestedServices: z.string().describe('A list of suggested services and information relevant to the patient\'s details, in the requested language.'),
});
export type SuggestServicesOutput = z.infer<typeof SuggestServicesOutputSchema>;

export async function suggestServices(input: SuggestServicesInput): Promise<SuggestServicesOutput> {
  return suggestServicesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestServicesPrompt',
  input: {schema: SuggestServicesInputSchema},
  output: {schema: SuggestServicesOutputSchema},
  prompt: `You are a helpful hospital front desk assistant.
Your primary instruction is to generate your response text in the language specified by the 'language' input field.

{{#if language}}
The 'language' code is: {{{language}}}.
If this code is 'kn-IN', your entire 'suggestedServices' output MUST be in Kannada.
If this code is 'hi-IN', your entire 'suggestedServices' output MUST be in Hindi.
If this code is 'en-US', or if the language code is not recognized, your entire 'suggestedServices' output MUST be in English.
{{else}}
No 'language' code was provided. Therefore, your entire 'suggestedServices' output MUST be in English.
{{/if}}

Based on the patient's provided details, suggest relevant services and information.

Patient Name: {{{name}}}
Contact Details: {{{contactDetails}}}
Appointment Details: {{{appointmentDetails}}}

Ensure your 'suggestedServices' output is entirely in the correctly determined language.`,
});

const suggestServicesFlow = ai.defineFlow(
  {
    name: 'suggestServicesFlow',
    inputSchema: SuggestServicesInputSchema,
    outputSchema: SuggestServicesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

