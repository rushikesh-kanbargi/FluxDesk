export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#09090b] flex items-center justify-center p-4">
      {children}
    </div>
  )
}
