// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

// Heavy tabs are not under test here; the real dashboard shell, login form and
// tab routing run against a stubbed fetch.
vi.mock('../src/components/AdminOverview.jsx', () => ({ default: () => <div>overview-tab</div> }));
vi.mock('../src/components/admin/TransactionTab.jsx', () => ({ default: () => <div>transaction-tab</div> }));
vi.mock('../src/components/admin/AdminUsersTab.jsx', () => ({ default: () => <div>users-tab</div> }));

import AdminDashboard from '../src/components/AdminDashboard.jsx';

const jsonResponse = (data, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(data), text: () => Promise.resolve(JSON.stringify(data)) });

// jsdom exposes no localStorage on an opaque origin, so use an in-memory one.
const memoryStorage = () => {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    clear: () => data.clear(),
  };
};

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
  window.history.pushState({}, '', '/admin');
  vi.stubGlobal('fetch', vi.fn(() => jsonResponse({ data: [] })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AdminDashboard', () => {
  it('shows the login form when there is no saved session', () => {
    render(<AdminDashboard />);
    expect(screen.getByText('Admin Access')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
  });

  it('rejects an empty login without calling the API', () => {
    render(<AdminDashboard />);
    fireEvent.submit(screen.getByPlaceholderText('Password').closest('form'));
    expect(screen.getByText('Email dan Password harus diisi.')).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows the server error for wrong credentials and clears the password', async () => {
    fetch.mockImplementation(() => jsonResponse({ error: { message: 'Email atau password salah.' } }, 401));
    render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText('admin@urbanmenphoto.com'), { target: { value: 'a@b.test' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'wrong' } });
    fireEvent.submit(screen.getByPlaceholderText('Password').closest('form'));
    await waitFor(() => expect(screen.getByText('Email atau password salah.')).toBeTruthy());
    expect(screen.getByPlaceholderText('Password').value).toBe('');
    expect(localStorage.getItem('urbanmenphoto_admin_token')).toBeNull();
  });

  it('stores the token and opens the dashboard after a successful login', async () => {
    fetch.mockImplementation((url) =>
      String(url).includes('/auth/login')
        ? jsonResponse({ data: { token: 'tok-1', role: 'owner' } })
        : jsonResponse({ data: [] }),
    );
    render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText('admin@urbanmenphoto.com'), { target: { value: 'owner@b.test' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'secret-123' } });
    fireEvent.submit(screen.getByPlaceholderText('Password').closest('form'));
    await waitFor(() => expect(localStorage.getItem('urbanmenphoto_admin_token')).toBe('tok-1'));
    await waitFor(() => expect(screen.queryByText('Admin Access')).toBeNull());
  });

  it('asks for the 2FA code when the backend requires it', async () => {
    fetch.mockImplementation(() => jsonResponse({ data: { requires2FA: true } }));
    render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText('admin@urbanmenphoto.com'), { target: { value: 'owner@b.test' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'secret-123' } });
    fireEvent.submit(screen.getByPlaceholderText('Password').closest('form'));
    await waitFor(() => expect(screen.getByText('Verifikasi 2FA')).toBeTruthy());
  });
});
