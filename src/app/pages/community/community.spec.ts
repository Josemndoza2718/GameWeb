import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { CommunityComponent } from './community';
import { PostsService } from '../../services/posts';
import { RawgService } from '../../services/rawg';
import { AuthService } from '../../services/auth';
import { MessageService } from 'primeng/api';
import { AutoCompleteCompleteEvent } from 'primeng/autocomplete';

describe('CommunityComponent', () => {
  let component: CommunityComponent;
  let fixture: ComponentFixture<CommunityComponent>;

  const postsServiceMock = {
    getPosts: () => Promise.resolve([]),
    createPost: (postData: any) => Promise.resolve({
      id: 'test-post-id',
      ...postData,
      created_at: new Date().toISOString(),
      profiles: { username: 'AlexVance' }
    })
  };

  const rawgServiceMock = {
    searchGames: () => of([
      { id: 101, name: 'Chrono Trigger', background_image: 'https://images.igdb.com/ct.jpg' },
      { id: 102, name: 'Final Fantasy VI', background_image: 'https://images.igdb.com/ff6.jpg' }
    ])
  };

  const authServiceMock = {
    currentUser: signal({
      id: 'test-user-id',
      email: 'alex.vance@retroarchive.gg',
      user_metadata: { username: 'AlexVance' }
    })
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityComponent],
      providers: [
        provideRouter([]),
        { provide: PostsService, useValue: postsServiceMock },
        { provide: RawgService, useValue: rawgServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        MessageService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CommunityComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create the Community component', () => {
    expect(component).toBeTruthy();
  });

  it('should switch debate filters correctly', () => {
    expect(component.selectedFilter()).toBe('all');
    component.setFilter('heresy');
    expect(component.selectedFilter()).toBe('heresy');
    component.setFilter('canon');
    expect(component.selectedFilter()).toBe('canon');
  });

  it('should cast duel vote and calculate percentages correctly', () => {
    const initialVotesA = component.duelVotesA();
    const initialTotal = component.totalDuelVotes();

    expect(component.userDuelVote()).toBeNull();
    component.voteDuel('A');

    expect(component.userDuelVote()).toBe('A');
    expect(component.duelVotesA()).toBe(initialVotesA + 1);
    expect(component.totalDuelVotes()).toBe(initialTotal + 1);
    expect(component.percentA()).toBeGreaterThan(0);
  });

  it('should open and close the dialectic creation modal with specified mode', () => {
    expect(component.isModalOpen()).toBe(false);

    component.openNewDebateModal('heresy');
    expect(component.isModalOpen()).toBe(true);
    expect(component.modalMode()).toBe('heresy');

    component.closeModal();
    expect(component.isModalOpen()).toBe(false);
  });

  it('should compute argument rigor dynamically based on content length', () => {
    component.argumentContent.set('Corta');
    expect(component.rigorScore()).toBe(25);

    component.argumentContent.set(
      'Premisa 1: La música y el arte gótico definen la obra maestra.\n\n' +
      'Premisa 2: El diseño de niveles en el castillo invertido presenta picos de dificultad desbalanceados.\n\n' +
      'Conclusión y evidencia comparada: Los elementos de diseño superan con creces los pequeños defectos mecánicos y ameritan una revisión crítica objetiva.'
    );
    expect(component.rigorScore()).toBe(78);
  });

  it('should toggle following state for top curators', () => {
    const curator = component.curators[0];
    const initialFollowing = component.isCuratorFollowed(curator.handle);
    expect(initialFollowing).toBe(false);

    component.toggleFollowCurator(curator.handle);
    expect(component.isCuratorFollowed(curator.handle)).toBe(true);

    component.toggleFollowCurator(curator.handle);
    expect(component.isCuratorFollowed(curator.handle)).toBe(false);
  });

  it('should search games for dialectic thesis selection', () => {
    component.searchGames({ query: 'Chrono' } as AutoCompleteCompleteEvent);
    expect(component.gameSuggestions().length).toBe(2);
    expect(component.gameSuggestions()[0].name).toBe('Chrono Trigger');
  });
});
