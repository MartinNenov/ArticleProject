import { Directive, ViewContainerRef, Injector, TemplateRef, Input, Renderer2 } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { YjsProsemirrorService } from '../services/yjs-prosemirror.service';

@Directive({
  selector: '[appEditor]'
})
export class EditorDirective {
  constructor(
    private viewContainerRef: ViewContainerRef,
    private injector: Injector,
    public yjsPMService: YjsProsemirrorService,
    private renderer: Renderer2) {
    }
    @Input() set appEditor(asd:{MatDialog:MatDialog,commentsContainer:HTMLDivElement}){
    this.yjsPMService.init(this.viewContainerRef.element.nativeElement,asd.MatDialog,asd.commentsContainer, this.renderer);

  }
}
