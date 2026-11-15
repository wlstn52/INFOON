import type { RelationType } from "@/lib/materials";

// "이 자료 → B · 인용"처럼 방향을 화살표로 보여 준다
export default function RelationText({
  relation,
  outgoing,
  self,
  other,
}: {
  relation: RelationType;
  outgoing: boolean;
  self: string;
  other: React.ReactNode;
}) {
  const muted = "text-xs text-zinc-500";
  if (relation === "related") {
    return (
      <>
        <span className={muted}>{self} ↔ </span>
        {other}
        <span className={muted}> · 관련</span>
      </>
    );
  }
  return outgoing ? (
    <>
      <span className={muted}>{self} → </span>
      {other}
      <span className={muted}> · 인용</span>
    </>
  ) : (
    <>
      {other}
      <span className={muted}> → {self} · 인용</span>
    </>
  );
}
