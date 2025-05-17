
export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  imageUrl: string;
  aiHint?: string; // For placeholder image generation hints
  bio?: string;
  availability?: string[]; // Array of availability strings
}

export interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  status: "Pending Confirmation" | "Confirmed" | "Cancelled";
  requestedAt: string; // ISO string for the date/time of the request
}
