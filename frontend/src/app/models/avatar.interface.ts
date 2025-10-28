export interface AvatarUploadResponse {
  id: string;
  url: string;
  sizes?: { [key: string]: string } | string[]; // adapt to your API
  uploadedAt?: string;
}
