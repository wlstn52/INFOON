export default function ShareNotFound() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16 text-center">
      <h1 className="text-xl font-bold text-[#1b4965] dark:text-sky-300">
        열 수 없는 링크입니다
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        주소가 잘못되었거나 공유가 중지되었습니다. 링크를 보낸 사람에게
        확인해 주세요.
      </p>
    </main>
  );
}
