import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { AuthGuard } from './auth.guard';
import { CarlistComponent } from './carlist/carlist.component';
import { LoggedinComponent } from './loggedin/loggedin.component';

const routes: Routes = [
  { path: '', component : LoginComponent },
  { path: 'carlist', component: CarlistComponent, canActivate: [AuthGuard] },
  { path: 'loggedin', component: LoggedinComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: 'loggedin' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
