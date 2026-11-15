import { toCitationRuns } from "@/lib/citation";

// 강조 표시가 들어 있는 인용을 이탤릭/굵게로 보여 준다
export default function CitationText({ citation }: { citation: string }) {
  return (
    <>
      {toCitationRuns(citation).map((run, i) => {
        let node: React.ReactNode = run.text;
        if (run.italic) node = <i>{node}</i>;
        if (run.bold) node = <strong>{node}</strong>;
        return <span key={i}>{node}</span>;
      })}
    </>
  );
}
