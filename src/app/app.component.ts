import { Component } from '@angular/core';
import { YjsProsemirrorService } from './services/yjs-prosemirror.service';
import { TestDataService } from './test-data.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'angular-prosemirror';

  constructor(public tds: TestDataService) {
    
  }
}
