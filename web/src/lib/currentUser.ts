import { cookies } from "next/headers";
import { DEFAULT_USER_ID, findPeer, type Peer } from "./peers";

export const USER_COOKIE = "primum_user";

export async function getCurrentUser(): Promise<Peer> {
  const c = await cookies();
  const id = c.get(USER_COOKIE)?.value ?? DEFAULT_USER_ID;
  return findPeer(id) ?? findPeer(DEFAULT_USER_ID)!;
}
