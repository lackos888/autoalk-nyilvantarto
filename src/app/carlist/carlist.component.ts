import { Component, OnInit } from '@angular/core';

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
  loggedInAs: string;
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

  constructor() { 
    this.loggedInAs = "lackos";
    this.alreadySelectedBrand = "";
    this.carEditActive = {
      dbID: 0,
      brand: "",
      modelData: {}
    };

    this.carIDToDataCache = {};

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

    this.carBrands = [];

    this.selectableVehicles = [];

    this.carIdSelected = 0;

    for(const [brandName, modelNames] of Object.entries(this.currentCars))
    {
      this.carBrands.push({internalName: brandName, displayName: modelNames.brandDisplayName});
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
      }
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
      modelData: obj
    };
  }

  populateSelectableVehicles(brandInternalName: string, searchKeyword: string): void 
  {
    this.carIDToDataCache = {};

    this.selectableVehicles = [];

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

          this.carIDToDataCache[variationObj.carId] = {modelName: modelName, modelData: variationObj};

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
