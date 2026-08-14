type Props = {
  message: string
}

export default function Toast({ message }: Props) {
  if (!message) return null
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-navy px-5 py-2.5 text-[13px] font-extrabold text-cream shadow-[0_8px_24px_rgba(43,27,77,.22)]"
    >
      {message}
    </div>
  )
}
