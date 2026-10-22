// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import {
  MENU_ITEMS,
  STAFF_ALLOWED_MENUS,
  dateInputToISOString,
  describeAuditAction,
  formatBytes,
  getAdminPath,
  getAdminTabFromPath,
  getPaginationItems,
  voucherStatus,
} from '../src/components/admin/shared.jsx';

afterEach(() => window.history.pushState({}, '', '/'));

describe('voucherStatus', () => {
  const day = 24 * 60 * 60 * 1000;
  const iso = (offset) => new Date(Date.now() + offset).toISOString();

  it('reports each lifecycle state', () => {
    expect(voucherStatus({ active: false })).toBe('inactive');
    expect(voucherStatus({ active: true, startsAt: iso(day) })).toBe('scheduled');
    expect(voucherStatus({ active: true, endsAt: iso(-day) })).toBe('expired');
    expect(voucherStatus({ active: true, usageLimit: 5, usedCount: 5 })).toBe('depleted');
    expect(voucherStatus({ active: true, usageLimit: 5, usedCount: 4, startsAt: iso(-day), endsAt: iso(day) })).toBe('active');
  });

  it('treats a zero usage limit as unlimited', () => {
    expect(voucherStatus({ active: true, usageLimit: 0, usedCount: 999 })).toBe('active');
  });
});

describe('formatBytes', () => {
  it('scales units', () => {
    expect(formatBytes()).toBe('0 B');
    expect(formatBytes(1023)).toBe('1023 B');
    expect(formatBytes(1024)).toBe('1.00 KB');
    expect(formatBytes(15 * 1024 * 1024)).toBe('15.0 MB');
    expect(formatBytes(5 * 1024 ** 4)).toBe('5.00 TB');
  });
});

describe('describeAuditAction', () => {
  it('translates known verbs and keeps unknown ones', () => {
    expect(describeAuditAction('admin.login.success')).toBe('admin berhasil login');
    expect(describeAuditAction('voucher.update')).toBe('voucher mengubah update');
    expect(describeAuditAction('')).toContain('system');
  });
});

describe('getPaginationItems', () => {
  it('lists every page when there are five or fewer', () => {
    expect(getPaginationItems(1, 1)).toEqual([1]);
    expect(getPaginationItems(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('collapses long ranges around the current page', () => {
    expect(getPaginationItems(1, 20)).toEqual([1, 2, 3, 'ellipsis', 20]);
    expect(getPaginationItems(10, 20)).toEqual([1, 'ellipsis-left', 10, 'ellipsis-right', 20]);
    expect(getPaginationItems(20, 20)).toEqual([1, 'ellipsis', 18, 19, 20]);
  });

  it('clamps out-of-range input', () => {
    expect(getPaginationItems(99, 3)).toEqual([1, 2, 3]);
    expect(getPaginationItems(0, undefined)).toEqual([1]);
  });
});

describe('admin routing helpers', () => {
  it('maps paths to tabs and back', () => {
    window.history.pushState({}, '', '/admin/transaction');
    expect(getAdminTabFromPath()).toBe('transaction');
    window.history.pushState({}, '', '/admin/kiosk-settings');
    expect(getAdminTabFromPath()).toBe('kiosk');
    window.history.pushState({}, '', '/admin/does-not-exist');
    expect(getAdminTabFromPath()).toBe('overview');
    expect(getAdminPath('overview')).toBe('/admin');
    expect(getAdminPath('voucher')).toBe('/admin/voucher');
  });

  it('only lets staff see menus that exist', () => {
    const ids = new Set(MENU_ITEMS.map((item) => item.id));
    for (const id of STAFF_ALLOWED_MENUS) expect(ids.has(id)).toBe(true);
    expect(STAFF_ALLOWED_MENUS.has('wallet')).toBe(false);
    expect(STAFF_ALLOWED_MENUS.has('admin_users')).toBe(false);
  });
});

describe('dateInputToISOString', () => {
  it('returns null for empty input and spans the whole day', () => {
    expect(dateInputToISOString('')).toBeNull();
    const start = new Date(dateInputToISOString('2026-03-10'));
    const end = new Date(dateInputToISOString('2026-03-10', true));
    expect(end - start).toBe(24 * 60 * 60 * 1000 - 1);
  });
});
