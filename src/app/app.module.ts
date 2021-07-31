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
import { YjsProsemirrorService } from './services/yjs-prosemirror.service';
import { AddCommentDialogComponent } from './add-comment-dialog/add-comment-dialog.component';
import {MatDialogModule} from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    AppComponent,
    MyElementComponent,
    AddCommentDialogComponent,
  ],
  imports: [
    BrowserModule,
    ProsemirrorModule,
    BrowserAnimationsModule,
    MatButtonModule,
    MatCardModule,
    MatInputModule,
    MatDialogModule,
    FormsModule
  ],
  providers: [
    YjsProsemirrorService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
