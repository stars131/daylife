import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto mt-20 max-w-sm rounded-lg border border-line bg-white p-5 text-center">
      <h1 className="text-lg font-semibold text-ink">页面不存在</h1>
      <p className="mt-2 text-sm text-muted">请返回首页继续管理日程。</p>
      <Link href="/" className="mt-4 inline-flex h-11 items-center rounded-md bg-accent px-4 text-sm font-semibold text-white">
        返回首页
      </Link>
    </div>
  );
}
