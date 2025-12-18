// Simple obfuscation/encryption using Web Crypto API to protect key at rest in LocalStorage
// Note: Client-side encryption key must be stored somewhere. 
// We will generate a random key on first load and store it, 
// effectively binding the data to this browser instance 
// but creating a layer of obfuscation against casual inspection.

export async function generateKey(): Promise<CryptoKey> {
    return window.crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256
        },
        true,
        ["encrypt", "decrypt"]
    );
}

export async function encryptData(data: string, key: CryptoKey): Promise<{ iv: number[]; encrypted: number[] }> {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encryptedContent = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        encodedData
    );

    return {
        iv: Array.from(iv),
        encrypted: Array.from(new Uint8Array(encryptedContent))
    };
}

export async function decryptData(encryptedData: number[], iv: number[], key: CryptoKey): Promise<string> {
    const decryptedContent = await window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: new Uint8Array(iv)
        },
        key,
        new Uint8Array(encryptedData)
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedContent);
}

// Helpers to store/retrieve key from text (JWK) for storage
export async function exportKey(key: CryptoKey): Promise<JsonWebKey> {
    return await window.crypto.subtle.exportKey("jwk", key);
}

export async function importKey(jwk: JsonWebKey): Promise<CryptoKey> {
    return await window.crypto.subtle.importKey(
        "jwk",
        jwk,
        {
            name: "AES-GCM",
        },
        true,
        ["encrypt", "decrypt"]
    );
}
