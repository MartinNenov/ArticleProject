import { Directive, ViewContainerRef, Injector, TemplateRef, Input, Renderer2 } from '@angular/core';

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
    yjsPMService.init(this.viewContainerRef.element.nativeElement, renderer);
  }
}
