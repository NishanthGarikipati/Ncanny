import type {
  AcademicHall,
  AuthSession,
  AuthTokens,
  CurrentUser,
  MediaPayload,
  OtpRequestResult,
  PaginatedResult,
  PreceptorProfile,
  ScholarProfile,
  SchoolRoster,
  SchoolSummary,
  SchoolWorkCounts,
  SessionSummary,
  StoredMedia,
  Subject,
  WorkCard,
  WorkDetail,
} from '@ncanny/types';
import type {
  AwardBadgeInput,
  CommentWorkInput,
  CreateWorkInput,
  ChangePasswordInput,
  LoginInput,
  OtpRequestInput,
  OtpVerifyInput,
  PresenceInput,
  RegisterPreceptorInput,
  RegisterScholarInput,
  ReactionInput,
  ReportWorkInput,
  ReviewWorkInput,
  UpdatePreceptorProfileInput,
  UpdateScholarProfileInput,
  UploadMediaInput,
  WorkFeedInput,
} from '@ncanny/validation';
import { HttpClient, type HttpClientOptions, type RequestOptions } from './http-client';

type Cancellable = Pick<RequestOptions, 'signal'>;

/**
 * Typed façade over the Ncanny REST API. Feature code calls these methods
 * rather than assembling URLs, so endpoint changes stay in one file.
 */
export class NcannyClient {
  readonly http: HttpClient;

  constructor(options: HttpClientOptions | HttpClient) {
    this.http = options instanceof HttpClient ? options : new HttpClient(options);
  }

  // ---------------------------------------------------------------- auth

  readonly auth = {
    registerScholar: (input: RegisterScholarInput, options: Cancellable = {}) =>
      this.http.post<AuthSession>('/api/v1/auth/register/scholar', input, {
        ...options,
        anonymous: true,
      }),

    registerPreceptor: (input: RegisterPreceptorInput, options: Cancellable = {}) =>
      this.http.post<AuthSession>('/api/v1/auth/register/preceptor', input, {
        ...options,
        anonymous: true,
      }),

    login: (input: LoginInput, options: Cancellable = {}) =>
      this.http.post<AuthSession>('/api/v1/auth/login', input, { ...options, anonymous: true }),

    requestOtp: (input: OtpRequestInput, options: Cancellable = {}) =>
      this.http.post<OtpRequestResult>('/api/v1/auth/otp/request', input, {
        ...options,
        anonymous: true,
      }),

    verifyOtp: (input: OtpVerifyInput, options: Cancellable = {}) =>
      this.http.post<AuthSession>('/api/v1/auth/otp/verify', input, {
        ...options,
        anonymous: true,
      }),

    refresh: (refreshToken: string) =>
      this.http.post<AuthTokens>('/api/v1/auth/refresh', { refreshToken }, { anonymous: true }),

    me: (options: Cancellable = {}) => this.http.get<CurrentUser>('/api/v1/auth/me', options),

    sessions: (options: Cancellable = {}) =>
      this.http.get<SessionSummary[]>('/api/v1/auth/sessions', options),

    logout: (refreshToken: string) =>
      this.http.post<{ loggedOut: true }>('/api/v1/auth/logout', { refreshToken }),

    logoutAll: () => this.http.post<{ revokedSessions: number }>('/api/v1/auth/logout-all'),

    changePassword: (input: ChangePasswordInput, options: Cancellable = {}) =>
      this.http.post<{ changed: true }>('/api/v1/auth/password', input, options),
  };

  // ------------------------------------------------------------ profiles

  readonly scholars = {
    me: (options: Cancellable = {}) =>
      this.http.get<ScholarProfile>('/api/v1/scholars/me', options),

    byCannyId: (cannyId: string, options: Cancellable = {}) =>
      this.http.get<ScholarProfile>(`/api/v1/scholars/${encodeURIComponent(cannyId)}`, options),

    updateMe: (input: UpdateScholarProfileInput, options: Cancellable = {}) =>
      this.http.patch<ScholarProfile>('/api/v1/scholars/me', input, options),
  };

  readonly preceptors = {
    me: (options: Cancellable = {}) =>
      this.http.get<PreceptorProfile>('/api/v1/preceptors/me', options),

    byCannyId: (cannyId: string, options: Cancellable = {}) =>
      this.http.get<PreceptorProfile>(`/api/v1/preceptors/${encodeURIComponent(cannyId)}`, options),

    updateMe: (input: UpdatePreceptorProfileInput, options: Cancellable = {}) =>
      this.http.patch<PreceptorProfile>('/api/v1/preceptors/me', input, options),
  };

  // ------------------------------------------------------- reference data

  readonly schools = {
    search: (query: { q?: string; limit?: number; cursor?: string }, options: Cancellable = {}) =>
      this.http.get<PaginatedResult<SchoolSummary>>('/api/v1/schools', {
        ...options,
        query,
        anonymous: true,
      }),

    byId: (id: string, options: Cancellable = {}) =>
      this.http.get<SchoolSummary>(`/api/v1/schools/${encodeURIComponent(id)}`, {
        ...options,
        anonymous: true,
      }),

    roster: (options: Cancellable = {}) =>
      this.http.get<SchoolRoster>('/api/v1/scholars/school-roster', options),
  };

  readonly subjects = {
    list: (options: Cancellable = {}) =>
      this.http.get<Subject[]>('/api/v1/subjects', { ...options, anonymous: true }),
  };

  readonly media = {
    upload: (input: UploadMediaInput, options: Cancellable = {}) =>
      this.http.post<StoredMedia>('/api/v1/media', input, options),
  };

  readonly content = {
    create: (input: CreateWorkInput, options: Cancellable = {}) =>
      this.http.post<WorkDetail>('/api/v1/content', input, options),

    feed: (query: Partial<WorkFeedInput> = {}, options: Cancellable = {}) =>
      this.http.get<PaginatedResult<WorkCard>>('/api/v1/content', { ...options, query }),

    mine: (options: Cancellable = {}) => this.http.get<WorkCard[]>('/api/v1/content/mine', options),

    summary: (options: Cancellable = {}) =>
      this.http.get<SchoolWorkCounts>('/api/v1/content/summary', options),

    byId: (id: string, options: Cancellable = {}) =>
      this.http.get<WorkDetail>(`/api/v1/content/${encodeURIComponent(id)}`, options),

    media: (id: string, options: Cancellable = {}) =>
      this.http.get<MediaPayload>(`/api/v1/content/${encodeURIComponent(id)}/media`, options),

    review: (id: string, input: ReviewWorkInput, options: Cancellable = {}) =>
      this.http.post<WorkDetail>(`/api/v1/content/${encodeURIComponent(id)}/review`, input, options),

    report: (id: string, input: ReportWorkInput, options: Cancellable = {}) =>
      this.http.post<{ reported: true }>(
        `/api/v1/content/${encodeURIComponent(id)}/report`,
        input,
        options,
      ),

    react: (id: string, input: ReactionInput, options: Cancellable = {}) =>
      this.http.post<WorkDetail>(`/api/v1/content/${encodeURIComponent(id)}/reactions`, input, options),

    comment: (id: string, input: CommentWorkInput, options: Cancellable = {}) =>
      this.http.post<WorkDetail>(`/api/v1/content/${encodeURIComponent(id)}/comments`, input, options),

    reportComment: (id: string, commentId: string, input: ReportWorkInput, options: Cancellable = {}) =>
      this.http.post<{ reported: true }>(
        `/api/v1/content/${encodeURIComponent(id)}/comments/${encodeURIComponent(commentId)}/report`,
        input,
        options,
      ),

    bookmark: (id: string, options: Cancellable = {}) =>
      this.http.post<WorkDetail>(`/api/v1/content/${encodeURIComponent(id)}/bookmark`, {}, options),

    awardBadge: (id: string, input: AwardBadgeInput, options: Cancellable = {}) =>
      this.http.post<WorkDetail>(`/api/v1/content/${encodeURIComponent(id)}/badges`, input, options),
  };

  readonly whiteboard = {
    hall: (options: Cancellable = {}) =>
      this.http.get<AcademicHall>('/api/v1/whiteboard/hall', options),

    setPresence: (input: PresenceInput, options: Cancellable = {}) =>
      this.http.post<{ optedIn: boolean }>('/api/v1/whiteboard/presence', input, options),
  };

  readonly health = {
    check: (options: Cancellable = {}) =>
      this.http.get<{ status: string; database: string; uptimeSeconds: number }>('/api/v1/health', {
        ...options,
        anonymous: true,
      }),
  };
}

export function createNcannyClient(options: HttpClientOptions): NcannyClient {
  return new NcannyClient(options);
}
