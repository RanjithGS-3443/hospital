
"use server";

import { suggestServices, type SuggestServicesInput, type SuggestServicesOutput } from '@/ai/flows/suggest-services';
import { bookAppointmentViaVoice, type BookAppointmentInput, type BookAppointmentOutput } from '@/ai/flows/book-appointment-flow';
import { doctorsData } from '@/lib/data';
import type { Appointment } from '@/lib/types';

const APPOINTMENTS_STORAGE_KEY = 'healthdesk.appointments';

export async function getAISuggestions(input: SuggestServicesInput): Promise<SuggestServicesOutput> {
  try {
    if (!input.name || !input.contactDetails || !input.appointmentDetails) {
      throw new Error("All patient information fields are required for AI suggestions.");
    }
    
    const result = await suggestServices(input);
    return result;
  } catch (error) {
    console.error("Error getting AI suggestions:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to get AI suggestions: ${error.message}`);
    }
    throw new Error("An unknown error occurred while fetching AI suggestions.");
  }
}

export async function handleVoiceAppointmentBooking(transcript: string, language: string): Promise<BookAppointmentOutput> {
  try {
    if (!transcript) {
      throw new Error("Voice transcript is empty.");
    }

    const flowInput: BookAppointmentInput = {
      voiceTranscript: transcript,
      language: language,
      availableDoctors: doctorsData, // Provide the list of doctors to the AI
    };

    const result = await bookAppointmentViaVoice(flowInput);

    // If the AI identified a doctor and didn't flag an error, proceed to "book" (save to localStorage)
    if (result.bookedDoctorId && !result.isError) {
      const doctor = doctorsData.find(d => d.id === result.bookedDoctorId);
      if (doctor) {
        const newAppointment: Appointment = {
          id: Date.now().toString(),
          doctorId: doctor.id,
          doctorName: doctor.name,
          doctorSpecialty: doctor.specialty,
          status: "Pending Confirmation",
          requestedAt: new Date().toISOString(),
        };
        
        // This part needs to run client-side or be handled by a database in a real app.
        // For now, we can't directly modify localStorage from a server action.
        // The actual saving to localStorage will be triggered on the client-side after this action returns.
        // We are just returning the AI's confirmation and doctor ID.
      } else {
        // This case should ideally be caught by the AI, but as a fallback:
        return {
          ...result,
          bookingConfirmationMessage: language === 'kn-IN' ? `ಕ್ಷಮಿಸಿ, ಗುರುತಿಸಲಾದ ವೈದ್ಯರನ್ನು (${result.bookedDoctorId}) ನಮ್ಮ ಪಟ್ಟಿಯಲ್ಲಿ ಹುಡುಕಲಾಗಲಿಲ್ಲ.` : language === 'hi-IN' ? `क्षमा करें, पहचाने गए डॉक्टर (${result.bookedDoctorId}) हमारी सूची में नहीं मिले।` : `Sorry, the identified doctor (${result.bookedDoctorId}) was not found in our list.`,
          isError: true,
          bookedDoctorId: undefined, // Clear doctorId if not found
        };
      }
    }
    return result;

  } catch (error) {
    console.error("Error handling voice appointment booking:", error);
    let errorMessage = "An unknown error occurred while processing your voice request.";
    if (error instanceof Error) {
        errorMessage = `Failed to process voice request: ${error.message}`;
    }
    if (language === 'kn-IN') errorMessage = "ನಿಮ್ಮ ಧ್ವನಿ ವಿನಂತಿಯನ್ನು ಪ್ರಕ್ರಿಯೆಗೊಳಿಸುವಾಗ ದೋಷವಾಯಿತು.";
    if (language === 'hi-IN') errorMessage = "आपकी आवाज़ अनुरोध को संसाधित करते समय एक त्रुटि हुई।";
    
    return { bookingConfirmationMessage: errorMessage, isError: true };
  }
}
