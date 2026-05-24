import { PasswordService } from './password.service';

describe('PasswordService', () => {
  it('hashes a password and verifies the original value', async () => {
    const service = new PasswordService();

    const hash = await service.hash('StrongPassword123!');

    expect(hash).not.toBe('StrongPassword123!');
    await expect(service.verify('StrongPassword123!', hash)).resolves.toBe(true);
    await expect(service.verify('wrong-password', hash)).resolves.toBe(false);
  });
});

