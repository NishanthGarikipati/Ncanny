import { ApiError } from '@ncanny/api-client';
import { ErrorCode } from '@ncanny/types';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AttendanceForm } from './AttendanceForm';

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: jest.fn() }),
}));

const login = jest.fn();
const requestOtp = jest.fn();
const verifyOtp = jest.fn();

jest.mock('../../lib/api', () => ({
  getApiClient: () => ({ auth: { login, requestOtp, verifyOtp } }),
  tokenStore: { get: () => null, set: jest.fn(), clear: jest.fn() },
  onAuthFailure: jest.fn(),
}));

const session = {
  user: { id: '1', fullName: 'Aarav Menon', cannyId: 'NCS-000001' },
  tokens: { accessToken: 'a', refreshToken: 'b', expiresIn: 900, tokenType: 'Bearer' },
  redirectTo: '/home',
};

beforeEach(() => {
  jest.clearAllMocks();
});

/**
 * Scoped to the active tab panel: the panel is labelled by its tab, so a
 * document-wide label query would also match the tab itself.
 */
const panel = () => within(screen.getByRole('tabpanel'));

describe('AttendanceForm', () => {
  it('rejects an invalid email before any request is made', async () => {
    render(<AttendanceForm />);

    await userEvent.type(panel().getByLabelText(/email/i), 'not-an-email');
    await userEvent.type(panel().getByLabelText(/password/i), 'Password123');
    await userEvent.click(screen.getByRole('button', { name: /mark attendance/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/valid email/i);
    expect(login).not.toHaveBeenCalled();
  });

  it('signs in and routes to the destination the server chose', async () => {
    login.mockResolvedValue(session);
    render(<AttendanceForm />);

    await userEvent.type(panel().getByLabelText(/email/i), 'aarav@example.com');
    await userEvent.type(panel().getByLabelText(/password/i), 'Password123');
    await userEvent.click(screen.getByRole('button', { name: /mark attendance/i }));

    expect(login).toHaveBeenCalledWith({ email: 'aarav@example.com', password: 'Password123' });
    expect(push).toHaveBeenCalledWith('/home');
  });

  it('shows the API message when credentials are rejected', async () => {
    login.mockRejectedValue(
      new ApiError({
        code: ErrorCode.INVALID_CREDENTIALS,
        message: 'Email or password is incorrect',
        status: 401,
      }),
    );
    render(<AttendanceForm />);

    await userEvent.type(panel().getByLabelText(/email/i), 'aarav@example.com');
    await userEvent.type(panel().getByLabelText(/password/i), 'WrongPass123');
    await userEvent.click(screen.getByRole('button', { name: /mark attendance/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect');
    expect(push).not.toHaveBeenCalled();
  });

  it('does not claim the phone number is registered when requesting a code', async () => {
    requestOtp.mockResolvedValue({ sent: true, expiresInSeconds: 300 });
    render(<AttendanceForm />);

    await userEvent.click(screen.getByRole('tab', { name: /phone code/i }));
    await userEvent.type(panel().getByLabelText(/phone number/i), '+919876543210');
    await userEvent.click(screen.getByRole('button', { name: /send code/i }));

    const notice = await screen.findByRole('status');
    expect(notice).toHaveTextContent(/if that number belongs to an ncanny account/i);
    expect(panel().getByLabelText(/6-digit code/i)).toBeInTheDocument();
  });

  it('verifies the code and signs the Scholar in', async () => {
    requestOtp.mockResolvedValue({ sent: true, expiresInSeconds: 300 });
    verifyOtp.mockResolvedValue(session);
    render(<AttendanceForm />);

    await userEvent.click(screen.getByRole('tab', { name: /phone code/i }));
    await userEvent.type(panel().getByLabelText(/phone number/i), '+919876543210');
    await userEvent.click(screen.getByRole('button', { name: /send code/i }));

    await userEvent.type(await panel().findByLabelText(/6-digit code/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /mark attendance/i }));

    expect(verifyOtp).toHaveBeenCalledWith({ phone: '+919876543210', code: '123456' });
    expect(push).toHaveBeenCalledWith('/home');
  });
});
