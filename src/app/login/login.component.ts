import { Component, OnInit } from '@angular/core';

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

  constructor() 
  { 
    this.username = "";
    this.password = "";
    this.showSpinner = false;
    this.passwordVisible = false;
    this.errorString = "";
    this.errorColor = "red";
    this.errorTimeout = setTimeout(() => {}, 0);
  }

  ngOnInit(): void 
  {
  }

  dropErrorMessage(errorMessage: string, errorColor = "red", timeout = 2500) : void
  {
    this.errorColor = errorColor;

    this.errorString = errorMessage;

    clearTimeout(this.errorTimeout);

    this.errorTimeout = setTimeout(() =>
    {
      this.errorString = "";
    }, timeout);
  }

  login(): void 
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
  }

  togglePassVisibility(): void 
  {
    this.passwordVisible = !this.passwordVisible;
  }
}