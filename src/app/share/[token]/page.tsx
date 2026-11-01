import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SharedMaterialList from "@/components/SharedMaterialList";
import type { Author, Material } from "@/lib/materials";
import { isUuid } from "@/lib/materialDb";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "공유된 자료 목록 | INFOON",
  robots: { index: false, follow: false },
};

type SharedRow = Record<string, string | number | Author[] | null>;

function toMaterial(row: SharedRow, index: number, projectName: string) {
  const fields = Object.fromEntries(
    Object.entries(row).filter(([, value]) => value !== null),
  );
  // 공유 응답에는 내부 ID가 없으므로 화면용 키만 만든다
  return {
    ...fields,
    id: String(index),
    projectName,
    location: "",
    createdAt: row.created_at,
  } as unknown as Material;
}

export default async function SharePage({
  params,
}: PageProps<"/share/[token]">) {
  const { token } = await params;
  if (!isUuid(token)) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_project", {
    p_token: token,
  });

  if (error) {
    console.error("get_shared_project", error);
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16 text-center">
        <p className="text-sm text-red-600">
          지금은 자료를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.
        </p>
      </main>
    );
  }
  if (!data) notFound();

  const materials = (data.materials as SharedRow[]).map((row, i) =>
    toMaterial(row, i, data.name),
  );

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <section>
        <p className="text-xs text-zinc-500">공유된 자료 목록 · 읽기 전용</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#1b4965] dark:text-sky-300">
          {data.name}
        </h1>
        {data.goal && (
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">{data.goal}</p>
        )}
        <p className="mt-2 text-sm text-zinc-500">자료 {materials.length}건</p>
      </section>
      <SharedMaterialList materials={materials} />
    </main>
  );
}
