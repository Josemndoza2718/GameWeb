import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ProfileComponent } from './profile';
import { ProfileService } from '../../services/profile';
import { UserGamesService } from '../../services/user-games';
import { PostsService } from '../../services/posts';
import { TierlistsService } from '../../services/tierlist';
import { AuthService } from '../../services/auth';
import { MessageService } from 'primeng/api';
import { signal } from '@angular/core';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;

  const profileServiceMock = {
    getProfileByUsername: () => Promise.resolve(null),
    getProfileById: () => Promise.resolve(null),
    ensureProfile: () => Promise.resolve({
      id: 'test-user-id',
      username: 'AlexVance',
      avatar_url: null,
      bio: null,
      created_at: new Date().toISOString()
    }),
    getProfileStats: () => Promise.resolve({
      totalGames: 42,
      completedGames: 12,
      totalPosts: 5,
      totalTierlists: 2
    }),
    uploadAvatar: () => Promise.resolve('https://test.avatar/url.png'),
    updateProfile: () => Promise.resolve()
  };

  const userGamesServiceMock = {
    getUserLibrary: () => Promise.resolve([])
  };

  const postsServiceMock = {
    getPosts: () => Promise.resolve([])
  };

  const tierlistsServiceMock = {
    getPublicTierlists: () => Promise.resolve([])
  };

  const authServiceMock = {
    currentUser: signal({ id: 'test-user-id', email: 'alex.vance@retroarchive.gg', user_metadata: { username: 'AlexVance' } }),
    client: {
      auth: {
        updateUser: () => Promise.resolve({ error: null })
      }
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideRouter([]),
        { provide: ProfileService, useValue: profileServiceMock },
        { provide: UserGamesService, useValue: userGamesServiceMock },
        { provide: PostsService, useValue: postsServiceMock },
        { provide: TierlistsService, useValue: tierlistsServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        MessageService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create ProfileComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should switch navigation tabs properly', () => {
    expect(component.activeTab()).toBe('personal');
    component.setActiveTab('security');
    expect(component.activeTab()).toBe('security');
    component.setActiveTab('preferences');
    expect(component.activeTab()).toBe('preferences');
    component.setActiveTab('connections');
    expect(component.activeTab()).toBe('connections');
    component.setActiveTab('collection');
    expect(component.activeTab()).toBe('collection');
  });

  it('should compute password robustness score reactively', () => {
    component.newPassword.set('Pass123!');
    expect(component.pwdHasUpper()).toBe(true);
    expect(component.pwdHasNumbers()).toBe(true);
    expect(component.pwdHasSymbols()).toBe(true);
    expect(component.pwdHasLength()).toBe(false); // Length < 12
    expect(component.pwdScore()).toBe(3);

    component.newPassword.set('MasterVault2024!Secure');
    expect(component.pwdScore()).toBe(4);
    expect(component.pwdScoreLabel()).toBe('Excelente (4/4 Parámetros)');
  });
});
