import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AddCommentDialogComponent } from './add-comment-dialog/add-comment-dialog.component';
import { YjsProsemirrorService } from './services/yjs-prosemirror.service';
import { TestDataService } from './test-data.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'angular-prosemirror';
  animal?: string ;
  name?: string ;
  comments:string |null = '';

  constructor(public tds: TestDataService,public dialog: MatDialog) {
    
  }

  openDialog():void{
    const dialogRef = this.dialog.open(AddCommentDialogComponent, {
      width: '250px',
      data: {name: this.name, animal: this.animal}
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      this.animal = result;
    });
  }

  displayComments():void{
    this.comments = '';
    document.querySelectorAll('#asd').forEach((el,index)=>{
      if(this.comments!=null){
        this.comments+=index.toString()+el.textContent+"\n";
      }
    })
    //this.comments = document.querySelectorAll('#asd')[0].textContent;
  }
}
