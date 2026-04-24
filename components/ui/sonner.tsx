"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4 text-emerald-500" />
        ),
        info: (
          <InfoIcon className="size-4 text-primary" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4 text-amber-500" />
        ),
        error: (
          <OctagonXIcon className="size-4 text-rose-500" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin text-primary" />
        ),
      }}
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-background/75 group-[.toaster]:backdrop-blur-2xl group-[.toaster]:text-foreground group-[.toaster]:border-white/20 group-[.toaster]:shadow-[0_20px_50px_rgba(0,0,0,0.15)] group-[.toaster]:rounded-full group-[.toaster]:px-6 group-[.toaster]:py-3.5 group-[.toaster]:font-medium",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-[11px]",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-full group-[.toast]:px-4",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-full group-[.toast]:px-4",
          closeButton: "group-[.toast]:bg-background group-[.toast]:border-border group-[.toast]:rounded-full",
          success: "group-[.toaster]:border-emerald-500/30 group-[.toaster]:text-emerald-600 dark:group-[.toaster]:text-emerald-400",
          error: "group-[.toaster]:border-rose-500/30 group-[.toaster]:text-rose-600 dark:group-[.toaster]:text-rose-400",
          info: "group-[.toaster]:border-primary/30 group-[.toaster]:text-primary",
          warning: "group-[.toaster]:border-amber-500/30 group-[.toaster]:text-amber-600 dark:group-[.toaster]:text-amber-400",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
