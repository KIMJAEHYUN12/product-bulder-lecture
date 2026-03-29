import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { RpgCharacter } from "@/types";

const COLLECTION = "rpg_characters";

export async function loadRpgCharacter(userId: string): Promise<RpgCharacter | null> {
  const snap = await getDoc(doc(db, COLLECTION, userId));
  if (!snap.exists()) return null;
  return snap.data() as RpgCharacter;
}

export async function saveRpgCharacter(userId: string, character: RpgCharacter): Promise<void> {
  await setDoc(doc(db, COLLECTION, userId), character);
}
