import type { CharacterSnapshot } from "@/types/social";

const GRADE_COLORS: Record<string, string> = {
  common: "text-gray-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
};

interface Props {
  snapshot: CharacterSnapshot;
}

export function CharacterSnapshotCard({ snapshot }: Props) {
  const total =
    snapshot.battleRecord.wins +
    snapshot.battleRecord.losses +
    snapshot.battleRecord.draws;

  return (
    <div className="mt-2 rounded-lg border border-purple-500/20 bg-purple-500/5 p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-mono text-purple-400">캐릭터</span>
        <span className="text-[10px] font-mono text-gray-500">
          전투력 {snapshot.combatPower}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-base">{snapshot.classEmoji}</span>
        <span className="text-xs font-bold text-gray-800 dark:text-zinc-200">
          {snapshot.nickname}
        </span>
        <span className="text-[10px] font-mono text-gray-500">
          Lv.{snapshot.level} {snapshot.className}
        </span>
      </div>
      {snapshot.equipment.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {snapshot.equipment.map((eq, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-500/10 text-[10px] font-mono ${GRADE_COLORS[eq.grade] ?? "text-gray-400"}`}
            >
              {eq.emoji} {eq.name}
              {eq.enhanceLevel > 0 && (
                <span className="text-yellow-400">+{eq.enhanceLevel}</span>
              )}
            </span>
          ))}
        </div>
      )}
      {total > 0 && (
        <div className="text-[10px] font-mono text-gray-500">
          전적 {snapshot.battleRecord.wins}승 {snapshot.battleRecord.losses}패{" "}
          {snapshot.battleRecord.draws}무
        </div>
      )}
    </div>
  );
}
