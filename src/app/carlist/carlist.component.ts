import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '../_providers/session';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import {MatTable} from '@angular/material/table';

export interface CarBrandEntry {
  internalName: string;
  displayName: string;
};

export interface CarModelEntry {
  engineCode: string;
  modelYear: number;
  hp: number;
  nm: number;
  carId: number;
  type: string;
}; //interface correlated to DB entries

export interface CarEditInstance {
  dbID: number;
  brand: string;
  modelData: any;
  oldModelName: any | null;
};

export interface SelectableVehicleEntry {
  carId: number;
  modelName: string;
  modelYear: number;
  engineCode: string;
  hp: number;
  nm: number;
  type: string;
} //interface correlated to narrowed down search results

type CarModelsType = {
  [key: string]: Array<CarModelEntry>;
}

export interface CarIDToDataCache {
  modelName: string;
  modelData: CarModelEntry;
}

type CarIDToData = {
  [key: number]: CarIDToDataCache;
}

export interface CarEntry {
  brandDisplayName: string;

  models: CarModelsType;
}

type CarsType = {
  [key: string]: CarEntry;
};

@Component({
  selector: 'app-carlist',
  templateUrl: './carlist.component.html',
  styleUrls: ['./carlist.component.css']
})

export class CarlistComponent implements OnInit {
  currentCars: CarsType; //vehicle from DB
  alreadySelectedBrand: string; //is a brand selected
  carBrands: Array<CarBrandEntry>; //carBrand selection object
  selectableVehicles: Array<SelectableVehicleEntry>; //selectable vehicles after brand selection
  carIdSelected: number;
  displayedColumnsInSelectableVehicles: string[] = ['carId', 'modelName', 'modelYear', 'engineCode', 'hp', 'nm', 'type', 'icons'];
  carEditActive: CarEditInstance;
  carIDToDataCache: CarIDToData;
  showSpinner: boolean = false;
  errorString: string = "";
  sessionService: SessionService;
  currentSearchText: string = "";

  getLoggedAsIn() : string | null
  {
    return this.sessionService.getLoggedInAs();
  }

  handleRealLogout(): Promise<void>
  {
    return this.sessionService.handleRealLogout();
  }

  navigateToHome(): void
  {
    this.router.navigate(['/loggedin'], {});
  }

  async refreshCarListFromDB(): Promise<void>
  {
    const carlistRet = await this.sessionService.requestCurrentCarlist();

    if(carlistRet && carlistRet.successful == false)
    {
      alert("Hiba történt a járműadatok lekérése közben: " + carlistRet.errorString);

      return;
    }

    for(let it = 0; it < carlistRet.length; it++)
    {
      const carlistDBData = carlistRet[it];

      const brand = carlistDBData.brand;

      const modelName = carlistDBData.modelName;

      const newObject = {
        carId: carlistDBData["_id"],
        engineCode: carlistDBData.engineCode,
        modelYear: carlistDBData.modelYear,
        hp: carlistDBData.hp,
        nm: carlistDBData.nm,
        type: carlistDBData.type
      };

      if(!this.currentCars[brand])
      {
        this.currentCars[brand] = {brandDisplayName: brand, models: {}};
      }

      if(!this.currentCars[brand].models[modelName])
      {
        this.currentCars[brand].models[modelName] = [];
      }

      this.currentCars[brand].models[modelName].push(newObject);
    }

    this.refreshCarBrandsCache();
  }

  constructor(private router: Router, private sessionServiceInstance: SessionService, public dialog: MatDialog) { 
    this.sessionService = sessionServiceInstance;
    this.alreadySelectedBrand = "";
    this.carEditActive = {
      dbID: 0,
      brand: "",
      modelData: {},
      oldModelName: null
    };

    this.carIDToDataCache = {};

    /*
    TESZT ADAT

    this.currentCars = {
      "OPEL": {
        "brandDisplayName": "OPEL",
        "models": {
          "ASTRA F": [
            {
                carId: 1,
                engineCode: "C14SE",
                modelYear: 1995,
                hp: 82,
                nm: 112,
                type: "hatchback"
            },
            {
              carId: 2,
              engineCode: "C14SE2",
              modelYear: 1995,
              hp: 82,
              nm: 112,
              type: "hatchback"
          }
          ]
        }
      }
    }
    */

    this.carBrands = [];

    this.selectableVehicles = [];

    this.currentCars = {};

    this.carIdSelected = 0;

    this.refreshCarBrandsCache();

    this.refreshCarListFromDB();
  }

  refreshCarBrandsCache() : void
  {
    this.carBrands = [];

    this.selectableVehicles = [];

    this.carIdSelected = 0;

    for(const [brandName, modelNames] of Object.entries(this.currentCars))
    {
      this.carBrands.push({internalName: brandName, displayName: modelNames.brandDisplayName});
    }
  }

  async tryToDeleteVehicle(element: any) : Promise<void> {
      const retConfirm = confirm("Biztos, hogy ki akarod törölni a(z) " + element.carId + " IDjű járművet?");

      if(!retConfirm)
      {
        return;
      }

      this.showSpinner = true;

      const ret = await this.sessionService.tryToDeleteVehicle(element.carId);

      this.showSpinner = false;

      if(ret && ret.successful)
      {
        const brandName = this.alreadySelectedBrand;

        const brandObj = this.currentCars[brandName];

        const modelName = element.modelName;

        if(brandObj && brandObj.models && brandObj.models[modelName])
        {
          const modelArray = brandObj.models[modelName];

          for(let it = 0; it < modelArray.length; it++)
          {
            if(modelArray[it].carId === element.carId)
            {
              modelArray.splice(it, 1);

              break;
            }
          }

          if(!brandObj.models[modelName].length)
          {
            delete brandObj.models[modelName];
          }

          if(!Object.keys(brandObj.models).length)
          {
            delete this.currentCars[brandName];
          }

          this.refreshCarBrandsCache();
        }

        alert("Sikeresen törölted a(z) " + element.carId + " ID-jű járművet!");
      } else 
      {
        alert("Hiba történt a(z) " + element.carId + " ID-jű jármű törlése közben!");
      }
  }

  async handleCarEditOrAddition() : Promise<void> {
    if(this.carEditActive)
    {
      if(!this.carEditActive.brand)
      {
        alert("Nem lehet üresen hagyva a márka neve!");

        return;
      }

      if(!this.carEditActive.modelData || !this.carEditActive.modelData.modelName)
      {
        alert("Nem lehet üresen hagyva a modell neve!");

        return;
      }

      if(!this.carEditActive.modelData.modelData.engineCode)
      {
        alert("Nem lehet üresen hagyva a motorszám/motorkód!");

        return;
      }

      if(!this.carEditActive.modelData.modelData.type)
      {
        alert("Nem lehet üresen hagyva a jármű kivitele!");

        return;
      }


      const shouldBeNumbers = ['modelYear', 'hp', 'nm'];
      const shouldBeNumbers2 = ['évjárat', 'lóerő', 'nyomaték nm-ben'];

      for(let it = 0; it < shouldBeNumbers.length; it++)
      {
        const num = parseInt(this.carEditActive.modelData.modelData[shouldBeNumbers[it]]);

        if(isNaN(num))
        {
          alert("Számot kell beírni a(z) " + shouldBeNumbers2[it] + ' mezőbe!');

          return;
        }
      }

      if(this.carEditActive.dbID === -1)
      {
        this.showSpinner = true;

        const ret = await this.sessionService.tryToAddNewVehicle(this.carEditActive);

        this.showSpinner = false;

        if(ret && ret.successful)
        {
          const brand = this.carEditActive.brand;
          const modelName = this.carEditActive.modelData.modelName;

          if(!this.currentCars[brand])
          {
            this.currentCars[brand] = {
              brandDisplayName: brand,
              models: {}
            };
          }

          if(!this.currentCars[brand].models[modelName])
          {
            this.currentCars[brand].models[modelName] = [];
          }

          this.currentCars[brand].models[modelName].push({
            carId: ret.dbid,
            ...this.carEditActive.modelData.modelData
          });

          this.carIDToDataCache[ret.dbid] = JSON.parse(JSON.stringify({modelName: this.carEditActive.modelData.modelName, modelData: this.carEditActive.modelData.modelData}));
          
          this.refreshCarBrandsCache();

          alert("Sikeresen hozzáadtad a járművet!");

          this.carEditActive = {
            dbID: 0,
            brand: "",
            modelData: {},
            oldModelName: null
          };
        } else 
        {
          alert("A jármű hozzáadása nem sikerült, hiba: " + ret.errorString);
        }
      } else 
      {
        console.log("teszt: " + JSON.stringify(this.carIDToDataCache));

        const carDataFromDBID = {...this.carIDToDataCache[this.carEditActive.dbID]};

        if(!carDataFromDBID)
        {
          alert("Cache hiba!");

          return;
        }

        this.showSpinner = true;

        const ret = await this.sessionService.tryToModifyVehicle(this.carEditActive);

        this.showSpinner = false;

        if(ret && ret.successful)
        {
          const brand = this.carEditActive.brand;

          const oldModelName = this.carEditActive.oldModelName;

          const newModelName = this.carEditActive.modelData.modelName;

          delete this.carEditActive.oldModelName;

          if(this.currentCars[brand] && this.currentCars[brand].models && this.currentCars[brand].models[oldModelName])
          {
            const modelArray = this.currentCars[brand].models[oldModelName];

            for(let it = 0; it < modelArray.length; it++)
            {
              if(modelArray[it].carId == this.carEditActive.dbID)
              {
                modelArray.splice(it, 1);

                break;
              }
            }

            if(!this.currentCars[brand].models[oldModelName].length)
            {
              delete this.currentCars[brand].models[oldModelName];
            }

            if(!this.currentCars[brand].models[newModelName])
            {
              this.currentCars[brand].models[newModelName] = [];
            }

            this.currentCars[brand].models[newModelName].push(this.carEditActive.modelData.modelData);
          }

          alert("Sikeresen módosítottad a jármű adatait!");

          this.carEditActive = {
            dbID: 0,
            brand: "",
            modelData: {},
            oldModelName: null
          };

          this.populateSelectableVehicles(this.alreadySelectedBrand, this.currentSearchText);
        } else 
        {
          alert("A jármű módosítása nem sikerült, hiba: " + ret.errorString);
        }
      }
    }
  }

  ngOnInit(): void {
  }

  enterCarAdd()
  {
    this.carEditActive = {
      dbID: -1,
      brand: "",
      modelData: {
        modelName: "",
        modelData: {}
      },
      oldModelName: null
    };
  }

  startCarEdit(carId: number)
  {
    const obj = this.carIDToDataCache[carId];

    if(!obj)
    {
      return;
    }

    this.carEditActive = {
      dbID: carId,
      brand: this.alreadySelectedBrand,
      oldModelName: obj.modelName,
      modelData: obj
    };
  }

  populateSelectableVehicles(brandInternalName: string, searchKeyword: string): void 
  {
    this.carIDToDataCache = {};

    this.selectableVehicles = [];

    this.currentSearchText = searchKeyword;

    const obj = this.currentCars[brandInternalName];

    if(!obj)
    {
      return;
    }

    const models = obj.models;

    this.carIdSelected = 0;

    for(const [modelName, variations] of Object.entries(models))
    {
        for(let variationIt = 0; variationIt < variations.length; variationIt++)
        {
          const variationObj = variations[variationIt];

          const displayNameFormatted = obj.brandDisplayName + " " + modelName + " | " + variationObj.modelYear + " | " + variationObj.engineCode;

          if(searchKeyword && displayNameFormatted.toLowerCase().indexOf(searchKeyword) == -1)
          {
            continue;
          }

          if(!this.carIdSelected && searchKeyword)
          {
            this.carIdSelected = variationObj.carId;
          }

          this.carIDToDataCache[variationObj.carId] = JSON.parse(JSON.stringify({modelName: modelName, modelData: variationObj}));

          this.selectableVehicles.push({carId: variationObj.carId, modelName: modelName, modelYear: variationObj.modelYear, engineCode: variationObj.engineCode, hp: variationObj.hp, nm: variationObj.nm, type: variationObj.type});
        }
    }
  }

  searchTextChanged(event: any): void
  {
    this.populateSelectableVehicles(this.alreadySelectedBrand, event.target.value.toLowerCase());
  }

  onBrandSelect(event: { source: { value: any; }; }): void 
  {
    this.selectableVehicles = [];

    this.alreadySelectedBrand = "";

    const brandInternalName = event.source.value;

    const obj = this.currentCars[brandInternalName];

    if(!obj)
    {
      return;
    }

    this.alreadySelectedBrand = brandInternalName;

    this.populateSelectableVehicles(brandInternalName, "");
  }
}
