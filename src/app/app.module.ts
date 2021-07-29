import { NgModule ,Injector} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';


import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MyElementComponent } from './my-element/my-element.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ProsemirrorModule } from './prosemirror/prosemirror.module';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';


@NgModule({
  declarations: [
    AppComponent,
    MyElementComponent,
  ],
  imports: [
    BrowserModule,
    ProsemirrorModule,
    BrowserAnimationsModule,
    MatButtonModule,
    MatCardModule,
    MatInputModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
