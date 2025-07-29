export interface User {
  _id: string;
  email: string;
  name?: string;
  password?: string; // Use '?' as we don't always handle the password
  fitness_goal?: 'Build Muscle' | 'Lose Weight' | 'Improve Performance' | 'Maintain Health';
  dietary_preferences?: string[];
  allergies?: string[];
}