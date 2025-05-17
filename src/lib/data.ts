
import type { Doctor } from '@/lib/types';

export const doctorsData: Doctor[] = [
  { id: '1', name: 'Dr. Evelyn Reed', specialty: 'Cardiology', imageUrl: 'https://placehold.co/400x400.png', aiHint: 'doctor portrait', bio: 'Dr. Reed is a board-certified cardiologist with over 15 years of experience in treating complex heart conditions. She is passionate about preventive care and patient education.', availability: ['Mon: 9 AM - 1 PM', 'Wed: 2 PM - 5 PM', 'Fri: 9 AM - 12 PM'] },
  { id: '2', name: 'Dr. Samuel Green', specialty: 'Pediatrics', imageUrl: 'https://placehold.co/400x400.png', aiHint: 'friendly doctor', bio: 'Dr. Green provides compassionate and comprehensive care for children from infancy through adolescence. He believes in a holistic approach to child health.', availability: ['Tue: 10 AM - 4 PM', 'Thu: 1 PM - 6 PM'] },
  { id: '3', name: 'Dr. Olivia Chen', specialty: 'Dermatology', imageUrl: 'https://placehold.co/400x400.png', aiHint: 'professional doctor', bio: 'Dr. Chen specializes in medical, surgical, and cosmetic dermatology. She is dedicated to helping patients achieve healthy, beautiful skin.', availability: ['Mon: 10 AM - 5 PM', 'Wed: 9 AM - 1 PM', 'Fri: 1 PM - 4 PM'] },
  { id: '4', name: 'Dr. Marcus Kane', specialty: 'Orthopedics', imageUrl: 'https://placehold.co/400x400.png', aiHint: 'surgeon doctor', bio: 'Dr. Kane is an orthopedic surgeon focusing on sports injuries and joint replacement. He employs the latest techniques for optimal patient outcomes.', availability: ['Tue: 8 AM - 12 PM', 'Thu: 2 PM - 6 PM', 'Fri: 10 AM - 2PM'] },
];
