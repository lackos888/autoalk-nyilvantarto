import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

const apiURL = "http://localhost:3000/";

export interface LoginResult
{
    possibleErrorString: string;
    successful: boolean;
    ourSessionId: string;
    realUsername: string;
}

export interface LogoutResult
{
    successful: boolean;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
    constructor(private http: HttpClient, private router: Router) 
    {
        
    }

    cleanupLocalStorage()
    {
        localStorage.removeItem("loggedIn");
        localStorage.removeItem("loggedInAs");
    }

    async tryToAddNewVehicle(instance: any) : Promise<any>
    {
        return await new Promise((resolve, reject) =>
        {
            this.http.post(apiURL + "addcar", {
                sessionId: localStorage.getItem("loggedIn"),
                editData: instance
            }).subscribe({
                next: ret =>
                {
                    return resolve(ret);
                },
                error: errorRet =>
                {
                    return resolve({
                        successful: false,
                        errorString: errorRet.message
                    });
                }
            });
        });
    }

    async tryToModifyVehicle(instance: any) : Promise<any> /* SAME AS tryToAddNewVehicle but with different dbid (!= -1) */
    {
        return await new Promise((resolve, reject) =>
        {
            this.http.post(apiURL + "addcar", {
                sessionId: localStorage.getItem("loggedIn"),
                editData: instance
            }).subscribe({
                next: ret =>
                {
                    return resolve(ret);
                },
                error: errorRet =>
                {
                    return resolve({
                        successful: false,
                        errorString: errorRet.message
                    });
                }
            });
        });
    }

    async tryToDeleteVehicle(vehicleDBID: any) : Promise<any>
    {
        return await new Promise((resolve, reject) =>
        {
            this.http.post(apiURL + "delcar", {
                sessionId: localStorage.getItem("loggedIn"),
                vehicleDBID: vehicleDBID
            }).subscribe({
                next: ret =>
                {
                    return resolve(ret);
                },
                error: errorRet =>
                {
                    return resolve({
                        successful: false,
                        errorString: errorRet.message
                    });
                }
            });
        });
    }

    async requestCurrentCarlist() : Promise<any>
    {
        return await new Promise((resolve, reject) =>
        {
            this.http.post(apiURL + "carlist", {
                sessionId: localStorage.getItem("loggedIn")
            }).subscribe({
                next: ret =>
                {
                    return resolve(ret);
                },
                error: errorRet =>
                {
                    return resolve({
                        successful: false,
                        errorString: errorRet.message
                    });
                }
            });
        });
    }

    async tryToLogin(username: string, password: string) : Promise<LoginResult>
    {
        return await new Promise((resolve, reject) =>
        {
            this.http.post<LoginResult>(apiURL + "login", {
                username: username,
                password: password,
            }).subscribe({
                next: ret =>
                {
                    if(ret.successful)
                    {
                        localStorage.setItem("loggedIn", ret.ourSessionId);
                        localStorage.setItem("loggedInAs", ret.realUsername);
                    } else 
                    {
                        this.cleanupLocalStorage();
                    }

                    return resolve(ret);
                },
                error: errorRet =>
                {
                    this.cleanupLocalStorage();

                    return resolve({
                        successful: false,
                        ourSessionId: "",
                        realUsername: "",
                        possibleErrorString: errorRet.message
                    });
                }
            });
        });
    }

    async logOut(): Promise<LogoutResult>
    {
        return await new Promise((resolve, reject) =>
        {
            this.http.post<LoginResult>(apiURL + "logout", {
                sessionId: localStorage.getItem("loggedIn")
            }).subscribe({
                next: ret =>
                {
                    if(ret.successful)
                    {
                        this.cleanupLocalStorage();
                    }

                    return resolve(ret);
                },
                error: errorRet =>
                {
                    return resolve({
                        successful: false
                    });
                }
            });
        });
    }

    async handleRealLogout()
    {
        const ret = await this.logOut();

        if(ret && ret.successful)
        {
          this.router.navigate(['/'], {});
        } else 
        {
          alert("Hiba történt kijelentkezés közben!");
        }
    }

    getLoggedInAs(): string | null
    {
        return localStorage.getItem("loggedInAs");
    }

    isAuthorized(): boolean
    {
        const loggedIn = localStorage.getItem("loggedIn");

        return loggedIn !== null && loggedIn !== undefined;
    }
}