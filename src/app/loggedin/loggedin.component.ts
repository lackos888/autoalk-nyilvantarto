import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { SessionService } from '../_providers/session';
import { Router } from '@angular/router';

@Component({
  selector: 'app-loggedin',
  templateUrl: './loggedin.component.html',
  styleUrls: ['./loggedin.component.css']
})
export class LoggedinComponent implements OnInit {

  loggedInAs: string | null;
  sessionService: SessionService;

  constructor(private router: Router, private sessionServiceInstance: SessionService) 
  { 
    this.sessionService = sessionServiceInstance;

    this.loggedInAs = sessionServiceInstance.getLoggedInAs();
  }

  ngOnInit(): void {
  }

  async navigateToCarlist(): Promise<void> {
    this.router.navigate(['/carlist'], {});
  }
}
