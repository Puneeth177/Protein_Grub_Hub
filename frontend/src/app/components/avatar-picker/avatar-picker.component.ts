import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarService, Avatar, AvatarUploadResponse } from '../../services/avatar.service';
import { resizeToSquare, validateImageFile, getInitials as getInitialsUtil } from '../../utils/image';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';

export interface AvatarPickerResult {
  url: string;
  id?: string;
  size: number;
}

@Component({
  selector: 'app-avatar-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avatar-picker.component.html',
  styleUrls: ['./avatar-picker.component.css']
})
export class AvatarPickerComponent implements OnInit {
  @Input() userId: string = '';
  @Input() userName: string = '';
  @Input() currentAvatar: { url?: string; id?: string } | null = null;
  @Output() avatarSelected = new EventEmitter<AvatarPickerResult>();
  @Output() cancelled = new EventEmitter<void>();

  defaultAvatars: Avatar[] = [];
  previewUrl: string | null = null;

  // legacy local-selected file (kept for backward compat with save())
  selectedFile: File | null = null;

  isLoading = false;
  errorMessage = '';
  successMessage = '';
  selectedAvatarId: string | null = null;
  uploading = false;

  // New: final image blob/file to upload (used by onSaveAvatar upload branch)
  fileToUpload: File | Blob | null = null;

  apiEnabled = environment.avatarApiEnabled !== false; // default to true unless explicitly false

  // New: store the picked default avatar URL for persistence via profile API
  selectedAvatarUrl: string | null = null;

  constructor(
    private avatarService: AvatarService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.loadDefaultAvatars();
    this.loadCurrentAvatar();
  }

  // Choose a default avatar (URL)
  onSelectDefault(avatarUrl: string) {
    this.selectedAvatarUrl = avatarUrl;
    this.previewUrl = avatarUrl;
    // Clear any file upload choice
    this.fileToUpload = null;
    this.selectedFile = null;
    this.errorMessage = '';
    this.successMessage = '';
  }

  // Kept for backward compatibility; Save button now calls onSaveAvatar()
  applyAvatar() {
    if (!this.selectedAvatarUrl) return;
    const url = this.selectedAvatarUrl as string;
    this.auth.updateAvatar(url).subscribe({
      next: () => { /* optional toast */ },
      error: () => { /* optional error */ }
    });
  }

  loadDefaultAvatars() {
    if (!this.apiEnabled) {
      this.defaultAvatars = [
        { id: 'd1', url: 'https://png.pngtree.com/png-clipart/20231019/original/pngtree-user-profile-avatar-png-image_13369988.png', alt: 'Default avatar 1' },
        { id: 'd2', url: 'https://cdn1.iconfinder.com/data/icons/user-pictures/100/female1-512.png', alt: 'Default avatar 2' },
        { id: 'd3', url: 'https://png.pngtree.com/png-clipart/20230927/original/pngtree-man-avatar-image-for-profile-png-image_13001882.png', alt: 'Default avatar 3' },
        { id: 'd4', url: 'https://cdn.vectorstock.com/i/1000v/73/04/woman-profile-icon-round-headshot-vector-18307304.jpg', alt: 'Default avatar 4' },
        { id: 'd5', url: 'https://www.clipartmax.com/png/middle/319-3191274_male-avatar-admin-profile.png', alt: 'Default avatar 5' },
        { id: 'd6', url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRbsmMa5pDxMth6kn5gelIvtvgIU3QguTK4PVDqEbk8Bow4sx1vCiDLfefHaj5unuQ7aG0&usqp=CAU', alt: 'Default avatar 6' },
      ];
      this.errorMessage = '';
      return;
    }

    this.avatarService.getDefaultAvatars().subscribe({
      next: (avatars) => { this.defaultAvatars = avatars; },
      error: () => {
        this.defaultAvatars = [
          { id: 'd1', url: 'https://png.pngtree.com/png-clipart/20231019/original/pngtree-user-profile-avatar-png-image_13369988.png', alt: 'Default avatar 1' },
          { id: 'd2', url: 'https://cdn1.iconfinder.com/data/icons/user-pictures/100/female1-512.png', alt: 'Default avatar 2' },
          { id: 'd3', url: 'https://png.pngtree.com/png-clipart/20230927/original/pngtree-man-avatar-image-for-profile-png-image_13001882.png', alt: 'Default avatar 3' },
          { id: 'd4', url: 'https://cdn.vectorstock.com/i/1000v/73/04/woman-profile-icon-round-headshot-vector-18307304.jpg', alt: 'Default avatar 4' },
          { id: 'd5', url: 'https://www.clipartmax.com/png/middle/319-3191274_male-avatar-admin-profile.png', alt: 'Default avatar 5' },
          { id: 'd6', url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRbsmMa5pDxMth6kn5gelIvtvgIU3QguTK4PVDqEbk8Bow4sx1vCiDLfefHaj5unuQ7aG0&usqp=CAU', alt: 'Default avatar 6' },
        ];
        this.errorMessage = '';
      }
    });
  }

  loadCurrentAvatar() {
    if (this.currentAvatar?.url) {
      this.previewUrl = this.currentAvatar.url;
      this.selectedAvatarUrl = this.currentAvatar.url;
    } else if (this.currentAvatar?.id) {
      this.selectedAvatarId = this.currentAvatar.id;
    } else {
      this.setInitialsPreview();
    }
  }

  getInitials(name: string): string {
    return getInitialsUtil(name);
  }

  setInitialsPreview() {
    const initials = this.getInitials(this.userName);
    this.previewUrl = this.createInitialsAvatar(initials);
  }

  private createInitialsAvatar(initials: string): string {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;

    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = '#e0e0e0';
    ctx.beginPath();
    ctx.arc(100, 100, 100, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#666';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, 100, 100);

    return canvas.toDataURL('image/png');
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    this.errorMessage = '';
    this.successMessage = '';

    if (!file) return;

    // Validate (use the util's actual signature)
    type FileValidation = { valid: boolean; error?: string };
    const validation = validateImageFile(file) as FileValidation;
    if (!validation.valid) {
      this.errorMessage = validation.error || 'Invalid file';
      return;
    }

    // Resize to square and prepare preview + upload blob
    resizeToSquare(file, 512).then((blob) => {
      this.fileToUpload = blob;                         // final Blob to upload
      this.previewUrl = URL.createObjectURL(blob);      // show preview
      this.selectedAvatarUrl = null;                    // clear default selection if any
      this.selectedFile = null;
    }).catch(() => {
      this.errorMessage = 'Failed to process image';
    });
  }

  // Legacy selection by Avatar object, retained for compatibility with default list UI
  selectDefaultAvatar(avatar: Avatar) {
    this.selectedAvatarId = avatar.id;
    this.previewUrl = avatar.url;
    this.selectedFile = null;
    this.fileToUpload = null;
    this.selectedAvatarUrl = avatar.url;
    this.errorMessage = '';
  }

  // Legacy save (kept intact for compatibility with existing flows)
  async save() {
    if (!this.userId) {
      this.errorMessage = 'User ID is required';
      return;
    }

    // Bypass API entirely when disabled
    if (!this.apiEnabled) {
      if (this.selectedFile) {
        this.uploading = true;
        const resizedBlob = await resizeToSquare(this.selectedFile, 512);
        this.uploading = false;
        this.avatarSelected.emit({ url: this.previewUrl || '', id: undefined, size: 512 });
        return;
      } else if (this.selectedAvatarId) {
        this.avatarSelected.emit({ url: this.previewUrl || '', id: this.selectedAvatarId, size: 512 });
        return;
      } else {
        this.errorMessage = 'Please select or upload an avatar';
        return;
      }
    }

    this.uploading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      if (this.selectedFile) {
        const resizedBlob = await resizeToSquare(this.selectedFile, 512);
        const resizedFile = new File([resizedBlob], this.selectedFile.name, { type: this.selectedFile.type });

        this.avatarService.uploadAvatar(resizedFile, this.userId).subscribe({
          next: (response) => {
            this.uploading = false;
            this.successMessage = 'Avatar uploaded successfully!';
            this.avatarSelected.emit({
              url: response.url,
              id: response.id,
              size: 512
            });
            setTimeout(() => { this.successMessage = ''; }, 3000);
          },
          error: (error) => {
            this.uploading = false;
            if (error?.statusCode === 404) {
              // Backend route missing: proceed locally (soft-success)
              this.successMessage = 'Avatar updated locally (backend route missing).';
              this.avatarSelected.emit({
                url: this.previewUrl || '',
                id: undefined,
                size: 512
              });
              setTimeout(() => { this.successMessage = ''; }, 2000);
            } else {
              this.errorMessage = error.message || 'Failed to upload avatar';
            }
          }
        });
      } else if (this.selectedAvatarId) {
        this.avatarService.setDefaultAvatar(this.selectedAvatarId, this.userId).subscribe({
          next: (response) => {
            this.uploading = false;
            this.successMessage = 'Avatar set successfully!';
            this.avatarSelected.emit({
              url: response.url,
              id: this.selectedAvatarId || '',
              size: 512
            });
            setTimeout(() => { this.successMessage = ''; }, 3000);
          },
          error: (error) => {
            this.uploading = false;
            if (error?.statusCode === 404) {
              this.successMessage = 'Avatar updated locally (backend route missing).';
              this.avatarSelected.emit({
                url: this.previewUrl || '',
                id: this.selectedAvatarId || '',
                size: 512
              });
              setTimeout(() => { this.successMessage = ''; }, 2000);
            } else {
              this.errorMessage = error.message || 'Failed to set avatar';
            }
          }
        });
      } else {
        this.errorMessage = 'Please select or upload an avatar';
        this.uploading = false;
      }
    } catch (error) {
      this.uploading = false;
      this.errorMessage = 'Failed to process image';
    }
  }

  cancel() {
    this.cancelled.emit();
  }

  // New primary save entry: handles both default avatar URL and uploaded file
  onSaveAvatar() {
    // Case 1: default avatar picked (URL)
    if (this.selectedAvatarUrl) {
      this.uploading = true;
      const url = this.selectedAvatarUrl as string;
      this.auth.updateAvatar(url).subscribe({
        next: () => {
          this.uploading = false;
          this.previewUrl = url;
          this.successMessage = 'Avatar saved!';
          // notify parent and close
          this.avatarSelected.emit({ url, id: undefined, size: 512 });
          this.cancelled.emit();
          setTimeout(() => this.successMessage = '', 1500);
        },
        error: () => {
          this.uploading = false;
          this.errorMessage = 'Failed to save avatar';
        }
      });
      return;
    }

    // Case 2: uploaded file flow – upload then persist returned URL
    if (this.fileToUpload) {
      this.uploading = true;

      // Ensure we upload a File: convert Blob -> File if needed
      let fileToSend: File;
      if (this.fileToUpload instanceof File) {
        fileToSend = this.fileToUpload;
      } else {
        fileToSend = new File([this.fileToUpload], 'avatar.png', { type: 'image/png' });
      }

      // Prefer using dedicated avatar upload API if available
      if (this.userId) {
        this.avatarService.uploadAvatar(fileToSend, this.userId).subscribe({
          next: (res: AvatarUploadResponse) => {
            const uploadedUrl = (res as any)?.url || (res as any)?.avatar?.url;
            if (!uploadedUrl) throw new Error('Upload did not return a URL');
            const url = uploadedUrl as string;

            this.auth.updateAvatar(url).subscribe({
              next: () => {
                this.uploading = false;
                this.previewUrl = url;
                this.successMessage = 'Avatar uploaded!';
                setTimeout(() => this.successMessage = '', 1500);
              },
              error: () => {
                this.uploading = false;
                this.errorMessage = 'Failed to save avatar';
              }
            });
          },
          error: () => {
            this.uploading = false;
            this.errorMessage = 'Upload failed';
          }
        });
      } else {
        // Fallback: if userId not provided, try generic upload endpoint (if your service exposes it)
        (this.avatarService as any).upload?.(fileToSend)?.subscribe({
          next: (res: any) => {
            const uploadedUrl = res?.url || res?.avatar?.url;
            if (!uploadedUrl) throw new Error('Upload did not return a URL');
            const url = uploadedUrl as string;

            this.auth.updateAvatar(url).subscribe({
              next: () => {
                this.uploading = false;
                this.previewUrl = url;
                this.successMessage = 'Avatar uploaded!';
                setTimeout(() => this.successMessage = '', 1500);
              },
              error: () => {
                this.uploading = false;
                this.errorMessage = 'Failed to save avatar';
              }
            });
          },
          error: () => {
            this.uploading = false;
            this.errorMessage = 'Upload failed';
          }
        });
      }
      return;
    }

    // No default selected, no upload file
    this.errorMessage = 'Please select a default avatar or upload an image first.';
  }

  deleteAvatar() {
    if (!this.userId) return;

    if (!this.apiEnabled) {
      this.selectedAvatarId = null;
      this.selectedFile = null;
      this.selectedAvatarUrl = null;
      this.fileToUpload = null;
      this.setInitialsPreview();
      this.avatarSelected.emit({ url: '', id: undefined, size: 0 });
      return;
    }

    this.avatarService.deleteAvatar(this.userId).subscribe({
      next: () => {
        this.selectedAvatarId = null;
        this.selectedFile = null;
        this.selectedAvatarUrl = null;
        this.fileToUpload = null;
        this.setInitialsPreview();
        this.successMessage = 'Avatar removed, using default initials';

        // Emit to parent so it can update user and close the editor
        this.avatarSelected.emit({ url: '', id: undefined, size: 0 });

        setTimeout(() => { this.successMessage = ''; }, 3000);
      },
      error: (error) => {
        if (error?.statusCode === 404) {
          // Backend route missing: proceed locally
          this.avatarSelected.emit({ url: '', id: undefined, size: 0 });
          this.successMessage = 'Avatar removed locally (backend route missing).';
          setTimeout(() => { this.successMessage = ''; }, 2000);
        } else {
          this.errorMessage = error.message || 'Failed to delete avatar';
        }
      }
    });
  }
}