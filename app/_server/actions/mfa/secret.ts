import _sodium from "libsodium-wrappers-sumo";
import { findUserRecord } from "../users/records";

let sodium: any;
const _getSodium = async () => {
    if (!sodium) {
        await _sodium.ready;
        sodium = _sodium;
    }
    return sodium;
};

export const encryptMfaSecret = async (secret: string, username: string): Promise<string> => {
    const sod = await _getSodium();

    const user = await findUserRecord(username);
    if (!user) {
        throw new Error("User not found");
    }

    const passphrase = user.passwordHash;
    const salt = sod.randombytes_buf(sod.crypto_pwhash_SALTBYTES);

    const key = sod.crypto_pwhash(
        sod.crypto_aead_xchacha20poly1305_ietf_KEYBYTES,
        passphrase,
        salt,
        sod.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        sod.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        sod.crypto_pwhash_ALG_DEFAULT
    );

    const nonce = sod.randombytes_buf(sod.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
    const ciphertext = sod.crypto_aead_xchacha20poly1305_ietf_encrypt(
        secret,
        null,
        null,
        nonce,
        key
    );

    const packageData = {
        alg: "xchacha20",
        salt: sod.to_hex(salt),
        nonce: sod.to_hex(nonce),
        data: sod.to_hex(ciphertext)
    };

    return JSON.stringify(packageData);
};

export const decryptMfaSecret = async (encryptedSecret: string, username: string): Promise<string> => {
    const sod = await _getSodium();
    const pkg = JSON.parse(encryptedSecret);

    const user = await findUserRecord(username);
    if (!user) {
        throw new Error("User not found");
    }

    const passphrase = user.passwordHash;
    const salt = sod.from_hex(pkg.salt);
    const nonce = sod.from_hex(pkg.nonce);
    const ciphertext = sod.from_hex(pkg.data);

    const key = sod.crypto_pwhash(
        sod.crypto_aead_xchacha20poly1305_ietf_KEYBYTES,
        passphrase,
        salt,
        sod.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        sod.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        sod.crypto_pwhash_ALG_DEFAULT
    );

    const decrypted = sod.crypto_aead_xchacha20poly1305_ietf_decrypt(
        null,
        ciphertext,
        null,
        nonce,
        key
    );

    return sod.to_string(decrypted);
};
