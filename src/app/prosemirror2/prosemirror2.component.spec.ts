import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Prosemirror2Component } from './prosemirror2.component';

describe('Prosemirror2Component', () => {
  let component: Prosemirror2Component;
  let fixture: ComponentFixture<Prosemirror2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ Prosemirror2Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(Prosemirror2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
