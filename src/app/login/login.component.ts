import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppRoutingModule } from '../app-routing.module';
import { SessionService } from '../_providers/session';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})

export class LoginComponent implements OnInit 
{
  username: string;
  password: string;

  errorString: string;
  errorColor: string;

  showSpinner: boolean;

  passwordVisible: boolean;

  errorTimeout: ReturnType<typeof setTimeout>;

  constructor(private http: HttpClient, private router: Router, private sessionServiceInstance: SessionService) 
  { 
    this.username = "";
    this.password = "";
    this.showSpinner = false;
    this.passwordVisible = false;
    this.errorString = "";
    this.errorColor = "red";
    this.errorTimeout = setTimeout(() => {}, 0);

    if(sessionServiceInstance.isAuthorized())
    {
      this.router.navigate(['/loggedin'], {});
    }
  }

  ngOnInit(): void 
  {
  }

  dropErrorMessage(errorMessage: string, errorColor = "red", timeout = 3000, callback: any = null) : void
  {
    this.errorColor = errorColor;

    this.errorString = errorMessage;

    clearTimeout(this.errorTimeout);

    this.errorTimeout = setTimeout(() =>
    {
      this.errorString = "";

      if(typeof(callback) === "function")
      {
        callback();
      }
    }, timeout);
  }

  async login(): Promise<void> 
  {
    if(this.showSpinner)
    {
      return;
    }

    if(!this.username)
    {
      return this.dropErrorMessage("Nem írtál be felhasználónevet!");
    }

    if(this.username.length < 3)
    {
      return this.dropErrorMessage("A felhasználónév nem lehet rövidebb, mint 3 karakter!");
    }

    if(!this.password)
    {
      return this.dropErrorMessage("Nem írtál be jelszót!");
    }

    if(this.password.length < 3)
    {
      return this.dropErrorMessage("Nem lehet a jelszó rövidebb, mint 3 karakter!");
    }

    this.showSpinner = true;

    const res = await this.sessionServiceInstance.tryToLogin(this.username, this.password);

    this.showSpinner = false;

    if(!res)
    {
      return this.dropErrorMessage("Hiba történt bejelentkezés közben!");
    }

    if(!res.successful)
    {
      return this.dropErrorMessage("Hiba történt bejelentkezés közben: " + res.possibleErrorString);
    }

    this.dropErrorMessage("Sikeresen bejelentkeztél!", "green", 3000, () =>
    {
      this.router.navigate(['/loggedin'], {});
    });
  }

  togglePassVisibility(): void 
  {
    this.passwordVisible = !this.passwordVisible;
  }
}