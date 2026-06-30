import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">Welcome to ArthaRakshak</h1>
      <p className="mt-2 text-muted-foreground">
        Your AI-powered financial guardian.
      </p>
    </div>
  )
}