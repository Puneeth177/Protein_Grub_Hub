import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, AuthResponse } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email = '';
  password = '';
  showPassword = false;
  isLoading = false;
  errorMessage = '';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  private googleInitTimer: any = null;

  ngOnInit(): void {
    // Initialize Google Identity Services when available
    const tryInit = () => {
      const win: any = window as any;
      if (win.google && win.google.accounts && win.google.accounts.id) {
        win.google.accounts.id.initialize({
          client_id: environment.googleClientId,
          callback: (response: any) => this.handleCredentialResponse(response),
          auto_select: false
        });

        win.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          { theme: 'outline', size: 'large', width: 300 }
        );
      } else {
        // Retry shortly if the script hasn't loaded
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
    console.log('Google credential response:', response);
    const idToken = response?.credential;
    if (!idToken) {
      console.error('No ID token in response');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.googleLogin(idToken).subscribe({
      next: (response: AuthResponse) => {
        console.log('Google login success:', response);
        this.isLoading = false;
        
        // Store auth token
        localStorage.setItem('token', response.token);
        
        if (response.user.onboardingCompleted) {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigate(['/onboarding']);
        }
      },
      error: (err: any) => {
        console.error('Google login error:', err);
        this.isLoading = false;
        this.errorMessage = err?.message || 'Google sign-in failed';
      }
    });
  }

  onSubmit() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Please fill in all fields';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        // Check for a stored return URL
        const returnUrl = localStorage.getItem('returnUrl') || '/';
        localStorage.removeItem('returnUrl'); // Clear it after use
        this.router.navigateByUrl(returnUrl);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Login failed. Please try again.';
      }
    });
  }

  demoLogin() {
    // Demo login removed. Keep method stubbed in case it's referenced elsewhere.
    // Previously set demo credentials and submitted; now do nothing.
    return;
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}