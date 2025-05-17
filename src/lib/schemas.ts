import { z } from 'zod';

export const patientInfoSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(100, { message: "Name must be 100 characters or less."}),
  contactDetails: z.string().min(5, { message: "Please enter valid contact details (e.g., phone or email)." }).max(100, { message: "Contact details must be 100 characters or less."}),
  appointmentDetails: z.string().min(10, { message: "Appointment details must be at least 10 characters." }).max(500, { message: "Appointment details must be 500 characters or less."}),
});

export type PatientInfoFormData = z.infer<typeof patientInfoSchema>;
