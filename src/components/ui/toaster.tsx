import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()
  const visibleToasts = toasts
    .filter(t => t.title || t.description || t.action)
    .filter((t, i, arr) => {
      const key = `${String(t.title ?? "")}||${String(t.description ?? "")}`
      return i === arr.findIndex(u => `${String(u.title ?? "")}||${String(u.description ?? "")}` === key)
    })

  return (
    <ToastProvider>
      {visibleToasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription className="whitespace-pre-wrap break-words">{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
