import PlaceholderField from "@/components/PlaceholderField";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-10">
      <section className="text-center sm:text-left">
        <h1 className="text-3xl font-bold tracking-tight text-[#1b4965]">
          INFOON
        </h1>
        <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
          자료명, 저장 위치, 자료 간의 관계, 설명 등을 등록하면 목록을
          정리하고, 필터에 따라 자료를 보여주고 인용 양식을 제공하는
          서비스입니다.
        </p>
      </section>

      <section
        id="new-material"
        className="overflow-hidden rounded-lg border border-black/10 dark:border-white/10"
      >
        <h2 className="bg-[#1b4965] px-5 py-3 font-medium text-white">
          새 자료 등록하기
        </h2>
        <div className="flex flex-col gap-3 p-5">
          <PlaceholderField label="프로젝트" />
          <PlaceholderField label="자료명" />
          <PlaceholderField label="자료 종류" />
          <PlaceholderField label="저장 위치" />
          <PlaceholderField label="중요도" />
          <PlaceholderField label="자료 설명" tall />
        </div>
      </section>

      <section
        id="materials"
        className="overflow-hidden rounded-lg border border-black/10 dark:border-white/10"
      >
        <h2 className="bg-[#1b4965] px-5 py-3 font-medium text-white">
          자료 확인하기
        </h2>
        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap gap-4">
            <PlaceholderField label="프로젝트" />
            <PlaceholderField label="정렬" />
            <PlaceholderField label="필터" />
          </div>
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 rounded border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900"
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
