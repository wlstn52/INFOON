import PlaceholderField from "@/components/PlaceholderField";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-10">
      <h1 className="text-center text-2xl font-bold tracking-tight text-[#1b4965]">
        로그인
      </h1>
      <div className="flex flex-col gap-3 rounded-lg border border-black/10 p-5 dark:border-white/10">
        <PlaceholderField label="아이디" />
        <PlaceholderField label="비밀번호" />
      </div>
    </main>
  );
}
