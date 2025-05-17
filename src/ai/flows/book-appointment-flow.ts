
'use server';
/**
 * @fileOverview An AI agent that books an appointment based on voice input.
 *
 * - bookAppointmentViaVoice - A function that handles the voice appointment booking process.
 * - BookAppointmentInput - The input type for the bookAppointmentViaVoice function.
 * - BookAppointmentOutput - The return type for the bookAppointmentViaVoice function.
 */

import {ai} from '@/ai/genkit';
import type { Doctor } from '@/lib/types';
import {z} from 'genkit';

const DoctorSchema = z.object({
  id: z.string(),
  name: z.string(),
  specialty: z.string(),
  imageUrl: z.string().optional(),
  aiHint: z.string().optional(),
  bio: z.string().optional(),
  availability: z.array(z.string()).optional(),
});

const BookAppointmentInputSchema = z.object({
  voiceTranscript: z.string().describe("The user's spoken request to book an appointment."),
  language: z.string().optional().describe('The language of the transcript and desired response (e.g., "en-US", "kn-IN", "hi-IN"). Defaults to English if not provided.'),
  availableDoctors: z.array(DoctorSchema).describe('A list of available doctors with their details (id, name, specialty).'),
});
export type BookAppointmentInput = z.infer<typeof BookAppointmentInputSchema>;

const BookAppointmentOutputSchema = z.object({
  bookingConfirmationMessage: z.string().describe('A message confirming the booking attempt, stating an error, or asking for clarification. This message should be in the specified language.'),
  bookedDoctorId: z.string().optional().describe('The ID of the doctor if an appointment was successfully booked/identified.'),
  isError: z.boolean().default(false).describe('Indicates if there was an error processing the request (e.g., doctor not found, ambiguity).'),
});
export type BookAppointmentOutput = z.infer<typeof BookAppointmentOutputSchema>;

export async function bookAppointmentViaVoice(input: BookAppointmentInput): Promise<BookAppointmentOutput> {
  return bookAppointmentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'bookAppointmentPrompt',
  input: {schema: BookAppointmentInputSchema},
  output: {schema: BookAppointmentOutputSchema},
  prompt: `You are a helpful hospital appointment booking assistant.
Your CRITICAL task is to generate your 'bookingConfirmationMessage' in the language specified by the 'language' input field.

{{#if language}}
The 'language' code provided is '{{{language}}}'.
- If '{{{language}}}' is 'kn-IN', your ENTIRE 'bookingConfirmationMessage' MUST be in Kannada.
- If '{{{language}}}' is 'hi-IN', your ENTIRE 'bookingConfirmationMessage' MUST be in Hindi.
- If '{{{language}}}' is 'en-US', or if the code is not recognized, your ENTIRE 'bookingConfirmationMessage' MUST be in English.
{{else}}
No 'language' code was provided. Therefore, your ENTIRE 'bookingConfirmationMessage' MUST be in English.
{{/if}}

User's voice transcript: "{{{voiceTranscript}}}"

Available doctors:
{{#each availableDoctors}}
- Name: {{name}}, Specialty: {{specialty}}, ID: {{id}}
{{/each}}

Instructions:
1. Analyze the voice transcript to identify the doctor the user wants to book an appointment with. The user might mention the doctor's name or specialty.
2. Match the identified doctor with the list of "Available doctors".
3. If a unique doctor is clearly identified:
    - Set 'bookedDoctorId' to the ID of that doctor.
    - Craft a 'bookingConfirmationMessage' confirming the appointment request with that doctor. This message MUST be in the specified language.
    - Set 'isError' to false.
4. If the requested doctor cannot be found in the "Available doctors" list, or if the request is ambiguous (e.g., multiple doctors match a general specialty and no name is given):
    - Do NOT set 'bookedDoctorId'.
    - Craft a 'bookingConfirmationMessage' explaining the issue. This message MUST be in the specified language.
    - Set 'isError' to true.
5. If the transcript is too vague or doesn't seem like an appointment request:
    - Do NOT set 'bookedDoctorId'.
    - Craft a 'bookingConfirmationMessage' asking for clarification. This message MUST be in the specified language.
    - Set 'isError' to true.

Ensure your 'bookingConfirmationMessage' is helpful and adheres STRICTLY to the language requirement determined above.
`,
});

const bookAppointmentFlow = ai.defineFlow(
  {
    name: 'bookAppointmentFlow',
    inputSchema: BookAppointmentInputSchema,
    outputSchema: BookAppointmentOutputSchema,
  },
  async (input) => {
    if (!input.availableDoctors || input.availableDoctors.length === 0) {
      let message = "No doctors are available to book at the moment.";
      if (input.language === 'kn-IN') message = "ಕ್ಷಮಿಸಿ, ಸದ್ಯಕ್ಕೆ ಯಾವುದೇ ವೈದ್ಯರು ಲಭ್ಯವಿಲ್ಲ.";
      if (input.language === 'hi-IN') message = "क्षमा करें, इस समय कोई डॉक्टर बुक करने के लिए उपलब्ध नहीं हैं।";
      return { bookingConfirmationMessage: message, isError: true };
    }
    const {output} = await prompt(input);
    return output!;
  }
);

