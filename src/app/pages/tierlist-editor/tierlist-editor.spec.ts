import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TierlistEditor } from './tierlist-editor';

describe('TierlistEditor', () => {
  let component: TierlistEditor;
  let fixture: ComponentFixture<TierlistEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TierlistEditor],
    }).compileComponents();

    fixture = TestBed.createComponent(TierlistEditor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
