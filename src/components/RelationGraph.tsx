"use client";

import { useId, useMemo, useState } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import type {
  Material,
  MaterialRelation,
  RelationType,
} from "@/lib/materials";

type Node = SimulationNodeDatum & {
  id: string;
  title: string;
  projectName: string;
  importance: number;
  r: number;
};

type Link = SimulationLinkDatum<Node> & {
  id: string;
  relation: RelationType;
};

const LABEL_MAX = 14;
const LABEL_SIZE = 11;
// 노드가 적어도 그림이 과하게 확대되지 않도록 최소 크기를 둔다
const MIN_WIDTH = 640;
const MIN_HEIGHT = 380;

const shorten = (s: string) =>
  s.length > LABEL_MAX ? `${s.slice(0, LABEL_MAX - 1)}…` : s;

// 이름표 너비 추정: 한글 등 전각 문자는 글자 크기만큼, 영문은 그 60%
const labelWidth = (s: string) =>
  [...shorten(s)].reduce(
    (w, c) => w + (c.charCodeAt(0) > 0x2e80 ? LABEL_SIZE : LABEL_SIZE * 0.6),
    0,
  );

// 노드 배치를 한 번에 계산한다 (애니메이션 없이 고정된 그림)
function layout(materials: Material[], relations: MaterialRelation[], connectedOnly: boolean) {
  const ids = new Set(materials.map((m) => m.id));
  const visibleRelations = relations.filter(
    (r) => ids.has(r.sourceId) && ids.has(r.targetId),
  );
  const connected = new Set(
    visibleRelations.flatMap((r) => [r.sourceId, r.targetId]),
  );
  const nodes: Node[] = materials
    .filter((m) => !connectedOnly || connected.has(m.id))
    .map((m) => ({
      id: m.id,
      title: m.title,
      projectName: m.projectName,
      importance: m.importance,
      r: 6 + m.importance * 2,
    }));
  const links: Link[] = visibleRelations.map((r) => ({
    id: r.id,
    source: r.sourceId,
    target: r.targetId,
    relation: r.relation,
  }));

  const simulation = forceSimulation(nodes)
    .force(
      "link",
      forceLink<Node, Link>(links)
        .id((d) => d.id)
        .distance(90),
    )
    .force("charge", forceManyBody().strength(-260))
    .force("center", forceCenter(0, 0))
    // 이름표가 겹치지 않도록 이름표 너비만큼 간격을 둔다
    .force(
      "collide",
      forceCollide<Node>((d) => Math.max(d.r + 18, labelWidth(d.title) / 2 + 8)),
    )
    .stop();
  for (let i = 0; i < 300; i++) simulation.tick();

  const pad = 70;
  const xs = nodes.map((n) => n.x ?? 0);
  const ys = nodes.map((n) => n.y ?? 0);
  let minX = Math.min(...xs) - pad;
  let minY = Math.min(...ys) - pad;
  let width = Math.max(...xs) - minX + pad;
  let height = Math.max(...ys) - minY + pad + 14;
  if (width < MIN_WIDTH) {
    minX -= (MIN_WIDTH - width) / 2;
    width = MIN_WIDTH;
  }
  if (height < MIN_HEIGHT) {
    minY -= (MIN_HEIGHT - height) / 2;
    height = MIN_HEIGHT;
  }
  return {
    nodes,
    links: links as (Link & { source: Node; target: Node })[],
    viewBox: `${minX} ${minY} ${width} ${height}`,
  };
}

export default function RelationGraph({
  materials,
  relations,
  onSelect,
}: {
  materials: Material[];
  relations: MaterialRelation[];
  onSelect: (id: string) => void;
}) {
  const uid = useId();
  const arrowId = `${uid}-arrow`.replace(/:/g, "");
  const [connectedOnly, setConnectedOnly] = useState(true);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const graph = useMemo(
    () => layout(materials, relations, connectedOnly),
    [materials, relations, connectedOnly],
  );

  const isActive = (link: { source: Node; target: Node }) =>
    !hoverId || link.source.id === hoverId || link.target.id === hoverId;

  return (
    <div className="flex flex-col gap-2 rounded bg-zinc-100 p-3 dark:bg-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-400">
        <span>
          현재 목록 기준 · 자료 {graph.nodes.length}개 · 관계 {graph.links.length}개
          · 노드를 누르면 해당 자료로 이동합니다
        </span>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={connectedOnly}
            onChange={(e) => setConnectedOnly(e.target.checked)}
          />
          연결된 자료만
        </label>
      </div>

      {graph.nodes.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">
          {connectedOnly
            ? "연결된 자료가 없습니다. 카드의 \"+ 관계\"에서 자료를 연결해 보세요."
            : "표시할 자료가 없습니다."}
        </p>
      ) : (
        <svg
          viewBox={graph.viewBox}
          className="h-[26rem] w-full rounded bg-white dark:bg-zinc-900"
          role="img"
          aria-label="자료 관계 그래프"
        >
          <defs>
            <marker
              id={arrowId}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" className="fill-zinc-500 dark:fill-zinc-400" />
            </marker>
          </defs>

          {graph.links.map((link) => {
            const { source: s, target: t } = link;
            const dx = (t.x ?? 0) - (s.x ?? 0);
            const dy = (t.y ?? 0) - (s.y ?? 0);
            const dist = Math.hypot(dx, dy) || 1;
            // 화살촉이 대상 노드 테두리에 닿도록 선 끝을 줄인다
            const endGap = link.relation === "cites" ? t.r + 4 : t.r;
            return (
              <line
                key={link.id}
                x1={(s.x ?? 0) + (dx / dist) * s.r}
                y1={(s.y ?? 0) + (dy / dist) * s.r}
                x2={(t.x ?? 0) - (dx / dist) * endGap}
                y2={(t.y ?? 0) - (dy / dist) * endGap}
                strokeWidth={2}
                strokeDasharray={link.relation === "related" ? "5 4" : undefined}
                markerEnd={link.relation === "cites" ? `url(#${arrowId})` : undefined}
                className={`stroke-zinc-500 transition-opacity dark:stroke-zinc-400 ${
                  isActive(link) ? "opacity-100" : "opacity-15"
                }`}
              />
            );
          })}

          {graph.nodes.map((node) => (
            <g
              key={node.id}
              transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}
              role="button"
              tabIndex={0}
              aria-label={`${node.title} (${node.projectName})로 이동`}
              className="cursor-pointer outline-none"
              onClick={() => onSelect(node.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(node.id);
                }
              }}
              onMouseEnter={() => setHoverId(node.id)}
              onMouseLeave={() => setHoverId(null)}
              onFocus={() => setHoverId(node.id)}
              onBlur={() => setHoverId(null)}
            >
              <title>{`${node.title}\n${node.projectName} · 중요도 ${node.importance}`}</title>
              {/* 손가락으로 누르기 쉽도록 보이는 원보다 큰 투명 영역 */}
              <circle r={node.r + 8} fill="transparent" />
              <circle
                r={node.r}
                strokeWidth={2}
                className={`fill-[#2a7ab0] stroke-white dark:fill-[#4896cb] dark:stroke-zinc-900 ${
                  hoverId === node.id ? "stroke-[#1b4965] dark:stroke-sky-200" : ""
                }`}
              />
              {/* 선 위에서도 읽히도록 배경색 테두리를 먼저 칠한다 */}
              <text
                y={node.r + 13}
                textAnchor="middle"
                fontSize={LABEL_SIZE}
                strokeWidth={4}
                strokeLinejoin="round"
                paintOrder="stroke"
                className="pointer-events-none fill-zinc-700 stroke-white dark:fill-zinc-300 dark:stroke-zinc-900"
              >
                {shorten(node.title)}
              </text>
            </g>
          ))}
        </svg>
      )}

      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-600 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <svg width="14" height="14" aria-hidden>
            <circle cx="7" cy="7" r="6" className="fill-[#2a7ab0] dark:fill-[#4896cb]" />
          </svg>
          자료 (클수록 중요도 높음)
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="28" height="10" aria-hidden>
            <line x1="1" y1="5" x2="20" y2="5" strokeWidth="2" className="stroke-zinc-500 dark:stroke-zinc-400" />
            <path d="M20,1 L27,5 L20,9 z" className="fill-zinc-500 dark:fill-zinc-400" />
          </svg>
          A → B: A가 B를 인용
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="28" height="10" aria-hidden>
            <line x1="1" y1="5" x2="27" y2="5" strokeWidth="2" strokeDasharray="5 4" className="stroke-zinc-500 dark:stroke-zinc-400" />
          </svg>
          관련 있음
        </span>
      </div>
    </div>
  );
}
