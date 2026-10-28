import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthComponent } from './auth.component';
import { AuthService } from '../../services/auth';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('AuthComponent', () => {
  let component: AuthComponent;
  let fixture: ComponentFixture<AuthComponent>;

  const authServiceMock = {
    signIn: vi.fn(),
    signUp: vi.fn(),
    signInWithProvider: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle between login and register modes', () => {
    expect(component.isRegister()).toBe(false);
    component.toggleMode();
    expect(component.isRegister()).toBe(true);
    component.toggleMode();
    expect(component.isRegister()).toBe(false);
  });

  it('should compute slug dynamically from username', () => {
    component.username.set('Master_Chief-117');
    expect(component.slug()).toBe('master_chief-117');
  });

  it('should compute password strength correctly', () => {
    component.password.set('Secret123!');
    expect(component.strengthScore()).toBe(4);
    expect(component.strengthLabel()).toBe('Nivel: Excelente');
  });
});
