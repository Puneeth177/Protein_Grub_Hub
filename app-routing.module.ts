import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// TODO: Import your components
// import { HomepageComponent } from './components/homepage/homepage.component';
// import { RegisterComponent } from './components/register/register.component'; // FR1
// import { DashboardComponent } from './components/dashboard/dashboard.component';

const routes: Routes = [
  // { path: '', component: HomepageComponent },
  // { path: 'register', component: RegisterComponent }, // FR1
  // { path: 'dashboard', component: DashboardComponent }, // FR5, FR6
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }