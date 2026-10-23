import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyLibrary } from './my-library';

describe('MyLibrary', () => {
  let component: MyLibrary;
  let fixture: ComponentFixture<MyLibrary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyLibrary],
    }).compileComponents();

    fixture = TestBed.createComponent(MyLibrary);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
