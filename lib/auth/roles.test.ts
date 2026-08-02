import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoles, hasAtLeast, canManageUsers, canDelete, canWrite } from './roles';

describe('parseRoles', () => {
  test('reads the comma-separated string the admin plugin stores', () => {
    assert.deepEqual(parseRoles('admin,staff'), ['admin', 'staff']);
    assert.deepEqual(parseRoles(' superadmin , admin '), ['superadmin', 'admin']);
  });

  test('is case-insensitive', () => {
    assert.deepEqual(parseRoles('SuperAdmin'), ['superadmin']);
  });

  test('drops unknown roles rather than trusting them', () => {
    assert.deepEqual(parseRoles('admin,owner,root'), ['admin']);
  });

  test('treats absent or empty as no roles at all', () => {
    assert.deepEqual(parseRoles(null), []);
    assert.deepEqual(parseRoles(undefined), []);
    assert.deepEqual(parseRoles(''), []);
  });
});

describe('privilege ordering', () => {
  test('a higher role satisfies a lower requirement', () => {
    assert.equal(hasAtLeast(['superadmin'], 'staff'), true);
    assert.equal(hasAtLeast(['admin'], 'staff'), true);
  });

  test('a lower role does not satisfy a higher requirement', () => {
    assert.equal(hasAtLeast(['staff'], 'admin'), false);
    assert.equal(hasAtLeast(['admin'], 'superadmin'), false);
  });

  test('the best role wins when several are held', () => {
    assert.equal(hasAtLeast(['staff', 'superadmin'], 'admin'), true);
  });

  test('no roles means no access', () => {
    assert.equal(hasAtLeast([], 'staff'), false);
    assert.equal(canWrite([]), false);
  });
});

describe('capability helpers', () => {
  test('admin and above manage users — the Console can only assign admin', () => {
    assert.equal(canManageUsers(['superadmin']), true);
    assert.equal(canManageUsers(['admin']), true);
    assert.equal(canManageUsers(['staff']), false);
    assert.equal(canManageUsers([]), false);
  });

  test('staff can write but not delete', () => {
    assert.equal(canWrite(['staff']), true);
    assert.equal(canDelete(['staff']), false);
    assert.equal(canDelete(['admin']), true);
  });
});
