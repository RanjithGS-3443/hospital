
export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  imageUrl: string;
  aiHint?: string; // For placeholder image generation hints
  bio?: string;
  availability?: string[]; // Array of availability strings
}
