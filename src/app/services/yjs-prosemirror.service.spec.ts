import { TestBed } from '@angular/core/testing';

import { YjsProsemirrorService } from './yjs-prosemirror.service';

describe('YjsProsemirrorService', () => {
  let service: YjsProsemirrorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(YjsProsemirrorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
