// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

// Each step is replaced by a stub that exposes its callbacks as buttons, so
// these tests cover App's orchestration of the kiosk flow only.
vi.mock('../src/utils/kioskConfig.js', () => ({ syncKioskSettings: vi.fn() }));
vi.mock('../src/components/LandingPage.jsx', () => ({
  default: ({ onStart }) => <button onClick={onStart}>landing-start</button>,
}));
vi.mock('../src/components/PaymentView.jsx', () => ({
  default: ({ title, onPaymentSuccess, onBack }) => (
    <div>
      <h1>{title}</h1>
      <button onClick={() => onPaymentSuccess({ session: { id: 's1' }, payment: { id: 'p1' } })}>pay-ok</button>
      <button onClick={onBack}>pay-back</button>
    </div>
  ),
}));
vi.mock('../src/components/CameraView.jsx', () => ({
  default: ({ onFinishSession }) => <button onClick={() => onFinishSession(['a.png', 'b.png'])}>camera-finish</button>,
}));
vi.mock('../src/components/StudioEditorView.jsx', () => ({
  default: ({ photos, onNext }) => (
    <div>
      <span>studio-photos:{photos.length}</span>
      <button onClick={() => onNext({ upsellPrice: 0, variants: [{ template: { id: 't' }, paperSize: { id: '4r' }, frame: { id: 'f' } }] })}>studio-free</button>
      <button onClick={() => onNext({ upsellPrice: 10000, variants: [{ template: { id: 't' } }, { template: { id: 't2' } }] })}>studio-upsell</button>
    </div>
  ),
}));
vi.mock('../src/components/LiveWallView.jsx', () => ({
  default: ({ capturedPhotos, onNext }) => (
    <div>
      <span>wall-photos:{capturedPhotos.length}</span>
      <button onClick={onNext}>wall-next</button>
    </div>
  ),
}));
vi.mock('../src/components/ThankYouScreen.jsx', () => ({
  default: ({ onReset }) => <button onClick={onReset}>thanks-reset</button>,
}));
vi.mock('../src/components/MobileGalleryView.jsx', () => ({
  default: ({ sessionId }) => <div>gallery:{sessionId}</div>,
}));
vi.mock('../src/components/AdminDashboard.jsx', () => ({ default: () => <div>admin-dashboard</div> }));

import App from '../src/App.jsx';

const click = (name) => fireEvent.click(screen.getByText(name));

beforeEach(() => window.history.pushState({}, '', '/'));
afterEach(() => cleanup());

describe('kiosk flow', () => {
  it('walks from landing to thank-you and back to landing', () => {
    render(<App />);
    click('landing-start');
    expect(screen.getByText('Mulai Sesi Photobooth')).toBeTruthy();
    click('pay-ok');
    click('camera-finish');
    expect(screen.getByText('studio-photos:2')).toBeTruthy();
    click('studio-free');
    expect(screen.getByText('wall-photos:2')).toBeTruthy();
    click('wall-next');
    click('thanks-reset');
    expect(screen.getByText('landing-start')).toBeTruthy();
  });

  it('shows the session countdown only while a session is running', () => {
    render(<App />);
    expect(screen.queryByText('Sisa sesi')).toBeNull();
    click('landing-start');
    click('pay-ok');
    expect(screen.getByText('Sisa sesi')).toBeTruthy();
    click('camera-finish');
    click('studio-free');
    expect(screen.queryByText('Sisa sesi')).toBeNull();
  });

  it('asks for an upsell payment and returns to the editor on back', () => {
    render(<App />);
    click('landing-start');
    click('pay-ok');
    click('camera-finish');
    click('studio-upsell');
    expect(screen.getByText('Pembayaran Tambahan (Upsell)')).toBeTruthy();
    click('pay-back');
    expect(screen.getByText('studio-photos:2')).toBeTruthy();
    click('studio-upsell');
    click('pay-ok');
    expect(screen.getByText('wall-photos:2')).toBeTruthy();
  });

  it('goes back to landing from the first payment', () => {
    render(<App />);
    click('landing-start');
    click('pay-back');
    expect(screen.getByText('landing-start')).toBeTruthy();
  });

  it('resets when the brand button is pressed mid-session', () => {
    render(<App />);
    click('landing-start');
    click('pay-ok');
    fireEvent.click(screen.getByText('Urbanmenphoto'));
    expect(screen.getByText('landing-start')).toBeTruthy();
    expect(screen.queryByText('Sisa sesi')).toBeNull();
  });
});

describe('routes', () => {
  it('renders the admin dashboard on /admin', () => {
    window.history.pushState({}, '', '/admin/transaction');
    render(<App />);
    expect(screen.getByText('admin-dashboard')).toBeTruthy();
  });

  it('renders the customer gallery on /gallery/:id', () => {
    window.history.pushState({}, '', '/gallery/abc-123');
    render(<App />);
    expect(screen.getByText('gallery:abc-123')).toBeTruthy();
  });
});
