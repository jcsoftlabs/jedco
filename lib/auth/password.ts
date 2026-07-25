import { hash, verify } from "@node-rs/argon2";

export async function hasherMotDePasse(motDePasse: string): Promise<string> {
  return hash(motDePasse);
}

export async function verifierMotDePasse(hachage: string, motDePasse: string): Promise<boolean> {
  return verify(hachage, motDePasse);
}
