import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TestDataService {

  public value = 0;

  public bump() {
    this.value++;
  }

  public reset(value : number) {
    this.value = value;
  }
  constructor() { }
}
