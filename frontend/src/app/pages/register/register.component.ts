import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit, OnDestroy {
  private googleInitTimer: any = null;
  formData = {
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  };
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  errorMessage = '';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Initialize Google Identity Services
    const tryInit = () => {
      const win: any = window;
      if (win.google?.accounts?.id) {
        win.google.accounts.id.initialize({
          client_id: environment.googleClientId,
          callback: (response: any) => this.handleCredentialResponse(response),
          context: 'signup'  // This helps customize the Google button for signup
        });

        win.google.accounts.id.renderButton(
          document.getElementById('google-signup-button'),
          { 
            theme: 'outline', 
            size: 'large', 
            width: '100%',
            text: 'signup_with'  // Changes button text to "Sign up with Google"
          }
        );
      } else {
        this.googleInitTimer = setTimeout(tryInit, 200);
      }
    };

    tryInit();
  }

  ngOnDestroy(): void {
    if (this.googleInitTimer) {
      clearTimeout(this.googleInitTimer);
      this.googleInitTimer = null;
    }
  }

  handleCredentialResponse(response: any) {
    console.log('Google credential response (register):', response);
    const idToken = response?.credential;
    if (!idToken) {
      console.error('No ID token in response');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Use the same googleLogin endpoint - it handles both signin/signup
    this.authService.googleLogin(idToken).subscribe({
      next: (response) => {
        console.log('Google signup/login success:', response);
        this.isLoading = false;
        // Store token and user data
        localStorage.setItem('token', response.token);
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        
        // If onboarding not completed, redirect there, otherwise dashboard
        const returnUrl = response.user.onboardingCompleted ? '/dashboard' : '/onboarding';
        console.log('Navigating to:', returnUrl);
        this.router.navigateByUrl(returnUrl);
      },
      error: (err: any) => {
        console.error('Google signup/login error:', err);
        this.isLoading = false;
        this.errorMessage = err?.message || 'Google sign-up failed';
      }
    });
  }

  onSubmit() {
    if (!this.formData.name || !this.formData.email || !this.formData.password || !this.formData.confirmPassword) {
      this.errorMessage = 'Please fill in all fields';
      return;
    }

    if (this.formData.password !== this.formData.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    if (this.formData.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters long';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    console.log('Registering user:', { name: this.formData.name, email: this.formData.email });
    this.authService.register(this.formData.name, this.formData.email, this.formData.password).subscribe({
      next: (response) => {
        console.log('Registration success:', response);
        this.isLoading = false;
        // Store auth data
        localStorage.setItem('token', response.token);
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        this.router.navigate(['/onboarding']);
      },
      error: (error) => {
        console.error('Registration error:', error);
        this.isLoading = false;
        this.errorMessage = error.message || 'Registration failed. Please try again.';
      }
    });
  }

  togglePasswordVisibility(field: 'password' | 'confirmPassword') {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  // Add any additional styles needed for the Google button container
  ngAfterViewInit() {
    const googleButton = document.getElementById('google-signup-button');
    if (googleButton) {
      googleButton.style.marginTop = '1rem';
    }
  }
}